import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clientUser,
  errorResponse,
  installFakeApi,
  TEST_API_BASE,
  tokenPair,
  type RecordedCall,
  type Routes,
} from '../../test/fakeApi';
import { ApiError, createHttpClient } from '../api/http';
import { createSession, RegistrationSignInError } from './session';
import { createMemoryTokenStore, type StoredTokens } from './tokenStore';

afterEach(() => vi.unstubAllGlobals());

const credentials = { email: 'client@example.test', password: 'Test-pass-1' };
const registration = {
  ...credentials,
  name: 'Test Client',
  role: 'CLIENT' as const,
};

function setup(routes: Routes, initial: Partial<StoredTokens> = {}) {
  const tokenStore = createMemoryTokenStore(initial);
  const api = installFakeApi(routes);
  const session = createSession({
    http: createHttpClient(TEST_API_BASE),
    tokenStore,
  });
  return { api, session, tokenStore };
}

function bearer(call: RecordedCall) {
  return call.headers.get('Authorization');
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const tick = (ms = 20) => new Promise((done) => setTimeout(done, ms));
const unauthorized = () => errorResponse(401, 'Autenticación requerida');

/** Routes for a backend that accepts only the access tokens in `valid`. */
function authedRoutes(valid: Set<string>, extra: Routes = {}): Routes {
  const guard = (body: () => Response) => (call: RecordedCall) =>
    valid.has(bearer(call)?.replace('Bearer ', '') ?? '')
      ? body()
      : unauthorized();
  return {
    'GET /users/me': guard(() => Response.json(clientUser)),
    'GET /requests': guard(() => Response.json([{ id: 1 }])),
    ...extra,
  };
}

describe('login and register', () => {
  it('stores the tokens, loads the user and becomes authenticated', async () => {
    const { api, session, tokenStore } = setup({
      'POST /auth/login': () => Response.json(tokenPair('1')),
      'GET /users/me': () => Response.json(clientUser),
    });
    expect(session.getState()).toEqual({ status: 'anonymous', user: null });

    expect(await session.login(credentials)).toEqual(clientUser);

    expect(session.getState()).toEqual({
      status: 'authenticated',
      user: clientUser,
    });
    expect(tokenStore.getAccessToken()).toBe('access-1');
    expect(tokenStore.getRefreshToken()).toBe('refresh-1');
    expect(api.calls[0]).toMatchObject({
      path: '/auth/login',
      body: credentials,
    });
    expect(bearer(api.calls[0]!)).toBeNull();
    expect(bearer(api.calls[1]!)).toBe('Bearer access-1');
  });

  it('keeps the session anonymous when the credentials are rejected', async () => {
    const { api, session, tokenStore } = setup({
      'POST /auth/login': () => errorResponse(401, 'Credenciales inválidas'),
    });
    await expect(session.login(credentials)).rejects.toMatchObject({
      status: 401,
      message: 'Credenciales inválidas',
    });
    expect(session.getState().status).toBe('anonymous');
    expect(tokenStore.getRefreshToken()).toBeNull();
    expect(api.calls).toHaveLength(1); // no refresh attempt on a login 401
  });

  it('discards the tokens, and revokes the new one, when /users/me fails', async () => {
    const { api, session, tokenStore } = setup({
      'POST /auth/login': () => Response.json(tokenPair('1')),
      'GET /users/me': () => errorResponse(500, 'Error interno del servidor'),
      'POST /auth/logout': () => new Response(null, { status: 204 }),
    });
    await expect(session.login(credentials)).rejects.toMatchObject({
      status: 500,
    });
    expect(session.getState().status).toBe('anonymous');
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
    await vi.waitFor(() =>
      expect(api.callsTo('POST /auth/logout')[0]?.body).toEqual({
        refreshToken: 'refresh-1',
      }),
    );
  });

  it('registers, then signs in with the same credentials', async () => {
    const { api, session } = setup({
      'POST /auth/register': () => Response.json(clientUser, { status: 201 }),
      'POST /auth/login': () => Response.json(tokenPair('1')),
      'GET /users/me': () => Response.json(clientUser),
    });
    expect(await session.register(registration)).toEqual(clientUser);
    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /auth/register',
      'POST /auth/login',
      'GET /users/me',
    ]);
    expect(api.calls[0]?.body).toEqual(registration);
    expect(api.calls[1]?.body).toEqual(credentials);
  });

  it('surfaces registration errors without trying to sign in', async () => {
    const { api, session } = setup({
      'POST /auth/register': () =>
        errorResponse(409, 'El correo ya está registrado'),
    });
    await expect(session.register(registration)).rejects.toMatchObject({
      status: 409,
    });
    expect(api.callsTo('POST /auth/login')).toHaveLength(0);
  });

  it('reports a failed sign-in after a successful registration distinctly', async () => {
    const { session } = setup({
      'POST /auth/register': () => Response.json(clientUser, { status: 201 }),
      'POST /auth/login': () =>
        errorResponse(500, 'Error interno del servidor'),
    });
    const error = await session.register(registration).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RegistrationSignInError);
    expect((error as RegistrationSignInError).cause).toBeInstanceOf(ApiError);
  });
});

describe('restoring the session on start', () => {
  it('is anonymous without any network call when no refresh token exists', async () => {
    const { api, session } = setup({});
    expect(session.getState().status).toBe('anonymous');
    await session.restore();
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes once, rotates the stored token and loads the user', async () => {
    const { api, session, tokenStore } = setup(
      {
        'POST /auth/refresh': () => Response.json(tokenPair('new')),
        'GET /users/me': () => Response.json(clientUser),
      },
      { refreshToken: 'refresh-old' },
    );
    expect(session.getState().status).toBe('loading');

    await Promise.all([session.restore(), session.restore()]); // StrictMode-like double call
    await session.restore();

    expect(session.getState()).toEqual({
      status: 'authenticated',
      user: clientUser,
    });
    expect(api.callsTo('POST /auth/refresh')).toHaveLength(1);
    expect(api.callsTo('POST /auth/refresh')[0]?.body).toEqual({
      refreshToken: 'refresh-old',
    });
    expect(bearer(api.callsTo('GET /users/me')[0]!)).toBe('Bearer access-new');
    expect(tokenStore.getRefreshToken()).toBe('refresh-new');
  });

  it('ends the session when the refresh token is rejected', async () => {
    const { session, tokenStore } = setup(
      { 'POST /auth/refresh': () => errorResponse(401, 'Token inválido') },
      { refreshToken: 'refresh-old' },
    );
    await session.restore();
    expect(session.getState()).toEqual({ status: 'anonymous', user: null });
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it('shows signed out but keeps the persisted token on a network failure', async () => {
    const { session, tokenStore } = setup(
      {
        'POST /auth/refresh': () => {
          throw new TypeError('Failed to fetch');
        },
      },
      { refreshToken: 'refresh-old' },
    );
    await session.restore();
    expect(session.getState().status).toBe('anonymous');
    expect(tokenStore.getRefreshToken()).toBe('refresh-old');
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  it('keeps the persisted token when the server fails with a 5xx', async () => {
    const { session, tokenStore } = setup(
      { 'POST /auth/refresh': () => errorResponse(500, 'Error interno') },
      { refreshToken: 'refresh-old' },
    );
    await session.restore();
    expect(session.getState().status).toBe('anonymous');
    expect(tokenStore.getRefreshToken()).toBe('refresh-old');
  });

  it('ends the session when the refreshed account is no longer available', async () => {
    const { session, tokenStore } = setup(
      {
        'POST /auth/refresh': () => Response.json(tokenPair('new')),
        'GET /users/me': unauthorized,
      },
      { refreshToken: 'refresh-old' },
    );
    await session.restore();
    expect(session.getState().status).toBe('anonymous');
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it('suspends without discarding the new token when /users/me is unreachable', async () => {
    const { session, tokenStore } = setup(
      {
        'POST /auth/refresh': () => Response.json(tokenPair('new')),
        'GET /users/me': () => {
          throw new TypeError('Failed to fetch');
        },
      },
      { refreshToken: 'refresh-old' },
    );
    await session.restore();
    expect(session.getState().status).toBe('anonymous');
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBe('refresh-new');
  });

  it('becomes anonymous if the token vanished before restore started', async () => {
    const { api, session, tokenStore } = setup(
      {},
      { refreshToken: 'refresh-old' },
    );
    tokenStore.clear(); // for example, a logout in another tab
    await session.restore();
    expect(session.getState().status).toBe('anonymous');
    expect(api.fetchMock).not.toHaveBeenCalled();
  });
});

describe('authenticated requests', () => {
  it('attaches the in-memory bearer token and returns the JSON body', async () => {
    const { api, session } = setup(authedRoutes(new Set(['access-1'])), {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    expect(await session.request('/requests')).toEqual([{ id: 1 }]);
    expect(bearer(api.calls[0]!)).toBe('Bearer access-1');
  });

  it('passes method, body, query and signal through', async () => {
    const { api, session } = setup(
      {
        'PATCH /services/7/status': () => Response.json({ id: 7 }),
      },
      { accessToken: 'access-1' },
    );
    const signal = new AbortController().signal;
    await session.request('/services/7/status', {
      method: 'PATCH',
      query: { status: 'COMPLETADO' },
      signal,
    });
    expect(api.fetchMock.mock.calls[0]?.[0]).toBe(
      `${TEST_API_BASE}/services/7/status?status=COMPLETADO`,
    );
    expect((api.fetchMock.mock.calls[0]?.[1] as RequestInit).signal).toBe(
      signal,
    );
  });

  it('sends no Authorization header when there is no token', async () => {
    const { api, session } = setup({
      'GET /appliance-types': () => Response.json([]),
    });
    await session.request('/appliance-types');
    expect(bearer(api.calls[0]!)).toBeNull();
  });

  it('send ignores an empty body while request rejects it', async () => {
    const { session } = setup({
      'DELETE /things/1': () => new Response(null, { status: 204 }),
    });
    await expect(
      session.send('/things/1', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
    await expect(
      session.request('/things/1', { method: 'DELETE' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('passes non-401 errors through without refreshing', async () => {
    const { api, session } = setup(
      { 'GET /requests': () => errorResponse(403, 'Acceso denegado') },
      { accessToken: 'access-1', refreshToken: 'refresh-1' },
    );
    await expect(session.request('/requests')).rejects.toMatchObject({
      status: 403,
    });
    expect(api.callsTo('POST /auth/refresh')).toHaveLength(0);
  });

  it('refreshes once on a 401 and retries the original request with the new token', async () => {
    const valid = new Set(['access-new']); // the old access token has expired
    const { api, session, tokenStore } = setup(
      authedRoutes(valid, {
        'POST /auth/refresh': () => Response.json(tokenPair('new')),
      }),
      { accessToken: 'access-old', refreshToken: 'refresh-old' },
    );

    expect(await session.request('/requests')).toEqual([{ id: 1 }]);

    expect(api.calls.map((call) => [call.path, bearer(call)])).toEqual([
      ['/requests', 'Bearer access-old'],
      ['/auth/refresh', null],
      ['/requests', 'Bearer access-new'],
    ]);
    expect(tokenStore.getRefreshToken()).toBe('refresh-new');
  });

  it('shares one refresh between parallel 401s (single-flight)', async () => {
    const valid = new Set(['access-new']);
    const gate = deferred();
    const { api, session, tokenStore } = setup(
      authedRoutes(valid, {
        'POST /auth/refresh': async () => {
          await gate.promise;
          return Response.json(tokenPair('new'));
        },
      }),
      { accessToken: 'access-old', refreshToken: 'refresh-old' },
    );

    const results = Promise.all([
      session.request('/requests'),
      session.request('/requests'),
      session.request('/requests'),
    ]);
    await vi.waitFor(() =>
      expect(api.callsTo('POST /auth/refresh')).toHaveLength(1),
    );
    await tick(); // let the other two 401s reach the shared refresh
    gate.resolve();

    expect(await results).toEqual([[{ id: 1 }], [{ id: 1 }], [{ id: 1 }]]);
    expect(api.callsTo('POST /auth/refresh')).toHaveLength(1);
    expect(api.callsTo('GET /requests')).toHaveLength(6);
    expect(tokenStore.getRefreshToken()).toBe('refresh-new');
  });

  it('retries with the already-refreshed token instead of refreshing again', async () => {
    const valid = new Set(['access-new']);
    const slow = deferred();
    const { api, session } = setup(
      authedRoutes(valid, {
        'GET /slow': async (call) => {
          if (bearer(call) === 'Bearer access-old') {
            await slow.promise;
            return unauthorized();
          }
          return Response.json({ ok: true });
        },
        'POST /auth/refresh': () => Response.json(tokenPair('new')),
      }),
      { accessToken: 'access-old', refreshToken: 'refresh-old' },
    );

    const slowRequest = session.request('/slow');
    await vi.waitFor(() => expect(api.callsTo('GET /slow')).toHaveLength(1));
    await session.request('/requests'); // 401 -> refresh -> retry
    slow.resolve(); // now the slow request's 401 arrives late

    expect(await slowRequest).toEqual({ ok: true });
    expect(api.callsTo('POST /auth/refresh')).toHaveLength(1);
    expect(bearer(api.callsTo('GET /slow')[1]!)).toBe('Bearer access-new');
  });

  it('retries only once: a second 401 is surfaced without another refresh', async () => {
    const { api, session } = setup(
      {
        'GET /requests': unauthorized,
        'POST /auth/refresh': () => Response.json(tokenPair('new')),
      },
      { accessToken: 'access-old', refreshToken: 'refresh-old' },
    );
    await expect(session.request('/requests')).rejects.toMatchObject({
      status: 401,
    });
    expect(api.callsTo('GET /requests')).toHaveLength(2);
    expect(api.callsTo('POST /auth/refresh')).toHaveLength(1);
  });

  it('clears the session and surfaces the 401 when the refresh is rejected', async () => {
    const { api, session, tokenStore } = setup(
      {
        'GET /requests': unauthorized,
        'POST /auth/refresh': () => errorResponse(401, 'Token inválido'),
      },
      { accessToken: 'access-old', refreshToken: 'refresh-old' },
    );
    await expect(session.request('/requests')).rejects.toMatchObject({
      status: 401,
      message: 'Autenticación requerida',
    });
    expect(api.callsTo('GET /requests')).toHaveLength(1); // not retried
    expect(session.getState()).toEqual({ status: 'anonymous', user: null });
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it('stays signed in when the refresh cannot be completed (network failure)', async () => {
    const { session, tokenStore } = setup(
      {
        'POST /auth/login': () => Response.json(tokenPair('1')),
        'GET /users/me': () => Response.json(clientUser),
        'GET /requests': unauthorized,
        'POST /auth/refresh': () => {
          throw new TypeError('Failed to fetch');
        },
      },
      {},
    );
    await session.login(credentials);

    await expect(session.request('/requests')).rejects.toMatchObject({
      status: 401,
    });
    expect(session.getState().status).toBe('authenticated');
    expect(tokenStore.getRefreshToken()).toBe('refresh-1');
  });

  it('does not refresh when there is no refresh token', async () => {
    const { api, session } = setup(
      { 'GET /requests': unauthorized },
      { accessToken: 'access-old' },
    );
    await expect(session.request('/requests')).rejects.toMatchObject({
      status: 401,
    });
    expect(api.callsTo('POST /auth/refresh')).toHaveLength(0);
  });

  it('never attaches a token to, or refreshes after a 401 from, /auth endpoints', async () => {
    const { api, session } = setup(
      {
        'POST /auth/login': () => errorResponse(401, 'Credenciales inválidas'),
        'POST /auth/refresh': () => errorResponse(401, 'Token inválido'),
      },
      { accessToken: 'access-1', refreshToken: 'refresh-1' },
    );
    await expect(
      session.request('/auth/login', { method: 'POST', body: credentials }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      session.request('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: 'refresh-1' },
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(api.calls).toHaveLength(2);
    expect(api.calls.every((call) => bearer(call) === null)).toBe(true);
  });

  it('retries once with a token rotated by another tab', async () => {
    const valid = new Set(['access-new']);
    const { api, session, tokenStore } = setup(
      authedRoutes(valid, {
        'POST /auth/refresh': (call) => {
          const sent = (call.body as { refreshToken: string }).refreshToken;
          if (sent === 'refresh-old') {
            // Another tab consumed it first and persisted its replacement.
            tokenStore.setTokens({
              accessToken: 'access-other-tab',
              refreshToken: 'refresh-rotated',
            });
            return errorResponse(401, 'Token inválido');
          }
          return Response.json(tokenPair('new'));
        },
      }),
      { accessToken: 'access-old', refreshToken: 'refresh-old' },
    );

    expect(await session.request('/requests')).toEqual([{ id: 1 }]);
    expect(api.callsTo('POST /auth/refresh').map((call) => call.body)).toEqual([
      { refreshToken: 'refresh-old' },
      { refreshToken: 'refresh-rotated' },
    ]);
    expect(tokenStore.getRefreshToken()).toBe('refresh-new');
  });

  it('does not resurrect a session that was logged out during a refresh', async () => {
    const gate = deferred();
    const { api, session, tokenStore } = setup(
      {
        'GET /requests': unauthorized,
        'POST /auth/refresh': async () => {
          await gate.promise;
          return Response.json(tokenPair('new'));
        },
        'POST /auth/logout': () => new Response(null, { status: 204 }),
      },
      { accessToken: 'access-old', refreshToken: 'refresh-old' },
    );

    const pending = session.request('/requests').catch((e: unknown) => e);
    await vi.waitFor(() =>
      expect(api.callsTo('POST /auth/refresh')).toHaveLength(1),
    );
    await session.logout();
    gate.resolve();

    expect(await pending).toMatchObject({ status: 401 });
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
    expect(session.getState().status).toBe('anonymous');
    await vi.waitFor(() =>
      expect(api.callsTo('POST /auth/logout').map((c) => c.body)).toEqual([
        { refreshToken: 'refresh-old' },
        { refreshToken: 'refresh-new' }, // the orphaned replacement is revoked
      ]),
    );
  });

  it('ignores a refresh failure that arrives after the session ended', async () => {
    const gate = deferred();
    const { session } = setup(
      {
        'GET /requests': unauthorized,
        'POST /auth/refresh': async () => {
          await gate.promise;
          return errorResponse(401, 'Token inválido');
        },
        'POST /auth/logout': () => new Response(null, { status: 204 }),
      },
      { accessToken: 'access-old', refreshToken: 'refresh-old' },
    );
    const pending = session.request('/requests').catch((e: unknown) => e);
    await tick();
    await session.logout();
    gate.resolve();
    expect(await pending).toMatchObject({ status: 401 });
    expect(session.getState().status).toBe('anonymous');
  });
});

describe('logout', () => {
  async function signedIn(extra: Routes = {}) {
    const harness = setup({
      'POST /auth/login': () => Response.json(tokenPair('1')),
      'GET /users/me': () => Response.json(clientUser),
      'POST /auth/logout': () => new Response(null, { status: 204 }),
      ...extra,
    });
    await harness.session.login(credentials);
    return harness;
  }

  it('revokes the refresh token and clears every local trace', async () => {
    const { api, session, tokenStore } = await signedIn();
    await session.logout();
    expect(api.callsTo('POST /auth/logout')[0]?.body).toEqual({
      refreshToken: 'refresh-1',
    });
    expect(session.getState()).toEqual({ status: 'anonymous', user: null });
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it.each([
    ['server error', () => errorResponse(500, 'Error interno')],
    ['invalid token', () => errorResponse(401, 'Token inválido')],
    [
      'network failure',
      () => {
        throw new TypeError('Failed to fetch');
      },
    ],
  ])('still clears local state on %s', async (_name, handler) => {
    const { session, tokenStore } = await signedIn({
      'POST /auth/logout': handler,
    });
    await expect(session.logout()).resolves.toBeUndefined();
    expect(session.getState().status).toBe('anonymous');
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it('skips the server call when there is no refresh token', async () => {
    const { api, session } = setup({});
    await session.logout();
    expect(api.fetchMock).not.toHaveBeenCalled();
  });
});

describe('subscriptions', () => {
  it('notifies listeners on state changes until they unsubscribe', async () => {
    const { session } = setup({
      'POST /auth/login': () => Response.json(tokenPair('1')),
      'GET /users/me': () => Response.json(clientUser),
      'POST /auth/logout': () => new Response(null, { status: 204 }),
    });
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    await session.login(credentials);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await session.logout();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when the state does not change', async () => {
    const { session } = setup({});
    const listener = vi.fn();
    session.subscribe(listener);
    await session.logout();
    expect(listener).not.toHaveBeenCalled();
  });
});

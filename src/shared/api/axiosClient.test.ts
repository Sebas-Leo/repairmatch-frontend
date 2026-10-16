import {
  AxiosError,
  CanceledError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFakeBackend,
  errorResponse,
  TEST_API_BASE,
  type Routes,
} from '../../test/fakeApi';
import { createAxiosClient, DEFAULT_REQUEST_TIMEOUT_MS } from './axiosClient';
import {
  ApiError,
  isAbortError,
  NetworkError,
  type RequestAuthorizer,
  type RequestPass,
} from './http';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setup(routes: Routes) {
  const api = createFakeBackend(routes);
  const client = createAxiosClient({
    baseURL: TEST_API_BASE,
    adapter: api.adapter,
  });
  return { api, client };
}

/** A stand-in for the session: the interceptors only ever talk to this port. */
function fakeAuthorizer({
  token = 'access-1',
  replayWith = 'access-2',
}: { token?: string | null; replayWith?: string | null } = {}) {
  const begin = vi.fn<RequestAuthorizer['begin']>((): RequestPass => ({
    epoch: 7,
    accessToken: token,
  }));
  const recover = vi.fn<RequestAuthorizer['recover']>(async () => replayWith);
  return { begin, recover };
}

const authorization = (call: { headers: Headers }) =>
  call.headers.get('Authorization');
const unauthorized = () => errorResponse(401, 'Autenticación requerida');
const hang = () => new Promise<Response>(() => undefined);

/** Routes that accept only the bearer token `valid`. */
const guarded = (valid: string): Routes => ({
  'GET /requests': (call) =>
    authorization(call) === `Bearer ${valid}`
      ? Response.json([{ id: 1 }])
      : unauthorized(),
});

describe('central axios instance', () => {
  it('defines base URL, default headers, timeout and credentials in one place', async () => {
    const { api, client } = setup({ 'POST /things': () => Response.json({}) });
    await client.request('/things', { method: 'POST', body: { a: 1 } });

    const { config, headers } = api.calls[0]!;
    expect(config).toMatchObject({
      baseURL: TEST_API_BASE,
      timeout: DEFAULT_REQUEST_TIMEOUT_MS,
      withCredentials: false,
      allowAbsoluteUrls: false,
      responseType: 'text',
    });
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('normalizes the base URL and rejects an unsafe one', () => {
    expect(
      createAxiosClient({ baseURL: 'https://api.example.com/v1///' }).instance
        .defaults.baseURL,
    ).toBe('https://api.example.com/v1');
    expect(() => createAxiosClient({ baseURL: '/relative' })).toThrow(
      'VITE_API_BASE_URL',
    );
  });

  it('honours a client-wide timeout and a per-call one', async () => {
    const api = createFakeBackend({ 'GET /a': () => Response.json({}) });
    const client = createAxiosClient({
      baseURL: TEST_API_BASE,
      adapter: api.adapter,
      timeoutMs: 1234,
    });
    await client.request('/a');
    await client.request('/a', { timeoutMs: 99 });
    expect(api.calls.map((call) => call.config.timeout)).toEqual([1234, 99]);
  });

  it('talks to the network through the fetch adapter unless one is injected', () => {
    expect(
      createAxiosClient({ baseURL: TEST_API_BASE }).instance.defaults.adapter,
    ).toBe('fetch');
  });

  it.each(['GET', 'DELETE'] as const)(
    'sends no Content-Type on a body-less %s',
    async (method) => {
      const { api, client } = setup({
        [`${method} /things/1`]: () => Response.json({}),
      });
      await client.request('/things/1', { method });
      expect(api.calls[0]?.headers.has('Content-Type')).toBe(false);
    },
  );

  it.each(['POST', 'PUT', 'PATCH'] as const)(
    'keeps the JSON Content-Type on a body-less %s',
    async (method) => {
      const { api, client } = setup({
        [`${method} /things/1`]: () => Response.json({}),
      });
      await client.request('/things/1', { method });
      expect(api.calls[0]?.headers.get('Content-Type')).toBe(
        'application/json',
      );
    },
  );
});

describe('request interceptor', () => {
  it('attaches the session bearer token and remembers who sent the request', async () => {
    const { api, client } = setup(guarded('access-1'));
    client.authenticate(fakeAuthorizer());
    await client.request('/requests');
    expect(authorization(api.calls[0]!)).toBe('Bearer access-1');
    expect(api.calls[0]?.config.sessionPass).toEqual({
      epoch: 7,
      accessToken: 'access-1',
    });
  });

  it('sends no Authorization header when the session holds no token', async () => {
    const { api, client } = setup({ 'GET /a': () => Response.json({}) });
    client.authenticate(fakeAuthorizer({ token: null }));
    await client.request('/a');
    expect(api.calls[0]?.headers.has('Authorization')).toBe(false);
  });

  it('asks the session synchronously, as the request leaves', async () => {
    const { client } = setup({ 'GET /a': () => Response.json({}) });
    const auth = fakeAuthorizer();
    client.authenticate(auth);
    const pending = client.request('/a');
    expect(auth.begin).toHaveBeenCalledTimes(1); // before any await
    await pending;
  });

  it.each([
    ['/auth/login', 'POST /auth/login'],
    ['/auth/refresh', 'POST /auth/refresh'],
    ['/auth/logout', 'POST /auth/logout'],
    ['/auth/register?next=1', 'POST /auth/register'],
  ])(
    'never attaches a token to, or consults the session for, %s',
    async (path, route) => {
      const { api, client } = setup({ [route]: unauthorized });
      const auth = fakeAuthorizer();
      client.authenticate(auth);
      await expect(
        client.request(path, { method: 'POST', body: {} }),
      ).rejects.toMatchObject({ status: 401 });
      expect(api.calls[0]?.headers.has('Authorization')).toBe(false);
      expect(auth.begin).not.toHaveBeenCalled();
      expect(auth.recover).not.toHaveBeenCalled(); // and no loop on a 401
      expect(api.calls).toHaveLength(1);
    },
  );

  it('leaves a request that brings its own token alone, even on a 401', async () => {
    const { api, client } = setup({ 'GET /users/me': unauthorized });
    const auth = fakeAuthorizer();
    client.authenticate(auth);
    await expect(
      client.request('/users/me', { token: 'explicit' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(authorization(api.calls[0]!)).toBe('Bearer explicit');
    expect(auth.begin).not.toHaveBeenCalled();
    expect(auth.recover).not.toHaveBeenCalled();
  });

  it('adds nothing before a session is connected', async () => {
    const { api, client } = setup({ 'GET /a': unauthorized });
    await expect(client.request('/a')).rejects.toMatchObject({ status: 401 });
    expect(api.calls[0]?.headers.has('Authorization')).toBe(false);
    expect(api.calls[0]?.config.sessionPass).toBeUndefined();
  });
});

describe('response interceptor', () => {
  it('replays a 401 once, with the token the session hands back', async () => {
    const { api, client } = setup(guarded('access-2'));
    const auth = fakeAuthorizer();
    client.authenticate(auth);

    expect(await client.request('/requests')).toEqual([{ id: 1 }]);

    expect(api.calls.map(authorization)).toEqual([
      'Bearer access-1',
      'Bearer access-2',
    ]);
    expect(auth.begin).toHaveBeenCalledTimes(1); // the replay is not a new request
    expect(auth.recover).toHaveBeenCalledTimes(1);
    expect(auth.recover).toHaveBeenCalledWith({
      epoch: 7,
      accessToken: 'access-1',
    });
    expect(api.calls[1]?.config.replayed).toBe(true);
  });

  it('surfaces the original 401 when the session declines to recover', async () => {
    const { api, client } = setup({ 'GET /requests': unauthorized });
    const auth = fakeAuthorizer({ replayWith: null });
    client.authenticate(auth);
    const error = await client.request('/requests').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      message: 'Autenticación requerida',
    });
    expect(api.calls).toHaveLength(1);
  });

  it('replays at most once: a second 401 is surfaced without another recovery', async () => {
    const { api, client } = setup({ 'GET /requests': unauthorized });
    const auth = fakeAuthorizer();
    client.authenticate(auth);
    await expect(client.request('/requests')).rejects.toMatchObject({
      status: 401,
    });
    expect(api.calls).toHaveLength(2);
    expect(auth.recover).toHaveBeenCalledTimes(1);
  });

  it.each([400, 403, 404, 409, 500])(
    'does not try to recover from a %i',
    async (status) => {
      const { api, client } = setup({
        'GET /requests': () => errorResponse(status, 'Nope'),
      });
      const auth = fakeAuthorizer();
      client.authenticate(auth);
      await expect(client.request('/requests')).rejects.toMatchObject({
        status,
      });
      expect(auth.recover).not.toHaveBeenCalled();
      expect(api.calls).toHaveLength(1);
    },
  );

  it('does not try to recover from network failures or timeouts', async () => {
    vi.useFakeTimers();
    const { client } = setup({
      'GET /offline': () => {
        throw new TypeError('Failed to fetch');
      },
      'GET /slow': hang,
    });
    const auth = fakeAuthorizer();
    client.authenticate(auth);
    const offline = client.request('/offline').catch((e: unknown) => e);
    const slow = client.request('/slow').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS);
    expect(await offline).toBeInstanceOf(NetworkError);
    expect(await slow).toMatchObject({ name: 'TimeoutError' });
    expect(auth.recover).not.toHaveBeenCalled();
  });

  it('resends the same JSON body on the replay', async () => {
    const { api, client } = setup({
      'POST /requests': (call) =>
        authorization(call) === 'Bearer access-2'
          ? Response.json({ created: true })
          : unauthorized(),
    });
    client.authenticate(fakeAuthorizer());
    const body = { title: 'Fridge', tags: ['a', 'b'], note: 'ñandú' };

    await client.request('/requests', { method: 'POST', body });

    expect(api.calls).toHaveLength(2);
    expect(api.calls.map((call) => call.body)).toEqual([body, body]);
    expect(api.calls[1]?.config.data).toBe(api.calls[0]?.config.data);
  });

  it('keeps the caller signal and timeout on the replay', async () => {
    const { api, client } = setup(guarded('access-2'));
    client.authenticate(fakeAuthorizer());
    const signal = new AbortController().signal;
    await client.request('/requests', { signal, timeoutMs: 321 });
    expect(api.calls.map((call) => call.config.signal)).toEqual([
      signal,
      signal,
    ]);
    expect(api.calls.map((call) => call.config.timeout)).toEqual([321, 321]);
  });

  it('lets a cancellation during recovery win: the replay is never sent', async () => {
    const { api, client } = setup({ 'GET /requests': unauthorized });
    let release!: (token: string) => void;
    const auth = fakeAuthorizer();
    auth.recover.mockImplementation(
      () =>
        new Promise<string>((done) => {
          release = done;
        }),
    );
    client.authenticate(auth);
    const controller = new AbortController();
    const pending = client
      .request('/requests', { signal: controller.signal })
      .catch((e: unknown) => e);
    await vi.waitFor(() => expect(auth.recover).toHaveBeenCalledTimes(1));

    controller.abort();
    release('access-2');

    const error = await pending;
    expect(isAbortError(error)).toBe(true);
    expect(error).toBe(controller.signal.reason);
    expect(api.calls).toHaveLength(1); // only the original attempt went out
  });

  it('passes errors that are not transport failures straight through', async () => {
    const boom = new RangeError('boom');
    const client = createAxiosClient({
      baseURL: TEST_API_BASE,
      adapter: () => Promise.reject(boom),
    });
    await expect(client.request('/anything')).rejects.toBe(boom);
  });
});

describe('failure normalization', () => {
  function failing(error: (config: InternalAxiosRequestConfig) => unknown) {
    return createAxiosClient({
      baseURL: TEST_API_BASE,
      adapter: (config) => Promise.reject(error(config)),
    });
  }

  it('maps an axios failure without a response to a NetworkError carrying its code', async () => {
    const client = failing(
      (config) => new AxiosError('x', AxiosError.ERR_BAD_OPTION, config),
    );
    const error = await client.request('/a').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toMatchObject({
      message: 'Network request failed (ERR_BAD_OPTION)',
    });
    expect((error as NetworkError).cause).toBeUndefined();
  });

  it('names an axios failure that has no code', async () => {
    const client = failing((config) => new AxiosError('x', undefined, config));
    await expect(client.request('/a')).rejects.toMatchObject({
      message: 'Network request failed (unknown)',
    });
  });

  it('turns a cancellation without a signal reason into an AbortError', async () => {
    const client = failing((config) => new CanceledError(undefined, config));
    const error = await client.request('/a').catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
    expect(error).toBeInstanceOf(DOMException);
  });
});

describe('production wire format (real axios fetch adapter, stubbed fetch)', () => {
  /** The fetch adapter hands `fetch` a `Request`; this stands in for the network. */
  function stubFetch(
    handler: (request: Request) => Response | Promise<Response>,
  ) {
    const fetchMock = vi.fn((request: Request) =>
      Promise.resolve().then(() => handler(request)),
    );
    vi.stubGlobal('fetch', fetchMock);
    return {
      fetchMock,
      requests: () => fetchMock.mock.calls.map(([request]) => request),
    };
  }
  /** Like a real `fetch`: rejects with the reason as soon as the signal aborts. */
  const untilAborted = (request: Request) =>
    new Promise<Response>((_resolve, reject) => {
      if (request.signal.aborted) return reject(request.signal.reason);
      request.signal.addEventListener('abort', () =>
        reject(request.signal.reason),
      );
    });

  it('sends omit-credentials, no-redirect JSON requests to the API base', async () => {
    const { requests } = stubFetch(async (request) =>
      Response.json({ echoed: await request.json() }),
    );
    const client = createAxiosClient({ baseURL: `${TEST_API_BASE}/` });

    const result = await client.request('/requests?status=OPEN', {
      method: 'POST',
      body: { title: 'Fridge' },
    });

    expect(result).toEqual({ echoed: { title: 'Fridge' } });
    const request = requests()[0]!;
    expect(request.url).toBe(`${TEST_API_BASE}/requests?status=OPEN`);
    expect(request.method).toBe('POST');
    expect(request.credentials).toBe('omit');
    expect(request.redirect).toBe('error');
    expect(request.headers.get('Accept')).toBe('application/json');
    expect(request.headers.get('Content-Type')).toBe('application/json');
  });

  it.each(['https://evil.example/x', '//evil.example/x'])(
    'cannot be steered to another origin even if the guard in front is bypassed: %s',
    async (url) => {
      const { requests } = stubFetch(() => Response.json({}));
      const client = createAxiosClient({ baseURL: TEST_API_BASE });
      client.authenticate(fakeAuthorizer());
      await client.instance.request({ url });
      const sent = requests()[0]!;
      expect(new URL(sent.url).origin).toBe(new URL(TEST_API_BASE).origin);
    },
  );

  it('puts the session bearer token on the wire', async () => {
    const { requests } = stubFetch(() => Response.json({}));
    const client = createAxiosClient({ baseURL: TEST_API_BASE });
    client.authenticate(fakeAuthorizer());
    await client.request('/requests');
    expect(requests()[0]?.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('refreshes and replays a 401 end to end', async () => {
    const { requests } = stubFetch((request) =>
      request.headers.get('Authorization') === 'Bearer access-2'
        ? Response.json([{ id: 1 }])
        : unauthorized(),
    );
    const client = createAxiosClient({ baseURL: TEST_API_BASE });
    client.authenticate(fakeAuthorizer());
    expect(await client.request('/requests')).toEqual([{ id: 1 }]);
    expect(requests()).toHaveLength(2);
  });

  it('reports a blocked or redirected request as a NetworkError', async () => {
    stubFetch(() => {
      throw new TypeError('Failed to fetch'); // what a redirect:error rejection looks like
    });
    const client = createAxiosClient({ baseURL: TEST_API_BASE });
    await expect(client.request('/requests')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('times out through the adapter with a TimeoutError', async () => {
    vi.useFakeTimers();
    stubFetch(untilAborted);
    const client = createAxiosClient({ baseURL: TEST_API_BASE });
    const pending = client
      .request('/slow', { timeoutMs: 40 })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(40);
    expect(await pending).toMatchObject({
      name: 'TimeoutError',
      message: 'Request to /slow timed out',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels through the adapter with the signal reason', async () => {
    stubFetch(untilAborted);
    const client = createAxiosClient({ baseURL: TEST_API_BASE });
    const controller = new AbortController();
    const pending = client
      .request('/slow', { signal: controller.signal })
      .catch((e: unknown) => e);
    controller.abort();
    const error = await pending;
    expect(error).toBe(controller.signal.reason);
    expect(isAbortError(error)).toBe(true);
  });
});

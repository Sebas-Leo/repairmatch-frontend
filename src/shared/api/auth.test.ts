import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clientUser,
  createFakeBackend,
  TEST_API_BASE,
  tokenPair,
  type Routes,
} from '../../test/fakeApi';
import { AUTH_REQUEST_TIMEOUT_MS, createAuthApi } from './auth';
import { createAxiosClient } from './axiosClient';
import { ApiError } from './http';

function setup(routes: Routes, options?: { timeoutMs?: number }) {
  const api = createFakeBackend(routes);
  const client = createAxiosClient({
    baseURL: TEST_API_BASE,
    adapter: api.adapter,
  });
  return { api, authApi: createAuthApi(client.request, options) };
}

describe('auth endpoints', () => {
  it('registers with POST /auth/register', async () => {
    const { api, authApi } = setup({
      'POST /auth/register': () => Response.json(clientUser, { status: 201 }),
    });
    const body = {
      name: 'Test Client',
      email: 'client@example.test',
      password: 'Test-pass-1',
      role: 'CLIENT',
    } as const;
    expect(await authApi.register(body)).toEqual(clientUser);
    expect(api.calls[0]).toMatchObject({ method: 'POST', body });
  });

  it('logs in and refreshes with the exact request bodies', async () => {
    const { api, authApi } = setup({
      'POST /auth/login': () => Response.json(tokenPair('login')),
      'POST /auth/refresh': () => Response.json(tokenPair('refresh')),
    });
    await authApi.login({ email: 'a@example.test', password: 'x' });
    await authApi.refresh({ refreshToken: 'refresh-old' });
    expect(api.calls.map((c) => [c.method, c.path, c.body])).toEqual([
      ['POST', '/auth/login', { email: 'a@example.test', password: 'x' }],
      ['POST', '/auth/refresh', { refreshToken: 'refresh-old' }],
    ]);
  });

  it('logs out with the refresh token and accepts 204', async () => {
    const { api, authApi } = setup({
      'POST /auth/logout': () => new Response(null, { status: 204 }),
    });
    await expect(
      authApi.logout({ refreshToken: 'refresh-old' }),
    ).resolves.toBeUndefined();
    expect(api.calls[0]?.body).toEqual({ refreshToken: 'refresh-old' });
  });

  it('reads the current user with the explicit access token', async () => {
    const { api, authApi } = setup({
      'GET /users/me': () => Response.json(clientUser),
    });
    expect(await authApi.me('access-1')).toEqual(clientUser);
    expect(api.calls[0]?.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('rejects an empty body where one is required', async () => {
    const { authApi } = setup({
      'POST /auth/login': () => new Response(null),
    });
    await expect(
      authApi.login({ email: 'a@example.test', password: 'x' }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('auth call timeouts', () => {
  afterEach(() => vi.useRealTimers());

  const hang = () => new Promise<Response>(() => undefined);
  type AuthApiUnderTest = ReturnType<typeof setup>['authApi'];
  const calls: Array<
    [string, string, (authApi: AuthApiUnderTest) => Promise<unknown>]
  > = [
    [
      'register',
      'POST /auth/register',
      (authApi) =>
        authApi.register({
          name: 'n',
          email: 'a@example.test',
          password: 'Test-pass-1',
          role: 'CLIENT',
        }),
    ],
    [
      'login',
      'POST /auth/login',
      (authApi) => authApi.login({ email: 'a@example.test', password: 'x' }),
    ],
    [
      'refresh',
      'POST /auth/refresh',
      (authApi) => authApi.refresh({ refreshToken: 'r' }),
    ],
    [
      'logout',
      'POST /auth/logout',
      (authApi) => authApi.logout({ refreshToken: 'r' }),
    ],
    ['me', 'GET /users/me', (authApi) => authApi.me('access-1')],
  ];

  it.each(calls)(
    'aborts a stalled %s after 10 seconds with a TimeoutError',
    async (_name, route, call) => {
      vi.useFakeTimers();
      const { authApi } = setup({ [route]: hang });
      let settled = false;
      const outcome = call(authApi)
        .catch((error: unknown) => error)
        .finally(() => {
          settled = true;
        });

      await vi.advanceTimersByTimeAsync(AUTH_REQUEST_TIMEOUT_MS - 1);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);

      expect(await outcome).toMatchObject({ name: 'TimeoutError' });
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('hands the timeout to the transport and leaves no timer behind when the call completes', async () => {
    vi.useFakeTimers();
    const { api, authApi } = setup({
      'POST /auth/login': () => Response.json(tokenPair('login')),
    });
    await authApi.login({ email: 'a@example.test', password: 'x' });
    expect(api.calls[0]?.config.timeout).toBe(AUTH_REQUEST_TIMEOUT_MS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('honours a custom timeout', async () => {
    vi.useFakeTimers();
    const { authApi } = setup({ 'POST /auth/login': hang }, { timeoutMs: 50 });
    const outcome = authApi
      .login({ email: 'a@example.test', password: 'x' })
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(50);
    expect(await outcome).toMatchObject({ name: 'TimeoutError' });
  });
});

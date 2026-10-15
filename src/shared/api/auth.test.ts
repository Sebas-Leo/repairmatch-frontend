import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clientUser,
  installFakeApi,
  TEST_API_BASE,
  tokenPair,
} from '../../test/fakeApi';
import { createAuthApi } from './auth';
import { ApiError, createHttpClient } from './http';

const authApi = createAuthApi(createHttpClient(TEST_API_BASE));
afterEach(() => vi.unstubAllGlobals());

describe('auth endpoints', () => {
  it('registers with POST /auth/register', async () => {
    const api = installFakeApi({
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
    const api = installFakeApi({
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
    const api = installFakeApi({
      'POST /auth/logout': () => new Response(null, { status: 204 }),
    });
    await expect(
      authApi.logout({ refreshToken: 'refresh-old' }),
    ).resolves.toBeUndefined();
    expect(api.calls[0]?.body).toEqual({ refreshToken: 'refresh-old' });
  });

  it('reads the current user with the explicit access token', async () => {
    const api = installFakeApi({
      'GET /users/me': () => Response.json(clientUser),
    });
    expect(await authApi.me('access-1')).toEqual(clientUser);
    expect(api.calls[0]?.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('rejects an empty body where one is required', async () => {
    installFakeApi({ 'POST /auth/login': () => new Response(null) });
    await expect(
      authApi.login({ email: 'a@example.test', password: 'x' }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

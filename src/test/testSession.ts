import { createHttpClient } from '../shared/api/http';
import type { UserResponse } from '../shared/api/types';
import { createSession } from '../shared/auth/session';
import {
  createMemoryTokenStore,
  type StoredTokens,
  type TokenStore,
} from '../shared/auth/tokenStore';
import {
  installFakeApi,
  TEST_API_BASE,
  tokenPair,
  type Routes,
} from './fakeApi';

/** Routes of a backend where `user` can sign in, refresh and sign out. */
export function authRoutes(user: UserResponse, extra: Routes = {}): Routes {
  return {
    'POST /auth/login': () => Response.json(tokenPair('login')),
    'POST /auth/refresh': () => Response.json(tokenPair('refreshed')),
    'GET /users/me': () => Response.json(user),
    'POST /auth/logout': () => new Response(null, { status: 204 }),
    ...extra,
  };
}

/** A session wired to an in-memory backend; the token store defaults to a memory one. */
export function createTestSession(
  routes: Routes,
  initial: Partial<StoredTokens> = {},
  tokenStore: TokenStore = createMemoryTokenStore(initial),
) {
  const api = installFakeApi(routes);
  const session = createSession({
    http: createHttpClient(TEST_API_BASE),
    tokenStore,
  });
  return { api, session, tokenStore };
}

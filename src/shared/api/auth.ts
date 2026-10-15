import { requireBody, type HttpRequest } from './http';
import type {
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  TokenPair,
  UserResponse,
} from './types';

/**
 * Raw auth endpoints. They never attach a stored token and never trigger a
 * refresh; session handling lives in `shared/auth/session.ts`, which is the
 * only intended caller.
 */
export interface AuthApi {
  /** POST /auth/register (201). Returns the user only: it does NOT sign in. */
  register(body: RegisterRequest): Promise<UserResponse>;
  /** POST /auth/login. */
  login(body: LoginRequest): Promise<TokenPair>;
  /** POST /auth/refresh. The sent token is revoked; a new pair is returned. */
  refresh(body: RefreshRequest): Promise<TokenPair>;
  /** POST /auth/logout (204). Revokes the refresh token. */
  logout(body: RefreshRequest): Promise<void>;
  /** GET /users/me with an explicit access token. */
  me(accessToken: string): Promise<UserResponse>;
}

export function createAuthApi(request: HttpRequest): AuthApi {
  return {
    async register(body) {
      return requireBody(
        await request<UserResponse>('/auth/register', { method: 'POST', body }),
      );
    },
    async login(body) {
      return requireBody(
        await request<TokenPair>('/auth/login', { method: 'POST', body }),
      );
    },
    async refresh(body) {
      return requireBody(
        await request<TokenPair>('/auth/refresh', { method: 'POST', body }),
      );
    },
    async logout(body) {
      await request<undefined>('/auth/logout', { method: 'POST', body });
    },
    async me(accessToken) {
      return requireBody(
        await request<UserResponse>('/users/me', { token: accessToken }),
      );
    },
  };
}

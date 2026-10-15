import { requireBody, type HttpRequest, type HttpRequestOptions } from './http';
import type {
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  TokenPair,
  UserResponse,
} from './types';

/** Auth calls must never hang: a stalled one would freeze sign-in or restore. */
export const AUTH_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Raw auth endpoints. They never attach a stored token and never trigger a
 * refresh; session handling lives in `shared/auth/session.ts`, which is the
 * only intended caller. Every call aborts after `AUTH_REQUEST_TIMEOUT_MS`.
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

export function createAuthApi(
  request: HttpRequest,
  { timeoutMs = AUTH_REQUEST_TIMEOUT_MS }: { timeoutMs?: number } = {},
): AuthApi {
  // A plain AbortController + setTimeout (not AbortSignal.timeout) so it also
  // works under fake timers and in every test environment.
  async function call<T>(
    path: string,
    options: HttpRequestOptions,
  ): Promise<T | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(
        new DOMException(`Request to ${path} timed out`, 'TimeoutError'),
      );
    }, timeoutMs);
    try {
      return await request<T>(path, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async register(body) {
      return requireBody(
        await call<UserResponse>('/auth/register', { method: 'POST', body }),
      );
    },
    async login(body) {
      return requireBody(
        await call<TokenPair>('/auth/login', { method: 'POST', body }),
      );
    },
    async refresh(body) {
      return requireBody(
        await call<TokenPair>('/auth/refresh', { method: 'POST', body }),
      );
    },
    async logout(body) {
      await call<undefined>('/auth/logout', { method: 'POST', body });
    },
    async me(accessToken) {
      return requireBody(
        await call<UserResponse>('/users/me', { token: accessToken }),
      );
    },
  };
}

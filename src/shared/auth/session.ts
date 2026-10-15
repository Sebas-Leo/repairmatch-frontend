import { createAuthApi } from '../api/auth';
import {
  ApiError,
  requireBody,
  type HttpRequest,
  type HttpRequestOptions,
} from '../api/http';
import type {
  LoginRequest,
  RegisterRequest,
  TokenPair,
  UserResponse,
} from '../api/types';
import type { TokenStore } from './tokenStore';

export type AuthUser = UserResponse;

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export type SessionState =
  | { readonly status: 'loading'; readonly user: null }
  | { readonly status: 'anonymous'; readonly user: null }
  | { readonly status: 'authenticated'; readonly user: AuthUser };

/** Per-request options. The session owns the token, so callers cannot pass one. */
export type ApiRequestOptions = Omit<HttpRequestOptions, 'token'>;

/** Registration succeeded but the automatic sign-in that follows it did not. */
export class RegistrationSignInError extends Error {
  constructor(cause: unknown) {
    super('Your account was created, but signing in failed', { cause });
    this.name = 'RegistrationSignInError';
  }
}

export interface Session {
  getState(): SessionState;
  /** For `useSyncExternalStore`. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Restores the session from a persisted refresh token. Idempotent; never rejects. */
  restore(): Promise<void>;
  login(credentials: LoginRequest): Promise<AuthUser>;
  /** The backend returns no tokens on register, so this registers and then signs in. */
  register(input: RegisterRequest): Promise<AuthUser>;
  /** Always ends the local session, even if the server call fails. */
  logout(): Promise<void>;
  /**
   * Starts following sign-outs and sign-ins made in other tabs (through the
   * token store). Returns a stop function. A no-op for stores that cannot tell.
   */
  watchExternalChanges(): () => void;
  /** Authenticated JSON request that expects a response body. */
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  /** Authenticated request whose response body is ignored (204 and similar). */
  send(path: string, options?: ApiRequestOptions): Promise<void>;
}

export interface SessionDependencies {
  http: HttpRequest;
  tokenStore: TokenStore;
}

type RefreshOutcome =
  /** New tokens are stored. */
  | 'refreshed'
  /** The refresh token is invalid, expired, revoked or missing: the session is over. */
  | 'rejected'
  /** Network failure, 5xx or similar: unknown whether the token is still valid. */
  | 'unavailable';

const LOADING: SessionState = Object.freeze({ status: 'loading', user: null });
const ANONYMOUS: SessionState = Object.freeze({
  status: 'anonymous',
  user: null,
});

/** The backend answers 401 for a bad refresh token and 400 for a malformed one. */
function isRejection(error: unknown): boolean {
  return error instanceof ApiError && [400, 401, 403].includes(error.status);
}

function withToken(
  options: ApiRequestOptions,
  token: string | null,
): HttpRequestOptions {
  return token ? { ...options, token } : options;
}

/**
 * Framework-agnostic session: token lifecycle, restore on start, single-flight
 * refresh and an authenticated request wrapper. React only subscribes to it.
 */
export function createSession({
  http,
  tokenStore,
}: SessionDependencies): Session {
  const authApi = createAuthApi(http);
  const listeners = new Set<() => void>();
  let state: SessionState = tokenStore.getRefreshToken() ? LOADING : ANONYMOUS;
  // Bumped whenever the session is replaced or ended, so stale async results
  // (for example a refresh that finishes after logout) are discarded.
  let epoch = 0;
  let refreshInFlight: Promise<RefreshOutcome> | null = null;
  let restoreInFlight: Promise<void> | null = null;

  function setState(next: SessionState) {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener();
  }

  /** Ends the session: forgets every token (also the persisted one). */
  function endSession() {
    epoch += 1;
    tokenStore.clear();
    setState(ANONYMOUS);
  }

  /** Signs out of this page only: keeps the persisted refresh token for a later retry. */
  function suspendSession() {
    epoch += 1;
    tokenStore.clearAccessToken();
    setState(ANONYMOUS);
  }

  /** Best effort: an orphaned refresh token would otherwise live until it expires. */
  function revokeQuietly(refreshToken: string) {
    void authApi.logout({ refreshToken }).catch(() => undefined);
  }

  async function exchange(
    refreshToken: string,
    startedAt: number,
  ): Promise<TokenPair> {
    try {
      return await authApi.refresh({ refreshToken });
    } catch (error) {
      const latest = tokenStore.getRefreshToken();
      // Refresh tokens are single-use and shared between tabs through storage:
      // if another tab rotated it first, retry ONCE with the newer token, but
      // only while this session is still the one that asked: after a logout or
      // a new sign-in here, the newer token may belong to another account.
      if (
        epoch === startedAt &&
        isRejection(error) &&
        latest &&
        latest !== refreshToken
      ) {
        return authApi.refresh({ refreshToken: latest });
      }
      throw error;
    }
  }

  async function performRefresh(): Promise<RefreshOutcome> {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) {
      // Removed since start-up (for example by a logout in another tab).
      endSession();
      return 'rejected';
    }
    const startedAt = epoch;
    let tokens: TokenPair;
    try {
      tokens = await exchange(refreshToken, startedAt);
    } catch (error) {
      // The session changed meanwhile (logout or new login): nothing to undo.
      if (epoch !== startedAt) return 'rejected';
      if (isRejection(error)) {
        endSession();
        return 'rejected';
      }
      return 'unavailable';
    }
    if (epoch !== startedAt) {
      // Ended while refreshing: do not resurrect it, and revoke the new token.
      revokeQuietly(tokens.refreshToken);
      return 'rejected';
    }
    tokenStore.setTokens(tokens);
    return 'refreshed';
  }

  /** Single-flight: concurrent callers share one refresh (tokens are single-use). */
  function refresh(): Promise<RefreshOutcome> {
    refreshInFlight ??= performRefresh()
      // Never reject, and always clear the slot: a failure here must not wedge
      // later refreshes behind a dead promise.
      .catch((): RefreshOutcome => 'unavailable')
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  }

  async function execute<T>(
    path: string,
    options: ApiRequestOptions,
  ): Promise<T | undefined> {
    // Auth endpoints carry no bearer token and must never trigger a refresh,
    // otherwise a 401 on login/refresh would loop.
    if (path.startsWith('/auth/')) return http<T>(path, options);

    const used = tokenStore.getAccessToken();
    const startedAt = epoch;
    try {
      return await http<T>(path, withToken(options, used));
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      // The session was ended or replaced while the request was in flight
      // (logout, another sign-in): never replay it under a different identity.
      if (epoch !== startedAt) throw error;
      // A 401 means the server rejected the credentials before running the
      // handler, so replaying the request once is safe.
      if (tokenStore.getAccessToken() === used) {
        if (!tokenStore.getRefreshToken()) {
          // The persisted token is gone (another tab signed out): this session
          // is over here too, so guards send the user to /login.
          if (used !== null) endSession();
          throw error;
        }
        if ((await refresh()) !== 'refreshed' || epoch !== startedAt)
          throw error;
      } // else: another request already refreshed; just retry with its token.
      return http<T>(path, withToken(options, tokenStore.getAccessToken()));
    }
  }

  async function establish(tokens: TokenPair): Promise<AuthUser> {
    epoch += 1; // Invalidates refreshes started by a previous session.
    tokenStore.setTokens(tokens);
    try {
      const user = await authApi.me(tokens.accessToken);
      setState({ status: 'authenticated', user });
      return user;
    } catch (error) {
      endSession();
      revokeQuietly(tokens.refreshToken);
      throw error;
    }
  }

  async function login(credentials: LoginRequest): Promise<AuthUser> {
    return establish(await authApi.login(credentials));
  }

  /** Another tab signed out or signed in: this tab's identity can no longer be trusted. */
  function handleExternalChange() {
    if (state.status === 'anonymous') return;
    // Nothing persisted any more -> signed out elsewhere. Otherwise the
    // persisted tokens now belong to another sign-in (or a rotation): keep
    // them, since they are not ours to delete, and only drop this page's state.
    if (tokenStore.getRefreshToken()) suspendSession();
    else endSession();
  }

  async function doRestore(): Promise<void> {
    if (state.status !== 'loading') return;
    const startedAt = epoch;
    const outcome = await refresh();
    // Ended or replaced meanwhile (rejected refresh, logout, new sign-in,
    // another tab): whoever did it already set the state, so do not touch it.
    if (epoch !== startedAt) return;
    if (outcome !== 'refreshed') return suspendSession();
    const accessToken = tokenStore.getAccessToken();
    if (!accessToken) return suspendSession();
    try {
      const user = await authApi.me(accessToken);
      if (epoch === startedAt) setState({ status: 'authenticated', user });
    } catch (error) {
      if (epoch !== startedAt) return;
      if (isRejection(error)) endSession();
      else suspendSession();
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restore() {
      restoreInFlight ??= doRestore();
      return restoreInFlight;
    },
    login,
    watchExternalChanges: () =>
      tokenStore.subscribe?.(handleExternalChange) ?? (() => undefined),
    async register(input) {
      await authApi.register(input);
      try {
        return await login({ email: input.email, password: input.password });
      } catch (error) {
        throw new RegistrationSignInError(error);
      }
    },
    async logout() {
      const refreshToken = tokenStore.getRefreshToken();
      // Clear first: the user is signed out immediately even if the server hangs.
      endSession();
      if (!refreshToken) return;
      try {
        await authApi.logout({ refreshToken });
      } catch {
        // Best effort: the token expires on its own.
      }
    },
    async request<T>(path: string, options: ApiRequestOptions = {}) {
      return requireBody(await execute<T>(path, options));
    },
    async send(path, options = {}) {
      await execute<unknown>(path, options);
    },
  };
}

/**
 * Where the session keeps its tokens.
 *
 * Default strategy (`createBrowserTokenStore`):
 * - The short-lived ACCESS token lives only in memory (a module variable). It
 *   is never written to any storage, so a page reload drops it and the session
 *   is restored through the refresh token.
 * - The REFRESH token is persisted in `localStorage` so a reload or a new tab
 *   keeps the user signed in.
 *
 * XSS trade-off: any script that runs on this origin (an XSS bug or a
 * compromised dependency) can read `localStorage`, so it could steal the
 * refresh token and keep a session alive for its whole lifetime (7 days). An
 * HttpOnly cookie would hide the token from scripts, but the backend uses the
 * Bearer header with CORS credentials disabled, so that option does not exist
 * yet. Mitigations in place: refresh tokens are single-use and rotate on every
 * refresh, logout revokes them server-side, the access token is memory-only,
 * and the app renders no unsafe HTML.
 *
 * Swapping the strategy (sessionStorage, memory only, cookies later) is a
 * one-file change: implement `TokenStore` and pass it to `createSession` in
 * `appSession.ts`. Nothing else in the app touches token storage.
 */

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  /** Replaces both tokens (refresh tokens are single-use, so always as a pair). */
  setTokens(tokens: StoredTokens): void;
  /** Forgets only the in-memory access token; the persisted refresh token stays. */
  clearAccessToken(): void;
  /** Forgets everything, including the persisted refresh token. */
  clear(): void;
}

export const REFRESH_TOKEN_STORAGE_KEY = 'repairmatch.auth.refreshToken';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    // Merely reading `localStorage` throws in some browsers when storage is blocked.
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Access token in memory, refresh token in `localStorage`.
 *
 * The app keeps working when storage is unavailable or throws (private mode,
 * blocked site data, quota): the refresh token is then only held in memory, so
 * the session survives until the tab is closed or reloaded.
 */
export function createBrowserTokenStore(
  getStorage: () => StorageLike | null = defaultStorage,
): TokenStore {
  let accessToken: string | null = null;
  // In-memory copy, consulted only while persistent storage is unusable.
  let fallbackRefreshToken: string | null = null;
  let persistenceFailed = false;

  return {
    getAccessToken: () => accessToken,
    getRefreshToken() {
      if (persistenceFailed) return fallbackRefreshToken;
      try {
        const storage = getStorage();
        if (!storage) return fallbackRefreshToken;
        // Storage is the source of truth: another tab may have rotated or revoked it.
        return storage.getItem(REFRESH_TOKEN_STORAGE_KEY) || null;
      } catch {
        return fallbackRefreshToken;
      }
    },
    setTokens(tokens) {
      accessToken = tokens.accessToken;
      fallbackRefreshToken = tokens.refreshToken;
      let persisted = false;
      try {
        const storage = getStorage();
        if (storage) {
          storage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);
          persisted = true;
        }
      } catch {
        // Fall through: treated like unavailable storage.
      }
      persistenceFailed = !persisted;
      if (!persisted) {
        // Never leave a consumed (revoked) token behind to be replayed later.
        try {
          getStorage()?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        } catch {
          // Nothing else can be done; the in-memory copy is authoritative now.
        }
      }
    },
    clearAccessToken() {
      accessToken = null;
    },
    clear() {
      accessToken = null;
      fallbackRefreshToken = null;
      persistenceFailed = false;
      try {
        getStorage()?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore: there is nothing persisted that we could still reach.
      }
    },
  };
}

/** Volatile store: nothing is persisted. Useful for tests or a no-persistence policy. */
export function createMemoryTokenStore(
  initial: Partial<StoredTokens> = {},
): TokenStore {
  let accessToken: string | null = initial.accessToken ?? null;
  let refreshToken: string | null = initial.refreshToken ?? null;
  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    setTokens(tokens) {
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    },
    clearAccessToken() {
      accessToken = null;
    },
    clear() {
      accessToken = null;
      refreshToken = null;
    },
  };
}

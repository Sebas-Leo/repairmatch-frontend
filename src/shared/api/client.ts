import { appSession } from '../auth/appSession';
import type { ApiRequestOptions } from '../auth/session';

/**
 * Authenticated API client for feature code. It attaches the bearer token held
 * by the session, refreshes it once (single-flight) on a 401 and retries the
 * request one time. Components never see tokens.
 */
export interface ApiClient {
  /** JSON request; rejects with `ApiError` on non-2xx or an empty body. */
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  /** Request whose response body is ignored (204 and similar). */
  send(path: string, options?: ApiRequestOptions): Promise<void>;
}

/** Options every endpoint function accepts, for cancelling in-flight calls. */
export type CallOptions = Pick<ApiRequestOptions, 'signal'>;

export const api: ApiClient = {
  request: <T>(path: string, options?: ApiRequestOptions) =>
    appSession.request<T>(path, options),
  send: (path, options) => appSession.send(path, options),
};

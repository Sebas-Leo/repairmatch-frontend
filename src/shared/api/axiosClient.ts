import axios, {
  AxiosError,
  isAxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import { parseApiBaseUrl } from '../config/env';
import {
  ApiError,
  NetworkError,
  apiErrorFromResponse,
  createHttpRequest,
  type HttpTransport,
  type RequestAuthorizer,
  type RequestPass,
} from './http';

declare module 'axios' {
  // Bookkeeping of the interceptors below. Callers never set these.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface AxiosRequestConfig<D = any> {
    /** Who sent the request and under which token; present only for session-managed calls. */
    sessionPass?: RequestPass;
    /** Set once the request was replayed after a refresh: it is never replayed twice. */
    replayed?: boolean;
  }
}

/** Default for ordinary calls; auth calls use a shorter one (`AUTH_REQUEST_TIMEOUT_MS`). */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export interface AxiosClientOptions {
  /** Absolute HTTP(S) API base, for example `http://localhost:8080/api`. */
  baseURL: string;
  /** Applies to every call that does not set its own. */
  timeoutMs?: number;
  /** Replaces the transport. Tests inject a fake backend here; production uses `fetch`. */
  adapter?: AxiosRequestConfig['adapter'];
}

export interface AxiosClient extends HttpTransport {
  /** The central axios instance. Only this module and its tests use it directly. */
  readonly instance: AxiosInstance;
}

/** `/auth/*` calls carry no session token and never refresh, or a 401 there would loop. */
function isAuthEndpoint(path: string | undefined): boolean {
  return path?.startsWith('/auth/') ?? false;
}

// axios adds a form content type to these when none is set, so they keep the
// JSON default even without a body.
const METHODS_WITH_BODY = new Set(['post', 'put', 'patch']);

function hasName(value: unknown): value is { name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

function signalReason(signal: unknown): unknown {
  return typeof signal === 'object' && signal !== null && 'reason' in signal
    ? signal.reason
    : undefined;
}

/**
 * Normalises every axios failure so callers never see axios types (whose
 * `config` holds the Authorization header):
 * - HTTP error        -> `ApiError`
 * - cancelled         -> the signal's reason (`AbortError` by default)
 * - timed out         -> `TimeoutError`
 * - anything else     -> `NetworkError`
 */
function toFailure(error: AxiosError): unknown {
  if (error.code === AxiosError.ERR_CANCELED) {
    const reason = signalReason(error.config?.signal);
    return hasName(reason)
      ? reason
      : new DOMException('The request was aborted', 'AbortError');
  }
  if (error.code === AxiosError.ETIMEDOUT) {
    const path = (error.config?.url ?? '').split('?')[0];
    return new DOMException(`Request to ${path} timed out`, 'TimeoutError');
  }
  if (error.response) {
    return apiErrorFromResponse(error.response.status, error.response.data);
  }
  return new NetworkError(
    `Network request failed (${error.code ?? 'unknown'})`,
    error.cause === undefined ? undefined : { cause: error.cause },
  );
}

/**
 * The one axios instance of the app: base URL, default headers, timeout, and
 * the interceptors that centralise authentication and error handling.
 *
 * - Request interceptor: attaches the session's bearer token. Never for
 *   `/auth/*` or for a request that brings its own `Authorization`.
 * - Response interceptor: normalises failures (see `toFailure`) and, on a 401
 *   from a session-managed call, asks the session to recover (shared refresh)
 *   and replays the request once.
 *
 * The interceptors hold no auth rules of their own: the token and the refresh
 * live in the session, reached through `authenticate`.
 */
export function createAxiosClient({
  baseURL,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  adapter = 'fetch',
}: AxiosClientOptions): AxiosClient {
  let authorizer: RequestAuthorizer | null = null;

  const instance = axios.create({
    baseURL: parseApiBaseUrl(baseURL),
    timeout: timeoutMs,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    // The API authenticates with a Bearer header; its CORS has credentials off.
    withCredentials: false,
    // A request path can never replace the configured origin.
    allowAbsoluteUrls: false,
    // Raw body text: JSON is parsed once, in `createHttpRequest`.
    responseType: 'text',
    // Distinguishes a timeout (ETIMEDOUT) from a browser abort (ECONNABORTED).
    transitional: { clarifyTimeoutError: true },
    adapter,
    // fetch adapter only: a redirect would resend the request elsewhere.
    fetchOptions: { redirect: 'error' },
  });

  instance.interceptors.request.use(
    (config) => {
      const method = config.method?.toLowerCase() ?? 'get';
      if (config.data === undefined && !METHODS_WITH_BODY.has(method)) {
        config.headers.delete('Content-Type');
      }
      if (
        !authorizer ||
        config.replayed ||
        isAuthEndpoint(config.url) ||
        config.headers.has('Authorization')
      ) {
        return config;
      }
      // Runs synchronously with the send (`synchronous: true`), so the token
      // and the epoch describe exactly the request that leaves.
      const pass = authorizer.begin();
      config.sessionPass = pass;
      if (pass.accessToken) {
        config.headers.set('Authorization', `Bearer ${pass.accessToken}`);
      }
      return config;
    },
    undefined,
    { synchronous: true },
  );

  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error)) throw error; // not a transport failure: pass it on
    const failure = toFailure(error);
    const config = error.config;
    if (
      authorizer &&
      config?.sessionPass &&
      !config.replayed &&
      failure instanceof ApiError &&
      failure.status === 401
    ) {
      // A 401 means the server rejected the credentials before running the
      // handler, so replaying the request once is safe.
      const token = await authorizer.recover(config.sessionPass);
      if (token !== null) {
        config.replayed = true;
        config.headers.set('Authorization', `Bearer ${token}`);
        // `config.data` is the JSON text already built (a string, never a
        // stream), so resending it cannot hit a consumed body.
        return instance.request(config);
      }
    }
    throw failure;
  });

  return {
    instance,
    request: createHttpRequest(instance),
    authenticate(next) {
      authorizer = next;
    },
  };
}

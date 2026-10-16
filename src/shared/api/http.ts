import type { AxiosInstance, AxiosRequestConfig } from 'axios';

/** Field name -> message, as sent in the backend `errors` map. */
export type FieldErrors = Readonly<Record<string, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractFieldErrors(body: unknown): FieldErrors {
  if (!isRecord(body) || !isRecord(body.errors)) return {};
  const errors: Record<string, string> = {};
  for (const [field, message] of Object.entries(body.errors)) {
    if (typeof message === 'string') errors[field] = message;
  }
  return errors;
}

function extractMessage(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  // `detail` duplicates `message` for compatibility with older backend builds.
  for (const candidate of [body.message, body.detail]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return undefined;
}

/**
 * The server answered with a non-2xx status (or a 2xx that is not JSON). It
 * never keeps a reference to the request, so headers such as `Authorization`
 * cannot leak through a logged error.
 */
export class ApiError extends Error {
  /** Per-field validation messages (empty unless the backend sent an `errors` map). */
  public readonly errors: FieldErrors;

  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.errors = extractFieldErrors(body);
  }
}

/**
 * No HTTP answer arrived: offline, DNS, CORS, a blocked or redirected request.
 * Whether the server saw the request is unknown, so it is not safe to assume it
 * was not processed.
 */
export class NetworkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

/**
 * True when the call was cancelled through its `AbortSignal`. That is the
 * caller's own decision, not a failure: do not show it as an error.
 * (A timeout rejects with a `TimeoutError` instead and IS a failure.)
 */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

/**
 * Parses a response body without throwing: JSON when it is JSON, the raw text
 * otherwise (`json: false`). An empty body is valid and yields `undefined`.
 */
function parseBody(text: string): { data: unknown; json: boolean } {
  if (!text.trim()) return { data: undefined, json: true };
  try {
    return { data: JSON.parse(text) as unknown, json: true };
  } catch {
    return { data: text, json: false };
  }
}

/** Builds the `ApiError` of a non-2xx response from its raw body. */
export function apiErrorFromResponse(
  status: number,
  rawBody: unknown,
): ApiError {
  const { data } = parseBody(typeof rawBody === 'string' ? rawBody : '');
  return new ApiError(
    status,
    extractMessage(data) ?? `Request failed (${status})`,
    data,
  );
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** A JSON value (never a Blob, FormData, binary data or stream); a replay resends it intact. */
  body?: unknown;
  /**
   * Cancels the call. A cancelled call rejects with an `AbortError`
   * (see `isAbortError`); nothing else is left pending.
   */
  signal?: AbortSignal;
  headers?: HeadersInit;
}

/** Options only the session's own auth calls need; feature code cannot pass them. */
export interface RawRequestOptions extends HttpRequestOptions {
  /**
   * Bearer token for this one call (`GET /users/me` while signing in). A request
   * that carries its own `Authorization` is never given the session's token and
   * never triggers a refresh.
   */
  token?: string;
  /** Aborts the call with a `TimeoutError` after this many milliseconds. */
  timeoutMs?: number;
}

/** JSON transport only. T describes the expected contract; it is not runtime validation. */
export type HttpRequest = <T>(
  path: string,
  options?: RawRequestOptions,
) => Promise<T | undefined>;

/** Where the session stands when a request leaves; see `RequestAuthorizer`. */
export interface RequestPass {
  /** Changes whenever the session is replaced or ended (logout, new sign-in). */
  readonly epoch: number;
  /** The access token the request was sent with, if any. */
  readonly accessToken: string | null;
}

/**
 * What the HTTP layer asks of the session, so the session stays the single
 * source of truth for tokens and refreshes and the transport knows no auth rules.
 */
export interface RequestAuthorizer {
  /** Called synchronously as a request is sent. */
  begin(): RequestPass;
  /**
   * Called when a request that began with `pass` got a 401. Resolves with the
   * access token to replay it with (after a shared refresh if one is needed), or
   * `null` when it must not be replayed. Never rejects.
   */
  recover(pass: RequestPass): Promise<string | null>;
}

/** The transport a session is built on. */
export interface HttpTransport {
  request: HttpRequest;
  /** Connects the session: requests carry its token and a 401 refreshes through it. */
  authenticate(authorizer: RequestAuthorizer): void;
}

// A path segment made only of dots, written plainly or percent-encoded
// (`.`, `..`, `%2e`, `%2E%2e`, `.%2e`): servers and proxies resolve these and
// could walk out of the API prefix.
const DOT_SEGMENT = /(^|\/)(\.|%2e){1,2}(\/|$)/i;
// `..%2f` and `..%5c` become traversal on servers that decode before routing.
const ENCODED_SEPARATOR = /%2f|%5c/i;

function assertApiPath(path: string) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error(
      'API path must start with one slash and stay on the configured origin',
    );
  }
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  if (DOT_SEGMENT.test(pathname) || ENCODED_SEPARATOR.test(pathname)) {
    throw new Error(
      'API path must not contain dot segments or encoded slashes',
    );
  }
}

const AUTH_PREFIX = /^\/auth\//i;

/** The path as the server will route it: dot segments resolved, escapes decoded. */
function canonicalPathname(path: string): string {
  try {
    return decodeURIComponent(
      new URL(path, 'http://placeholder.invalid').pathname,
    );
  } catch {
    return path;
  }
}

/**
 * `/auth/*` calls carry no session token and never refresh, or a 401 there
 * would loop. Tests the path as written AND as the server will route it, so
 * `/x/../auth/login` or `/%41uth/login` cannot slip through; when in doubt it
 * answers yes, which only means "no token".
 */
export function isAuthEndpoint(path: string | undefined): boolean {
  if (!path) return false;
  return AUTH_PREFIX.test(path) || AUTH_PREFIX.test(canonicalPathname(path));
}

function isBinaryOrStream(body: unknown): boolean {
  return (
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof URLSearchParams !== 'undefined' &&
      body instanceof URLSearchParams) ||
    (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
}

/**
 * The one place a body becomes JSON text. A string is quoted like any other
 * value (`'123'` is sent as `"123"`), and what is not JSON is refused, so a
 * replayed request can never meet a consumed stream or a body sent with the
 * wrong content type.
 */
function serializeBody(body: unknown): string {
  if (isBinaryOrStream(body)) {
    throw new TypeError(
      'API request bodies must be JSON values, not Blob, FormData, URLSearchParams, binary data or streams',
    );
  }
  const json = JSON.stringify(body) as string | undefined;
  if (json === undefined) {
    throw new TypeError('API request body is not JSON-serialisable');
  }
  return json;
}

/**
 * Turns an axios instance (see `axiosClient.ts`) into the JSON `HttpRequest`.
 * Failures arrive already normalised by the instance's interceptors:
 * `ApiError`, `NetworkError`, an `AbortError` or a `TimeoutError`.
 */
export function createHttpRequest(client: AxiosInstance): HttpRequest {
  return async function request<T>(
    path: string,
    options: RawRequestOptions = {},
  ): Promise<T | undefined> {
    assertApiPath(path);
    const headers = new Headers(options.headers);
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    const config: AxiosRequestConfig = {
      url: path,
      method: options.method ?? 'GET',
      headers: Object.fromEntries(headers.entries()),
      ...(options.body !== undefined
        ? { data: serializeBody(options.body) }
        : {}),
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.timeoutMs !== undefined
        ? { timeout: options.timeoutMs }
        : {}),
    };
    // The instance asks for `responseType: 'text'`, so `data` is the raw body
    // and JSON is parsed here, exactly once, for successes and failures alike.
    const response = await client.request<string>(config);
    const { data, json } = parseBody(
      response.status === 204 ? '' : response.data,
    );
    if (!json) {
      throw new ApiError(response.status, 'Expected a JSON response', data);
    }
    return data as T | undefined;
  };
}

/** Narrows an expected JSON body; an empty 2xx response is a contract violation. */
export function requireBody<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new ApiError(200, 'Expected a response body', undefined);
  }
  return data;
}

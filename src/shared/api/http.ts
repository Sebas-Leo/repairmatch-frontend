import { apiBaseUrl, parseApiBaseUrl } from '../config/env';

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

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  token?: string;
  headers?: HeadersInit;
}

/** JSON transport only. T describes the expected contract; it is not runtime validation. */
export function createHttpClient(baseUrl: string) {
  const base = parseApiBaseUrl(baseUrl);
  return async function request<T>(
    path: string,
    options: HttpRequestOptions = {},
  ): Promise<T | undefined> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
      throw new Error(
        'API path must start with one slash and stay on the configured origin',
      );
    }
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    if (options.body !== undefined)
      headers.set('Content-Type', 'application/json');
    const response = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers,
      credentials: 'omit',
      redirect: 'error',
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    const text = response.status === 204 ? '' : await response.text();
    let data: unknown;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
        if (response.ok)
          throw new ApiError(response.status, 'Expected a JSON response', data);
      }
    }
    if (!response.ok) {
      throw new ApiError(
        response.status,
        extractMessage(data) ?? `Request failed (${response.status})`,
        data,
      );
    }
    return data as T | undefined;
  };
}

/** Raw transport (no session handling). Feature code should use `api` from `./client`. */
export type HttpRequest = ReturnType<typeof createHttpClient>;

/** Narrows an expected JSON body; an empty 2xx response is a contract violation. */
export function requireBody<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new ApiError(200, 'Expected a response body', undefined);
  }
  return data;
}

export const apiRequest: HttpRequest = createHttpClient(apiBaseUrl);

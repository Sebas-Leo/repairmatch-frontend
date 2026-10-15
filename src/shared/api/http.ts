import { apiBaseUrl, parseApiBaseUrl } from '../config/env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  token?: string;
  headers?: HeadersInit;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** JSON transport only. T describes the expected contract; it is not runtime validation. */
export function createHttpClient(baseUrl: string) {
  const base = parseApiBaseUrl(baseUrl);
  return async function request<T>(
    path: string,
    options: RequestOptions = {},
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
      const message =
        isRecord(data) && typeof data.message === 'string'
          ? data.message
          : `Request failed (${response.status})`;
      throw new ApiError(response.status, message, data);
    }
    return data as T | undefined;
  };
}

export const apiRequest = createHttpClient(apiBaseUrl);

import {
  AxiosError,
  CanceledError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { vi } from 'vitest';
import type { TokenPair, UserResponse } from '../shared/api/types';

/** Base URL used by every test client. It never receives a real request. */
export const TEST_API_BASE = 'http://localhost:8080/api';

export interface RecordedCall {
  method: string;
  /** Path relative to the API base, e.g. `/auth/login`. */
  path: string;
  query: URLSearchParams;
  headers: Headers;
  body: unknown;
  /** The axios config the adapter received (timeout, signal, ...). */
  config: InternalAxiosRequestConfig;
}

export type RouteHandler = (call: RecordedCall) => Response | Promise<Response>;

/**
 * Keys look like `POST /auth/login`. Unknown routes answer 404. A handler that
 * throws stands for a dead network (offline, DNS, CORS).
 */
export type Routes = Record<string, RouteHandler>;

export function errorResponse(
  status: number,
  message: string,
  errors: Record<string, string> = {},
): Response {
  return Response.json(
    {
      timestamp: '2026-10-14T22:02:19.123Z',
      status,
      error: 'Error',
      message,
      path: '/api/test',
      errors,
      detail: message,
    },
    { status },
  );
}

export function tokenPair(label: string): TokenPair {
  return {
    accessToken: `access-${label}`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    refreshToken: `refresh-${label}`,
    refreshExpiresIn: 604800,
  };
}

export const clientUser: UserResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Test Client',
  email: 'client@example.test',
  role: 'CLIENT',
};

export const technicianUser: UserResponse = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Test Technician',
  email: 'technician@example.test',
  role: 'TECHNICIAN',
};

function toHeaders(config: InternalAxiosRequestConfig): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(config.headers.toJSON(true))) {
    headers.set(name, value);
  }
  return headers;
}

/** What the real adapters do after the answer arrives: non-2xx rejects. */
function settle(
  config: InternalAxiosRequestConfig,
  response: AxiosResponse<string>,
): AxiosResponse<string> {
  if (!config.validateStatus || config.validateStatus(response.status)) {
    return response;
  }
  throw new AxiosError(
    `Request failed with status code ${response.status}`,
    response.status < 500
      ? AxiosError.ERR_BAD_REQUEST
      : AxiosError.ERR_BAD_RESPONSE,
    config,
    response.request,
    response,
  );
}

/**
 * An in-memory backend behind an axios adapter, so tests exercise the real
 * instance, interceptors and session without any network. Like a real adapter
 * it honours the config's `signal` (rejecting with a `CanceledError`) and
 * `timeout` (rejecting with `ETIMEDOUT`), and returns the raw body text.
 */
export function createFakeBackend(routes: Routes) {
  const calls: RecordedCall[] = [];
  const base = new URL(TEST_API_BASE);

  const adapter = vi.fn<AxiosAdapter>(async (config) => {
    const url = new URL(`${config.baseURL ?? ''}${config.url ?? ''}`);
    const call: RecordedCall = {
      method: (config.method ?? 'get').toUpperCase(),
      path: url.pathname.slice(base.pathname.length),
      query: url.searchParams,
      headers: toHeaders(config),
      body:
        typeof config.data === 'string' ? JSON.parse(config.data) : undefined,
      config,
    };
    calls.push(call);

    const respond = async (): Promise<AxiosResponse<string>> => {
      const handler = routes[`${call.method} ${call.path}`];
      let response: Response;
      try {
        response = handler
          ? await handler(call)
          : errorResponse(404, 'Ruta no encontrada');
      } catch (cause) {
        throw AxiosError.from(
          cause instanceof Error ? cause : new Error(String(cause)),
          AxiosError.ERR_NETWORK,
          config,
        );
      }
      const text = response.status === 204 ? '' : await response.text();
      return settle(config, {
        data: text,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        config,
        request: {},
      });
    };

    const { timeout } = config;
    // axios types the signal loosely (listeners are optional); it is an AbortSignal.
    const signal = config.signal as AbortSignal | undefined;
    if (signal?.aborted) throw new CanceledError(undefined, config);
    return new Promise<AxiosResponse<string>>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => {
        cleanup();
        reject(new CanceledError(undefined, config));
      };
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      if (timeout) {
        timer = setTimeout(() => {
          cleanup();
          reject(
            new AxiosError(
              `timeout of ${timeout}ms exceeded`,
              AxiosError.ETIMEDOUT,
              config,
            ),
          );
        }, timeout);
      }
      respond().then(
        (response) => {
          cleanup();
          resolve(response);
        },
        (error: unknown) => {
          cleanup();
          reject(error);
        },
      );
    });
  });

  return {
    calls,
    /** Pass as `adapter` to `createAxiosClient`. */
    adapter,
    callsTo: (key: string) =>
      calls.filter((call) => `${call.method} ${call.path}` === key),
  };
}

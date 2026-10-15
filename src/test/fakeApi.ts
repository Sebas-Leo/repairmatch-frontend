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
}

export type RouteHandler = (call: RecordedCall) => Response | Promise<Response>;

/** Keys look like `POST /auth/login`. Unknown routes answer 404. */
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

/** Replaces global `fetch` with an in-memory backend. Remember `vi.unstubAllGlobals()`. */
export function installFakeApi(routes: Routes) {
  const calls: RecordedCall[] = [];
  const base = new URL(TEST_API_BASE);
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(String(input));
      const call: RecordedCall = {
        method: init?.method ?? 'GET',
        path: url.pathname.slice(base.pathname.length),
        query: url.searchParams,
        headers: new Headers(init?.headers),
        body:
          typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      const handler = routes[`${call.method} ${call.path}`];
      const respond = async () =>
        handler ? handler(call) : errorResponse(404, 'Ruta no encontrada');
      const signal = init?.signal;
      if (!signal) return respond();
      // Like a real fetch, reject as soon as the caller's signal aborts.
      return new Promise<Response>((resolve, reject) => {
        if (signal.aborted) return reject(signal.reason);
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
        respond().then(resolve, reject);
      });
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    fetchMock,
    callsTo: (key: string) =>
      calls.filter((call) => `${call.method} ${call.path}` === key),
  };
}

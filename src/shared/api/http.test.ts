import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeBackend, type Routes } from '../../test/fakeApi';
import { createAxiosClient } from './axiosClient';
import {
  ApiError,
  apiErrorFromResponse,
  isAbortError,
  NetworkError,
  requireBody,
} from './http';

afterEach(() => vi.useRealTimers());

/** The JSON transport over the real axios instance and an in-memory backend. */
function setup(routes: Routes) {
  const api = createFakeBackend(routes);
  const client = createAxiosClient({
    baseURL: 'http://localhost:8080/api/',
    adapter: api.adapter,
  });
  return { api, request: client.request };
}

const hang = () => new Promise<Response>(() => undefined);

describe('JSON HTTP transport', () => {
  it('reads JSON and combines the configured API base with a route', async () => {
    const { api, request } = setup({
      'GET /users/me': () => Response.json({ id: 1 }),
    });
    expect(await request<{ id: number }>('/users/me')).toEqual({ id: 1 });

    const call = api.calls[0]!;
    expect(call.config).toMatchObject({
      baseURL: 'http://localhost:8080/api',
      url: '/users/me',
      method: 'get',
      withCredentials: false,
      responseType: 'text',
    });
    expect(call.headers.get('Accept')).toBe('application/json');
    expect(call.headers.has('Content-Type')).toBe(false);
    expect(call.headers.has('Authorization')).toBe(false);
  });

  it('keeps the query string of a path', async () => {
    const { api, request } = setup({
      'GET /requests': () => Response.json([]),
    });
    await request('/requests?status=OPEN&page=2');
    expect(api.calls[0]?.path).toBe('/requests');
    expect(Object.fromEntries(api.calls[0]!.query)).toEqual({
      status: 'OPEN',
      page: '2',
    });
  });

  it.each([204, 200])('handles an empty %s response', async (status) => {
    const { request } = setup({
      'POST /auth/logout': () => new Response(null, { status }),
    });
    expect(
      await request<void>('/auth/logout', { method: 'POST' }),
    ).toBeUndefined();
  });

  it('preserves validation details and HTTP status', async () => {
    const errorBody = {
      status: 400,
      message: 'Validation failed',
      errors: { email: 'Invalid email' },
    };
    const { request } = setup({
      'GET /auth/login': () => Response.json(errorBody, { status: 400 }),
    });
    await expect(request('/auth/login')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Validation failed',
      body: errorBody,
    });
  });

  it('normalizes non-JSON errors without exposing raw HTML as the message', async () => {
    const { request } = setup({
      'GET /users/me': () =>
        new Response('<h1>Bad gateway</h1>', { status: 502 }),
    });
    await expect(request('/users/me')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed (502)',
      body: '<h1>Bad gateway</h1>',
    });
  });

  it('handles an empty error response', async () => {
    const { request } = setup({
      'GET /users/me': () => new Response(null, { status: 403 }),
    });
    await expect(request('/users/me')).rejects.toMatchObject({
      status: 403,
      message: 'Request failed (403)',
    });
  });

  it('rejects non-JSON successful responses', async () => {
    const { request } = setup({
      'GET /users/me': () => new Response('<html>unexpected</html>'),
    });
    await expect(request('/users/me')).rejects.toBeInstanceOf(ApiError);
  });

  it('sends JSON, a bearer token only when supplied, and the caller signal', async () => {
    const { api, request } = setup({
      'POST /example': () => Response.json({ ok: true }),
    });
    const signal = new AbortController().signal;
    await request('/example', {
      method: 'POST',
      body: { name: 'Test' },
      token: 'test-token',
      signal,
      headers: { 'X-Request-ID': 'test' },
    });
    const call = api.calls[0]!;
    expect(call.headers.get('Authorization')).toBe('Bearer test-token');
    expect(call.headers.get('Content-Type')).toBe('application/json');
    expect(call.headers.get('X-Request-ID')).toBe('test');
    expect(call.config.data).toBe('{"name":"Test"}');
    expect(call.config.signal).toBe(signal);
  });

  it('serialises falsy JSON bodies instead of dropping them', async () => {
    const { api, request } = setup({
      'PUT /flags': () => Response.json({ ok: true }),
    });
    await request('/flags', { method: 'PUT', body: null });
    await request('/flags', { method: 'PUT', body: false });
    expect(api.calls.map((call) => call.body)).toEqual([null, false]);
  });

  it('lets a caller header replace the default but never the bearer token', async () => {
    const { api, request } = setup({
      'GET /example': () => Response.json({ ok: true }),
    });
    await request('/example', {
      token: 'real-token',
      headers: { authorization: 'Bearer other', Accept: 'text/plain' },
    });
    expect(api.calls[0]?.headers.get('Authorization')).toBe(
      'Bearer real-token',
    );
    expect(api.calls[0]?.headers.get('Accept')).toBe('text/plain');
  });

  it.each(['https://evil.example/x', '//evil.example/x', '/\\evil.example'])(
    'rejects cross-origin paths: %s',
    async (path) => {
      const { api, request } = setup({});
      await expect(request(path, { token: 'test-token' })).rejects.toThrow(
        'API path',
      );
      expect(api.adapter).not.toHaveBeenCalled();
    },
  );

  it('exposes backend field errors on ApiError and ignores malformed ones', async () => {
    const { request } = setup({
      'GET /auth/register': () =>
        Response.json(
          {
            status: 400,
            message: 'Revisa los campos enviados',
            errors: { email: 'Invalid email', odd: 42 },
          },
          { status: 400 },
        ),
    });
    await expect(request('/auth/register')).rejects.toMatchObject({
      status: 400,
      errors: { email: 'Invalid email' },
    });
  });

  it.each([
    [{ message: '', detail: 'Legacy detail' }, 'Legacy detail'],
    [{ detail: 'Legacy detail' }, 'Legacy detail'],
    [{ message: 42 }, 'Request failed (409)'],
    [['not', 'a', 'record'], 'Request failed (409)'],
  ])('derives the error message from %j', async (body, message) => {
    const { request } = setup({
      'GET /requests': () => Response.json(body, { status: 409 }),
    });
    const error = await request('/requests').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message, errors: {} });
  });
});

describe('failures other than an HTTP status', () => {
  it('reports a network failure as a NetworkError, not an HTTP error', async () => {
    const cause = new TypeError('Failed to fetch');
    const { request } = setup({
      'GET /users/me': () => {
        throw cause;
      },
    });
    const error = await request('/users/me').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'NetworkError', cause });
  });

  it('preserves cancellation (the signal reason) rather than treating it as an HTTP error', async () => {
    const { api, request } = setup({});
    const controller = new AbortController();
    controller.abort();
    const error = await request('/users/me', {
      signal: controller.signal,
    }).catch((e: unknown) => e);
    expect(error).toBe(controller.signal.reason);
    expect(isAbortError(error)).toBe(true);
    expect(api.adapter).not.toHaveBeenCalled(); // never sent
  });

  it('cancels a call that is already in flight', async () => {
    const { request } = setup({ 'GET /slow': hang });
    const controller = new AbortController();
    const pending = request('/slow', { signal: controller.signal }).catch(
      (e: unknown) => e,
    );
    controller.abort();
    const error = await pending;
    expect(error).toBe(controller.signal.reason);
    expect(isAbortError(error)).toBe(true);
  });

  it('falls back to an AbortError when the reason is not an error object', async () => {
    const { request } = setup({ 'GET /slow': hang });
    const controller = new AbortController();
    const pending = request('/slow', { signal: controller.signal }).catch(
      (e: unknown) => e,
    );
    controller.abort('stop');
    const error = await pending;
    expect(isAbortError(error)).toBe(true);
    expect(error).toMatchObject({ name: 'AbortError' });
  });

  it('hands back a custom abort reason, so a timeout signal reads as a failure', async () => {
    const { request } = setup({ 'GET /slow': hang });
    const controller = new AbortController();
    const pending = request('/slow', { signal: controller.signal }).catch(
      (e: unknown) => e,
    );
    const reason = new DOMException('Too slow', 'TimeoutError');
    controller.abort(reason);
    const error = await pending;
    expect(error).toBe(reason);
    expect(isAbortError(error)).toBe(false);
  });

  it('rejects with a TimeoutError after the per-call timeout', async () => {
    vi.useFakeTimers();
    const { api, request } = setup({ 'GET /slow': hang });
    const pending = request('/slow?secret=1', { timeoutMs: 500 }).catch(
      (e: unknown) => e,
    );
    expect(api.calls[0]?.config.timeout).toBe(500);

    await vi.advanceTimersByTimeAsync(500);

    const error = await pending;
    expect(error).toMatchObject({
      name: 'TimeoutError',
      message: 'Request to /slow timed out', // the query string is not repeated
    });
    expect(isAbortError(error)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('applies a 30 second default timeout to every call', async () => {
    vi.useFakeTimers();
    const { api, request } = setup({ 'GET /slow': hang });
    const pending = request('/slow').catch((e: unknown) => e);
    expect(api.calls[0]?.config.timeout).toBe(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await pending).toMatchObject({ name: 'TimeoutError' });
  });

  it('never exposes the request config or bearer token through a failure', async () => {
    const failures = await Promise.all([
      setup({ 'GET /a': () => new Response(null, { status: 500 }) })
        .request('/a', { token: 'secret-token' })
        .catch((e: unknown) => e),
      setup({
        'GET /a': () => {
          throw new TypeError('Failed to fetch');
        },
      })
        .request('/a', { token: 'secret-token' })
        .catch((e: unknown) => e),
    ]);
    for (const failure of failures) {
      const error = failure as Error;
      expect(Object.keys(error)).not.toContain('config');
      expect(Object.keys(error)).not.toContain('request');
      expect(Object.keys(error)).not.toContain('response');
      expect(
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      ).not.toContain('secret-token');
    }
  });
});

describe('error helpers', () => {
  it('builds an ApiError from a raw body of any type', () => {
    expect(apiErrorFromResponse(500, undefined)).toMatchObject({
      status: 500,
      message: 'Request failed (500)',
      body: undefined,
    });
    expect(apiErrorFromResponse(409, '{"message":"Taken"}')).toMatchObject({
      status: 409,
      message: 'Taken',
      body: { message: 'Taken' },
    });
  });

  it.each([
    [new DOMException('x', 'AbortError'), true],
    [new DOMException('x', 'TimeoutError'), false],
    [new Error('x'), false],
    [{ name: 'AbortError' }, true],
    ['AbortError', false],
    [null, false],
    [undefined, false],
  ])('isAbortError(%j) is %s', (error, expected) => {
    expect(isAbortError(error)).toBe(expected);
  });
});

describe('requireBody', () => {
  it('returns present values, including falsy ones', () => {
    expect(requireBody({ id: 1 })).toEqual({ id: 1 });
    expect(requireBody(0)).toBe(0);
    expect(requireBody([])).toEqual([]);
  });

  it('rejects an empty body as an ApiError', () => {
    expect(() => requireBody(undefined)).toThrow(ApiError);
  });
});

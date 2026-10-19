import { afterEach, describe, expect, it, vi } from 'vitest';
import { findSecret } from '../../test/deepSearch';
import {
  createFakeBackend,
  errorResponse,
  type Routes,
} from '../../test/fakeApi';
import { createAxiosClient } from './axiosClient';
import {
  ApiError,
  apiErrorFromResponse,
  isAbortError,
  isAuthEndpoint,
  isTimeoutError,
  NetworkError,
  requireBody,
  serverMessageOf,
  type RequestAuthorizer,
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

  it.each([
    '/requests/../../x',
    '/requests/..',
    '/a/./b',
    '/a/%2E%2E/b',
    '/a/%2e%2e/b',
    '/a/.%2e/b',
    '/a/%2e/b',
    '/a/..%2fb',
    '/a/..%2Fb',
    '/a/..%5cb',
    '/a%2fb',
    '/a/../b?next=1',
  ])('rejects traversal in the path: %s', async (path) => {
    const { api, request } = setup({});
    await expect(request(path, { token: 'test-token' })).rejects.toThrow(
      'API path',
    );
    expect(api.adapter).not.toHaveBeenCalled();
  });

  it.each([
    '/requests/12/cancel',
    '/files/v1.2/report.pdf',
    '/a..b/c',
    '/...',
    '/requests?next=../x',
    '/requests?next=%2e%2e%2f',
    '/requests#../frag',
  ])('allows an ordinary path: %s', async (path) => {
    const { api, request } = setup({ 'GET /ok': () => Response.json({}) });
    // The route may not exist (404); what matters is that the guard let it out.
    await request(path).catch(() => undefined);
    expect(api.adapter).toHaveBeenCalledTimes(1);
  });

  it('sends a string body as a quoted JSON string, not as a bare value', async () => {
    const { api, request } = setup({
      'PUT /note': () => Response.json({ ok: true }),
    });
    await request('/note', { method: 'PUT', body: '123' });
    expect(api.calls[0]?.config.data).toBe('"123"');
    expect(api.calls[0]?.body).toBe('123'); // a string once decoded, not the number 123
  });

  it.each([
    ['true', 'true', true],
    ['an object with a string field', '{"a":"1"}', { a: '1' }],
    ['an array', '[1,"2"]', [1, '2']],
  ])('serialises %s with JSON.stringify', async (_name, text, value) => {
    const { api, request } = setup({
      'PUT /note': () => Response.json({ ok: true }),
    });
    await request('/note', { method: 'PUT', body: value });
    expect(api.calls[0]?.config.data).toBe(text);
  });

  it.each([
    ['a Blob', () => new Blob(['x'])],
    ['a File', () => new File(['x'], 'x.txt')],
    ['an ArrayBuffer', () => new ArrayBuffer(4)],
    ['a Uint8Array', () => new Uint8Array(4)],
    ['a DataView', () => new DataView(new ArrayBuffer(4))],
    ['URLSearchParams', () => new URLSearchParams({ a: '1' })],
    ['FormData', () => new FormData()],
    ['a ReadableStream', () => new ReadableStream()],
  ])('refuses %s as a body', async (_name, make) => {
    const { api, request } = setup({});
    const error = await request('/upload', {
      method: 'POST',
      body: make(),
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TypeError);
    expect(error).toMatchObject({ message: expect.stringContaining('JSON') });
    expect(api.adapter).not.toHaveBeenCalled();
  });

  it.each([
    ['a function', () => () => undefined],
    ['a symbol', () => Symbol('x')],
  ])('refuses %s as a body: it has no JSON form', async (_name, make) => {
    const { api, request } = setup({});
    await expect(
      request('/upload', { method: 'POST', body: make() }),
    ).rejects.toThrow('not JSON-serialisable');
    expect(api.adapter).not.toHaveBeenCalled();
  });

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
    let settled = false;
    const pending = request('/slow?secret=1', { timeoutMs: 500 })
      .catch((e: unknown) => e)
      .finally(() => {
        settled = true;
      });
    expect(api.calls[0]?.config.timeout).toBe(500);

    await vi.advanceTimersByTimeAsync(499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    const error = await pending;
    expect(error).toMatchObject({
      name: 'TimeoutError',
      message: 'Request to /slow timed out', // the query string is not repeated
    });
    expect(isAbortError(error)).toBe(false);
  });

  it('applies a 30 second default timeout to every call', async () => {
    vi.useFakeTimers();
    const { api, request } = setup({ 'GET /slow': hang });
    const pending = request('/slow').catch((e: unknown) => e);
    expect(api.calls[0]?.config.timeout).toBe(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await pending).toMatchObject({ name: 'TimeoutError' });
  });

  describe('never exposes a bearer token through a failure', () => {
    const SESSION_TOKEN = 'secret-session-token';
    const REPLAY_TOKEN = 'secret-replay-token';
    const EXPLICIT_TOKEN = 'secret-explicit-token';

    function leaky(routes: Routes) {
      const api = createFakeBackend(routes);
      const client = createAxiosClient({
        baseURL: 'http://localhost:8080/api',
        adapter: api.adapter,
      });
      const authorizer: RequestAuthorizer = {
        begin: () => ({ epoch: 1, accessToken: SESSION_TOKEN }),
        recover: async () => REPLAY_TOKEN,
      };
      client.authenticate(authorizer);
      return { api, request: client.request };
    }

    const failures: Array<[string, () => Promise<unknown>]> = [
      [
        'an HTTP 500',
        () =>
          leaky({ 'GET /a': () => errorResponse(500, 'Boom') })
            .request('/a')
            .catch((e: unknown) => e),
      ],
      [
        'a 401 that is replayed and fails again',
        () =>
          leaky({ 'GET /a': () => errorResponse(401, 'No') })
            .request('/a')
            .catch((e: unknown) => e),
      ],
      [
        'a rejected explicit token',
        () =>
          leaky({ 'GET /a': () => errorResponse(401, 'No') })
            .request('/a', { token: EXPLICIT_TOKEN })
            .catch((e: unknown) => e),
      ],
      [
        'a network failure',
        () =>
          leaky({
            'GET /a': () => {
              throw new TypeError('Failed to fetch');
            },
          })
            .request('/a')
            .catch((e: unknown) => e),
      ],
      [
        'a timeout',
        async () => {
          vi.useFakeTimers();
          const pending = leaky({ 'GET /a': hang })
            .request('/a', { timeoutMs: 10 })
            .catch((e: unknown) => e);
          await vi.advanceTimersByTimeAsync(10);
          return pending;
        },
      ],
      [
        'a cancellation',
        async () => {
          const controller = new AbortController();
          const pending = leaky({ 'GET /a': hang })
            .request('/a', { signal: controller.signal })
            .catch((e: unknown) => e);
          controller.abort();
          return pending;
        },
      ],
    ];

    it.each(failures)(
      'after %s, no token is reachable from the error',
      async (_name, run) => {
        const error = await run();
        expect(error).toMatchObject({
          name: expect.any(String),
          message: expect.any(String),
        });
        for (const token of [SESSION_TOKEN, REPLAY_TOKEN, EXPLICIT_TOKEN]) {
          expect(findSecret(error, token)).toEqual([]);
        }
      },
    );

    it('the search itself finds a token hidden in a cause, a config or a non-enumerable field', () => {
      const hidden = new Error('outer', {
        cause: {
          config: { headers: { Authorization: 'Bearer ' + SESSION_TOKEN } },
        },
      });
      Object.defineProperty(hidden, 'secret', { value: SESSION_TOKEN });
      const found = findSecret(hidden, SESSION_TOKEN);
      expect(found.some((hit) => hit.includes('.cause.config.headers'))).toBe(
        true,
      );
      expect(found.some((hit) => hit.startsWith('root.secret'))).toBe(true);
    });
  });
});

describe('auth endpoint detection', () => {
  it.each([
    ['/auth/login', true],
    ['/auth/refresh?x=1', true],
    ['/AUTH/login', true],
    ['/%41uth/login', true],
    ['/x/../auth/login', true],
    ['/x/%2e%2e/auth/login', true],
    ['/auth', false],
    ['/authors/1', false],
    ['/users/me', false],
    ['/requests?next=/auth/login', false],
    ['', false],
    [undefined, false],
  ])('isAuthEndpoint(%j) is %s', (path, expected) => {
    expect(isAuthEndpoint(path)).toBe(expected);
  });

  it('treats a path it cannot decode as written', () => {
    expect(isAuthEndpoint('/auth/%E0%A4%A')).toBe(true);
    expect(isAuthEndpoint('/users/%E0%A4%A')).toBe(false);
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

  it.each([
    [new DOMException('x', 'TimeoutError'), true],
    [new DOMException('x', 'AbortError'), false],
    [{ name: 'TimeoutError' }, true],
    [new Error('x'), false],
    [null, false],
  ])('isTimeoutError(%j) is %s', (error, expected) => {
    expect(isTimeoutError(error)).toBe(expected);
  });

  it('reads the text the backend wrote, not the generic fallback', () => {
    expect(
      serverMessageOf(apiErrorFromResponse(409, '{"message":"Taken"}')),
    ).toBe('Taken');
    expect(
      serverMessageOf(apiErrorFromResponse(409, '{"detail":"Taken too"}')),
    ).toBe('Taken too');
    expect(serverMessageOf(apiErrorFromResponse(500, undefined))).toBe(
      undefined,
    );
    expect(serverMessageOf(apiErrorFromResponse(502, '<html>Bad</html>'))).toBe(
      undefined,
    );
    expect(
      serverMessageOf(new ApiError(200, 'Expected a JSON response', 'x')),
    ).toBe(undefined);
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

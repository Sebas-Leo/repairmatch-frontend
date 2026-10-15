import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient } from './http';

const request = createHttpClient('http://localhost:8080/api/');
afterEach(() => vi.unstubAllGlobals());

describe('JSON HTTP client', () => {
  it('reads JSON and combines the configured API base with a route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await request<{ id: number }>('/users/me')).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/users/me',
      expect.objectContaining({ credentials: 'omit', redirect: 'error' }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.has('Content-Type')).toBe(false);
    expect(headers.has('Authorization')).toBe(false);
  });

  it.each([204, 200])('handles an empty %s response', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status })),
    );
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json(errorBody, { status: 400 })),
    );
    await expect(request('/auth/login')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Validation failed',
      body: errorBody,
    });
  });

  it('normalizes non-JSON errors without exposing raw HTML as the message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('<h1>Bad gateway</h1>', { status: 502 }),
        ),
    );
    await expect(request('/users/me')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed (502)',
      body: '<h1>Bad gateway</h1>',
    });
  });

  it('handles an empty error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );
    await expect(request('/users/me')).rejects.toMatchObject({
      status: 403,
      message: 'Request failed (403)',
    });
  });

  it('rejects non-JSON successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>unexpected</html>')),
    );
    await expect(request('/users/me')).rejects.toBeInstanceOf(ApiError);
  });

  it('sends JSON, a bearer token only when supplied, and the caller signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    await request('/example', {
      method: 'POST',
      body: { name: 'Test' },
      token: 'test-token',
      signal,
      headers: { 'X-Request-ID': 'test' },
    });
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Request-ID')).toBe('test');
    expect(options.body).toBe('{"name":"Test"}');
    expect(options.signal).toBe(signal);
  });

  it('preserves network failures for the caller', async () => {
    const error = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(request('/users/me')).rejects.toBe(error);
  });

  it('preserves cancellation rather than treating it as an HTTP error', async () => {
    const error = new DOMException('Request aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    const controller = new AbortController();
    controller.abort();
    await expect(
      request('/users/me', { signal: controller.signal }),
    ).rejects.toBe(error);
  });

  it.each(['https://evil.example/x', '//evil.example/x', '/\\evil.example'])(
    'rejects cross-origin paths: %s',
    async (path) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(request(path, { token: 'test-token' })).rejects.toThrow(
        'API path',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

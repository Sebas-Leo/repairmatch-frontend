import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBaseUrl } from '../config/env';
import { api } from './client';

afterEach(() => vi.unstubAllGlobals());

// `api` is bound to the real application client (axios + fetch adapter), so
// these tests stub the global `fetch` underneath it: the full production path
// runs, only the network is replaced.
describe('authenticated API client', () => {
  it('sends JSON requests to the configured API base through the session', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json([{ id: 1 }])));
    vi.stubGlobal('fetch', fetchMock);

    expect(await api.request('/appliance-types')).toEqual([{ id: 1 }]);

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe(`${apiBaseUrl}/appliance-types`);
    expect(request.credentials).toBe('omit');
    expect(request.redirect).toBe('error');
    expect(request.headers.get('Accept')).toBe('application/json');
    expect(request.headers.has('Authorization')).toBe(false); // anonymous
  });

  it('send ignores an empty response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(
      api.send('/things/1', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });
});

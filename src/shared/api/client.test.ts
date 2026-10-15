import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBaseUrl } from '../config/env';
import { api } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('authenticated API client', () => {
  it('sends JSON requests to the configured API base through the session', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json([{ id: 1 }])));
    vi.stubGlobal('fetch', fetchMock);

    expect(await api.request('/appliance-types')).toEqual([{ id: 1 }]);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiBaseUrl}/appliance-types`);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit' });
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

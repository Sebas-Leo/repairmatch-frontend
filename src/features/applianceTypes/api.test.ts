import { expect, it, vi } from 'vitest';
import { listApplianceTypes } from './api';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../shared/api/client', () => ({ api: { request } }));

it('lists appliance types with GET /appliance-types', async () => {
  request.mockResolvedValue([]);
  const signal = new AbortController().signal;
  expect(await listApplianceTypes({ signal })).toEqual([]);
  expect(request).toHaveBeenCalledExactlyOnceWith('/appliance-types', {
    signal,
  });
});

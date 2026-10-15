import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createReview,
  getService,
  getServiceReview,
  listServices,
  updateServiceStatus,
} from './api';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../shared/api/client', () => ({ api: { request } }));

beforeEach(() => {
  request.mockReset().mockResolvedValue('response');
});

const review = { rating: 5, comment: 'Fixed quickly' };

describe('service endpoints match the backend contract', () => {
  it.each([
    ['list', () => listServices(), '/services', {}],
    ['get', () => getService(12), '/services/12', {}],
    [
      'review',
      () => createReview(12, review),
      '/services/12/review',
      { method: 'POST', body: review },
    ],
    ['get review', () => getServiceReview(12), '/services/12/review', {}],
  ])('%s', async (_name, call, path, options) => {
    expect(await call()).toBe('response');
    expect(request).toHaveBeenCalledExactlyOnceWith(path, options);
  });

  it.each(['EN_ATENCION', 'COMPLETADO', 'CANCELADO'] as const)(
    'sends the %s status as a query parameter with no body',
    async (status) => {
      await updateServiceStatus(12, status);
      expect(request).toHaveBeenCalledExactlyOnceWith('/services/12/status', {
        method: 'PATCH',
        query: { status },
      });
    },
  );
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addEvidence,
  cancelServiceRequest,
  createServiceRequest,
  getServiceForRequest,
  getServiceRequest,
  listEvidences,
  listServiceRequests,
  updateRequestLocation,
} from './api';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../shared/api/client', () => ({ api: { request } }));

beforeEach(() => {
  request.mockReset().mockResolvedValue('response');
});

const creation = { applianceTypeId: 3, originalDescription: 'Does not spin' };
const location = { latitude: -12.05, longitude: -77.04 };
const evidence = {
  mediaUrl: 'https://cdn.example.test/a.jpg',
  mediaType: 'image/jpeg',
};

describe('request endpoints match the backend contract', () => {
  it.each([
    [
      'create',
      () => createServiceRequest(creation),
      '/requests',
      { method: 'POST', body: creation },
    ],
    ['list', () => listServiceRequests(), '/requests', {}],
    ['get', () => getServiceRequest(7), '/requests/7', {}],
    [
      'location',
      () => updateRequestLocation(7, location),
      '/requests/7/location',
      { method: 'PATCH', body: location },
    ],
    [
      'cancel',
      () => cancelServiceRequest(7),
      '/requests/7/cancel',
      { method: 'PATCH' },
    ],
    [
      'add evidence',
      () => addEvidence(7, evidence),
      '/requests/7/evidences',
      { method: 'POST', body: evidence },
    ],
    ['list evidences', () => listEvidences(7), '/requests/7/evidences', {}],
    [
      'service of a request',
      () => getServiceForRequest(7),
      '/requests/7/service',
      {},
    ],
  ])('%s', async (_name, call, path, options) => {
    expect(await call()).toBe('response');
    expect(request).toHaveBeenCalledExactlyOnceWith(path, options);
  });

  it('forwards an abort signal', async () => {
    const signal = new AbortController().signal;
    await getServiceRequest(7, { signal });
    expect(request).toHaveBeenCalledWith('/requests/7', { signal });
  });

  it('refuses ids that would change the route', () => {
    expect(() => listEvidences('..' as unknown as number)).toThrow(
      'Invalid API path segment',
    );
  });
});

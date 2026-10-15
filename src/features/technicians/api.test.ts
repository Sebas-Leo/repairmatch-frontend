import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getOwnTechnicianProfile,
  getTechnician,
  getTechnicianReputation,
  listMatchingRequests,
  listOwnProposals,
  listTechnicianReviews,
  updateOwnTechnicianProfile,
  updateServiceArea,
} from './api';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../shared/api/client', () => ({ api: { request } }));

beforeEach(() => {
  request.mockReset().mockResolvedValue('response');
});

const id = '3f2c9d6e-0000-4000-8000-000000000000';
const profile = {
  experienceYears: 5,
  bio: 'Fridges',
  applianceTypeIds: [1, 2],
};
const area = { latitude: -12.05, longitude: -77.04, maxRadiusKm: 25 };

describe('technician endpoints match the backend contract', () => {
  it.each([
    [
      'own profile',
      () => getOwnTechnicianProfile(),
      '/technicians/me/profile',
      {},
    ],
    [
      'update profile',
      () => updateOwnTechnicianProfile(profile),
      '/technicians/me/profile',
      { method: 'PUT', body: profile },
    ],
    [
      'service area',
      () => updateServiceArea(area),
      '/technicians/me/service-areas',
      { method: 'PUT', body: area },
    ],
    [
      'own proposals',
      () => listOwnProposals(),
      '/technicians/me/proposals',
      {},
    ],
    ['public profile', () => getTechnician(id), `/technicians/${id}`, {}],
    [
      'reputation',
      () => getTechnicianReputation(id),
      `/technicians/${id}/reputation`,
      {},
    ],
    [
      'reviews',
      () => listTechnicianReviews(id),
      `/technicians/${id}/reviews`,
      {},
    ],
  ])('%s', async (_name, call, path, options) => {
    expect(await call()).toBe('response');
    expect(request).toHaveBeenCalledExactlyOnceWith(path, options);
  });

  it('passes page and size to the matching-requests query', async () => {
    await listMatchingRequests({ page: 2, size: 50 });
    expect(request).toHaveBeenCalledExactlyOnceWith(
      '/technicians/me/matching-requests',
      { query: { page: 2, size: 50 } },
    );
  });

  it('leaves the server defaults when no paging is given', async () => {
    await listMatchingRequests();
    expect(request).toHaveBeenCalledExactlyOnceWith(
      '/technicians/me/matching-requests',
      { query: { page: undefined, size: undefined } },
    );
  });
});

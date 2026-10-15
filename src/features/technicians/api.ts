import { api, type CallOptions } from '../../shared/api/client';
import { pathSegment } from '../../shared/api/paths';
import type {
  MatchingRequest,
  MatchingRequestsQuery,
  Proposal,
  Review,
  ServiceAreaUpdate,
  TechnicianProfile,
  TechnicianProfileUpdate,
  TechnicianPublicProfile,
  TechnicianReputation,
  Uuid,
} from '../../shared/api/types';

// "me" endpoints require the TECHNICIAN role; the by-id ones are readable by
// any authenticated account.

/** GET /technicians/me/profile. Before the first save only id, name, email and []. */
export function getOwnTechnicianProfile(options?: CallOptions) {
  return api.request<TechnicianProfile>('/technicians/me/profile', {
    ...options,
  });
}

/** PUT /technicians/me/profile. Omitted or null fields keep their current value. */
export function updateOwnTechnicianProfile(
  body: TechnicianProfileUpdate,
  options?: CallOptions,
) {
  return api.request<TechnicianProfile>('/technicians/me/profile', {
    method: 'PUT',
    body,
    ...options,
  });
}

/** PUT /technicians/me/service-areas. */
export function updateServiceArea(
  body: ServiceAreaUpdate,
  options?: CallOptions,
) {
  return api.request<TechnicianProfile>('/technicians/me/service-areas', {
    method: 'PUT',
    body,
    ...options,
  });
}

/**
 * GET /technicians/me/matching-requests?page&size: nearest first. 404 without a
 * profile and 400 when the service area is not configured. The backend slices a
 * full in-memory result, so every page costs a full scan.
 */
export function listMatchingRequests(
  query: MatchingRequestsQuery = {},
  options?: CallOptions,
) {
  return api.request<MatchingRequest[]>('/technicians/me/matching-requests', {
    query: { page: query.page, size: query.size },
    ...options,
  });
}

/** GET /technicians/me/proposals: submitted by the caller, newest first. */
export function listOwnProposals(options?: CallOptions) {
  return api.request<Proposal[]>('/technicians/me/proposals', { ...options });
}

/** GET /technicians/{uuid}: public profile (no email, phone or coordinates). */
export function getTechnician(id: Uuid, options?: CallOptions) {
  return api.request<TechnicianPublicProfile>(
    `/technicians/${pathSegment(id)}`,
    { ...options },
  );
}

/** GET /technicians/{uuid}/reputation. */
export function getTechnicianReputation(id: Uuid, options?: CallOptions) {
  return api.request<TechnicianReputation>(
    `/technicians/${pathSegment(id)}/reputation`,
    { ...options },
  );
}

/** GET /technicians/{uuid}/reviews: newest first, `[]` when none. */
export function listTechnicianReviews(id: Uuid, options?: CallOptions) {
  return api.request<Review[]>(`/technicians/${pathSegment(id)}/reviews`, {
    ...options,
  });
}

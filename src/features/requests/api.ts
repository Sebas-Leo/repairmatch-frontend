import { api, type CallOptions } from '../../shared/api/client';
import { pathSegment, withQuery } from '../../shared/api/paths';
import type {
  Page,
  ServiceRequestsQuery,
  CreateEvidence,
  CreateServiceRequest,
  Evidence,
  RequestLocationUpdate,
  Service,
  ServiceRequest,
} from '../../shared/api/types';

// Client-side request endpoints. PATCH /requests/{id}/close is intentionally
// absent: the backend always answers 403 (closing happens by accepting a proposal).

/** POST /requests (CLIENT). Latitude and longitude go together or not at all. */
export function createServiceRequest(
  body: CreateServiceRequest,
  options?: CallOptions,
) {
  return api.request<ServiceRequest>('/requests', {
    method: 'POST',
    body,
    ...options,
  });
}

/**
 * GET /requests?page&size&status&search&sort (CLIENT): a page of own requests,
 * newest first unless `sort` is `oldest`. Empty filters are left out.
 */
export function listServiceRequests(
  query: ServiceRequestsQuery = {},
  options?: CallOptions,
) {
  return api.request<Page<ServiceRequest>>(
    withQuery('/requests', {
      page: query.page,
      size: query.size,
      status: query.status,
      search: query.search,
      sort: query.sort,
    }),
    { ...options },
  );
}

/** GET /requests/{id}: owning client, or a technician with a proposal on it. */
export function getServiceRequest(id: number, options?: CallOptions) {
  return api.request<ServiceRequest>(`/requests/${pathSegment(id)}`, {
    ...options,
  });
}

/** PATCH /requests/{id}/location (CLIENT owner). 409 once it is no longer PUBLICADA. */
export function updateRequestLocation(
  id: number,
  body: RequestLocationUpdate,
  options?: CallOptions,
) {
  return api.request<ServiceRequest>(`/requests/${pathSegment(id)}/location`, {
    method: 'PATCH',
    body,
    ...options,
  });
}

/** PATCH /requests/{id}/cancel (CLIENT owner). */
export function cancelServiceRequest(id: number, options?: CallOptions) {
  return api.request<ServiceRequest>(`/requests/${pathSegment(id)}/cancel`, {
    method: 'PATCH',
    ...options,
  });
}

/** POST /requests/{id}/evidences (CLIENT owner). Metadata only: no file upload. */
export function addEvidence(
  requestId: number,
  body: CreateEvidence,
  options?: CallOptions,
) {
  return api.request<Evidence>(
    `/requests/${pathSegment(requestId)}/evidences`,
    {
      method: 'POST',
      body,
      ...options,
    },
  );
}

/** GET /requests/{id}/evidences: owner, or a technician with a proposal on it. */
export function listEvidences(requestId: number, options?: CallOptions) {
  return api.request<Evidence[]>(
    `/requests/${pathSegment(requestId)}/evidences`,
    { ...options },
  );
}

/** GET /requests/{id}/service (CLIENT owner): 404 until a proposal is accepted. */
export function getServiceForRequest(requestId: number, options?: CallOptions) {
  return api.request<Service>(`/requests/${pathSegment(requestId)}/service`, {
    ...options,
  });
}

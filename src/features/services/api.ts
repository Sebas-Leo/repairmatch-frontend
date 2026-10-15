import { api, type CallOptions } from '../../shared/api/client';
import { pathSegment } from '../../shared/api/paths';
import type {
  CreateReview,
  Review,
  Service,
  ServiceStatusUpdate,
} from '../../shared/api/types';

/** GET /services: services where the caller is the client or the technician. */
export function listServices(options?: CallOptions) {
  return api.request<Service[]>('/services', { ...options });
}

/** GET /services/{id} (participant). */
export function getService(id: number, options?: CallOptions) {
  return api.request<Service>(`/services/${pathSegment(id)}`, { ...options });
}

/**
 * PATCH /services/{id}/status?status=... (participant). The status travels in
 * the query string and the request has no body. PROGRAMADO -> EN_ATENCION ->
 * COMPLETADO is technician-only; CANCELADO is allowed from PROGRAMADO.
 */
export function updateServiceStatus(
  id: number,
  status: ServiceStatusUpdate,
  options?: CallOptions,
) {
  return api.request<Service>(`/services/${pathSegment(id)}/status`, {
    method: 'PATCH',
    query: { status },
    ...options,
  });
}

/** POST /services/{id}/review (CLIENT owner): only on COMPLETADO, once. */
export function createReview(
  serviceId: number,
  body: CreateReview,
  options?: CallOptions,
) {
  return api.request<Review>(`/services/${pathSegment(serviceId)}/review`, {
    method: 'POST',
    body,
    ...options,
  });
}

/** GET /services/{id}/review (participant): 404 until the service is reviewed. */
export function getServiceReview(serviceId: number, options?: CallOptions) {
  return api.request<Review>(`/services/${pathSegment(serviceId)}/review`, {
    ...options,
  });
}

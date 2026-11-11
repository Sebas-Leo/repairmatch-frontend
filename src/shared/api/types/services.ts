import type { LocalDateTimeString, Uuid } from './common';

export const SERVICE_STATUSES = [
  'PROGRAMADO',
  'EN_ATENCION',
  'COMPLETADO',
  'CANCELADO',
] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

/**
 * Statuses a participant may request with PATCH /services/{id}/status
 * (`PROGRAMADO` is the initial state and can never be requested).
 */
export type ServiceStatusUpdate = Exclude<ServiceStatus, 'PROGRAMADO'>;

/**
 * Backend `ServiceResponseDTO`. Created when a client accepts a proposal.
 * `requestId`, `clientId`, `technicianId` and `technicianName` are derived by
 * the backend so the UI can link a service without extra calls.
 */
export interface Service {
  id: number;
  proposalId: number;
  status: ServiceStatus;
  createdAt: LocalDateTimeString;
  requestId: number;
  clientId: Uuid;
  technicianId: Uuid;
  technicianName: string;
}

/** POST /services/{id}/review. Only the client, once, on a `COMPLETADO` service. */
export interface CreateReview {
  /** Integer 1-5. */
  rating: number;
  /** Required, at most 2000 characters. */
  comment: string;
}

/** Backend `ReviewResponseDto`. The reviewer is deliberately not exposed. */
export interface Review {
  id: number;
  serviceId: number;
  rating: number;
  comment: string;
  createdAt: LocalDateTimeString;
}

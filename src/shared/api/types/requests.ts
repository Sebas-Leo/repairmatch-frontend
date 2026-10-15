import type { LocalDateTimeString, Uuid } from './common';

export const REQUEST_STATUSES = [
  'PUBLICADA',
  'CON_PROPUESTAS',
  'CERRADA',
  'CANCELADA',
  'EXPIRADA',
] as const;
/**
 * Plain string on the wire. `EXPIRADA` is reserved (nothing sets it yet) but
 * the UI must still render it. `CERRADA`, `CANCELADA` and `EXPIRADA` are final.
 */
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/**
 * A repair request (backend `RequestResponseDto`). Named `ServiceRequest` to
 * avoid clashing with the DOM `Request` type. Nullable fields serialize as
 * `null`. For a technician, `latitude`/`longitude` are `null` unless that
 * technician's proposal was accepted.
 */
export interface ServiceRequest {
  id: number;
  clientId: Uuid;
  applianceTypeId: number;
  applianceTypeName: string;
  originalDescription: string;
  brand: string | null;
  model: string | null;
  status: RequestStatus;
  latitude: number | null;
  longitude: number | null;
  createdAt: LocalDateTimeString;
}

/** POST /requests (backend `CreateRequestDto`). */
export interface CreateServiceRequest {
  applianceTypeId: number;
  /** Required, at most 5000 characters. */
  originalDescription: string;
  /** At most 100 characters. */
  brand?: string | null;
  /** At most 100 characters. */
  model?: string | null;
  /** -90..90. Latitude and longitude must be sent together or not at all. */
  latitude?: number | null;
  /** -180..180. */
  longitude?: number | null;
}

/** PATCH /requests/{id}/location (only while the request is `PUBLICADA`). */
export interface RequestLocationUpdate {
  latitude: number;
  longitude: number;
}

/** POST /requests/{id}/evidences. Metadata only: the file lives elsewhere. */
export interface CreateEvidence {
  /** `http(s)://` URL, at most 500 characters. */
  mediaUrl: string;
  /** For example `image/jpeg`. At most 50 characters. */
  mediaType: string;
}

export interface Evidence {
  requestId: number;
  evidenceNumber: number;
  mediaUrl: string;
  mediaType: string;
}

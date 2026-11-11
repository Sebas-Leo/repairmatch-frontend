import type { Uuid } from './common';
import type { RequestStatus } from './requests';

/**
 * Backend `TechnicianProfileResponseDto`; null fields are OMITTED from the JSON
 * (hence optional rather than nullable). Before the first save the own profile
 * is only `{ id, fullName, email, applianceTypes: [] }`.
 */
export interface TechnicianProfile {
  id: Uuid;
  fullName: string;
  email: string;
  experienceYears?: number;
  bio?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  maxRadiusKm?: number;
  /** Appliance type NAMES (updates send ids through `applianceTypeIds`). */
  applianceTypes: string[];
}

/**
 * GET /technicians/{uuid}: the same profile without email, phone and
 * coordinates (the backend nulls them, so the keys are absent).
 */
export type TechnicianPublicProfile = Omit<
  TechnicianProfile,
  'email' | 'phone' | 'latitude' | 'longitude'
> & {
  email?: never;
  phone?: never;
  latitude?: never;
  longitude?: never;
};

/** PUT /technicians/me/profile. Omitted or null fields keep their current value. */
export interface TechnicianProfileUpdate {
  /** 0-70. */
  experienceYears?: number | null;
  /** At most 1000 characters. */
  bio?: string | null;
  /** At most 20 characters. */
  phone?: string | null;
  applianceTypeIds?: number[] | null;
}

/** PUT /technicians/me/service-areas. */
export interface ServiceAreaUpdate {
  /** -90..90. */
  latitude: number;
  /** -180..180. */
  longitude: number;
  /** 1-300. */
  maxRadiusKm: number;
}

/** Query of GET /technicians/me/matching-requests. */
export interface MatchingRequestsQuery {
  /** Zero-based, default 0. */
  page?: number;
  /** 1-100, default 20. */
  size?: number;
}

/** Item of GET /technicians/me/matching-requests, nearest first. */
export interface MatchingRequest {
  requestId: number;
  applianceTypeName: string;
  brand: string | null;
  model: string | null;
  description: string;
  status: RequestStatus;
  distanceKm: number;
}

/** GET /technicians/{uuid}/reputation. */
export interface TechnicianReputation {
  technicianId: Uuid;
  /** Unrounded mean; `0` with `reviewCount: 0` when there are no reviews. */
  averageRating: number;
  reviewCount: number;
}

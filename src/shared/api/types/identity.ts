import type { LocalDateTimeString } from './common';

export const IDENTITY_STATUSES = [
  'NOT_STARTED',
  'PENDING',
  'VERIFIED',
  'REJECTED',
] as const;
/** Where a user stands in the optional Didit identity verification. */
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];

/** GET /verification/identity. `verifiedAt` is null unless verified. */
export interface IdentityState {
  status: IdentityStatus;
  verifiedAt: LocalDateTimeString | null;
}

/** POST /verification/identity/session (201): open `url` to verify. */
export interface IdentitySession {
  url: string;
  status: IdentityStatus;
}

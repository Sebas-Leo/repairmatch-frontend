import type { LocalDateTimeString, Uuid } from './common';

export const PROPOSAL_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
/**
 * Plain string on the wire. Cancelling a request leaves its proposals
 * `PENDING`, so read the request status before offering to act on one.
 */
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** POST /requests/{id}/proposals (backend `CreateProposalDto`). */
export interface CreateProposal {
  /** Decimal number, at least 0, at most 10 integer and 2 fraction digits. */
  diagnosticCost: number;
  /** Must be in the future; local date-time without timezone. */
  availableAt: LocalDateTimeString;
  /** Required, at most 1000 characters. */
  conditions: string;
}

/** Backend `ProposalResponseDto`. */
export interface Proposal {
  id: number;
  requestId: number;
  technicianId: Uuid;
  technicianName: string;
  diagnosticCost: number;
  availableAt: LocalDateTimeString;
  conditions: string;
  createdAt: LocalDateTimeString;
  status: ProposalStatus;
}

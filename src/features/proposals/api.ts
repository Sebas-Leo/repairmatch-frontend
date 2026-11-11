import { api, type CallOptions } from '../../shared/api/client';
import { pathSegment } from '../../shared/api/paths';
import type { CreateProposal, Proposal, Service } from '../../shared/api/types';

/**
 * POST /requests/{id}/proposals (TECHNICIAN). 403 when the request is not
 * compatible (the `message` says why), 409 when closed or already proposed.
 */
export function submitProposal(
  requestId: number,
  body: CreateProposal,
  options?: CallOptions,
) {
  return api.request<Proposal>(
    `/requests/${pathSegment(requestId)}/proposals`,
    {
      method: 'POST',
      body,
      ...options,
    },
  );
}

/** GET /requests/{id}/proposals (CLIENT owner), ordered by cost then availability. */
export function listRequestProposals(requestId: number, options?: CallOptions) {
  return api.request<Proposal[]>(
    `/requests/${pathSegment(requestId)}/proposals`,
    { ...options },
  );
}

/**
 * POST /proposals/{id}/accept (CLIENT owner). Creates the service, rejects the
 * other proposals and closes the request in one transaction; the loser of a
 * race gets 409.
 */
export function acceptProposal(proposalId: number, options?: CallOptions) {
  return api.request<Service>(`/proposals/${pathSegment(proposalId)}/accept`, {
    method: 'POST',
    ...options,
  });
}

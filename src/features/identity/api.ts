import { api, type CallOptions } from '../../shared/api/client';
import type { IdentitySession, IdentityState } from '../../shared/api/types';

/** GET /verification/identity (any role). */
export function getIdentityState(options?: CallOptions) {
  return api.request<IdentityState>('/verification/identity', { ...options });
}

/**
 * POST /verification/identity/session (any role): creates a Didit session and
 * returns the hosted page to open. 409 when already verified, 503 when the
 * server has no Didit configuration.
 */
export function startIdentityVerification(options?: CallOptions) {
  return api.request<IdentitySession>('/verification/identity/session', {
    method: 'POST',
    ...options,
  });
}

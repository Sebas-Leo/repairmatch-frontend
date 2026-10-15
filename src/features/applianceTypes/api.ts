import { api, type CallOptions } from '../../shared/api/client';
import type { ApplianceType } from '../../shared/api/types';

/** GET /appliance-types: any authenticated account, sorted by name. */
export function listApplianceTypes(options?: CallOptions) {
  return api.request<ApplianceType[]>('/appliance-types', { ...options });
}

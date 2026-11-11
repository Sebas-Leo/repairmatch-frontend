import { REQUEST_STATUSES, type RequestStatus } from '../../shared/api/types';
import type { BadgeTone } from '../../shared/ui/Badge';
import type { SelectOption } from '../../shared/ui/SelectField';

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PUBLICADA: 'Published',
  CON_PROPUESTAS: 'Has offers',
  CERRADA: 'Closed',
  CANCELADA: 'Cancelled',
  EXPIRADA: 'Expired',
};

export const REQUEST_STATUS_TONE: Record<RequestStatus, BadgeTone> = {
  PUBLICADA: 'info',
  CON_PROPUESTAS: 'brand',
  CERRADA: 'success',
  CANCELADA: 'neutral',
  EXPIRADA: 'warning',
};

export const REQUEST_STATUS_OPTIONS: readonly SelectOption[] =
  REQUEST_STATUSES.map((status) => ({
    value: status,
    label: REQUEST_STATUS_LABEL[status],
  }));

export function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
}

/** Open requests still receive offers and can be cancelled. */
export function isOpenRequest(status: RequestStatus): boolean {
  return status === 'PUBLICADA' || status === 'CON_PROPUESTAS';
}

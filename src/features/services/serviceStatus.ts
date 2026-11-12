import type {
  Role,
  ServiceStatus,
  ServiceStatusUpdate,
} from '../../shared/api/types';
import { SERVICE_STATUSES } from '../../shared/api/types';
import type { BadgeTone } from '../../shared/ui/Badge';

const STATUS_META: Record<
  ServiceStatus,
  { label: string; tone: BadgeTone; summary: string }
> = {
  PROGRAMADO: {
    label: 'Scheduled',
    tone: 'info',
    summary: 'Waiting for the technician to start the visit.',
  },
  EN_ATENCION: {
    label: 'In progress',
    tone: 'warning',
    summary: 'The technician is currently working on this repair.',
  },
  COMPLETADO: {
    label: 'Completed',
    tone: 'success',
    summary: 'The repair has been finished.',
  },
  CANCELADO: {
    label: 'Cancelled',
    tone: 'danger',
    summary: 'This service was cancelled before starting.',
  },
};

export const SERVICE_STATUS_OPTIONS = SERVICE_STATUSES.map((value) => ({
  value,
  label: STATUS_META[value].label,
}));

export function isServiceStatus(
  value: string | null | undefined,
): value is ServiceStatus {
  return (
    typeof value === 'string' &&
    (SERVICE_STATUSES as readonly string[]).includes(value)
  );
}

export function getServiceStatusMeta(status: ServiceStatus) {
  return STATUS_META[status];
}

export interface StatusTransition {
  nextStatus: ServiceStatusUpdate;
  label: string;
  tone: 'primary' | 'danger';
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  cancelLabel: string;
  successMessage: string;
}

/**
 * Valid status actions for the signed-in role:
 * - PROGRAMADO -> EN_ATENCION -> COMPLETADO (technician only)
 * - PROGRAMADO -> CANCELADO (client or technician)
 */
export function getAvailableTransitions(
  status: ServiceStatus,
  role: Role,
): StatusTransition[] {
  const actions: StatusTransition[] = [];

  if (role === 'TECHNICIAN' && status === 'PROGRAMADO') {
    actions.push({
      nextStatus: 'EN_ATENCION',
      label: 'Start service',
      tone: 'primary',
      dialogTitle: 'Start this service now?',
      dialogDescription:
        'The status will change to In progress so the client knows you are attending the repair.',
      confirmLabel: 'Start service',
      cancelLabel: 'Not yet',
      successMessage: 'Service marked as in progress.',
    });
  }

  if (role === 'TECHNICIAN' && status === 'EN_ATENCION') {
    actions.push({
      nextStatus: 'COMPLETADO',
      label: 'Mark as completed',
      tone: 'primary',
      dialogTitle: 'Complete this service?',
      dialogDescription:
        'This closes the service and lets the client leave a review. This cannot be undone.',
      confirmLabel: 'Complete service',
      cancelLabel: 'Not yet',
      successMessage: 'Service marked as completed.',
    });
  }

  if (status === 'PROGRAMADO') {
    actions.push({
      nextStatus: 'CANCELADO',
      label: 'Cancel service',
      tone: 'danger',
      dialogTitle: 'Cancel this service?',
      dialogDescription:
        'The scheduled service will be cancelled permanently. This cannot be undone.',
      confirmLabel: 'Cancel service',
      cancelLabel: 'Keep service',
      successMessage: 'Service cancelled.',
    });
  }

  return actions;
}
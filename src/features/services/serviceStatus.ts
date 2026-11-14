import type {
  Role,
  ServiceStatus,
  ServiceStatusUpdate,
} from '../../shared/api/types';

export interface ServiceStatusMeta {
  label: string;
  pillClass: string;
  summary: string;
}

const SERVICE_STATUS_META: Record<ServiceStatus, ServiceStatusMeta> = {
  PROGRAMADO: {
    label: 'Programado',
    pillClass: 'bg-cobalt-soft text-cobalt',
    summary:
      'El servicio está agendado y a la espera de que el técnico inicie la atención.',
  },
  EN_ATENCION: {
    label: 'En atención',
    pillClass: 'bg-warning-soft text-warning',
    summary: 'El técnico se encuentra realizando la reparación.',
  },
  COMPLETADO: {
    label: 'Completado',
    pillClass: 'bg-fresh-soft text-fresh',
    summary:
      'La reparación ha finalizado. El cliente ya puede dejar una reseña.',
  },
  CANCELADO: {
    label: 'Cancelado',
    pillClass: 'bg-danger-soft text-danger',
    summary: 'Este servicio fue cancelado antes de comenzar.',
  },
};

export function getServiceStatusMeta(status: ServiceStatus): ServiceStatusMeta {
  return SERVICE_STATUS_META[status];
}

export function isServiceStatus(
  value: string | null | undefined,
): value is ServiceStatus {
  return (
    value === 'PROGRAMADO' ||
    value === 'EN_ATENCION' ||
    value === 'COMPLETADO' ||
    value === 'CANCELADO'
  );
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
 * - TECHNICIAN: PROGRAMADO -> EN_ATENCION -> COMPLETADO, and PROGRAMADO -> CANCELADO
 * - CLIENT: PROGRAMADO -> CANCELADO
 */
export function getAvailableTransitions(
  status: ServiceStatus,
  role: Role,
): StatusTransition[] {
  const transitions: StatusTransition[] = [];

  if (role === 'TECHNICIAN' && status === 'PROGRAMADO') {
    transitions.push({
      nextStatus: 'EN_ATENCION',
      label: 'Iniciar atención',
      tone: 'primary',
      dialogTitle: '¿Iniciar este servicio ahora?',
      dialogDescription:
        'El estado cambiará a En atención y el cliente sabrá que ya empezaste la reparación.',
      confirmLabel: 'Iniciar atención',
      cancelLabel: 'Volver',
      successMessage: 'Servicio marcado como en atención.',
    });
  }

  if (role === 'TECHNICIAN' && status === 'EN_ATENCION') {
    transitions.push({
      nextStatus: 'COMPLETADO',
      label: 'Marcar como completado',
      tone: 'primary',
      dialogTitle: '¿Marcar este servicio como completado?',
      dialogDescription:
        'Esto cierra la reparación y habilita al cliente para dejar una reseña.',
      confirmLabel: 'Completar servicio',
      cancelLabel: 'Seguir en atención',
      successMessage: 'Servicio marcado como completado.',
    });
  }

  if (status === 'PROGRAMADO') {
    transitions.push({
      nextStatus: 'CANCELADO',
      label: 'Cancelar servicio',
      tone: 'danger',
      dialogTitle: '¿Cancelar este servicio programado?',
      dialogDescription:
        'Esta acción no se puede deshacer. Solo se puede cancelar antes de iniciar la atención.',
      confirmLabel: 'Cancelar servicio',
      cancelLabel: 'Mantener servicio',
      successMessage: 'Servicio cancelado.',
    });
  }

  return transitions;
}

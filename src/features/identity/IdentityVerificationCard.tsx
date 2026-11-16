import {
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { describeApiError } from '../../shared/api/errorMessages';
import { isAbortError } from '../../shared/api/http';
import type { IdentityStatus } from '../../shared/api/types';
import { formatDateTime } from '../../shared/format';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { httpUrl } from '../../shared/safeUrl';
import { useToast } from '../../shared/toast/toastContext';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ErrorState } from '../../shared/ui/ErrorState';
import { IdentityBadge } from '../../shared/ui/IdentityBadge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { getIdentityState, startIdentityVerification } from './api';
import { openVerificationPage } from './openExternal';

interface Copy {
  title: string;
  text: string;
  icon: ReactNode;
  action?: string;
}

const COPY: Record<IdentityStatus, Copy> = {
  NOT_STARTED: {
    title: 'Aún no verificas tu identidad',
    text: 'Es opcional y toma pocos minutos. Con una insignia de identidad verificada, los demás saben que eres una persona real.',
    icon: <ShieldQuestion size={22} aria-hidden="true" />,
    action: 'Verificar mi identidad',
  },
  PENDING: {
    title: 'Verificación en revisión',
    text: 'Estamos revisando tu verificación. Puede tardar unos minutos; mientras tanto puedes seguir usando RepairMatch.',
    icon: <Clock size={22} aria-hidden="true" />,
    action: 'Continuar verificación',
  },
  VERIFIED: {
    title: 'Identidad verificada',
    text: 'Listo: tu perfil muestra la insignia de identidad verificada.',
    icon: <ShieldCheck size={22} aria-hidden="true" />,
  },
  REJECTED: {
    title: 'No pudimos verificar tu identidad',
    text: 'La verificación no fue aprobada. Puedes intentarlo de nuevo con un documento vigente y buena luz.',
    icon: <ShieldAlert size={22} aria-hidden="true" />,
    action: 'Intentar de nuevo',
  },
};

const STATUS_LABEL: Record<IdentityStatus, string> = {
  NOT_STARTED: 'No iniciada',
  PENDING: 'En revisión',
  VERIFIED: 'Verificada',
  REJECTED: 'Rechazada',
};

const TONE: Record<IdentityStatus, string> = {
  NOT_STARTED: 'bg-surface-2 text-muted',
  PENDING: 'bg-warning-soft text-warning',
  VERIFIED: 'bg-fresh-soft text-fresh',
  REJECTED: 'bg-danger-soft text-danger',
};

/**
 * "Verificación de identidad" for any account. It is a soft trust layer: it
 * never blocks the app, only offers the badge. The button creates a Didit
 * session on the server and opens the hosted page (after checking the URL).
 */
export function IdentityVerificationCard() {
  const toast = useToast();
  const query = useApiQuery(
    ['identity-state'],
    (signal) => getIdentityState({ signal }),
    { keepPreviousData: false },
  );

  const start = useSubmitGuard(async () => {
    try {
      const session = await startIdentityVerification();
      const url = httpUrl(session.url);
      if (!url) {
        toast.error(
          'No pudimos abrir la verificación. Inténtalo de nuevo en unos minutos.',
        );
        return;
      }
      openVerificationPage(url);
    } catch (error) {
      if (isAbortError(error)) return;
      toast.error(describeApiError(error).message);
    }
  });

  const state = query.data;
  const copy = state ? COPY[state.status] : undefined;

  return (
    <Card
      as="section"
      aria-labelledby="identity-heading"
      className="grid gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="identity-heading" className="m-0 text-xl font-bold">
          Verificación de identidad
        </h2>
        {state ? (
          state.status === 'VERIFIED' ? (
            <IdentityBadge />
          ) : (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[state.status]}`}
            >
              {STATUS_LABEL[state.status]}
            </span>
          )
        ) : null}
      </div>

      {query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : !state || !copy ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`grid size-10 shrink-0 place-items-center rounded-full ${TONE[state.status]}`}
            >
              {copy.icon}
            </span>
            <div className="grid gap-1">
              <p className="m-0 font-semibold">{copy.title}</p>
              <p className="m-0 text-sm text-muted">{copy.text}</p>
              {state.status === 'VERIFIED' && state.verifiedAt ? (
                <p className="m-0 text-xs text-muted">
                  Verificada el {formatDateTime(state.verifiedAt)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {copy.action ? (
              <Button
                loading={start.isSubmitting}
                onClick={() => void start.run()}
                icon={<ShieldCheck size={16} aria-hidden="true" />}
              >
                {copy.action}
              </Button>
            ) : null}
            {state.status === 'PENDING' ? (
              <Button
                variant="secondary"
                onClick={query.reload}
                icon={<RefreshCw size={16} aria-hidden="true" />}
              >
                Actualizar estado
              </Button>
            ) : null}
          </div>
          <p className="m-0 text-xs text-muted">
            No guardamos fotos de tu documento ni datos biométricos: solo si
            quedaste verificado o no.
          </p>
        </div>
      )}
    </Card>
  );
}

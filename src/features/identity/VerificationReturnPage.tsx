import { CircleAlert, Clock, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { ButtonLink } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ErrorState } from '../../shared/ui/ErrorState';
import { IdentityBadge } from '../../shared/ui/IdentityBadge';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { getIdentityState } from './api';

/** The webhook can land a few seconds after the user comes back. */
export const POLL_MS = 3000;
export const MAX_POLLS = 5;

/**
 * /verification/return: where Didit sends the user back (DIDIT_CALLBACK_URL).
 * The query string Didit appends is NOT trusted: the page only refetches the
 * status from our server, and polls briefly while the webhook is pending.
 */
export function VerificationReturnPage() {
  const { user } = useAuth();
  const query = useApiQuery(
    ['identity-state', 'return'],
    (signal) => getIdentityState({ signal }),
    { keepPreviousData: false },
  );
  const [polls, setPolls] = useState(0);
  const { reload } = query;
  const status = query.data?.status;

  useEffect(() => {
    if (status !== 'PENDING' || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      setPolls((count) => count + 1);
      reload();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [status, polls, reload]);

  const accountPath =
    user?.role === 'TECHNICIAN' ? '/technician/profile' : '/client/account';

  return (
    <section aria-labelledby="verification-title" className="grid gap-6">
      <PageHeader
        titleId="verification-title"
        title="Verificación de identidad"
        description="Revisamos el resultado de tu verificación."
      />
      {query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : !query.data ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <Card className="grid max-w-xl gap-4" role="status">
          {status === 'VERIFIED' ? (
            <>
              <IdentityBadge className="justify-self-start" />
              <p className="m-0 flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck
                  size={20}
                  aria-hidden="true"
                  className="text-fresh"
                />
                ¡Listo! Tu identidad quedó verificada.
              </p>
              <p className="m-0 text-sm text-muted">
                Ahora tu perfil muestra la insignia de identidad verificada.
              </p>
            </>
          ) : status === 'PENDING' ? (
            <>
              <p className="m-0 flex items-center gap-2 text-lg font-semibold">
                <Clock size={20} aria-hidden="true" className="text-warning" />
                Tu verificación está en revisión.
              </p>
              <p className="m-0 text-sm text-muted">
                {polls >= MAX_POLLS
                  ? 'Está tardando un poco más de lo normal. Puedes seguir usando la app: te avisaremos con la insignia cuando termine.'
                  : 'Esto puede tardar unos segundos. Actualizaremos el estado por ti.'}
              </p>
            </>
          ) : (
            <>
              <p className="m-0 flex items-center gap-2 text-lg font-semibold">
                <CircleAlert
                  size={20}
                  aria-hidden="true"
                  className="text-danger"
                />
                {status === 'REJECTED'
                  ? 'No pudimos verificar tu identidad.'
                  : 'Tu verificación no se completó.'}
              </p>
              <p className="m-0 text-sm text-muted">
                Puedes intentarlo de nuevo cuando quieras desde tu cuenta.
              </p>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/home">Volver al inicio</ButtonLink>
            {status !== 'VERIFIED' ? (
              <ButtonLink to={accountPath} variant="secondary">
                Ir a mi cuenta
              </ButtonLink>
            ) : null}
          </div>
        </Card>
      )}
    </section>
  );
}

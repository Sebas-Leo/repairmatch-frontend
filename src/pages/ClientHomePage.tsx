import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../features/auth/authContext';
import { listServiceRequests } from '../features/requests/api';
import { ClientRequestCard } from '../features/requests/ClientRequestCard';
import { PublishPanel } from '../features/requests/PublishPanel';
import type { RequestStatus } from '../shared/api/types';
import { useApiQuery } from '../shared/hooks/useApiQuery';
import { ButtonLink } from '../shared/ui/Button';
import { EmptyState } from '../shared/ui/EmptyState';
import { ErrorState } from '../shared/ui/ErrorState';
import { ListSkeleton, Skeleton } from '../shared/ui/Skeleton';

const SUMMARY: readonly {
  label: string;
  status: RequestStatus | undefined;
  to: string;
}[] = [
  { label: 'Todas', status: undefined, to: '/client/requests' },
  {
    label: 'Esperando ofertas',
    status: 'PUBLICADA',
    to: '/client/requests?status=PUBLICADA',
  },
  {
    label: 'Con ofertas por revisar',
    status: 'CON_PROPUESTAS',
    to: '/client/requests?status=CON_PROPUESTAS',
  },
  {
    label: 'Cerradas',
    status: 'CERRADA',
    to: '/client/requests?status=CERRADA',
  },
];

const ACTIVE: readonly RequestStatus[] = ['PUBLICADA', 'CON_PROPUESTAS'];

/**
 * /client: publish first, then follow what is open. The publish block owns
 * the first fold; under it, a strip of totals by state (each one a link to
 * that list) and a grid of the requests still waiting or with offers.
 * Totals are the `totalElements` of one-item pages, from the backend.
 */
export function ClientHomePage() {
  const { user } = useAuth();
  const stats = useApiQuery(['client-stats'], (signal) =>
    Promise.all(
      SUMMARY.map(({ status }) =>
        listServiceRequests({ size: 1, status }, { signal }).then(
          (page) => page.totalElements,
        ),
      ),
    ),
  );
  const recent = useApiQuery(['client-recent'], (signal) =>
    listServiceRequests({ size: 12 }, { signal }),
  );
  const active = recent.data?.content.filter((r) => ACTIVE.includes(r.status));

  return (
    <section aria-labelledby="client-home-title" className="grid gap-8">
      <PublishPanel
        titleId="client-home-title"
        greeting={`Hola, ${user?.name?.split(' ')[0] ?? ''}`.trim()}
      />

      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <h2 className="m-0 text-2xl font-extrabold">Tus solicitudes</h2>
            <p className="m-0 text-sm text-muted">
              Sesión de {user?.name ?? 'cliente'}.
            </p>
          </div>
          {stats.status === 'error' ? null : (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {SUMMARY.map((row, index) => (
                <li key={row.label}>
                  <Link
                    to={row.to}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm no-underline shadow-card transition-colors hover:border-cobalt/50"
                  >
                    <span className="text-muted">{row.label}</span>
                    <span className="font-display font-bold tabular-nums">
                      {stats.data ? (
                        stats.data[index]
                      ) : (
                        <Skeleton className="h-4 w-5" />
                      )}
                    </span>
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className="text-muted"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {stats.status === 'error' ? (
          <ErrorState
            error={stats.error}
            onRetry={() => {
              stats.reload();
              recent.reload();
            }}
          />
        ) : null}

        {recent.status === 'error' ? (
          stats.status === 'error' ? null : (
            <ErrorState error={recent.error} onRetry={recent.reload} />
          )
        ) : !active ? (
          <ListSkeleton rows={3} label="Cargando tus solicitudes" />
        ) : recent.data?.content.length === 0 ? (
          <EmptyState
            title="Aún no publicas nada"
            description="Tu primera solicitud toma un minuto: el equipo, qué falla y, si los sabes, marca y modelo."
          />
        ) : active.length === 0 ? (
          <EmptyState
            title="No tienes solicitudes abiertas"
            description="Todo lo que publicaste ya está cerrado. Cuando algo más se malogre, empieza arriba."
            action={
              <ButtonLink to="/client/requests" variant="secondary">
                Ver todas mis solicitudes
              </ButtonLink>
            }
          />
        ) : (
          <ul className="stagger spotlight m-0 grid list-none grid-cols-3 gap-5 p-0">
            {active.map((request) => (
              <li key={request.id}>
                <ClientRequestCard request={request} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

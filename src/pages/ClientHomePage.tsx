import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../features/auth/authContext';
import { listServiceRequests } from '../features/requests/api';
import type { RequestStatus } from '../shared/api/types';
import { useApiQuery } from '../shared/hooks/useApiQuery';
import { ButtonLink } from '../shared/ui/Button';
import { ErrorState } from '../shared/ui/ErrorState';
import { PageHeader } from '../shared/ui/PageHeader';
import { Skeleton } from '../shared/ui/Skeleton';

const SUMMARY: readonly {
  label: string;
  status: RequestStatus | undefined;
  to: string;
}[] = [
  { label: 'Todas las solicitudes', status: undefined, to: '/client/requests' },
  {
    label: 'Esperando ofertas',
    status: 'PUBLICADA',
    to: '/client/requests?status=PUBLICADA',
  },
  {
    label: 'Ofertas por revisar',
    status: 'CON_PROPUESTAS',
    to: '/client/requests?status=CON_PROPUESTAS',
  },
  {
    label: 'Solicitudes cerradas',
    status: 'CERRADA',
    to: '/client/requests?status=CERRADA',
  },
];

/** Overview only. Creation, search and the full list live under My requests. */
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
  return (
    <section aria-labelledby="client-home-title" className="grid gap-8">
      <PageHeader
        titleId="client-home-title"
        title={`Hola, ${user?.name?.split(' ')[0] ?? 'client'}`}
        description="Consulta el resumen de tus reparaciones. Crea y gestiona solicitudes en Mis solicitudes."
        actions={
          <ButtonLink to="/client/requests">Ir a mis solicitudes</ButtonLink>
        }
      />
      <div>
        <h2 className="text-xl">Resumen de solicitudes</h2>
        {stats.status === 'error' ? (
          <ErrorState error={stats.error} onRetry={stats.reload} />
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {SUMMARY.map((row, index) => (
              <li key={row.label}>
                <Link
                  to={row.to}
                  className="grid min-h-28 gap-3 rounded-2xl border border-line bg-surface p-5 text-ink no-underline hover:border-cobalt"
                >
                  <span>{row.label}</span>
                  <span className="flex items-center justify-between text-3xl font-bold">
                    {stats.data ? (
                      stats.data[index]
                    ) : (
                      <Skeleton className="h-8 w-8" />
                    )}
                    <ChevronRight size={20} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="m-0 text-xl">Tus servicios</h2>
        <p className="m-0 text-muted">
          Sigue las reparaciones contratadas y califica los servicios
          completados.
        </p>
        <ButtonLink to="/client/services" variant="secondary">
          Ver servicios
        </ButtonLink>
      </div>
    </section>
  );
}

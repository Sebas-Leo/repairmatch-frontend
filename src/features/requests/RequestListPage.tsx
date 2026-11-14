import { Plus, SearchX } from 'lucide-react';
import type { RequestStatus } from '../../shared/api/types';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { usePageParams } from '../../shared/hooks/usePageParams';
import { Breadcrumbs } from '../../shared/ui/Breadcrumbs';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { cx } from '../../shared/ui/cx';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { Pagination } from '../../shared/ui/Pagination';
import { SearchInput } from '../../shared/ui/SearchInput';
import { ListSkeleton, Skeleton } from '../../shared/ui/Skeleton';
import { listServices } from '../services/api';
import { listServiceRequests } from './api';
import { ClientRequestRow } from './ClientRequestRow';
import { isRequestStatus } from './requestStatus';

const TABS: readonly { value: '' | RequestStatus; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'CON_PROPUESTAS', label: 'Con ofertas' },
  { value: 'PUBLICADA', label: 'Publicadas' },
  { value: 'CERRADA', label: 'Cerradas' },
  { value: 'CANCELADA', label: 'Canceladas' },
];

const KPI_STATUSES = ['PUBLICADA', 'CON_PROPUESTAS', 'CERRADA'] as const;

/**
 * /client/requests: the client's requests, paged, searchable and filtered
 * by state on the backend, with totals on top. "En curso" counts the
 * client's services that are scheduled or being attended.
 */
export function RequestListPage() {
  const params = usePageParams();
  const rawStatus = params.get('status');
  const status = isRequestStatus(rawStatus) ? rawStatus : undefined;
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const { page, size, search } = params;

  const query = useApiQuery(
    ['requests', page, size, status, search, sort],
    (signal) =>
      listServiceRequests({ page, size, status, search, sort }, { signal }),
  );
  const totals = useApiQuery(['request-totals'], (signal) =>
    Promise.all(
      KPI_STATUSES.map((s) =>
        listServiceRequests({ size: 1, status: s }, { signal }).then(
          (p) => p.totalElements,
        ),
      ),
    ),
  );
  const services = useApiQuery(['client-services'], (signal) =>
    listServices({ signal }),
  );
  const inProgress = services.data?.filter(
    (s) => s.status === 'PROGRAMADO' || s.status === 'EN_ATENCION',
  ).length;
  const [published, withOffers, closed] = totals.data ?? [];

  const data = query.data;
  const filtered = Boolean(status || search);

  function clearFilters() {
    params.setFilters({ status: '', search: '' });
  }

  let content;
  if (!data) {
    content =
      query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : (
        <ListSkeleton rows={4} label="Cargando tus solicitudes" />
      );
  } else if (data.content.length === 0) {
    content =
      data.totalElements > 0 ? (
        <EmptyState
          title="Esta página está vacía"
          description={`Tienes ${data.totalElements} solicitudes en ${data.totalPages} páginas.`}
          action={
            <Button onClick={() => params.setPage(data.totalPages - 1)}>
              Ir a la última página
            </Button>
          }
        />
      ) : filtered ? (
        <EmptyState
          icon={<SearchX size={28} />}
          title="Ninguna solicitud coincide"
          description="Prueba otra palabra u otro estado."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Quitar filtros
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="Aún no tienes solicitudes"
          description="Cuenta qué se malogró y los técnicos cercanos te enviarán ofertas."
          action={
            <ButtonLink
              to="/client/requests/new"
              icon={<Plus size={18} aria-hidden="true" />}
            >
              Nueva solicitud
            </ButtonLink>
          }
        />
      );
  } else {
    content = (
      <div aria-busy={query.isFetching || undefined} className="grid gap-6">
        <ul className="stagger m-0 grid list-none grid-cols-2 gap-5 p-0">
          {data.content.map((request) => (
            <li key={request.id}>
              <ClientRequestRow request={request} />
            </li>
          ))}
        </ul>
        <Pagination
          page={data.page}
          size={data.size}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={params.setPage}
          onSizeChange={params.setSize}
          disabled={query.isFetching}
        />
      </div>
    );
  }

  return (
    <section aria-labelledby="requests-title" className="grid gap-6">
      <header className="grid gap-3">
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/client' },
            { label: 'Mis solicitudes' },
          ]}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <h1
              id="requests-title"
              tabIndex={-1}
              className="m-0 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em] focus:outline-none"
            >
              Mis solicitudes
            </h1>
            <p className="m-0 text-muted">
              Sigue cada reparación desde su publicación hasta la elección del
              técnico.
            </p>
          </div>
          <ButtonLink
            to="/client/requests/new"
            icon={<Plus size={18} aria-hidden="true" />}
          >
            Nueva solicitud
          </ButtonLink>
        </div>
      </header>

      <dl className="m-0 grid grid-cols-4 gap-3">
        <Kpi label="Publicadas" value={published} />
        <Kpi
          label="Con ofertas por revisar"
          value={withOffers}
          className="border-fresh/30 bg-fresh-soft"
          tone="text-fresh"
        />
        <Kpi
          label="En curso"
          value={services.status === 'error' ? '—' : inProgress}
          className="border-cobalt/25 bg-cobalt-soft"
          tone="text-cobalt"
        />
        <Kpi label="Cerradas" value={closed} />
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-72 flex-1 [&_label]:sr-only">
          <SearchInput
            label="Buscar solicitudes"
            placeholder="Buscar por equipo, marca o falla…"
            value={search}
            onSearch={params.setSearch}
          />
        </div>
        <div
          role="tablist"
          aria-label="Estado"
          className="flex gap-1 rounded-full bg-surface p-1 shadow-card"
        >
          {TABS.map((tab) => {
            const active = (status ?? '') === tab.value;
            return (
              <button
                key={tab.value || 'all'}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => params.setFilter('status', tab.value)}
                className={cx(
                  'min-h-9 rounded-full border-0 px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
                  active
                    ? 'bg-ink text-bg'
                    : 'bg-transparent text-muted hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <label className="sr-only" htmlFor="requests-sort">
          Ordenar
        </label>
        <select
          id="requests-sort"
          value={sort}
          onChange={(event) =>
            params.setFilter(
              'sort',
              event.target.value === 'oldest' ? 'oldest' : '',
            )
          }
          className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold shadow-card"
        >
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguas</option>
        </select>
      </div>

      {data && query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : null}
      {content}
    </section>
  );
}

function Kpi({
  label,
  value,
  className,
  tone,
}: {
  label: string;
  value: number | string | undefined;
  className?: string;
  tone?: string;
}) {
  return (
    <div
      className={cx(
        'grid gap-1 rounded-card border border-line bg-surface px-5 py-4 shadow-card',
        className,
      )}
    >
      <dt className="text-sm text-slate">{label}</dt>
      <dd
        className={cx(
          'm-0 font-display text-3xl font-extrabold tabular-nums',
          tone,
        )}
      >
        {value === undefined ? <Skeleton className="h-8 w-10" /> : value}
      </dd>
    </div>
  );
}

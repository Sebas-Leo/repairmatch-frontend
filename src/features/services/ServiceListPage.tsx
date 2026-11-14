import { SearchX, Wrench } from 'lucide-react';
import { useAuth } from '../auth/authContext';
import { listServices } from './api';
import type { ServiceStatus } from '../../shared/api/types';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { usePageParams } from '../../shared/hooks/usePageParams';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { cx } from '../../shared/ui/cx';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Pagination } from '../../shared/ui/Pagination';
import { SearchInput } from '../../shared/ui/SearchInput';
import { SelectField } from '../../shared/ui/SelectField';
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { ServiceCard } from './ServiceCard';
import { isServiceStatus } from './serviceStatus';

const STATUS_TABS: ReadonlyArray<{ value: '' | ServiceStatus; label: string }> =
  [
    { value: '', label: 'Todos' },
    { value: 'PROGRAMADO', label: 'Programados' },
    { value: 'EN_ATENCION', label: 'En atención' },
    { value: 'COMPLETADO', label: 'Completados' },
    { value: 'CANCELADO', label: 'Cancelados' },
  ];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
] as const;

/** /client/services and /technician/services: services of the signed-in user. */
export function ServiceListPage() {
  const auth = useAuth();
  const role = auth.status === 'authenticated' ? auth.user.role : 'CLIENT';
  const homePath = role === 'CLIENT' ? '/client' : '/technician';

  const params = usePageParams();
  const rawStatus = params.get('status');
  const status = isServiceStatus(rawStatus) ? rawStatus : undefined;
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const { page, size, search } = params;

  const query = useApiQuery(['services'], (signal) => listServices({ signal }));
  const allServices = query.data;
  const filtered = Boolean(status || search);

  const counts = {
    total: allServices?.length ?? 0,
    programado:
      allServices?.filter((s) => s.status === 'PROGRAMADO').length ?? 0,
    enAtencion:
      allServices?.filter((s) => s.status === 'EN_ATENCION').length ?? 0,
    completado:
      allServices?.filter((s) => s.status === 'COMPLETADO').length ?? 0,
  };

  function clearFilters() {
    params.setFilters({ status: '', search: '' });
  }

  let content;
  if (!allServices) {
    content =
      query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : (
        <ListSkeleton rows={4} label="Cargando servicios" />
      );
  } else {
    const term = search.trim().toLowerCase();
    const matching = allServices
      .filter((item) => (!status ? true : item.status === status))
      .filter((item) => {
        if (!term) return true;
        return (
          `#${item.id}`.includes(term) ||
          String(item.id).includes(term) ||
          `#${item.requestId}`.includes(term) ||
          String(item.requestId).includes(term) ||
          item.technicianName.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const cmp = a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
        return sort === 'oldest' ? cmp : -cmp;
      });

    const totalElements = matching.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const start = page * size;
    const pageItems = matching.slice(start, start + size);

    if (pageItems.length === 0) {
      content =
        totalElements > 0 ? (
          <EmptyState
            title="Esta página está vacía"
            description={`Hay ${totalElements} servicios repartidos en ${totalPages} páginas.`}
            action={
              <Button onClick={() => params.setPage(totalPages - 1)}>
                Ir a la última página
              </Button>
            }
          />
        ) : filtered ? (
          <EmptyState
            icon={<SearchX size={36} />}
            title="Ningún servicio coincide"
            description="Prueba con otro término de búsqueda o cambia el filtro de estado."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Quitar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Wrench size={36} />}
            title="Aún no tienes servicios"
            description={
              role === 'CLIENT'
                ? 'Acepta una oferta en tus solicitudes para agendar tu primera reparación.'
                : 'Cuando un cliente acepte una de tus ofertas, el servicio aparecerá aquí.'
            }
            action={
              <ButtonLink
                to={
                  role === 'CLIENT'
                    ? '/client/requests'
                    : '/technician/opportunities'
                }
              >
                {role === 'CLIENT'
                  ? 'Ver mis solicitudes'
                  : 'Explorar oportunidades'}
              </ButtonLink>
            }
          />
        );
    } else {
      content = (
        <div aria-busy={query.isFetching || undefined}>
          <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">
            {pageItems.map((service) => (
              <li key={service.id}>
                <ServiceCard service={service} role={role} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            size={size}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={params.setPage}
            onSizeChange={params.setSize}
            disabled={query.isFetching}
          />
        </div>
      );
    }
  }

  return (
    <section aria-labelledby="services-title">
      <PageHeader
        titleId="services-title"
        title="Servicios"
        description={
          role === 'CLIENT'
            ? 'Sigue tus reparaciones agendadas, cancélalas antes de iniciar y califica el trabajo terminado.'
            : 'Gestiona tus reparaciones agendadas desde el inicio hasta su finalización.'
        }
        breadcrumbs={[
          { label: 'Inicio', to: homePath },
          { label: 'Servicios' },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-card border border-line bg-surface p-4 shadow-card">
          <p className="m-0 text-xs font-medium text-muted">Total</p>
          <p className="m-0 mt-1 font-display text-2xl font-extrabold tabular-nums">
            {counts.total}
          </p>
        </div>
        <div className="rounded-card border border-line bg-surface p-4 shadow-card">
          <p className="m-0 text-xs font-medium text-cobalt">Programados</p>
          <p className="m-0 mt-1 font-display text-2xl font-extrabold tabular-nums">
            {counts.programado}
          </p>
        </div>
        <div className="rounded-card border border-line bg-surface p-4 shadow-card">
          <p className="m-0 text-xs font-medium text-warning">En atención</p>
          <p className="m-0 mt-1 font-display text-2xl font-extrabold tabular-nums">
            {counts.enAtencion}
          </p>
        </div>
        <div className="rounded-card border border-line bg-surface p-4 shadow-card">
          <p className="m-0 text-xs font-medium text-fresh">Completados</p>
          <p className="m-0 mt-1 font-display text-2xl font-extrabold tabular-nums">
            {counts.completado}
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Filtrar por estado"
        className="mb-4 flex flex-wrap gap-2"
      >
        {STATUS_TABS.map((tab) => {
          const active = (status ?? '') === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => params.setFilter('status', tab.value)}
              className={cx(
                'min-h-10 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                active
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line bg-surface text-muted hover:border-ink/40 hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-0 pb-2">
        <div className="mb-4 w-full sm:w-auto sm:flex-1">
          <SearchInput
            label="Buscar servicios"
            placeholder="Buscar por servicio #, solicitud # o técnico"
            value={search}
            onSearch={params.setSearch}
          />
        </div>
        <SelectField
          id="services-sort"
          label="Ordenar"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(event) =>
            params.setFilter(
              'sort',
              event.target.value === 'oldest' ? 'oldest' : '',
            )
          }
        />
      </div>

      {allServices && query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : null}
      {content}
    </section>
  );
}

import { MapPinOff, Search } from 'lucide-react';
import { useState } from 'react';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { usePageParams } from '../../shared/hooks/usePageParams';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { cx } from '../../shared/ui/cx';
import { Pagination } from '../../shared/ui/Pagination';
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { applianceLabel } from '../requests/applianceLabel';
import { listRecommendedRequests, type RecommendedRequest } from './api';
import { RecentRequestCard } from './RecentRequestCard';
import { needsSetup } from './setup';

const FRESH_MS = 3 * 60 * 60 * 1000;

const TABS = [
  { value: '', label: 'Todas' },
  { value: 'no-offers', label: 'Sin ofertas aún', fresh: true },
  { value: 'near', label: 'A menos de 2 km' },
  { value: 'new', label: 'Nuevas (3 h)' },
] as const;
type Tab = (typeof TABS)[number]['value'];

const SORTS = [
  { value: 'near', label: 'Más cercanas' },
  { value: 'best', label: 'Mejor oportunidad' },
  { value: 'recent', label: 'Más recientes' },
] as const;
type Sort = (typeof SORTS)[number]['value'];

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matches(item: RecommendedRequest, needle: string): boolean {
  if (!needle) return true;
  const r = item.request;
  return fold(
    [
      r.applianceTypeName,
      applianceLabel(r.applianceTypeName),
      r.brand,
      r.model,
      r.description,
      item.symptom,
    ]
      .filter(Boolean)
      .join(' '),
  ).includes(needle);
}

/**
 * /technician/oportunidades: every open request the technician can serve
 * and has not answered yet, paged, with quick tabs, search and order.
 * Tabs and search work on the current page; the page size is in the URL.
 */
export function OpportunitiesPage() {
  const params = usePageParams();
  const { page, size } = params;
  const tab = params.get('tab') as Tab;
  const [sort, setSort] = useState<Sort>('near');
  const [now] = useState(() => Date.now());
  const query = useApiQuery(['opportunities', page, size], (signal) =>
    listRecommendedRequests({ page, size }, { signal }),
  );
  const data = query.data;
  const needle = fold(params.search);

  const visible = (data?.content ?? [])
    .filter((item) => matches(item, needle))
    .filter((item) =>
      tab === 'no-offers'
        ? item.proposalCount === 0
        : tab === 'near'
          ? item.request.distanceKm <= 2
          : tab === 'new'
            ? now - new Date(item.createdAt).getTime() < FRESH_MS
            : true,
    )
    .sort((a, b) =>
      sort === 'near'
        ? a.request.distanceKm - b.request.distanceKm
        : sort === 'best'
          ? b.score - a.score
          : b.createdAt.localeCompare(a.createdAt),
    );

  let content;
  if (!data) {
    content =
      query.status !== 'error' ? (
        <ListSkeleton rows={4} label="Buscando solicitudes cercanas" />
      ) : needsSetup(query.error) ? (
        <EmptyState
          icon={<MapPinOff size={28} />}
          title="Primero configura tu zona de servicio"
          description="Las oportunidades dependen de dónde trabajas, hasta dónde te desplazas y qué equipos reparas."
        />
      ) : (
        <ErrorState error={query.error} onRetry={query.reload} />
      );
  } else if (data.totalElements === 0) {
    content = (
      <EmptyState
        title="No hay solicitudes cerca por ahora"
        description="Las nuevas solicitudes dentro de tu radio, para los equipos que reparas, aparecerán aquí."
      />
    );
  } else {
    content = (
      <div aria-busy={query.isFetching || undefined} className="grid gap-6">
        {visible.length === 0 ? (
          <EmptyState
            title="Nada con estos filtros en esta página"
            description="Prueba otra pestaña, otra búsqueda o la página siguiente."
          />
        ) : (
          <ul className="stagger spotlight m-0 grid list-none grid-cols-3 gap-5 p-0">
            {visible.map((item) => (
              <li key={item.request.requestId}>
                <RecentRequestCard item={item} onSent={query.reload} />
              </li>
            ))}
          </ul>
        )}
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
    <section aria-labelledby="opportunities-title" className="grid gap-6">
      <header className="grid gap-2">
        <h1
          id="opportunities-title"
          tabIndex={-1}
          className="m-0 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em] focus:outline-none"
        >
          Oportunidades en tu zona
        </h1>
        <p className="m-0 max-w-2xl text-muted">
          Solicitudes abiertas que aún no respondiste, ordenadas por cercanía o
          por qué tan buena es la oportunidad.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-[var(--rm-cover-line)] p-3 [background-image:var(--rm-cover-bg)]">
        <label className="relative min-w-64 flex-1">
          <span className="sr-only">Buscar oportunidades</span>
          <Search
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            defaultValue={params.search}
            onChange={(event) => params.setSearch(event.target.value)}
            placeholder="Equipo, marca o falla…"
            className="min-h-11 w-full rounded-full border border-line bg-surface py-2 pr-4 pl-11 text-ink [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <div
          role="tablist"
          aria-label="Filtrar"
          className="flex gap-1 rounded-full bg-surface-2 p-1"
        >
          {TABS.map((option) => {
            const active = option.value === tab;
            return (
              <button
                key={option.value || 'all'}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => params.setFilter('tab', option.value)}
                className={cx(
                  'min-h-9 rounded-full border-0 px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
                  active
                    ? 'fresh' in option
                      ? 'bg-fresh-strong text-white'
                      : 'bg-ink text-bg'
                    : 'fresh' in option
                      ? 'bg-transparent text-fresh hover:bg-fresh-soft'
                      : 'bg-transparent text-muted hover:text-ink',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <label className="sr-only" htmlFor="opportunities-sort">
          Ordenar
        </label>
        <select
          id="opportunities-sort"
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {data && query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : null}
      {content}
    </section>
  );
}

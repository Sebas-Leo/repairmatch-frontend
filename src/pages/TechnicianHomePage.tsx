import { MapPinned } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  getOwnTechnicianProfile,
  listMatchingRequests,
  listRecommendedRequests,
  type RecommendedRequest,
} from '../features/technicians/api';
import type {
  RadiusOption,
  SortOption,
} from '../features/technicians/coverage';
import { CoverageRadar } from '../features/technicians/CoverageRadar';
import { RecentRequestCard } from '../features/technicians/RecentRequestCard';
import { needsSetup } from '../features/technicians/setup';
import { applianceLabel } from '../features/requests/applianceLabel';
import { nearestLimaDistrict } from '../shared/geo/limaDistricts';
import { useApiQuery } from '../shared/hooks/useApiQuery';
import { ButtonLink } from '../shared/ui/Button';
import { EmptyState } from '../shared/ui/EmptyState';
import { ErrorState } from '../shared/ui/ErrorState';
import { ListSkeleton } from '../shared/ui/Skeleton';

const DAY = 24 * 60 * 60 * 1000;
const SORT_TITLE: Record<SortOption, string> = {
  recent: 'Más recientes',
  near: 'Más cercanos primero',
  'no-offers': 'Sin ofertas primero',
};
const FRESH_MS = 3 * 60 * 60 * 1000;

/** Hoy, los últimos siete días y lo anterior. */
function groupByRecency(
  items: readonly RecommendedRequest[],
  now = Date.now(),
) {
  const groups = [
    { title: 'Hoy', items: [] as RecommendedRequest[] },
    { title: 'Esta semana', items: [] as RecommendedRequest[] },
    { title: 'Antes', items: [] as RecommendedRequest[] },
  ];
  const midnight = new Date(now).setHours(0, 0, 0, 0);
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const item of sorted) {
    const at = new Date(item.createdAt).getTime();
    const group = at >= midnight ? 0 : at >= midnight - 6 * DAY ? 1 : 2;
    groups[group]!.items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

/** Lower case without accents, so "fria" finds "fría". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function searchText(item: RecommendedRequest): string {
  const r = item.request;
  return [
    r.applianceTypeName,
    applianceLabel(r.applianceTypeName),
    r.brand,
    r.model,
    r.description,
    item.symptom,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * /technician: quién necesita una reparación cerca, lo más nuevo primero.
 * The side column opens with the coverage radar (base, radius, category),
 * which filters the feed, and then the technician's own numbers.
 */
export function TechnicianHomePage() {
  const [radius, setRadius] = useState<RadiusOption>(null);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('recent');
  const [focused, setFocused] = useState<number | undefined>();
  // One clock per visit, so freshness does not shift between renders.
  const [now] = useState(() => Date.now());

  const feed = useApiQuery(['tech-recent-feed'], (signal) =>
    listRecommendedRequests({ size: 50 }, { signal }),
  );
  const profile = useApiQuery(['tech-own-profile'], (signal) =>
    getOwnTechnicianProfile({ signal }),
  );
  const opportunities = useApiQuery(['tech-opportunities-count'], (signal) =>
    listMatchingRequests({ size: 1 }, { signal }),
  );

  const all = useMemo(() => feed.data?.content ?? [], [feed.data]);
  const categories = useMemo(
    () =>
      [...new Set(all.map((item) => item.request.applianceTypeName))].sort(),
    [all],
  );
  const needle = fold(query);
  const visible = all
    .filter(
      (item) =>
        (radius === null || item.request.distanceKm <= radius) &&
        (!category || item.request.applianceTypeName === category) &&
        (!needle || fold(searchText(item)).includes(needle)),
    )
    .sort((a, b) =>
      sort === 'near'
        ? a.request.distanceKm - b.request.distanceKm
        : sort === 'no-offers'
          ? a.proposalCount - b.proposalCount ||
            b.createdAt.localeCompare(a.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
    );

  const base = profile.data;
  const district =
    base?.latitude !== undefined && base.longitude !== undefined
      ? nearestLimaDistrict(base.latitude, base.longitude)
      : null;
  const baseLabel = district
    ? `Cerca de ${district} · Lima Metropolitana`
    : 'Tu zona de servicio';

  const setupMissing =
    opportunities.status === 'error' && needsSetup(opportunities.error);

  let main: ReactNode;
  if (setupMissing || (feed.status === 'error' && needsSetup(feed.error))) {
    main = (
      <EmptyState
        icon={<MapPinned size={28} />}
        title="Primero configura tu zona de servicio"
        description="Tu lista depende de dónde trabajas, hasta dónde te desplazas y qué equipos reparas."
      />
    );
  } else if (feed.status === 'error') {
    main = <ErrorState error={feed.error} onRetry={feed.reload} />;
  } else if (!feed.data) {
    main = <ListSkeleton rows={3} label="Buscando solicitudes recientes" />;
  } else if (all.length === 0) {
    main = (
      <EmptyState
        title="Aún no hay solicitudes nuevas cerca"
        description="Las nuevas solicitudes dentro de tu radio, para los equipos que reparas, aparecerán aquí primero."
        action={
          <ButtonLink to="/technician/opportunities" variant="secondary">
            Ver oportunidades
          </ButtonLink>
        }
      />
    );
  } else if (visible.length === 0) {
    main = (
      <EmptyState
        title="Nada con estos filtros"
        description="Prueba un radio mayor, todas las categorías u otra búsqueda."
        action={
          <button
            type="button"
            onClick={() => {
              setRadius(null);
              setCategory('');
              setQuery('');
            }}
            className="button-link"
          >
            Quitar filtros
          </button>
        }
      />
    );
  } else {
    main = (
      <div className="grid gap-8">
        {(sort === 'recent'
          ? groupByRecency(visible, now)
          : [{ title: SORT_TITLE[sort], items: visible }]
        ).map((group) => (
          <section
            key={group.title}
            className="grid gap-3"
            aria-label={group.title}
          >
            <h2 className="m-0 text-sm font-semibold text-muted">
              {group.title}
              <span className="ml-2 tabular-nums">{group.items.length}</span>
            </h2>
            <ul className="stagger spotlight m-0 grid list-none grid-cols-3 gap-5 p-0">
              {group.items.map((item) => (
                <li key={item.request.requestId}>
                  <RecentRequestCard
                    item={item}
                    highlighted={item.request.requestId === focused}
                    onSent={feed.reload}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="technician-home-title" className="grid gap-6">
      <div className="grid min-w-0 gap-6">
        <div className="grid gap-2">
          <h1
            id="technician-home-title"
            tabIndex={-1}
            className="m-0 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em] focus:outline-none"
          >
            ¿Quién necesita una reparación?
          </h1>
          <p className="m-0 max-w-xl text-muted">
            Clientes cerca de ti que publicaron hace poco, lo más nuevo primero.
            Donde aún no hay ofertas es donde más destacas.
          </p>
        </div>
        <CoverageRadar
          baseLabel={baseLabel}
          pins={all.map((item) => ({
            id: item.request.requestId,
            distanceKm: item.request.distanceKm,
            label: item.request.applianceTypeName,
            fresh: now - new Date(item.createdAt).getTime() < FRESH_MS,
          }))}
          visibleCount={visible.length}
          radius={radius}
          onRadiusChange={setRadius}
          categories={categories}
          category={category}
          onCategoryChange={setCategory}
          serviceRadiusKm={base?.maxRadiusKm}
          selectedId={focused}
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          onSelect={(id) => {
            setFocused(id);
            document
              .getElementById(`request-${id}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
        {main}
      </div>
    </section>
  );
}

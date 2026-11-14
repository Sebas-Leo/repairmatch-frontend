import { MapPin, Search } from 'lucide-react';
import { applianceLabel } from '../requests/applianceLabel';
import { cx } from '../../shared/ui/cx';
import {
  RADIUS_OPTIONS,
  SORT_OPTIONS,
  type RadiusOption,
  type SortOption,
} from './coverage';

interface Pin {
  id: number;
  distanceKm: number;
  label: string;
  fresh: boolean;
}

interface CoverageRadarProps {
  baseLabel: string;
  pins: readonly Pin[];
  /** How many requests pass the current filters. */
  visibleCount: number;
  radius: RadiusOption;
  onRadiusChange: (radius: RadiusOption) => void;
  categories: readonly string[];
  category: string;
  onCategoryChange: (category: string) => void;
  /** The technician's configured service radius, shown as text. */
  serviceRadiusKm?: number | undefined;
  selectedId?: number | undefined;
  onSelect?: (id: number) => void;
  query: string;
  onQueryChange: (query: string) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const RINGS = [2, 5, 10] as const;

/** A stable angle per request: the bearing is not in the API, so it is schematic. */
function angleFor(id: number): number {
  return ((id * 137.508) % 360) * (Math.PI / 180);
}

/**
 * The first fold of the technician's home: where they are, how many
 * requests fall in the chosen radius, a radar with those requests, and the
 * radius and category filters right under it. Changing the radius rescales
 * the radar, so its rings grow or shrink in place.
 */
export function CoverageRadar({
  baseLabel,
  pins,
  visibleCount,
  radius,
  onRadiusChange,
  categories,
  category,
  onCategoryChange,
  serviceRadiusKm,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  sort,
  onSortChange,
}: CoverageRadarProps) {
  const farthest = Math.max(5, ...pins.map((p) => p.distanceKm * 1.15));
  const scaleKm = radius ?? farthest;
  const size = 260;
  const centre = size / 2;
  const outer = centre - 12;
  const toPx = (km: number) => (Math.min(km, scaleKm) / scaleKm) * outer;

  return (
    <section
      aria-label="Zona de cobertura"
      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] rounded-[20px] border border-[var(--rm-cover-line)] [background-image:var(--rm-cover-bg)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 p-6">
        <div className="grid gap-4">
          <div className="grid gap-1">
            <p className="m-0 inline-flex items-center gap-1.5 text-sm font-semibold text-slate">
              <MapPin size={16} aria-hidden="true" className="text-cobalt" />
              {baseLabel}
            </p>
            {serviceRadiusKm ? (
              <p className="m-0 text-sm text-muted">
                Atiendes hasta {serviceRadiusKm} km a la redonda.
              </p>
            ) : null}
          </div>
          <p
            className="m-0 font-display text-4xl leading-none font-extrabold tracking-[-0.03em] tabular-nums"
            aria-live="polite"
          >
            {visibleCount}{' '}
            <span className="text-2xl tracking-normal">
              {visibleCount === 1 ? 'solicitud' : 'solicitudes'}
            </span>
            <span className="mt-2 block font-sans text-base font-medium tracking-normal text-muted">
              {radius ? `a ${radius} km de ti` : 'en toda tu zona de servicio'}
              {category ? ` · ${applianceLabel(category)}` : ''}
            </span>
          </p>
          <p className="m-0 flex items-center gap-2 text-sm text-muted">
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-full bg-fresh"
            />
            Últimas 3 h
            <span
              aria-hidden="true"
              className="ml-3 inline-block size-2.5 rounded-full bg-brand"
            />
            Activas
          </p>
        </div>

        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-44"
          role="img"
          aria-label={`Radar: ${visibleCount} solicitudes dentro del filtro`}
        >
          <circle
            cx={centre}
            cy={centre}
            r={outer}
            fill="var(--rm-surface)"
            fillOpacity={0.7}
          />
          {RINGS.map((km) => {
            const visible = km <= scaleKm;
            const active = radius === km;
            const r = visible ? toPx(km) : outer;
            return (
              <g key={km} opacity={visible ? 1 : 0} className="radar-ring">
                <circle
                  className="radar-ring"
                  cx={centre}
                  cy={centre}
                  r={r}
                  fill={active ? 'var(--rm-surface)' : 'none'}
                  fillOpacity={active ? 0.6 : 0}
                  stroke={active ? 'var(--rm-cobalt)' : 'var(--rm-muted)'}
                  strokeOpacity={active ? 1 : 0.35}
                  strokeWidth={active ? 1.5 : 1}
                  strokeDasharray={active ? undefined : '3 4'}
                />
                <text
                  x={centre + 4}
                  y={centre - r + 12}
                  fontSize="9"
                  fill={active ? 'var(--rm-cobalt)' : 'var(--rm-muted)'}
                >
                  {km} km
                </text>
              </g>
            );
          })}
          {pins.map((pin) => {
            const inside = radius === null || pin.distanceKm <= radius;
            const a = angleFor(pin.id);
            const r = toPx(pin.distanceKm);
            const x = centre + Math.cos(a) * r;
            const y = centre + Math.sin(a) * r;
            const selected = pin.id === selectedId;
            const colour = pin.fresh ? 'var(--rm-fresh)' : 'var(--rm-brand)';
            return (
              <g
                key={pin.id}
                className="radar-pin cursor-pointer"
                opacity={inside ? 1 : 0.15}
                onClick={() => onSelect?.(pin.id)}
              >
                <title>{`${applianceLabel(pin.label)} · ${pin.distanceKm.toFixed(1)} km`}</title>
                {pin.fresh && inside ? (
                  <circle
                    className="radar-ping"
                    cx={x}
                    cy={y}
                    r={6}
                    fill="var(--rm-fresh)"
                  />
                ) : null}
                <circle
                  className="radar-pin"
                  cx={x}
                  cy={y}
                  r={selected ? 7 : 5.5}
                  fill={selected ? 'var(--rm-ink)' : colour}
                  stroke="var(--rm-surface)"
                  strokeWidth={2}
                />
              </g>
            );
          })}
          <circle cx={centre} cy={centre} r={8} fill="var(--rm-ink)" />
          <circle cx={centre} cy={centre} r={3.5} fill="var(--rm-surface)" />
        </svg>
      </div>

      <div className="grid content-center gap-4 border-l border-[var(--rm-cover-line)] p-6">
        <div className="grid grid-cols-[65fr_35fr] gap-2">
          <label className="relative">
            <span className="sr-only">Buscar solicitudes</span>
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Equipo, marca o falla…"
              className="min-h-11 w-full rounded-full border border-line bg-surface py-2 pr-4 pl-11 text-ink [&::-webkit-search-cancel-button]:hidden"
            />
          </label>
          <label className="sr-only" htmlFor="feed-sort">
            Ordenar
          </label>
          <select
            id="feed-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            className="min-h-11 w-full rounded-full border border-line bg-surface px-4 text-sm font-semibold"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            role="group"
            aria-label="Radio"
            className="grid gap-2 rounded-2xl border border-line bg-surface p-3"
          >
            <span className="text-xs font-semibold text-slate">Radio</span>
            <div className="grid grid-cols-4 gap-1 rounded-full bg-surface-2 p-1">
              {RADIUS_OPTIONS.map((option) => {
                const active = option === radius;
                return (
                  <button
                    key={option ?? 'all'}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onRadiusChange(option)}
                    className={cx(
                      'min-h-8 rounded-full border-0 px-1 text-xs font-semibold whitespace-nowrap transition-colors duration-200',
                      active
                        ? 'bg-ink text-bg'
                        : 'bg-transparent text-muted hover:text-ink',
                    )}
                  >
                    {option ? `${option} km` : 'Todo'}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2 rounded-2xl border border-line bg-surface p-3">
            <label
              htmlFor="feed-category"
              className="text-xs font-semibold text-slate"
            >
              Categoría
            </label>
            <select
              id="feed-category"
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className={cx(
                'min-h-10 w-full rounded-full border bg-surface px-3 text-sm font-medium',
                category ? 'border-cobalt text-cobalt' : 'border-line text-ink',
              )}
            >
              <option value="">Todas las categorías</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {applianceLabel(name)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

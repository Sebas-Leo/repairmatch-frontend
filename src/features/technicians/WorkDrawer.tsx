import { ArrowRight, CalendarClock, MapPinned, Star, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { Proposal, ProposalStatus, Service } from '../../shared/api/types';
import { formatMoney } from '../../shared/format';
import { nearestLimaDistrict } from '../../shared/geo/limaDistricts';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { cx } from '../../shared/ui/cx';
import { Skeleton } from '../../shared/ui/Skeleton';
import { applianceLabel } from '../requests/applianceLabel';
import { getServiceRequest } from '../requests/api';
import { listServices } from '../services/api';
import {
  getOwnTechnicianProfile,
  getTechnicianReputation,
  listMatchingRequests,
  listOwnProposals,
} from './api';
import { useAvailability } from './availability';

const OFFER: Record<ProposalStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Pendiente', tone: 'bg-warning-soft text-warning' },
  ACCEPTED: { label: 'Aceptada', tone: 'bg-fresh-soft text-fresh' },
  REJECTED: { label: 'No elegida', tone: 'bg-surface-2 text-muted' },
};

const VISIT: Record<
  'PROGRAMADO' | 'EN_ATENCION',
  { label: string; tone: string }
> = {
  PROGRAMADO: { label: 'Programado', tone: 'bg-surface-2 text-ink' },
  EN_ATENCION: { label: 'En atención', tone: 'bg-cobalt-soft text-cobalt' },
};

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

const TIME = new Intl.DateTimeFormat('es-PE', {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * "Tu trabajo", on demand: a slide-over with the technician's profile and
 * availability, upcoming visits, recent offers and how they are doing. It
 * is a native modal dialog, so Esc, focus trapping and the backdrop come
 * from the browser; a click on the backdrop closes it too.
 */
export function WorkDrawer({
  open,
  onClose,
  userId,
  name,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  name: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [available, setAvailable] = useAvailability();

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    // jsdom has no showModal; the content still renders for tests.
    if (open && !node.open && typeof node.showModal === 'function')
      node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  const profile = useApiQuery(
    ['drawer-profile'],
    (signal) => getOwnTechnicianProfile({ signal }),
    { enabled: open },
  );
  const reputation = useApiQuery(
    ['drawer-reputation', userId],
    (signal) => getTechnicianReputation(userId, { signal }),
    { enabled: open && Boolean(userId) },
  );
  const offers = useApiQuery(
    ['drawer-offers'],
    (signal) => listOwnProposals({ size: 100 }, { signal }),
    { enabled: open },
  );
  const services = useApiQuery(
    ['drawer-services'],
    (signal) => listServices({ signal }),
    { enabled: open },
  );
  const nearby = useApiQuery(
    ['drawer-nearby'],
    (signal) => listMatchingRequests({ size: 1 }, { signal }),
    { enabled: open },
  );

  const proposals = offers.data?.content ?? [];
  const byProposal = new Map(proposals.map((p) => [p.id, p]));
  const upcoming = (services.data ?? [])
    .filter(
      (s): s is Service & { status: 'PROGRAMADO' | 'EN_ATENCION' } =>
        s.technicianId === userId &&
        (s.status === 'PROGRAMADO' || s.status === 'EN_ATENCION'),
    )
    .map((service) => ({
      service,
      proposal: byProposal.get(service.proposalId),
    }))
    .sort((a, b) =>
      (a.proposal?.availableAt ?? '').localeCompare(
        b.proposal?.availableAt ?? '',
      ),
    );
  const accepted = proposals.filter((p) => p.status === 'ACCEPTED').length;
  const pending = proposals.filter((p) => p.status === 'PENDING').length;
  const total = offers.data?.totalElements ?? proposals.length;
  const rating = reputation.data;
  const types = (profile.data?.applianceTypes ?? []).map(applianceLabel);
  const specialty =
    types.length === 0
      ? null
      : types.length <= 2
        ? types.join(' y ')
        : `${types.slice(0, 2).join(', ')} y ${types.length - 2} más`;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label="Tu trabajo"
      className="drawer fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[400px] max-w-[92vw] overflow-y-auto border-0 border-l border-line bg-surface p-0 text-ink shadow-[-24px_0_60px_-20px_rgb(40_20_5/35%)] backdrop:bg-ink/25 backdrop:backdrop-blur-[2px]"
    >
      <div className="grid gap-6 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-full bg-ink font-display text-lg font-bold text-bg"
            >
              {initials(name)}
            </span>
            <div className="grid gap-0.5">
              <h2 className="m-0 text-lg">{name}</h2>
              <p className="m-0 text-sm text-muted">
                {specialty ? `Atiende ${specialty}` : 'Técnico'}
              </p>
              <p className="m-0 inline-flex items-center gap-1 text-sm">
                <Star
                  size={14}
                  aria-hidden="true"
                  className="fill-sun text-sun"
                />
                {rating ? (
                  <>
                    <span className="font-semibold tabular-nums">
                      {rating.reviewCount > 0
                        ? rating.averageRating.toFixed(1)
                        : '—'}
                    </span>
                    <span className="text-muted">
                      ·{' '}
                      {rating.reviewCount === 1
                        ? '1 reseña'
                        : `${rating.reviewCount} reseñas`}
                    </span>
                  </>
                ) : (
                  <Skeleton className="h-4 w-20" />
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-10 place-items-center rounded-full border border-line bg-surface hover:bg-surface-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div
          className={cx(
            'flex items-center gap-3 rounded-2xl p-4 transition-colors duration-300',
            available ? 'bg-fresh-soft' : 'bg-surface-2',
          )}
        >
          <button
            type="button"
            role="switch"
            aria-checked={available}
            onClick={() => setAvailable(!available)}
            className={cx(
              'relative h-7 w-12 shrink-0 rounded-full border-0 p-0 transition-colors duration-300',
              available ? 'bg-fresh' : 'bg-line',
            )}
          >
            <span className="sr-only">Disponible hoy</span>
            <span
              aria-hidden="true"
              className={cx(
                'absolute top-1 left-1 size-5 rounded-full bg-surface shadow-card transition-transform duration-300 ease-out-soft',
                available && 'translate-x-5',
              )}
            />
          </button>
          <span className="grid gap-0.5">
            <span
              className={cx(
                'font-semibold',
                available ? 'text-fresh' : 'text-muted',
              )}
            >
              {available ? 'Disponible hoy' : 'Pausado'}
            </span>
            <span className="text-xs text-muted">
              {profile.data?.maxRadiusKm
                ? `Atiendes hasta ${profile.data.maxRadiusKm} km · `
                : ''}
              preferencia de este equipo
            </span>
          </span>
        </div>

        <section
          className="grid gap-3 border-t border-line pt-5"
          aria-label="Próximas visitas"
        >
          <div className="flex items-center justify-between">
            <h3 className="m-0 text-base">Próximas visitas</h3>
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold tabular-nums">
              {upcoming.length === 1
                ? '1 visita'
                : `${upcoming.length} visitas`}
            </span>
          </div>
          {!services.data && services.status !== 'error' ? (
            <Skeleton className="h-12 w-full" />
          ) : services.status === 'error' ? (
            <p className="m-0 text-sm text-muted">No se pudo cargar ahora</p>
          ) : upcoming.length === 0 ? (
            <p className="m-0 text-sm text-muted">
              Sin visitas pendientes. Cuando un cliente acepte tu oferta,
              aparecerá aquí.
            </p>
          ) : (
            <ul className="m-0 grid list-none gap-2 p-0">
              {upcoming.map(({ service, proposal }) => (
                <VisitRow
                  key={service.id}
                  requestId={service.requestId}
                  when={proposal?.availableAt}
                  status={VISIT[service.status]}
                />
              ))}
            </ul>
          )}
        </section>

        <section
          className="grid gap-3 border-t border-line pt-5"
          aria-label="Ofertas recientes"
        >
          <div className="flex items-center justify-between">
            <h3 className="m-0 text-base">Ofertas recientes</h3>
            <Link
              to="/technician/proposals"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand no-underline"
            >
              Ver todas <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {!offers.data && offers.status !== 'error' ? (
            <Skeleton className="h-16 w-full" />
          ) : offers.status === 'error' ? (
            <p className="m-0 text-sm text-muted">No se pudo cargar ahora</p>
          ) : proposals.length === 0 ? (
            <p className="m-0 text-sm text-muted">Aún no envías ofertas.</p>
          ) : (
            <ul className="m-0 grid list-none p-0">
              {proposals.slice(0, 5).map((proposal: Proposal) => (
                <li
                  key={proposal.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
                >
                  <span className="text-sm">
                    Solicitud #{proposal.requestId} ·{' '}
                    <span className="font-semibold tabular-nums">
                      {formatMoney(proposal.diagnosticCost)}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      OFFER[proposal.status].tone,
                    )}
                  >
                    {OFFER[proposal.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="grid gap-3 border-t border-line pt-5"
          aria-label="Rendimiento"
        >
          <h3 className="m-0 text-base">Rendimiento</h3>
          <dl className="m-0 grid grid-cols-3 gap-2">
            <Metric
              label="Oportunidades en tu radio"
              value={
                nearby.status === 'error' ? '—' : nearby.data?.totalElements
              }
            />
            <Metric
              label="Tasa de aceptación"
              value={
                offers.data
                  ? total > 0
                    ? `${Math.round((accepted / total) * 100)}%`
                    : '—'
                  : undefined
              }
            />
            <Metric
              label="Ofertas pendientes"
              value={offers.data ? pending : undefined}
            />
          </dl>
          <Link
            to="/technician/opportunities"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold no-underline hover:bg-surface-2"
          >
            <MapPinned size={15} aria-hidden="true" className="text-cobalt" />
            Ver todas las oportunidades
          </Link>
        </section>
      </div>
    </dialog>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string | undefined;
}) {
  return (
    <div className="grid gap-1 rounded-2xl bg-surface-2 p-3">
      <dt className="text-xs leading-tight text-muted">{label}</dt>
      <dd className="m-0 font-display text-xl font-bold tabular-nums">
        {value === undefined ? <Skeleton className="h-5 w-8" /> : value}
      </dd>
    </div>
  );
}

function VisitRow({
  requestId,
  when,
  status,
}: {
  requestId: number;
  when: string | undefined;
  status: { label: string; tone: string };
}) {
  const request = useApiQuery(['drawer-visit-request', requestId], (signal) =>
    getServiceRequest(requestId, { signal }),
  );
  const r = request.data;
  const district =
    r?.latitude != null && r.longitude != null
      ? nearestLimaDistrict(r.latitude, r.longitude)
      : null;
  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl border border-line p-3">
      <span className="grid gap-0.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <CalendarClock size={14} aria-hidden="true" className="text-cobalt" />
          {when ? TIME.format(new Date(when)) : 'Por coordinar'}
        </span>
        <span className="text-sm text-muted">
          {r
            ? [applianceLabel(r.applianceTypeName), r.brand, district]
                .filter(Boolean)
                .join(' · ')
            : `Solicitud #${requestId}`}
        </span>
      </span>
      <span
        className={cx(
          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
          status.tone,
        )}
      >
        {status.label}
      </span>
    </li>
  );
}

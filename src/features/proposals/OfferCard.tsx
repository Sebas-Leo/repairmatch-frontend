import { CalendarCheck, CheckCircle2, MapPin } from 'lucide-react';
import type { Proposal, ProposalStatus } from '../../shared/api/types';
import { formatMoney } from '../../shared/format';
import { nearestLimaDistrict } from '../../shared/geo/limaDistricts';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { cx } from '../../shared/ui/cx';
import { Skeleton } from '../../shared/ui/Skeleton';
import { getServiceRequest } from '../requests/api';
import { applianceLabel } from '../requests/applianceLabel';
import { CoverPhoto } from '../requests/CoverPhoto';

const STATUS: Record<ProposalStatus, { label: string; tone: string }> = {
  ACCEPTED: { label: 'Aceptada', tone: 'bg-fresh-soft text-fresh' },
  PENDING: { label: 'Pendiente', tone: 'bg-warning-soft text-warning' },
  REJECTED: { label: 'No elegida', tone: 'bg-surface-2 text-muted' },
};

const WHEN = new Intl.DateTimeFormat('es-PE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function km(
  from:
    | { latitude?: number | undefined; longitude?: number | undefined }
    | undefined,
  to: { latitude: number | null; longitude: number | null } | undefined,
): number | null {
  if (
    from?.latitude === undefined ||
    from.longitude === undefined ||
    to?.latitude == null ||
    to.longitude == null
  )
    return null;
  const rad = Math.PI / 180;
  const a =
    Math.sin(((to.latitude - from.latitude) * rad) / 2) ** 2 +
    Math.cos(from.latitude * rad) *
      Math.cos(to.latitude * rad) *
      Math.sin(((to.longitude - from.longitude) * rad) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * One offer the technician sent, told from the request's side: what the
 * appliance is, where, the amount and visit time offered, and the note. An
 * offer that was not chosen stays visible but quiet.
 */
export function OfferCard({
  proposal,
  base,
}: {
  proposal: Proposal;
  /** The technician's base, to show how far the request is. */
  base?:
    | { latitude?: number | undefined; longitude?: number | undefined }
    | undefined;
}) {
  const request = useApiQuery(['offer-request', proposal.requestId], (signal) =>
    getServiceRequest(proposal.requestId, { signal }),
  );
  const r = request.data;
  const product = r ? [r.brand, r.model].filter(Boolean).join(' ') : '';
  const title = r
    ? product || applianceLabel(r.applianceTypeName)
    : `Solicitud #${proposal.requestId}`;
  const district =
    r?.latitude != null && r.longitude != null
      ? nearestLimaDistrict(r.latitude, r.longitude)
      : null;
  const distance = km(base, r);
  const status = STATUS[proposal.status];
  const quiet = proposal.status === 'REJECTED';

  return (
    <article
      className={cx(
        'grid grid-cols-[9rem_minmax(0,1fr)] overflow-hidden rounded-card border border-line bg-surface transition-opacity',
        quiet && 'opacity-65',
      )}
    >
      <CoverPhoto
        applianceName={r?.applianceTypeName ?? ''}
        className="h-full w-full rounded-none !aspect-auto"
      />
      <div className="grid content-start gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-0.5">
            <h2 className="m-0 truncate text-lg" title={title}>
              {r ? title : <Skeleton className="h-6 w-40" />}
            </h2>
            <p className="m-0 inline-flex items-center gap-1 text-sm text-slate">
              <MapPin size={14} aria-hidden="true" className="text-cobalt" />
              {[
                r ? applianceLabel(r.applianceTypeName) : null,
                district,
                distance !== null ? `${distance.toFixed(1)} km` : null,
              ]
                .filter(Boolean)
                .join(' · ') || `Solicitud #${proposal.requestId}`}
            </p>
          </div>
          <span
            className={cx(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              status.tone,
            )}
          >
            {status.label}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="m-0 font-display text-2xl font-extrabold tabular-nums">
            {formatMoney(proposal.diagnosticCost)}
          </p>
          <p className="m-0 inline-flex items-center gap-1.5 text-sm text-slate">
            <CalendarCheck
              size={15}
              aria-hidden="true"
              className="text-cobalt"
            />
            {WHEN.format(new Date(proposal.availableAt))}
          </p>
        </div>

        <p className="m-0 line-clamp-2 text-sm text-muted">
          {proposal.conditions}
        </p>

        {proposal.status === 'ACCEPTED' ? (
          <p className="m-0 inline-flex items-center gap-1.5 rounded-full bg-fresh-strong px-4 py-2 text-sm font-semibold text-white">
            <CheckCircle2 size={16} aria-hidden="true" />
            El cliente eligió tu oferta: ya es un servicio
          </p>
        ) : null}
      </div>
    </article>
  );
}

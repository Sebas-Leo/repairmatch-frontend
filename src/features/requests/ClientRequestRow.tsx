import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import type { ServiceRequest } from '../../shared/api/types';
import { formatMoney } from '../../shared/format';
import { cx } from '../../shared/ui/cx';
import { timeAgo } from '../technicians/timeAgo';
import { applianceLabel } from './applianceLabel';
import { useOfferSummary } from './offerSummary';
import { CoverPhoto } from './CoverPhoto';
import { RequestProgress } from './RequestProgress';
import { RequestStatusBadge } from './RequestStatusBadge';

/**
 * A request in "Mis solicitudes": thumbnail on the left, badges, model and
 * description, the journey along the bottom and a footer that says where
 * the offers stand. Cancelled and expired requests stay readable but quiet.
 */
export function ClientRequestRow({ request }: { request: ServiceRequest }) {
  const product = [request.brand, request.model].filter(Boolean).join(' ');
  const title = product || applianceLabel(request.applianceTypeName);
  const { count, lowest } = useOfferSummary(request.id);
  const hasOffers = Boolean(count);
  const stopped =
    request.status === 'CANCELADA' || request.status === 'EXPIRADA';

  return (
    <article
      className={cx(
        'group relative grid h-full grid-cols-[9.5rem_minmax(0,1fr)] overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[border-color,box-shadow] duration-200 hover:border-cobalt/40 hover:shadow-[0_10px_24px_-14px_rgb(28_25_23/30%)]',
        stopped && 'opacity-70',
      )}
    >
      <CoverPhoto
        applianceName={request.applianceTypeName}
        className="h-full w-full rounded-none !aspect-auto"
      />
      <div className="flex min-w-0 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-cobalt-soft px-2.5 py-0.5 text-xs font-semibold text-cobalt">
            {applianceLabel(request.applianceTypeName)}
          </span>
          {hasOffers && count ? (
            <span className="rounded-full bg-fresh-soft px-2.5 py-0.5 text-xs font-semibold text-fresh">
              {count === 1 ? '1 oferta' : `${count} ofertas`}
            </span>
          ) : (
            <RequestStatusBadge status={request.status} />
          )}
          <span className="ml-auto text-xs text-muted">
            {timeAgo(request.createdAt)} · #{request.id}
          </span>
        </div>
        <div className="grid gap-1">
          <h2 className="m-0 truncate text-lg" title={title}>
            <Link
              to={`/client/requests/${request.id}`}
              className="no-underline after:absolute after:inset-0"
            >
              {title}
            </Link>
          </h2>
          <p className="m-0 line-clamp-2 text-sm text-muted">
            {request.originalDescription}
          </p>
        </div>
        <div className="mt-auto grid gap-4 pt-1">
          <RequestProgress status={request.status} />
          <div className="flex items-center justify-between gap-3">
            <span
              className={cx(
                'text-sm',
                hasOffers
                  ? 'font-display text-base font-bold tabular-nums'
                  : 'text-muted',
              )}
            >
              {stopped
                ? 'Sin cambios'
                : hasOffers && lowest !== undefined
                  ? `Desde ${formatMoney(lowest)}`
                  : 'Esperando cotizaciones'}
            </span>
            <span
              aria-hidden="true"
              className={cx(
                'inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold',
                stopped
                  ? 'border border-line text-muted'
                  : hasOffers
                    ? 'bg-fresh-strong text-white transition-colors group-hover:bg-[#065f46]'
                    : 'offer-cta',
              )}
            >
              {hasOffers && !stopped ? 'Revisar ofertas' : 'Ver detalle'}
              <ArrowRight size={15} />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

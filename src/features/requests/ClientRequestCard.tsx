import { ArrowRight, Clock, MessageSquareText } from 'lucide-react';
import { Link } from 'react-router';
import type { ServiceRequest } from '../../shared/api/types';
import { cx } from '../../shared/ui/cx';
import { timeAgo } from '../technicians/timeAgo';
import { applianceLabel } from './applianceLabel';
import { CoverPhoto } from './CoverPhoto';
import { offerSummaryLabel, useOfferSummary } from './offerSummary';
import { RequestProgress } from './RequestProgress';
import { RequestStatusBadge } from './RequestStatusBadge';

/**
 * One of the client's open requests in the home grid. The card is a column:
 * whatever the description length, the journey and the action sit at the
 * bottom, so cards in a row line up. Once offers arrive, they lead.
 */
export function ClientRequestCard({ request }: { request: ServiceRequest }) {
  const product = [request.brand, request.model].filter(Boolean).join(' ');
  const title = product || applianceLabel(request.applianceTypeName);
  const { count, lowest } = useOfferSummary(request.id);
  const hasOffers = Boolean(count);

  return (
    <article className="feed-card group relative flex h-full flex-col rounded-card border border-line bg-surface shadow-card">
      <div className="overflow-hidden rounded-t-card">
        <CoverPhoto
          applianceName={request.applianceTypeName}
          className="aspect-[16/10] rounded-none"
        >
          <span className="absolute top-3 left-3 rounded-full bg-cobalt-soft px-3 py-1 text-xs font-semibold text-cobalt">
            {applianceLabel(request.applianceTypeName)}
          </span>
          <span className="absolute top-3 right-3">
            {hasOffers && count ? (
              <span className="rounded-full bg-fresh-soft px-2.5 py-0.5 text-xs font-semibold text-fresh">
                {offerSummaryLabel(count, lowest)}
              </span>
            ) : (
              <RequestStatusBadge status={request.status} />
            )}
          </span>
        </CoverPhoto>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pt-4 pb-5">
        <p className="m-0 flex items-center gap-x-3 text-sm text-slate">
          <span className="inline-flex items-center gap-1">
            <Clock size={14} aria-hidden="true" />
            {timeAgo(request.createdAt)}
          </span>
          <span aria-hidden="true" className="text-line">
            ·
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageSquareText size={14} aria-hidden="true" />
            {count === undefined
              ? 'Ofertas…'
              : count === 0
                ? 'Sin ofertas aún'
                : count === 1
                  ? '1 oferta'
                  : `${count} ofertas`}
          </span>
        </p>
        <h3 className="m-0 truncate text-lg" title={title}>
          <Link
            to={`/client/requests/${request.id}`}
            className="no-underline after:absolute after:inset-0 after:rounded-card"
          >
            {title}
          </Link>
        </h3>
        <p className="m-0 line-clamp-2 text-sm text-muted">
          {request.originalDescription}
        </p>
        <div className="mt-auto grid gap-4 pt-1">
          <RequestProgress status={request.status} />
          <span
            aria-hidden="true"
            className={cx(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold',
              hasOffers
                ? 'bg-fresh-strong text-white transition-colors group-hover:bg-[#065f46]'
                : 'offer-cta',
            )}
          >
            {hasOffers ? 'Revisar ofertas' : 'Ver solicitud'}
            <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}

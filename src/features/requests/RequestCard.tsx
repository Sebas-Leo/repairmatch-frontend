import { ArrowUpRight, CalendarClock, MessageSquareText } from 'lucide-react';
import { Link } from 'react-router';
import type { ServiceRequest } from '../../shared/api/types';
import { formatDateTime } from '../../shared/format';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { listRequestProposals } from '../proposals/api';
import { ApplianceIcon } from './ApplianceIcon';
import { RequestProgress } from './RequestProgress';
import { RequestStatusBadge } from './RequestStatusBadge';

/** One request in a list; the title links to its detail page. */
export function RequestCard({
  request,
  showOffers = false,
}: {
  request: ServiceRequest;
  /** Also fetch and show how many offers the request has received. */
  showOffers?: boolean;
}) {
  const product = [request.brand, request.model].filter(Boolean).join(' ');
  return (
    <article className="group lift relative grid gap-4 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink transition-colors duration-300 group-hover:bg-brand-soft group-hover:text-brand"
        >
          <ApplianceIcon name={request.applianceTypeName} size={24} />
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="m-0 text-lg">
              <Link
                to={`/client/requests/${request.id}`}
                className="inline-flex items-center gap-1 no-underline after:absolute after:inset-0 after:rounded-card hover:text-brand"
              >
                {request.applianceTypeName}
                {product ? (
                  <span className="font-sans text-base font-normal text-muted">
                    · {product}
                  </span>
                ) : null}
                <ArrowUpRight
                  size={18}
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </h2>
            <RequestStatusBadge status={request.status} />
          </div>
          <p className="m-0 line-clamp-2 text-muted">
            {request.originalDescription}
          </p>
        </div>
      </div>
      <RequestProgress status={request.status} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <p className="m-0 flex items-center gap-1">
          <CalendarClock size={14} aria-hidden="true" />
          Published {formatDateTime(request.createdAt)} · #{request.id}
        </p>
        {showOffers ? <OfferCount requestId={request.id} /> : null}
      </div>
    </article>
  );
}

function OfferCount({ requestId }: { requestId: number }) {
  const offers = useApiQuery(['request-offer-count', requestId], (signal) =>
    listRequestProposals(requestId, { signal }),
  );
  if (!offers.data) return null;
  const count = offers.data.length;
  return (
    <span
      className={
        count > 0
          ? 'relative z-10 inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand'
          : 'inline-flex items-center gap-1'
      }
    >
      <MessageSquareText size={14} aria-hidden="true" />
      {count === 0
        ? 'No offers yet'
        : count === 1
          ? '1 offer received'
          : `${count} offers received`}
    </span>
  );
}

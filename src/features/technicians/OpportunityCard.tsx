import { MapPin, MessageSquareText, Send } from 'lucide-react';
import type { MatchingRequest } from '../../shared/api/types';
import { ButtonLink } from '../../shared/ui/Button';
import { CoverPhoto } from '../requests/CoverPhoto';

/** A repair request near the technician that they can send an offer for. */
export function OpportunityCard({
  opportunity,
  offers,
}: {
  opportunity: MatchingRequest;
  /** Offers the request already has; `undefined` when unknown. */
  offers?: number | undefined;
}) {
  const product = [opportunity.brand, opportunity.model]
    .filter(Boolean)
    .join(' ');
  return (
    <article className="group lift grid h-full overflow-hidden rounded-card border border-line bg-surface">
      <CoverPhoto applianceName={opportunity.applianceTypeName}>
        <span className="absolute top-3 left-3 rounded-full bg-surface px-3 py-1 text-xs font-semibold">
          {opportunity.applianceTypeName}
        </span>
      </CoverPhoto>
      <div className="grid content-start gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
            <MapPin size={15} aria-hidden="true" className="text-brand" />
            {opportunity.distanceKm.toFixed(1)} km away
          </span>
          <span className="inline-flex items-center gap-1 text-muted tabular-nums">
            <MessageSquareText size={15} aria-hidden="true" />
            {offers === undefined
              ? opportunity.status === 'CON_PROPUESTAS'
                ? 'Has offers'
                : 'No offers yet'
              : offers === 1
                ? '1 offer'
                : `${offers} offers`}
          </span>
        </div>
        <h2 className="m-0 text-lg">
          {product || opportunity.applianceTypeName}
          <span className="sr-only"> · request #{opportunity.requestId}</span>
        </h2>
        <p className="m-0 line-clamp-2 text-muted">{opportunity.description}</p>
        <div className="pt-1">
          <ButtonLink
            to={`/technician/opportunities/${opportunity.requestId}/offer`}
            state={opportunity}
            size="sm"
            icon={<Send size={16} aria-hidden="true" />}
          >
            Send offer
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

import { MapPin } from 'lucide-react';
import type { MatchingRequest } from '../../shared/api/types';
import { Card } from '../../shared/ui/Card';
import { RequestStatusBadge } from '../requests/RequestStatusBadge';

/** A repair request near the technician that they can send an offer for. */
export function OpportunityCard({
  opportunity,
}: {
  opportunity: MatchingRequest;
}) {
  const product = [opportunity.brand, opportunity.model]
    .filter(Boolean)
    .join(' ');
  return (
    <Card as="article" className="grid gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="m-0 text-lg">
          {opportunity.applianceTypeName}
          {product ? (
            <span className="font-sans text-base font-normal text-muted">
              {' '}
              · {product}
            </span>
          ) : null}
        </h2>
        <RequestStatusBadge status={opportunity.status} />
      </div>
      <p className="m-0 line-clamp-3">{opportunity.description}</p>
      <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
        <MapPin size={16} aria-hidden="true" />
        {opportunity.distanceKm.toFixed(1)} km away · request #
        {opportunity.requestId}
      </p>
    </Card>
  );
}

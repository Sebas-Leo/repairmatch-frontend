import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import type { ServiceRequest } from '../../shared/api/types';
import { formatDateTime } from '../../shared/format';
import { Card } from '../../shared/ui/Card';
import { RequestStatusBadge } from './RequestStatusBadge';

/** One request in a list; the title links to its detail page. */
export function RequestCard({ request }: { request: ServiceRequest }) {
  const product = [request.brand, request.model].filter(Boolean).join(' ');
  return (
    <Card as="article" className="grid gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="m-0 text-lg">
          <Link
            to={`/client/requests/${request.id}`}
            className="inline-flex items-center gap-1 no-underline hover:text-brand"
          >
            {request.applianceTypeName}
            {product ? (
              <span className="font-sans text-base font-normal text-muted">
                · {product}
              </span>
            ) : null}
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </h2>
        <RequestStatusBadge status={request.status} />
      </div>
      <p className="m-0 line-clamp-2 text-muted">
        {request.originalDescription}
      </p>
      <p className="m-0 flex items-center gap-1 text-sm text-muted">
        <CalendarClock size={14} aria-hidden="true" />
        Published {formatDateTime(request.createdAt)} · #{request.id}
      </p>
    </Card>
  );
}

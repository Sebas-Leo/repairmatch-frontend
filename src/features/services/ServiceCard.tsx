import { ArrowRight, Calendar, FileText, Wrench } from 'lucide-react';
import { Link } from 'react-router';
import type { Role, Service } from '../../shared/api/types';
import { formatDateTime } from '../../shared/format';
import { Card } from '../../shared/ui/Card';
import { ServiceStatusBadge } from './ServiceStatusBadge';

export function ServiceCard({
  service,
  role,
}: {
  service: Service;
  role: Role;
}) {
  const basePath =
    role === 'CLIENT' ? '/client/services' : '/technician/services';

  return (
    <Card as="article" className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <h2 className="m-0 text-base font-semibold">
            <Link
              to={`${basePath}/${service.id}`}
              className="text-ink no-underline hover:text-brand focus-visible:underline"
            >
              Service #{service.id}
            </Link>
          </h2>
          <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Wrench size={14} aria-hidden="true" />
              Technician: {service.technicianName}
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText size={14} aria-hidden="true" />
              Request #{service.requestId}
            </span>
          </p>
        </div>
        <ServiceStatusBadge status={service.status} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={14} aria-hidden="true" />
          Created {formatDateTime(service.createdAt)}
        </span>
        <Link
          to={`${basePath}/${service.id}`}
          className="inline-flex items-center gap-1 font-medium text-brand no-underline hover:underline"
        >
          View details
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}

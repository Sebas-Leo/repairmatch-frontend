import { ArrowRight, Wrench } from 'lucide-react';
import { Link } from 'react-router';
import type { Role, Service } from '../../shared/api/types';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { cx } from '../../shared/ui/cx';
import { Skeleton } from '../../shared/ui/Skeleton';
import { getServiceRequest } from '../requests/api';
import { applianceLabel } from '../requests/applianceLabel';
import { CoverPhoto } from '../requests/CoverPhoto';
import { timeAgo } from '../technicians/timeAgo';
import { ServiceProgress } from './ServiceProgress';
import { ServiceStatusBadge } from './ServiceStatusBadge';

export function ServiceCard({
  service,
  role,
}: {
  service: Service;
  role: Role;
}) {
  const detailPath =
    role === 'CLIENT'
      ? `/client/services/${service.id}`
      : `/technician/services/${service.id}`;

  const requestQuery = useApiQuery(
    ['service-request', service.requestId],
    (signal) => getServiceRequest(service.requestId, { signal }),
  );
  const req = requestQuery.data;

  const product = req ? [req.brand, req.model].filter(Boolean).join(' ') : '';
  const title = req
    ? product || applianceLabel(req.applianceTypeName)
    : `Servicio #${service.id}`;
  const cancelled = service.status === 'CANCELADO';

  return (
    <article
      className={cx(
        'group relative grid h-full grid-cols-[9.5rem_minmax(0,1fr)] overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[border-color,box-shadow] duration-200 hover:border-cobalt/40 hover:shadow-[0_10px_24px_-14px_rgb(28_25_23/30%)]',
        cancelled && 'opacity-70',
      )}
    >
      <CoverPhoto
        applianceName={req?.applianceTypeName ?? ''}
        className="h-full w-full rounded-none !aspect-auto"
      />
      <div className="flex min-w-0 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {req ? (
            <span className="rounded-full bg-cobalt-soft px-2.5 py-0.5 text-xs font-semibold text-cobalt">
              {applianceLabel(req.applianceTypeName)}
            </span>
          ) : null}
          <ServiceStatusBadge status={service.status} />
          <span className="ml-auto text-xs text-muted">
            {timeAgo(service.createdAt)} · #{service.id}
          </span>
        </div>

        <div className="grid gap-1">
          <h2 className="m-0 truncate text-lg" title={title}>
            <Link
              to={detailPath}
              className="no-underline after:absolute after:inset-0"
            >
              {requestQuery.status === 'loading' && !req ? (
                <Skeleton className="h-6 w-44" />
              ) : (
                title
              )}
            </Link>
          </h2>
          {req?.originalDescription ? (
            <p className="m-0 line-clamp-2 text-sm text-muted">
              {req.originalDescription}
            </p>
          ) : null}
        </div>

        <div className="mt-auto grid gap-4 pt-1">
          <ServiceProgress status={service.status} />
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-slate">
              <Wrench size={14} aria-hidden="true" className="text-cobalt" />
              <span>
                Técnico:{' '}
                <strong className="font-semibold text-ink">
                  {service.technicianName}
                </strong>
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cx(
                'inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold',
                cancelled
                  ? 'border border-line text-muted'
                  : service.status === 'COMPLETADO' && role === 'CLIENT'
                    ? 'bg-fresh-strong text-white transition-colors group-hover:bg-[#065f46]'
                    : 'offer-cta',
              )}
            >
              {service.status === 'COMPLETADO' && role === 'CLIENT'
                ? 'Ver o calificar'
                : 'Ver detalle'}
              <ArrowRight size={15} />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

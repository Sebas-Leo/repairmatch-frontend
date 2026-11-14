import {
  Ban,
  Calendar,
  CheckCircle2,
  FileText,
  Play,
  Wrench,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '../auth/authContext';
import { getService, updateServiceStatus } from './api';
import { describeApiError } from '../../shared/api/errorMessages';
import type { ServiceStatusUpdate } from '../../shared/api/types';
import { formatDateTime } from '../../shared/format';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useToast } from '../../shared/toast/toastContext';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { ServiceReviewSection } from './ServiceReviewSection';
import {
  getAvailableTransitions,
  getServiceStatusMeta,
  type StatusTransition,
} from './serviceStatus';
import { ServiceStatusBadge } from './ServiceStatusBadge';

function transitionIcon(status: ServiceStatusUpdate) {
  if (status === 'EN_ATENCION') return <Play size={18} aria-hidden="true" />;
  if (status === 'COMPLETADO')
    return <CheckCircle2 size={18} aria-hidden="true" />;
  return <Ban size={18} aria-hidden="true" />;
}

/** /client/services/:serviceId and /technician/services/:serviceId */
export function ServiceDetailPage() {
  const { serviceId } = useParams();
  const id = Number(serviceId);
  const validId = Number.isInteger(id) && id > 0;

  const auth = useAuth();
  const role = auth.status === 'authenticated' ? auth.user.role : 'CLIENT';
  const homePath = role === 'CLIENT' ? '/client' : '/technician';
  const listPath = `${homePath}/services`;

  const toast = useToast();
  const [pending, setPending] = useState<StatusTransition | null>(null);
  const [busy, setBusy] = useState(false);
  const actedRef = useRef(false);

  const serviceQuery = useApiQuery(
    ['service', id],
    (signal) => getService(id, { signal }),
    { enabled: validId, keepPreviousData: false },
  );

  const crumbs = [
    { label: 'Dashboard', to: homePath },
    { label: 'Services', to: listPath },
    { label: validId ? `Service #${id}` : 'Service' },
  ];

  if (!validId) {
    return (
      <section aria-labelledby="service-title">
        <PageHeader
          titleId="service-title"
          title="Service not found"
          breadcrumbs={crumbs}
        />
        <ButtonLink to={listPath} variant="secondary">
          Back to services
        </ButtonLink>
      </section>
    );
  }

  const data = serviceQuery.data;
  if (!data) {
    return (
      <section aria-labelledby="service-title">
        <PageHeader
          titleId="service-title"
          title={`Service #${id}`}
          breadcrumbs={crumbs}
        />
        {serviceQuery.status === 'error' ? (
          <ErrorState
            error={serviceQuery.error}
            onRetry={serviceQuery.reload}
          />
        ) : (
          <ListSkeleton rows={2} label="Loading service details" />
        )}
      </section>
    );
  }

  const transitions = getAvailableTransitions(data.status, role);
  const statusMeta = getServiceStatusMeta(data.status);

  async function confirmTransition() {
    if (!pending) return;
    setBusy(true);
    actedRef.current = true;
    try {
      await updateServiceStatus(id, pending.nextStatus);
      toast.success(pending.successMessage);
    } catch (err) {
      toast.error(describeApiError(err).message);
    } finally {
      setPending(null);
      setBusy(false);
      serviceQuery.reload();
    }
  }

  return (
    <section aria-labelledby="service-title">
      <PageHeader
        titleId="service-title"
        title={`Service #${data.id}`}
        description={`Scheduled ${formatDateTime(data.createdAt)}`}
        breadcrumbs={crumbs}
        actions={
          transitions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {transitions.map((item) => (
                <Button
                  key={item.nextStatus}
                  variant={item.tone === 'danger' ? 'danger' : 'primary'}
                  icon={transitionIcon(item.nextStatus)}
                  onClick={() => setPending(item)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="grid content-start gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 text-lg">Service status</h2>
            <ServiceStatusBadge status={data.status} />
          </div>
          <p className="m-0 text-sm text-muted">{statusMeta.summary}</p>

          <dl className="m-0 grid gap-2.5 border-t border-line pt-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted">
                <Wrench size={15} aria-hidden="true" />
                Technician
              </dt>
              <dd className="m-0 font-medium">{data.technicianName}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted">
                <FileText size={15} aria-hidden="true" />
                Related request
              </dt>
              <dd className="m-0 font-medium">
                {role === 'CLIENT' ? (
                  <Link
                    to={`/client/requests/${data.requestId}`}
                    className="text-brand no-underline hover:underline"
                  >
                    Request #{data.requestId}
                  </Link>
                ) : (
                  `Request #${data.requestId}`
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted">
                <FileText size={15} aria-hidden="true" />
                Accepted offer
              </dt>
              <dd className="m-0 font-medium">Offer #{data.proposalId}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted">
                <Calendar size={15} aria-hidden="true" />
                Created
              </dt>
              <dd className="m-0 font-medium">
                {formatDateTime(data.createdAt)}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="grid content-start gap-4">
          <ServiceReviewSection
            serviceId={data.id}
            status={data.status}
            role={role}
          />
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        busy={busy}
        tone={pending?.tone ?? 'primary'}
        title={pending?.dialogTitle ?? ''}
        description={pending?.dialogDescription ?? ''}
        confirmLabel={pending?.confirmLabel ?? 'Confirm'}
        cancelLabel={pending?.cancelLabel ?? 'Cancel'}
        onConfirm={() => void confirmTransition()}
        onCancel={() => setPending(null)}
        returnFocus={() => {
          if (!actedRef.current) return null;
          actedRef.current = false;
          return document.getElementById('service-title');
        }}
      />
    </section>
  );
}

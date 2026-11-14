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
import { getServiceRequest } from '../requests/api';
import { applianceLabel } from '../requests/applianceLabel';
import { CoverPhoto } from '../requests/CoverPhoto';
import { ServiceProgress } from './ServiceProgress';
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

  const data = serviceQuery.data;

  const requestQuery = useApiQuery(
    ['service-request', data?.requestId ?? 0],
    (signal) => getServiceRequest(data!.requestId, { signal }),
    { enabled: Boolean(data?.requestId) },
  );
  const req = requestQuery.data;

  const crumbs = [
    { label: 'Inicio', to: homePath },
    { label: 'Servicios', to: listPath },
    { label: validId ? `Servicio #${id}` : 'Servicio' },
  ];

  if (!validId) {
    return (
      <section aria-labelledby="service-title">
        <PageHeader
          titleId="service-title"
          title="Servicio no encontrado"
          breadcrumbs={crumbs}
        />
        <ButtonLink to={listPath} variant="secondary">
          Volver a servicios
        </ButtonLink>
      </section>
    );
  }

  if (!data) {
    return (
      <section aria-labelledby="service-title">
        <PageHeader
          titleId="service-title"
          title={`Servicio #${id}`}
          breadcrumbs={crumbs}
        />
        {serviceQuery.status === 'error' ? (
          <ErrorState
            error={serviceQuery.error}
            onRetry={serviceQuery.reload}
          />
        ) : (
          <ListSkeleton rows={2} label="Cargando detalle del servicio" />
        )}
      </section>
    );
  }

  const transitions = getAvailableTransitions(data.status, role);
  const statusMeta = getServiceStatusMeta(data.status);
  const product = req ? [req.brand, req.model].filter(Boolean).join(' ') : '';
  const heading = product || `Servicio #${data.id}`;

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
        title={heading}
        description={`Servicio #${data.id} · Agendado el ${formatDateTime(data.createdAt)}`}
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
        <Card className="grid content-start gap-4 overflow-hidden p-0">
          {req ? (
            <CoverPhoto
              applianceName={req.applianceTypeName}
              className="h-44 w-full rounded-none !aspect-auto"
            />
          ) : null}

          <div className="grid gap-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {req ? (
                  <span className="rounded-full bg-cobalt-soft px-2.5 py-0.5 text-xs font-semibold text-cobalt">
                    {applianceLabel(req.applianceTypeName)}
                  </span>
                ) : null}
                <ServiceStatusBadge status={data.status} />
              </div>
            </div>

            <ServiceProgress status={data.status} />

            <p className="m-0 text-sm text-muted">{statusMeta.summary}</p>

            {req?.originalDescription ? (
              <p className="m-0 rounded-xl bg-surface-2 p-3 text-sm text-ink">
                {req.originalDescription}
              </p>
            ) : null}

            <dl className="m-0 grid gap-2.5 border-t border-line pt-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-muted">
                  <Wrench
                    size={15}
                    aria-hidden="true"
                    className="text-cobalt"
                  />
                  Técnico
                </dt>
                <dd className="m-0 font-medium">{data.technicianName}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-muted">
                  <FileText
                    size={15}
                    aria-hidden="true"
                    className="text-cobalt"
                  />
                  Solicitud relacionada
                </dt>
                <dd className="m-0 font-medium">
                  {role === 'CLIENT' ? (
                    <Link
                      to={`/client/requests/${data.requestId}`}
                      className="text-cobalt no-underline hover:underline"
                    >
                      Solicitud #{data.requestId}
                    </Link>
                  ) : (
                    `Solicitud #${data.requestId}`
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-muted">
                  <FileText
                    size={15}
                    aria-hidden="true"
                    className="text-cobalt"
                  />
                  Oferta aceptada
                </dt>
                <dd className="m-0 font-medium">Oferta #{data.proposalId}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-muted">
                  <Calendar
                    size={15}
                    aria-hidden="true"
                    className="text-cobalt"
                  />
                  Fecha de creación
                </dt>
                <dd className="m-0 font-medium">
                  {formatDateTime(data.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
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
        confirmLabel={pending?.confirmLabel ?? 'Confirmar'}
        cancelLabel={pending?.cancelLabel ?? 'Cancelar'}
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

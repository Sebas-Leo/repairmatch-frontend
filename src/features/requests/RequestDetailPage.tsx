import { Ban, Image as ImageIcon, MapPin } from 'lucide-react';
import { useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { RequestPhotoUpload } from './RequestPhotoUpload';
import type { PendingPhoto } from './publishWithPhoto';
import { acceptProposal, listRequestProposals } from '../proposals/api';
import { ProposalCard } from '../proposals/ProposalCard';
import { describeApiError } from '../../shared/api/errorMessages';
import type { Proposal } from '../../shared/api/types';
import { formatDateTime } from '../../shared/format';
import { httpUrl } from '../../shared/safeUrl';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { useToast } from '../../shared/toast/toastContext';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { cancelServiceRequest, getServiceRequest, listEvidences } from './api';
import { isOpenRequest } from './requestStatus';
import { RequestStatusBadge } from './RequestStatusBadge';

type Pending = { kind: 'cancel' } | { kind: 'accept'; proposal: Proposal };

/** /client/requests/:requestId: the request, its photos and its offers. */
export function RequestDetailPage() {
  const { requestId } = useParams();
  const location = useLocation();
  const photoState = location.state as { pendingPhoto?: PendingPhoto } | null;
  const id = Number(requestId);
  const validId = Number.isInteger(id) && id > 0;
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  // After an action the button that opened the dialog may be gone: focus the title.
  const actedRef = useRef(false);

  const request = useApiQuery(
    ['request', id],
    (signal) => getServiceRequest(id, { signal }),
    { enabled: validId, keepPreviousData: false },
  );
  const evidences = useApiQuery(
    ['request-evidences', id],
    (signal) => listEvidences(id, { signal }),
    { enabled: validId, keepPreviousData: false },
  );
  const proposals = useApiQuery(
    ['request-proposals', id],
    (signal) => listRequestProposals(id, { signal }),
    { enabled: validId, keepPreviousData: false },
  );

  const crumbs = [
    { label: 'Inicio', to: '/client' },
    { label: 'Mis solicitudes', to: '/client/requests' },
    { label: validId ? `Solicitud #${id}` : 'Solicitud' },
  ];

  if (!validId) {
    return (
      <section aria-labelledby="request-title">
        <PageHeader
          titleId="request-title"
          title="Solicitud no encontrada"
          breadcrumbs={crumbs}
        />
        <ButtonLink to="/client/requests" variant="secondary">
          Volver a mis solicitudes
        </ButtonLink>
      </section>
    );
  }

  const data = request.data;
  if (!data) {
    return (
      <section aria-labelledby="request-title">
        <PageHeader
          titleId="request-title"
          title={`Solicitud #${id}`}
          breadcrumbs={crumbs}
        />
        {request.status === 'error' ? (
          <ErrorState error={request.error} onRetry={request.reload} />
        ) : (
          <ListSkeleton rows={2} label="Cargando la solicitud" />
        )}
      </section>
    );
  }

  const open = isOpenRequest(data.status);
  const offers = proposals.data ?? [];
  const cheapest = offers.reduce<Proposal | undefined>(
    (best, offer) =>
      !best || offer.diagnosticCost < best.diagnosticCost ? offer : best,
    undefined,
  );

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    actedRef.current = true;
    try {
      if (pending.kind === 'cancel') {
        await cancelServiceRequest(id);
        toast.success('Solicitud cancelada. Los técnicos ya no podrán verla.');
      } else {
        await acceptProposal(pending.proposal.id);
        toast.success(
          `Oferta de ${pending.proposal.technicianName} aceptada. El servicio quedó programado.`,
        );
      }
    } catch (error) {
      toast.error(describeApiError(error).message);
    } finally {
      // Success or not (a 409 means someone else changed it), show the truth.
      setPending(null);
      setBusy(false);
      request.reload();
      proposals.reload();
    }
  }

  const product = [data.brand, data.model].filter(Boolean).join(' ');
  return (
    <section aria-labelledby="request-title">
      <PageHeader
        titleId="request-title"
        title={`${data.applianceTypeName}${product ? ` · ${product}` : ''}`}
        description={`Solicitud #${data.id}, publicada el ${formatDateTime(data.createdAt)}`}
        breadcrumbs={crumbs}
        actions={
          open ? (
            <Button
              variant="danger"
              icon={<Ban size={18} aria-hidden="true" />}
              onClick={() => setPending({ kind: 'cancel' })}
            >
              Cancelar solicitud
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-4">
          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-lg">Problema</h2>
              <RequestStatusBadge status={data.status} />
            </div>
            <p className="m-0 whitespace-pre-line">
              {data.originalDescription}
            </p>
            <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={16} aria-hidden="true" />
              {data.latitude !== null && data.longitude !== null
                ? `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`
                : 'Sin ubicación: debes agregarla para encontrar técnicos compatibles.'}
            </p>
          </Card>
          <Card className="grid gap-3">
            <h2 className="m-0 text-lg">Fotos</h2>
            <RequestPhotoUpload
              key={id}
              requestId={id}
              pendingPhoto={photoState?.pendingPhoto ?? null}
              onAdded={evidences.reload}
            />
            {evidences.status === 'error' ? (
              <ErrorState error={evidences.error} onRetry={evidences.reload} />
            ) : !evidences.data ? (
              <ListSkeleton rows={1} label="Cargando fotos" />
            ) : evidences.data.length === 0 ? (
              <p className="m-0 flex items-center gap-1.5 text-muted">
                <ImageIcon size={16} aria-hidden="true" />
                Todavía no hay fotos. Agrega una aquí o usa la cámara del móvil.
              </p>
            ) : (
              <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
                {evidences.data.map((evidence) => {
                  const url = httpUrl(evidence.mediaUrl);
                  return (
                    <li key={evidence.evidenceNumber}>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer noopener">
                          <img
                            src={url}
                            alt={`Foto ${evidence.evidenceNumber} del electrodoméstico`}
                            loading="lazy"
                            className="aspect-square w-full rounded-lg border border-line object-cover"
                          />
                        </a>
                      ) : (
                        <span className="grid aspect-square place-items-center rounded-lg border border-line p-2 text-center text-sm text-muted">
                          Foto {evidence.evidenceNumber}: dirección no válida
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-3">
          <h2 className="m-0 text-lg">
            Ofertas{offers.length ? ` (${offers.length})` : ''}
          </h2>
          {proposals.status === 'error' ? (
            <ErrorState error={proposals.error} onRetry={proposals.reload} />
          ) : !proposals.data ? (
            <ListSkeleton rows={2} label="Cargando ofertas" />
          ) : offers.length === 0 ? (
            <EmptyState
              title="Todavía no hay ofertas"
              description={
                open
                  ? 'Los técnicos compatibles podrán ver esta solicitud y enviar sus ofertas aquí.'
                  : 'Esta solicitud se cerró sin ofertas.'
              }
            />
          ) : (
            <ul className="stagger m-0 grid list-none gap-4 p-0">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <ProposalCard
                    proposal={offer}
                    highlight={
                      offers.length > 1 && offer.id === cheapest?.id
                        ? 'Menor costo'
                        : undefined
                    }
                    action={
                      open && offer.status === 'PENDING' ? (
                        <Button
                          onClick={() =>
                            setPending({ kind: 'accept', proposal: offer })
                          }
                        >
                          Aceptar oferta
                        </Button>
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        busy={busy}
        tone={pending?.kind === 'accept' ? 'primary' : 'danger'}
        title={
          pending?.kind === 'accept'
            ? `¿Aceptar la oferta de ${pending.proposal.technicianName}?`
            : '¿Cancelar esta solicitud?'
        }
        description={
          pending?.kind === 'accept'
            ? 'Las demás ofertas serán rechazadas y se cerrará la solicitud. Esta acción no se puede deshacer.'
            : 'Los técnicos dejarán de verla. Esta acción no se puede deshacer.'
        }
        confirmLabel={
          pending?.kind === 'accept' ? 'Aceptar oferta' : 'Cancelar solicitud'
        }
        cancelLabel={
          pending?.kind === 'accept' ? 'Todavía no' : 'Conservar solicitud'
        }
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
        returnFocus={() => {
          if (!actedRef.current) return null;
          actedRef.current = false;
          return document.getElementById('request-title');
        }}
      />
    </section>
  );
}

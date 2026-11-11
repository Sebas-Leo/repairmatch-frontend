import { Ban, Image as ImageIcon, MapPin } from 'lucide-react';
import { useRef, useState } from 'react';
import { useParams } from 'react-router';
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
    { label: 'Dashboard', to: '/client' },
    { label: 'My requests', to: '/client/requests' },
    { label: validId ? `Request #${id}` : 'Request' },
  ];

  if (!validId) {
    return (
      <section aria-labelledby="request-title">
        <PageHeader
          titleId="request-title"
          title="Request not found"
          breadcrumbs={crumbs}
        />
        <ButtonLink to="/client/requests" variant="secondary">
          Back to my requests
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
          title={`Request #${id}`}
          breadcrumbs={crumbs}
        />
        {request.status === 'error' ? (
          <ErrorState error={request.error} onRetry={request.reload} />
        ) : (
          <ListSkeleton rows={2} label="Loading the request" />
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
        toast.success('Request cancelled. Technicians no longer see it.');
      } else {
        await acceptProposal(pending.proposal.id);
        toast.success(
          `Offer from ${pending.proposal.technicianName} accepted. The service is scheduled.`,
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
        description={`Request #${data.id}, published ${formatDateTime(data.createdAt)}`}
        breadcrumbs={crumbs}
        actions={
          open ? (
            <Button
              variant="danger"
              icon={<Ban size={18} aria-hidden="true" />}
              onClick={() => setPending({ kind: 'cancel' })}
            >
              Cancel request
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-4">
          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-lg">Problem</h2>
              <RequestStatusBadge status={data.status} />
            </div>
            <p className="m-0 whitespace-pre-line">
              {data.originalDescription}
            </p>
            <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={16} aria-hidden="true" />
              {data.latitude !== null && data.longitude !== null
                ? `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`
                : 'No location yet: technicians cannot match it until it has one.'}
            </p>
          </Card>
          <Card className="grid gap-3">
            <h2 className="m-0 text-lg">Photos</h2>
            {evidences.status === 'error' ? (
              <ErrorState error={evidences.error} onRetry={evidences.reload} />
            ) : !evidences.data ? (
              <ListSkeleton rows={1} label="Loading photos" />
            ) : evidences.data.length === 0 ? (
              <p className="m-0 flex items-center gap-1.5 text-muted">
                <ImageIcon size={16} aria-hidden="true" />
                No photos yet. The mobile app adds them from the camera.
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
                            alt={`Photo ${evidence.evidenceNumber} of the appliance`}
                            loading="lazy"
                            className="aspect-square w-full rounded-lg border border-line object-cover"
                          />
                        </a>
                      ) : (
                        <span className="grid aspect-square place-items-center rounded-lg border border-line p-2 text-center text-sm text-muted">
                          Photo {evidence.evidenceNumber} has an invalid address
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
            Offers{offers.length ? ` (${offers.length})` : ''}
          </h2>
          {proposals.status === 'error' ? (
            <ErrorState error={proposals.error} onRetry={proposals.reload} />
          ) : !proposals.data ? (
            <ListSkeleton rows={2} label="Loading offers" />
          ) : offers.length === 0 ? (
            <EmptyState
              title="No offers yet"
              description={
                open
                  ? 'Compatible technicians nearby will see this request and send their offers here.'
                  : 'This request closed without offers.'
              }
            />
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <ProposalCard
                    proposal={offer}
                    highlight={
                      offers.length > 1 && offer.id === cheapest?.id
                        ? 'Lowest cost'
                        : undefined
                    }
                    action={
                      open && offer.status === 'PENDING' ? (
                        <Button
                          onClick={() =>
                            setPending({ kind: 'accept', proposal: offer })
                          }
                        >
                          Accept offer
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
            ? `Accept the offer from ${pending.proposal.technicianName}?`
            : 'Cancel this request?'
        }
        description={
          pending?.kind === 'accept'
            ? 'The other offers are declined and the request closes. This cannot be undone.'
            : 'Technicians will stop seeing it and pending offers are discarded. This cannot be undone.'
        }
        confirmLabel={
          pending?.kind === 'accept' ? 'Accept offer' : 'Cancel request'
        }
        cancelLabel={pending?.kind === 'accept' ? 'Not yet' : 'Keep it'}
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

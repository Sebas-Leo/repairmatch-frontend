import {
  CheckCircle2,
  ClipboardList,
  Inbox,
  MessageSquareText,
  Plus,
} from 'lucide-react';
import { useAuth } from '../features/auth/authContext';
import { listServiceRequests } from '../features/requests/api';
import { RequestCard } from '../features/requests/RequestCard';
import type { RequestStatus } from '../shared/api/types';
import { useApiQuery } from '../shared/hooks/useApiQuery';
import { ButtonLink } from '../shared/ui/Button';
import { EmptyState } from '../shared/ui/EmptyState';
import { ErrorState } from '../shared/ui/ErrorState';
import { PageHeader } from '../shared/ui/PageHeader';
import { ListSkeleton } from '../shared/ui/Skeleton';
import { StatCard } from '../shared/ui/StatCard';

const STAT_STATUSES: readonly (RequestStatus | undefined)[] = [
  undefined,
  'PUBLICADA',
  'CON_PROPUESTAS',
  'CERRADA',
];

/**
 * /client: the client's dashboard. Each figure is the `totalElements` of a
 * one-item page, so the counts come from the backend, not from a local list.
 */
export function ClientHomePage() {
  const { user } = useAuth();
  const stats = useApiQuery(['client-stats'], (signal) =>
    Promise.all(
      STAT_STATUSES.map((status) =>
        listServiceRequests({ size: 1, status }, { signal }).then(
          (page) => page.totalElements,
        ),
      ),
    ),
  );
  const recent = useApiQuery(['client-recent'], (signal) =>
    listServiceRequests({ size: 3 }, { signal }),
  );
  const [total, published, withOffers, closed] = stats.data ?? [];

  return (
    <section aria-labelledby="client-home-title">
      <PageHeader
        titleId="client-home-title"
        title="Your repairs"
        description={`Signed in as ${user?.name ?? 'client'}.`}
        actions={
          <ButtonLink
            to="/client/requests/new"
            icon={<Plus size={18} aria-hidden="true" />}
          >
            New request
          </ButtonLink>
        }
      />
      {stats.status === 'error' ? (
        <ErrorState error={stats.error} onRetry={stats.reload} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="All requests"
            value={total}
            icon={<ClipboardList size={18} />}
            to="/client/requests"
          />
          <StatCard
            label="Waiting for offers"
            value={published}
            icon={<Inbox size={18} />}
            to="/client/requests?status=PUBLICADA"
          />
          <StatCard
            label="With offers to review"
            value={withOffers}
            icon={<MessageSquareText size={18} />}
            to="/client/requests?status=CON_PROPUESTAS"
          />
          <StatCard
            label="Closed"
            value={closed}
            icon={<CheckCircle2 size={18} />}
            to="/client/requests?status=CERRADA"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-8 pb-3">
        <h2 className="m-0 text-xl">Latest requests</h2>
        <ButtonLink to="/client/requests" variant="ghost" size="sm">
          See all
        </ButtonLink>
      </div>
      {recent.status === 'error' ? (
        <ErrorState error={recent.error} onRetry={recent.reload} />
      ) : !recent.data ? (
        <ListSkeleton rows={3} label="Loading your latest requests" />
      ) : recent.data.content.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          description="Your first request takes a minute: the appliance, what fails and, if you know them, brand and model."
          action={
            <ButtonLink
              to="/client/requests/new"
              icon={<Plus size={18} aria-hidden="true" />}
            >
              New request
            </ButtonLink>
          }
        />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {recent.data.content.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

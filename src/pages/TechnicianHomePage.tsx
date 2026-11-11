import { FileText, MapPinned, Star } from 'lucide-react';
import { useAuth } from '../features/auth/authContext';
import {
  getTechnicianReputation,
  listMatchingRequests,
  listOwnProposals,
} from '../features/technicians/api';
import { needsSetup } from '../features/technicians/setup';
import { useApiQuery } from '../shared/hooks/useApiQuery';
import { ButtonLink } from '../shared/ui/Button';
import { PageHeader } from '../shared/ui/PageHeader';
import { StatCard } from '../shared/ui/StatCard';

/** /technician: the technician's dashboard, with figures from the backend. */
export function TechnicianHomePage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const opportunities = useApiQuery(['tech-opportunities-count'], (signal) =>
    listMatchingRequests({ size: 1 }, { signal }),
  );
  const proposals = useApiQuery(['tech-proposals-count'], (signal) =>
    listOwnProposals({ size: 1 }, { signal }),
  );
  const reputation = useApiQuery(
    ['tech-reputation', userId],
    (signal) => getTechnicianReputation(userId, { signal }),
    { enabled: Boolean(userId) },
  );

  const setupMissing =
    opportunities.status === 'error' && needsSetup(opportunities.error);
  const rating = reputation.data;

  return (
    <section aria-labelledby="technician-home-title">
      <PageHeader
        titleId="technician-home-title"
        title="Your work"
        description={`Signed in as ${user?.name ?? 'technician'}.`}
        actions={
          <ButtonLink
            to="/technician/opportunities"
            icon={<MapPinned size={18} aria-hidden="true" />}
          >
            See opportunities
          </ButtonLink>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Opportunities nearby"
          value={
            setupMissing || opportunities.status === 'error'
              ? '—'
              : opportunities.data?.totalElements
          }
          hint={
            setupMissing
              ? 'Set up your service area to see them'
              : opportunities.status === 'error'
                ? 'Could not load right now'
                : 'Open requests you can quote'
          }
          icon={<MapPinned size={18} />}
          to="/technician/opportunities"
        />
        <StatCard
          label="Offers sent"
          value={
            proposals.status === 'error' ? '—' : proposals.data?.totalElements
          }
          hint={
            proposals.status === 'error'
              ? 'Could not load right now'
              : 'Every offer, whatever its state'
          }
          icon={<FileText size={18} />}
          to="/technician/proposals"
        />
        <StatCard
          label="Rating"
          value={
            reputation.status === 'error'
              ? '—'
              : rating
                ? rating.reviewCount > 0
                  ? rating.averageRating.toFixed(1)
                  : '—'
                : undefined
          }
          hint={
            reputation.status === 'error'
              ? 'Could not load right now'
              : rating
                ? `${rating.reviewCount} reviews`
                : 'From completed services'
          }
          icon={<Star size={18} />}
        />
      </div>
    </section>
  );
}

import { MapPinOff } from 'lucide-react';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { usePageParams } from '../../shared/hooks/usePageParams';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Pagination } from '../../shared/ui/Pagination';
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { listMatchingRequests } from './api';
import { OpportunityCard } from './OpportunityCard';
import { needsSetup } from './setup';

/** /technician/opportunities: compatible requests nearby, nearest first, paged. */
export function OpportunitiesPage() {
  const params = usePageParams();
  const { page, size } = params;
  const query = useApiQuery(['opportunities', page, size], (signal) =>
    listMatchingRequests({ page, size }, { signal }),
  );
  const data = query.data;

  let content;
  if (!data) {
    content =
      query.status !== 'error' ? (
        <ListSkeleton rows={4} label="Looking for nearby requests" />
      ) : needsSetup(query.error) ? (
        <EmptyState
          icon={<MapPinOff size={36} />}
          title="Set up your service area first"
          description="Opportunities depend on where you work, how far you travel and the appliances you repair."
        />
      ) : (
        <ErrorState error={query.error} onRetry={query.reload} />
      );
  } else if (data.content.length === 0) {
    content = (
      <EmptyState
        title={
          data.totalElements > 0
            ? 'This page is empty'
            : 'No requests nearby right now'
        }
        description={
          data.totalElements > 0
            ? `There are ${data.totalElements} opportunities in ${data.totalPages} pages.`
            : 'New requests inside your radius for the appliances you repair will show up here.'
        }
      />
    );
  } else {
    content = (
      <div aria-busy={query.isFetching || undefined}>
        <ul className="m-0 grid list-none gap-3 p-0">
          {data.content.map((opportunity) => (
            <li key={opportunity.requestId}>
              <OpportunityCard opportunity={opportunity} />
            </li>
          ))}
        </ul>
        <Pagination
          page={data.page}
          size={data.size}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={params.setPage}
          onSizeChange={params.setSize}
          disabled={query.isFetching}
        />
      </div>
    );
  }

  return (
    <section aria-labelledby="opportunities-title">
      <PageHeader
        titleId="opportunities-title"
        title="Opportunities"
        description="Open requests inside your service area, nearest first."
        breadcrumbs={[
          { label: 'Dashboard', to: '/technician' },
          { label: 'Opportunities' },
        ]}
      />
      {content}
    </section>
  );
}

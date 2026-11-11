import { MapPinned } from 'lucide-react';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { usePageParams } from '../../shared/hooks/usePageParams';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Pagination } from '../../shared/ui/Pagination';
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { listOwnProposals } from '../technicians/api';
import { ProposalCard } from './ProposalCard';

/** /technician/proposals: every offer the technician sent, newest first, paged. */
export function MyProposalsPage() {
  const params = usePageParams();
  const { page, size } = params;
  const query = useApiQuery(['my-proposals', page, size], (signal) =>
    listOwnProposals({ page, size }, { signal }),
  );
  const data = query.data;

  let content;
  if (!data) {
    content =
      query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : (
        <ListSkeleton rows={3} label="Loading your offers" />
      );
  } else if (data.content.length === 0) {
    content =
      data.totalElements > 0 ? (
        <EmptyState
          title="This page is empty"
          description={`You have ${data.totalElements} offers in ${data.totalPages} pages.`}
          action={
            <Button onClick={() => params.setPage(data.totalPages - 1)}>
              Go to the last page
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="No offers sent yet"
          description="Pick a nearby request and send your first offer."
          action={
            <ButtonLink
              to="/technician/opportunities"
              icon={<MapPinned size={18} aria-hidden="true" />}
            >
              See opportunities
            </ButtonLink>
          }
        />
      );
  } else {
    content = (
      <div aria-busy={query.isFetching || undefined}>
        <ul className="m-0 grid list-none gap-3 p-0">
          {data.content.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard
                proposal={proposal}
                heading={`Request #${proposal.requestId}`}
              />
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
    <section aria-labelledby="my-proposals-title">
      <PageHeader
        titleId="my-proposals-title"
        title="My offers"
        description="Pending offers wait for the client; accepted ones become services."
        breadcrumbs={[
          { label: 'Dashboard', to: '/technician' },
          { label: 'My offers' },
        ]}
      />
      {data && query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : null}
      {content}
    </section>
  );
}

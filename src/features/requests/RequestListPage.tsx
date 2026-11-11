import { Plus, SearchX } from 'lucide-react';
import { listServiceRequests } from './api';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { usePageParams } from '../../shared/hooks/usePageParams';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Pagination } from '../../shared/ui/Pagination';
import { SearchInput } from '../../shared/ui/SearchInput';
import { SelectField } from '../../shared/ui/SelectField';
import { ListSkeleton } from '../../shared/ui/Skeleton';
import { RequestCard } from './RequestCard';
import { isRequestStatus, REQUEST_STATUS_OPTIONS } from './requestStatus';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
] as const;

/** /client/requests: the client's requests, paged, searchable and filterable. */
export function RequestListPage() {
  const params = usePageParams();
  const rawStatus = params.get('status');
  const status = isRequestStatus(rawStatus) ? rawStatus : undefined;
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const { page, size, search } = params;

  const query = useApiQuery(
    ['requests', page, size, status, search, sort],
    (signal) =>
      listServiceRequests({ page, size, status, search, sort }, { signal }),
  );
  const data = query.data;
  const filtered = Boolean(status || search);

  function clearFilters() {
    params.setFilters({ status: '', search: '' });
  }

  let content;
  if (!data) {
    content =
      query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : (
        <ListSkeleton rows={4} label="Loading your requests" />
      );
  } else if (data.content.length === 0) {
    content =
      data.totalElements > 0 ? (
        <EmptyState
          title="This page is empty"
          description={`There are ${data.totalElements} requests across ${data.totalPages} pages.`}
          action={
            <Button onClick={() => params.setPage(data.totalPages - 1)}>
              Go to the last page
            </Button>
          }
        />
      ) : filtered ? (
        <EmptyState
          icon={<SearchX size={36} />}
          title="No requests match"
          description="Try another word or status."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="No requests yet"
          description="Describe what is broken and nearby technicians will send you offers."
          action={
            <ButtonLink
              to="/client/requests/new"
              icon={<Plus size={18} aria-hidden="true" />}
            >
              New request
            </ButtonLink>
          }
        />
      );
  } else {
    content = (
      <div aria-busy={query.isFetching || undefined}>
        <ul className="m-0 grid list-none gap-3 p-0">
          {data.content.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} />
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
    <section aria-labelledby="requests-title">
      <PageHeader
        titleId="requests-title"
        title="My requests"
        description="Follow each repair from publication to the accepted offer."
        breadcrumbs={[
          { label: 'Dashboard', to: '/client' },
          { label: 'My requests' },
        ]}
        actions={
          <ButtonLink
            to="/client/requests/new"
            icon={<Plus size={18} aria-hidden="true" />}
          >
            New request
          </ButtonLink>
        }
      />
      <div className="flex flex-wrap items-end gap-x-4 gap-y-0 pb-2">
        <div className="mb-4 w-full sm:w-auto sm:flex-1">
          <SearchInput
            label="Search requests"
            placeholder="Search by appliance, brand or problem"
            value={search}
            onSearch={params.setSearch}
          />
        </div>
        <SelectField
          id="requests-status"
          label="Status"
          placeholder="All statuses"
          options={REQUEST_STATUS_OPTIONS}
          value={status ?? ''}
          onChange={(event) => params.setFilter('status', event.target.value)}
        />
        <SelectField
          id="requests-sort"
          label="Sort"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(event) =>
            params.setFilter(
              'sort',
              event.target.value === 'oldest' ? 'oldest' : '',
            )
          }
        />
      </div>
      {data && query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : null}
      {content}
    </section>
  );
}

import { SearchX, Wrench } from 'lucide-react';
import { useAuth } from '../auth/authContext';
import { listServices } from './api';
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
import { ServiceCard } from './ServiceCard';
import { isServiceStatus, SERVICE_STATUS_OPTIONS } from './serviceStatus';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
] as const;

/** /client/services and /technician/services: services of the signed-in user. */
export function ServiceListPage() {
  const auth = useAuth();
  const role = auth.status === 'authenticated' ? auth.user.role : 'CLIENT';
  const homePath = role === 'CLIENT' ? '/client' : '/technician';

  const params = usePageParams();
  const rawStatus = params.get('status');
  const status = isServiceStatus(rawStatus) ? rawStatus : undefined;
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const { page, size, search } = params;

  const query = useApiQuery(['services'], (signal) => listServices({ signal }));
  const allServices = query.data;
  const filtered = Boolean(status || search);

  function clearFilters() {
    params.setFilters({ status: '', search: '' });
  }

  let content;
  if (!allServices) {
    content =
      query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : (
        <ListSkeleton rows={4} label="Loading services" />
      );
  } else {
    const term = search.trim().toLowerCase();
    const matching = allServices
      .filter((item) => (!status ? true : item.status === status))
      .filter((item) => {
        if (!term) return true;
        return (
          `#${item.id}`.includes(term) ||
          String(item.id).includes(term) ||
          `#${item.requestId}`.includes(term) ||
          String(item.requestId).includes(term) ||
          item.technicianName.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const cmp = a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
        return sort === 'oldest' ? cmp : -cmp;
      });

    const totalElements = matching.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const start = page * size;
    const pageItems = matching.slice(start, start + size);

    if (pageItems.length === 0) {
      content =
        totalElements > 0 ? (
          <EmptyState
            title="This page is empty"
            description={`There are ${totalElements} services across ${totalPages} pages.`}
            action={
              <Button onClick={() => params.setPage(totalPages - 1)}>
                Go to the last page
              </Button>
            }
          />
        ) : filtered ? (
          <EmptyState
            icon={<SearchX size={36} />}
            title="No services match"
            description="Try another search term or status filter."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Wrench size={36} />}
            title="No services yet"
            description={
              role === 'CLIENT'
                ? 'Accept an offer on one of your requests to schedule your first repair service.'
                : 'When a client accepts one of your offers, the scheduled service appears here.'
            }
            action={
              <ButtonLink
                to={
                  role === 'CLIENT'
                    ? '/client/requests'
                    : '/technician/opportunities'
                }
              >
                {role === 'CLIENT'
                  ? 'View my requests'
                  : 'Browse opportunities'}
              </ButtonLink>
            }
          />
        );
    } else {
      content = (
        <div aria-busy={query.isFetching || undefined}>
          <ul className="m-0 grid list-none gap-3 p-0">
            {pageItems.map((service) => (
              <li key={service.id}>
                <ServiceCard service={service} role={role} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            size={size}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={params.setPage}
            onSizeChange={params.setSize}
            disabled={query.isFetching}
          />
        </div>
      );
    }
  }

  return (
    <section aria-labelledby="services-title">
      <PageHeader
        titleId="services-title"
        title="Services"
        description={
          role === 'CLIENT'
            ? 'Track scheduled repairs, cancel before they start, and review completed work.'
            : 'Manage your scheduled repairs from start to completion.'
        }
        breadcrumbs={[
          { label: 'Dashboard', to: homePath },
          { label: 'Services' },
        ]}
      />

      <div className="flex flex-wrap items-end gap-x-4 gap-y-0 pb-2">
        <div className="mb-4 w-full sm:w-auto sm:flex-1">
          <SearchInput
            label="Search services"
            placeholder="Search by service #, request # or technician"
            value={search}
            onSearch={params.setSearch}
          />
        </div>
        <SelectField
          id="services-status"
          label="Status"
          placeholder="All statuses"
          options={SERVICE_STATUS_OPTIONS}
          value={status ?? ''}
          onChange={(event) => params.setFilter('status', event.target.value)}
        />
        <SelectField
          id="services-sort"
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

      {allServices && query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : null}
      {content}
    </section>
  );
}

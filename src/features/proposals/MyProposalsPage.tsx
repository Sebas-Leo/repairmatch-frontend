import { MapPinned } from 'lucide-react';
import type { ProposalStatus } from '../../shared/api/types';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { usePageParams } from '../../shared/hooks/usePageParams';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { cx } from '../../shared/ui/cx';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { Pagination } from '../../shared/ui/Pagination';
import { ListSkeleton, Skeleton } from '../../shared/ui/Skeleton';
import { getOwnTechnicianProfile, listOwnProposals } from '../technicians/api';
import { OfferCard } from './OfferCard';

const TABS: readonly { value: '' | ProposalStatus; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'ACCEPTED', label: 'Aceptadas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'REJECTED', label: 'No elegidas' },
];

/**
 * /technician/proposals: the offers the technician sent, newest first,
 * paged, with totals by state on top. The totals come from every offer;
 * the tabs filter the current page.
 */
export function MyProposalsPage() {
  const params = usePageParams();
  const { page, size } = params;
  const tab = params.get('estado') as '' | ProposalStatus;
  const query = useApiQuery(['my-proposals', page, size], (signal) =>
    listOwnProposals({ page, size }, { signal }),
  );
  const totals = useApiQuery(['my-proposals-totals'], (signal) =>
    listOwnProposals({ size: 100 }, { signal }),
  );
  const profile = useApiQuery(['my-proposals-base'], (signal) =>
    getOwnTechnicianProfile({ signal }),
  );
  const data = query.data;

  const all = totals.data?.content;
  const count = (status: ProposalStatus) =>
    all ? all.filter((p) => p.status === status).length : undefined;
  const sent = totals.data?.totalElements;
  const accepted = count('ACCEPTED');
  const rate =
    sent !== undefined && accepted !== undefined
      ? sent > 0
        ? `${Math.round((accepted / sent) * 100)}%`
        : '—'
      : undefined;

  let content;
  if (!data) {
    content =
      query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : (
        <ListSkeleton rows={3} label="Cargando tus ofertas" />
      );
  } else if (data.content.length === 0) {
    content =
      data.totalElements > 0 ? (
        <EmptyState
          title="Esta página está vacía"
          description={`Tienes ${data.totalElements} ofertas en ${data.totalPages} páginas.`}
          action={
            <Button onClick={() => params.setPage(data.totalPages - 1)}>
              Ir a la última página
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="Aún no envías ofertas"
          description="Elige una solicitud cercana y envía tu primera oferta."
          action={
            <ButtonLink
              to="/technician/opportunities"
              icon={<MapPinned size={18} aria-hidden="true" />}
            >
              Ver oportunidades
            </ButtonLink>
          }
        />
      );
  } else {
    const shown = tab
      ? data.content.filter((p) => p.status === tab)
      : data.content;
    content = (
      <div aria-busy={query.isFetching || undefined} className="grid gap-6">
        {shown.length === 0 ? (
          <EmptyState
            title="Nada en esta pestaña en esta página"
            description="Prueba otra pestaña o la página siguiente."
          />
        ) : (
          <ul className="stagger m-0 grid list-none grid-cols-2 gap-5 p-0">
            {shown.map((proposal) => (
              <li key={proposal.id}>
                <OfferCard proposal={proposal} base={profile.data} />
              </li>
            ))}
          </ul>
        )}
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
    <section aria-labelledby="my-proposals-title" className="grid gap-6">
      <header className="grid gap-2">
        <h1
          id="my-proposals-title"
          tabIndex={-1}
          className="m-0 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em] focus:outline-none"
        >
          Mis ofertas
        </h1>
        <p className="m-0 max-w-2xl text-muted">
          Haz seguimiento a tus cotizaciones enviadas y a las que ya se
          convirtieron en servicios.
        </p>
      </header>

      <dl className="m-0 grid grid-cols-4 gap-3">
        <Kpi label="Enviadas" value={sent} />
        <Kpi label="Aceptadas" value={accepted} tone="text-fresh" />
        <Kpi label="Pendientes" value={count('PENDING')} tone="text-warning" />
        <Kpi label="Tasa de cierre" value={rate} />
      </dl>

      <div
        role="tablist"
        aria-label="Estado"
        className="flex w-fit gap-1 rounded-full bg-surface-2 p-1"
      >
        {TABS.map((option) => {
          const active = option.value === tab;
          const n = option.value ? count(option.value) : sent;
          return (
            <button
              key={option.value || 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => params.setFilter('estado', option.value)}
              className={cx(
                'min-h-9 rounded-full border-0 px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
                active
                  ? 'bg-ink text-bg'
                  : 'bg-transparent text-muted hover:text-ink',
              )}
            >
              {option.label}
              {n !== undefined ? (
                <span className="ml-1.5 tabular-nums opacity-70">({n})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {data && query.status === 'error' ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : null}
      {content}
    </section>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string | undefined;
  tone?: string;
}) {
  return (
    <div className="grid gap-1 rounded-card border border-line bg-surface px-5 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={cx(
          'm-0 font-display text-3xl font-extrabold tabular-nums',
          tone,
        )}
      >
        {value === undefined ? <Skeleton className="h-8 w-12" /> : value}
      </dd>
    </div>
  );
}

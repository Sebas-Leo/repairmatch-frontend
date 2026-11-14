import { CalendarCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Proposal, ProposalStatus } from '../../shared/api/types';
import { formatDateTime, formatMoney } from '../../shared/format';
import { Badge, type BadgeTone } from '../../shared/ui/Badge';

const STATUS: Record<ProposalStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pending', tone: 'info' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  REJECTED: { label: 'Not chosen', tone: 'neutral' },
};

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

interface ProposalCardProps {
  proposal: Proposal;
  /** Marks the cheapest offer of a comparison. */
  highlight?: string | undefined;
  action?: ReactNode;
  /** Title above the cost, for lists where the offer needs context. */
  heading?: string;
}

/** A technician's offer: cost, availability, conditions and its state. */
export function ProposalCard({
  proposal,
  highlight,
  action,
  heading,
}: ProposalCardProps) {
  const status = STATUS[proposal.status];
  return (
    <article className="lift grid gap-4 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
      {heading ? <h2 className="m-0 text-lg">{heading}</h2> : null}
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-ink font-display text-base font-bold text-bg"
        >
          {initials(proposal.technicianName)}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="m-0 truncate font-display text-lg font-bold">
            {proposal.technicianName}
          </p>
          <div className="flex flex-wrap gap-1">
            {highlight ? <Badge tone="success">{highlight}</Badge> : null}
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
        </div>
        <div className="grid justify-items-end gap-0.5 rounded-2xl bg-surface-2 px-4 py-2">
          <p className="m-0 font-display text-2xl font-extrabold tabular-nums">
            {formatMoney(proposal.diagnosticCost)}
          </p>
          <p className="m-0 text-xs text-muted">Diagnostic cost</p>
        </div>
      </div>
      <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
        <CalendarCheck size={16} aria-hidden="true" />
        Available {formatDateTime(proposal.availableAt)}
      </p>
      <p className="m-0 whitespace-pre-line">{proposal.conditions}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </article>
  );
}

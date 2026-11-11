import { CalendarCheck, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Proposal, ProposalStatus } from '../../shared/api/types';
import { formatDateTime, formatMoney } from '../../shared/format';
import { Badge, type BadgeTone } from '../../shared/ui/Badge';
import { Card } from '../../shared/ui/Card';

const STATUS: Record<ProposalStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pending', tone: 'info' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  REJECTED: { label: 'Not chosen', tone: 'neutral' },
};

interface ProposalCardProps {
  proposal: Proposal;
  /** Marks the cheapest offer of a comparison. */
  highlight?: string | undefined;
  action?: ReactNode;
}

/** A technician's offer: cost, availability, conditions and its state. */
export function ProposalCard({
  proposal,
  highlight,
  action,
}: ProposalCardProps) {
  const status = STATUS[proposal.status];
  return (
    <Card as="article" className="grid gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <p className="m-0 font-display text-2xl font-bold tabular-nums">
            {formatMoney(proposal.diagnosticCost)}
          </p>
          <p className="m-0 text-sm text-muted">Diagnostic cost</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {highlight ? <Badge tone="success">{highlight}</Badge> : null}
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>
      <p className="m-0 flex items-center gap-1.5">
        <UserRound size={16} aria-hidden="true" className="text-muted" />
        {proposal.technicianName}
      </p>
      <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
        <CalendarCheck size={16} aria-hidden="true" />
        Available {formatDateTime(proposal.availableAt)}
      </p>
      <p className="m-0 whitespace-pre-line">{proposal.conditions}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  );
}

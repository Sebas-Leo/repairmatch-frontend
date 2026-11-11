import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Icon element; defaults to an inbox. */
  icon?: ReactNode;
  /** The next step, usually a `ButtonLink` or `Button`. */
  action?: ReactNode;
}

/** What an empty list shows: why it is empty and what to do next. */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-6 py-10 text-center">
      <span className="text-muted" aria-hidden="true">
        {icon ?? <Inbox size={36} />}
      </span>
      <p className="m-0 font-display text-lg font-bold">{title}</p>
      {description ? (
        <p className="m-0 max-w-md text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

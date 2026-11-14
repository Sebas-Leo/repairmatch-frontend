import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Skeleton } from './Skeleton';

interface StatCardProps {
  label: string;
  /** `undefined` while it loads. */
  value: number | string | undefined;
  icon?: ReactNode;
  hint?: string;
  /** Makes the whole card a link to the list behind the number. */
  to?: string;
}

/** A dashboard figure: what it counts, the number and where it leads. */
export function StatCard({ label, value, icon, hint, to }: StatCardProps) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 text-sm text-muted">
        {label}
        {icon ? (
          <span aria-hidden="true" className="text-brand">
            {icon}
          </span>
        ) : null}
      </span>
      <span className="font-display text-4xl font-extrabold tracking-tight tabular-nums">
        {value === undefined ? <Skeleton className="h-8 w-16" /> : value}
      </span>
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </>
  );
  const classes =
    'grid gap-1 rounded-card border border-line bg-surface p-5 no-underline shadow-card';
  return to ? (
    <Link to={to} className={`${classes} lift hover:border-brand/40`}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

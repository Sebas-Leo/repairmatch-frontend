import { cx } from './cx';

/** A grey placeholder block with a soft pulse, hidden from assistive tech. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'block animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none',
        className ?? 'h-4 w-full',
      )}
    />
  );
}

/** Placeholder for a list that is loading: `rows` card-shaped skeletons. */
export function ListSkeleton({
  rows = 3,
  label = 'Loading…',
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" className="grid gap-3">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid gap-2 rounded-card border border-line bg-surface p-4"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

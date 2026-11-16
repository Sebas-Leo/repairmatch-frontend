import { ShieldCheck } from 'lucide-react';
import { cx } from './cx';

/**
 * "Identidad verificada" pill, shown only when the backend says the person
 * passed Didit. It is a trust hint, never a gate: render it conditionally.
 */
export function IdentityBadge({
  label = 'Identidad verificada',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-fresh-soft px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-fresh',
        className,
      )}
    >
      <ShieldCheck size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

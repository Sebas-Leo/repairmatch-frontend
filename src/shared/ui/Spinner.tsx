import { LoaderCircle } from 'lucide-react';
import { cx } from './cx';

interface SpinnerProps {
  size?: number;
  /** When set, the spinner is announced; otherwise it is decorative. */
  label?: string;
  className?: string;
}

export function Spinner({ size = 20, label, className }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      className={cx('inline-flex items-center gap-2', className)}
    >
      <LoaderCircle
        size={size}
        aria-hidden="true"
        className="animate-spin motion-reduce:animate-none"
      />
      {label ? <span className="visually-hidden">{label}</span> : null}
    </span>
  );
}

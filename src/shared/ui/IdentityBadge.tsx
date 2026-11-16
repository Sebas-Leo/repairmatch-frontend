import { ShieldCheck } from 'lucide-react';
import { cx } from './cx';

/**
 * "Identidad verificada" pill, shown only when the backend says the person
 * passed Didit. It is a trust hint, never a gate: render it conditionally.
 *
 * `nameMatches === false` means the profile name differs from the verified
 * document: we then only claim "Persona verificada" and add a muted note.
 * `true` or `null`/`undefined` (unknown) keep the regular label.
 */
export function IdentityBadge({
  label = 'Identidad verificada',
  nameMatches,
  className,
}: {
  label?: string;
  nameMatches?: boolean | null | undefined;
  className?: string;
}) {
  const mismatch = nameMatches === false;
  const pill = (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-fresh-soft px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-fresh',
        !mismatch && className,
      )}
    >
      <ShieldCheck size={13} aria-hidden="true" />
      {mismatch ? 'Persona verificada' : label}
    </span>
  );
  if (!mismatch) return pill;
  return (
    <span className={cx('inline-flex flex-col items-start gap-0.5', className)}>
      {pill}
      <span className="text-xs text-muted">
        El nombre del perfil no coincide con su documento
      </span>
    </span>
  );
}

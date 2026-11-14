import { useState } from 'react';
import { ApplianceIcon } from '../../features/requests/ApplianceIcon';
import { cx } from '../../shared/ui/cx';

/**
 * A landing photo. It loads `/landing/<photo>.jpg` from `public/`; while
 * that file is missing it draws a lit scene with the appliance instead,
 * so the page never shows an empty "demo" box.
 */
export function Scene({
  photo,
  appliance,
  alt,
  className,
  tone = 'warm',
}: {
  photo: string;
  appliance: string;
  alt: string;
  className?: string;
  tone?: 'warm' | 'cool' | 'sage';
}) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        src={`/landing/${photo}.jpg`}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cx('size-full object-cover', className)}
      />
    );
  }
  const backdrop = {
    warm: 'from-[#f6ddc9] via-[#efe4d6] to-[#d9cdbd]',
    cool: 'from-[#dbe5f2] via-[#e9edf1] to-[#c9d3df]',
    sage: 'from-[#dfe9e3] via-[#e9eee9] to-[#c6d3cb]',
  }[tone];
  return (
    <div
      role="img"
      aria-label={alt}
      className={cx(
        'relative grid size-full place-items-center overflow-hidden bg-gradient-to-br',
        backdrop,
        className,
      )}
    >
      <span className="absolute -top-1/4 -left-1/4 size-3/4 rounded-full bg-white/50 blur-3xl" />
      <span className="absolute right-0 bottom-0 left-0 h-1/4 bg-gradient-to-t from-black/10 to-transparent" />
      <span className="relative text-ink/70 drop-shadow-[0_18px_18px_rgb(28_25_23/25%)]">
        <ApplianceIcon name={appliance} size={112} strokeWidth={1.1} />
      </span>
      <span className="absolute bottom-[18%] h-3 w-1/3 rounded-full bg-black/15 blur-md" />
    </div>
  );
}

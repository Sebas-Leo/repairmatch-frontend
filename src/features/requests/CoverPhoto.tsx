import type { ReactNode } from 'react';
import { cx } from '../../shared/ui/cx';
import { ApplianceIcon } from './ApplianceIcon';

/**
 * The 16:9 photo slot of a request. Until real photos come from the API,
 * it shows a demo cover: the appliance drawn large on a warm field, clearly
 * labelled as a demo so nobody takes it for the client's photo.
 */
export function CoverPhoto({
  applianceName,
  src,
  children,
  className,
}: {
  /** Overrides the frame, e.g. to fill a side column instead of 16:9. */
  className?: string;
  applianceName: string;
  src?: string | null | undefined;
  /** Overlays such as the category badge. */
  children?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'relative aspect-video overflow-hidden rounded-t-card bg-surface-2',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={`Photo of the ${applianceName.toLowerCase()}`}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
        />
      ) : (
        <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--rm-brand-soft),transparent_65%)]">
          <span
            aria-hidden="true"
            className="text-brand/80 transition-transform duration-700 ease-out-soft group-hover:scale-105"
          >
            <ApplianceIcon name={applianceName} size={72} strokeWidth={1.2} />
          </span>
          <span className="absolute right-3 bottom-3 whitespace-nowrap rounded-full bg-surface/90 px-2.5 py-0.5 text-xs font-medium text-muted">
            Foto demo
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

import type { RequestStatus } from '../../shared/api/types';
import { cx } from '../../shared/ui/cx';

const STEPS = ['Publicada', 'Ofertas', 'Técnico elegido'] as const;

/** How far along the request is: index of the current step, or null when it stopped. */
function reached(status: RequestStatus): number | null {
  switch (status) {
    case 'PUBLICADA':
      return 0;
    case 'CON_PROPUESTAS':
      return 1;
    case 'CERRADA':
      return 2;
    default:
      return null;
  }
}

/**
 * The request's journey as a row of stops: done stops are filled, the
 * current one glows, the rest wait. A cancelled or expired request keeps
 * the track but greys it out, so the card still says where it stopped.
 */
export function RequestProgress({ status }: { status: RequestStatus }) {
  const current = reached(status);
  const stopped = current === null;
  return (
    <ol
      className="m-0 grid list-none grid-cols-3 p-0"
      aria-label={stopped ? 'Solicitud detenida' : `Paso ${current + 1} de 3`}
    >
      {STEPS.map((label, index) => {
        const done = !stopped && index < current;
        const now = !stopped && index === current;
        return (
          <li key={label} className="relative grid gap-2">
            <span className="flex items-center">
              <span
                aria-hidden="true"
                className={cx(
                  'relative z-10 size-3 shrink-0 rounded-full transition-colors duration-500',
                  now && 'pulse-dot size-3.5 bg-brand ring-4 ring-brand-soft',
                  done && 'bg-ink',
                  !now && !done && 'border-2 border-line bg-surface',
                )}
              />
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cx(
                    'h-0.5 flex-1 rounded-full',
                    done ? 'bg-ink' : 'bg-line',
                  )}
                />
              ) : null}
            </span>
            <span
              className={cx(
                'text-xs',
                now ? 'font-semibold text-ink' : 'text-muted',
              )}
              aria-current={now ? 'step' : undefined}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import type { ServiceStatus } from '../../shared/api/types';
import { cx } from '../../shared/ui/cx';

const STEPS = ['Programado', 'En atención', 'Completado'] as const;

function reached(status: ServiceStatus): number | null {
  switch (status) {
    case 'PROGRAMADO':
      return 0;
    case 'EN_ATENCION':
      return 1;
    case 'COMPLETADO':
      return 2;
    default:
      return null;
  }
}

/**
 * El recorrido del servicio como una sucesión de paradas: Programado -> En atención -> Completado.
 */
export function ServiceProgress({ status }: { status: ServiceStatus }) {
  const current = reached(status);
  const stopped = current === null;

  return (
    <ol
      className="m-0 grid list-none grid-cols-3 p-0"
      aria-label={stopped ? 'Servicio cancelado' : `Paso ${current + 1} de 3`}
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

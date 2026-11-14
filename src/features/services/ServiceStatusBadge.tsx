import type { ServiceStatus } from '../../shared/api/types';
import { cx } from '../../shared/ui/cx';
import { getServiceStatusMeta } from './serviceStatus';

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const meta = getServiceStatusMeta(status);
  return (
    <span
      className={cx(
        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        meta.pillClass,
      )}
    >
      {meta.label}
    </span>
  );
}

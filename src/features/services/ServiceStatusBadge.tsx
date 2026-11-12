import type { ServiceStatus } from '../../shared/api/types';
import { Badge } from '../../shared/ui/Badge';
import { getServiceStatusMeta } from './serviceStatus';

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const meta = getServiceStatusMeta(status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

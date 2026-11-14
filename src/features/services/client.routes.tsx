import type { RouteObject } from 'react-router';
import { lazyPage } from '../../shared/routing/lazyPage';

/** Client screens of the services module, under /client. */
export default [
  {
    path: 'services',
    element: lazyPage(() => import('./ServiceListPage'), 'ServiceListPage'),
  },
  {
    path: 'services/:serviceId',
    element: lazyPage(() => import('./ServiceDetailPage'), 'ServiceDetailPage'),
  },
] satisfies RouteObject[];

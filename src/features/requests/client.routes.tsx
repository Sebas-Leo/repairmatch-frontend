import type { RouteObject } from 'react-router';
import { lazyPage } from '../../shared/routing/lazyPage';

/** Client screens of the requests module, under /client. */
export default [
  {
    path: 'requests',
    element: lazyPage(() => import('./RequestListPage'), 'RequestListPage'),
  },
  {
    path: 'requests/new',
    element: lazyPage(() => import('./NewRequestPage'), 'NewRequestPage'),
  },
  {
    path: 'requests/:requestId',
    element: lazyPage(() => import('./RequestDetailPage'), 'RequestDetailPage'),
  },
] satisfies RouteObject[];

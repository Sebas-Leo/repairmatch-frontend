import type { RouteObject } from 'react-router';
import { lazyPage } from '../../shared/routing/lazyPage';

export default [
  {
    path: 'requests',
    element: lazyPage(() => import('./RequestsPage'), 'RequestsPage'),
  },
] satisfies RouteObject[];
import type { RouteObject } from 'react-router';
import { lazyPage } from '../../shared/routing/lazyPage';

/** Client screens of the identity module, under /client. */
export default [
  {
    path: 'account',
    element: lazyPage(() => import('./AccountPage'), 'AccountPage'),
  },
] satisfies RouteObject[];

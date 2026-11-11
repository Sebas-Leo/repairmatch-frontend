import type { RouteObject } from 'react-router';
import { lazyPage } from '../../shared/routing/lazyPage';

/** Technician screens of the technicians module, under /technician. */
export default [
  {
    path: 'opportunities',
    element: lazyPage(() => import('./OpportunitiesPage'), 'OpportunitiesPage'),
  },
] satisfies RouteObject[];

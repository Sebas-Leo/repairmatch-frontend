import type { RouteObject } from 'react-router';
import { lazyPage } from '../shared/routing/lazyPage';
import { collectModuleRoutes, type RouteModule } from './moduleRoutes';
import { notFoundRoute } from './notFoundRoute';

/**
 * Screens contributed by feature modules: any `src/features/<module>/technician.routes.tsx`
 * with a default export of `RouteObject[]` is picked up automatically, so
 * teammates never edit this file and cannot conflict with each other. Module
 * files are loaded eagerly (they only declare routes); their pages should use
 * `lazyPage` so each screen downloads on first use.
 */
const moduleRoutes = collectModuleRoutes(
  import.meta.glob<RouteModule>('../features/*/technician.routes.tsx', {
    eager: true,
  }),
);

/**
 * Children of `/technician` (TECHNICIAN accounts only). The home page is a
 * placeholder to be replaced by the owning module. The catch-all stays last so
 * unknown URLs get a 404 inside the guard.
 */
export const technicianRoutes: RouteObject[] = [
  {
    index: true,
    element: lazyPage(
      () => import('../pages/TechnicianHomePage'),
      'TechnicianHomePage',
    ),
  },
  ...moduleRoutes,
  notFoundRoute,
];

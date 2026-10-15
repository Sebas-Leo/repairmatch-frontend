import type { RouteObject } from 'react-router';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ClientHomePage } from '../pages/ClientHomePage';
import { collectModuleRoutes, type RouteModule } from './moduleRoutes';

/**
 * Screens contributed by feature modules: any `src/features/<module>/client.routes.tsx`
 * with a default export of `RouteObject[]` is picked up automatically, so
 * teammates never edit this file and cannot conflict with each other.
 */
const moduleRoutes = collectModuleRoutes(
  import.meta.glob<RouteModule>('../features/*/client.routes.tsx', {
    eager: true,
  }),
);

/**
 * Children of `/client` (CLIENT accounts only). The home page is a placeholder
 * to be replaced by the owning module. The catch-all stays last so unknown
 * client URLs get a 404 inside the guard.
 */
export const clientRoutes: RouteObject[] = [
  { index: true, element: <ClientHomePage /> },
  ...moduleRoutes,
  { path: '*', element: <NotFoundPage /> },
];

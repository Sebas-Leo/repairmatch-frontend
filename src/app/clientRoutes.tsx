import type { RouteObject } from 'react-router';
import { ClientHomePage } from '../pages/ClientHomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Children of `/client` (CLIENT accounts only). Add client screens here.
 * Keep the catch-all last so unknown client URLs get a 404 inside the guard.
 */
export const clientRoutes: RouteObject[] = [
  { index: true, element: <ClientHomePage /> },
  { path: '*', element: <NotFoundPage /> },
];

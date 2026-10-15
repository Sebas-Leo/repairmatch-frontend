import type { RouteObject } from 'react-router';
import { NotFoundPage } from '../pages/NotFoundPage';
import { TechnicianHomePage } from '../pages/TechnicianHomePage';

/**
 * Children of `/technician` (TECHNICIAN accounts only). Add technician screens
 * here. Keep the catch-all last so unknown URLs get a 404 inside the guard.
 */
export const technicianRoutes: RouteObject[] = [
  { index: true, element: <TechnicianHomePage /> },
  { path: '*', element: <NotFoundPage /> },
];

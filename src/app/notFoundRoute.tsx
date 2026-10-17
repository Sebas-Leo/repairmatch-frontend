import type { RouteObject } from 'react-router';
import { lazyPage } from '../shared/routing/lazyPage';

/** Catch-all that closes every route list: unknown URLs get the 404 page. */
export const notFoundRoute: RouteObject = {
  path: '*',
  element: lazyPage(() => import('../pages/NotFoundPage'), 'NotFoundPage'),
};

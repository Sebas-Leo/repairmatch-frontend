import { createBrowserRouter, type RouteObject } from 'react-router';
import { RoleRedirect } from '../features/auth/RoleRedirect';
import { RequireAuth, RequireRole } from '../features/auth/guards';
import { lazyPage } from '../shared/routing/lazyPage';
import { AppLayout } from './AppLayout';
import { clientRoutes } from './clientRoutes';
import { notFoundRoute } from './notFoundRoute';
import { technicianRoutes } from './technicianRoutes';

/**
 * Route table (react-router data router). The guards are layout routes: they
 * only decide what to render and the backend still authorizes every call.
 * `AuthProvider` must wrap the router so guards can read the session.
 * Pages download on first use (`lazyPage`); the guards and the role redirect
 * are tiny and stay in the main bundle.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <RoleRedirect /> },
      {
        path: 'login',
        element: lazyPage(() => import('../pages/LoginPage'), 'LoginPage'),
      },
      {
        path: 'register',
        element: lazyPage(
          () => import('../pages/RegisterPage'),
          'RegisterPage',
        ),
      },
      {
        path: 'unauthorized',
        element: lazyPage(
          () => import('../pages/UnauthorizedPage'),
          'UnauthorizedPage',
        ),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole role="CLIENT" />,
            children: [{ path: 'client', children: clientRoutes }],
          },
          {
            element: <RequireRole role="TECHNICIAN" />,
            children: [{ path: 'technician', children: technicianRoutes }],
          },
        ],
      },
      notFoundRoute,
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

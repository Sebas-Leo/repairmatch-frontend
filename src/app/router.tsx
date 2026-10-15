import { createBrowserRouter, type RouteObject } from 'react-router';
import { RoleRedirect } from '../features/auth/RoleRedirect';
import { RequireAuth, RequireRole } from '../features/auth/guards';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RegisterPage } from '../pages/RegisterPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { AppLayout } from './AppLayout';
import { clientRoutes } from './clientRoutes';
import { technicianRoutes } from './technicianRoutes';

/**
 * Route table (react-router data router). The guards are layout routes: they
 * only decide what to render and the backend still authorizes every call.
 * `AuthProvider` must wrap the router so guards can read the session.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <RoleRedirect /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'unauthorized', element: <UnauthorizedPage /> },
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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

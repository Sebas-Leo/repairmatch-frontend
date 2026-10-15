import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '../../shared/api/types';
import { LoadingState } from '../../shared/ui/LoadingState';
import { useAuth } from './authContext';
import type { ReturnLocationState } from './redirects';

/**
 * Layout-route guard: renders the child routes only for a signed-in user.
 * Anonymous visitors go to /login remembering where they wanted to be.
 * This is navigation UX only; the backend authorizes every request.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading')
    return <LoadingState label="Checking your session…" />;
  if (status === 'anonymous') {
    const state: ReturnLocationState = {
      from: `${location.pathname}${location.search}${location.hash}`,
    };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/** Layout-route guard for one role; includes the `RequireAuth` behaviour. */
export function RequireRole({ role }: { role: Role }) {
  const { status, user } = useAuth();
  if (status !== 'authenticated') return <RequireAuth />;
  if (user.role !== role) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

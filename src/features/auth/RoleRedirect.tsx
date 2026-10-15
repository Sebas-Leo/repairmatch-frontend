import { Navigate } from 'react-router';
import { LoadingState } from '../../shared/ui/LoadingState';
import { useAuth } from './authContext';
import { roleHome } from './redirects';

/** Element of the `/` route: sends each visitor to the right place. */
export function RoleRedirect() {
  const auth = useAuth();
  if (auth.status === 'loading')
    return <LoadingState label="Checking your session…" />;
  if (auth.status === 'anonymous') return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(auth.user.role)} replace />;
}

import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Session } from '../../shared/auth/session';
import { AuthContext, type AuthContextValue } from './authContext';

interface AuthProviderProps {
  session: Session;
  children: ReactNode;
}

/** Exposes the session to React and restores it once on start. */
export function AuthProvider({ session, children }: AuthProviderProps) {
  const state = useSyncExternalStore(session.subscribe, session.getState);

  useEffect(() => {
    // Idempotent and single-flight, so React StrictMode's double effect is safe
    // even though refresh tokens are single-use.
    void session.restore();
    // Follow sign-outs and sign-ins done in other tabs; stops on unmount.
    return session.watchExternalChanges();
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: session.login,
      register: session.register,
      logout: session.logout,
    }),
    [state, session],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

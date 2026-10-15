import { createContext, useContext } from 'react';
import type { LoginRequest, RegisterRequest } from '../../shared/api/types';
import type { AuthUser, SessionState } from '../../shared/auth/session';

/**
 * What components may know about the session. Tokens are deliberately absent:
 * they stay inside the session and the authenticated API client.
 */
export type AuthContextValue = SessionState & {
  /** Rejects with `ApiError` (for example 401 for wrong credentials). */
  login(credentials: LoginRequest): Promise<AuthUser>;
  /** Registers and then signs in; see `RegistrationSignInError`. */
  register(input: RegisterRequest): Promise<AuthUser>;
  /** Never rejects; the local session always ends. */
  logout(): Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

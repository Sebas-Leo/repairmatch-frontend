import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientUser } from '../../test/fakeApi';
import { authRoutes, createTestSession } from '../../test/testSession';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';

afterEach(() => vi.unstubAllGlobals());

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="keys">{Object.keys(auth).sort().join(',')}</p>
      <p data-testid="user">{auth.user?.name ?? 'nobody'}</p>
    </div>
  );
}

describe('AuthProvider', () => {
  it('starts anonymous without any request when nothing is persisted', () => {
    const { session, api } = createTestSession(authRoutes(clientUser));
    render(
      <AuthProvider session={session}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it('restores a persisted session once, even under StrictMode', async () => {
    const { session, api } = createTestSession(authRoutes(clientUser), {
      refreshToken: 'refresh-persisted',
    });
    render(
      <StrictMode>
        <AuthProvider session={session}>
          <Probe />
        </AuthProvider>
      </StrictMode>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    expect(screen.getByTestId('user')).toHaveTextContent(clientUser.name);
    expect(api.callsTo('POST /auth/refresh')).toHaveLength(1);
  });

  it('exposes the user and actions but no tokens', async () => {
    const { session } = createTestSession(authRoutes(clientUser));
    await session.login({ email: clientUser.email, password: 'Test-pass-1' });
    render(
      <AuthProvider session={session}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('keys')).toHaveTextContent(
      'login,logout,register,status,user',
    );
    expect(document.body.textContent).not.toMatch(/access-|refresh-/);
  });

  it('refuses to run without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('useAuth must be used inside');
  });
});

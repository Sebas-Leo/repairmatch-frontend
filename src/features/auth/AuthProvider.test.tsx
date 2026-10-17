import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientUser } from '../../test/fakeApi';
import { authRoutes, createTestSession } from '../../test/testSession';
import {
  createBrowserTokenStore,
  REFRESH_TOKEN_STORAGE_KEY,
} from '../../shared/auth/tokenStore';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';

afterEach(() => vi.unstubAllGlobals());

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
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
    expect(api.adapter).not.toHaveBeenCalled();
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

  it('exposes the user and the actions, and nothing else', async () => {
    const { session } = createTestSession(authRoutes(clientUser));
    await session.login({ email: clientUser.email, password: 'Test-pass-1' });
    function Dump() {
      const auth = useAuth();
      return (
        <>
          <p data-testid="keys">{JSON.stringify(Object.keys(auth).sort())}</p>
          <p data-testid="user-json">{JSON.stringify(auth.user)}</p>
        </>
      );
    }
    render(
      <AuthProvider session={session}>
        <Dump />
      </AuthProvider>,
    );
    // Any token field on the context value or on the user would show up here.
    expect(screen.getByTestId('keys')).toHaveTextContent(
      JSON.stringify(['login', 'logout', 'register', 'status', 'user']),
    );
    expect(screen.getByTestId('user-json')).toHaveTextContent(
      JSON.stringify(clientUser),
    );
  });

  it('refuses to run without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('useAuth must be used inside');
  });
});

describe('following other tabs', () => {
  it('stops watching for other tabs when it unmounts', () => {
    const { session } = createTestSession(authRoutes(clientUser));
    const stop = vi.fn();
    vi.spyOn(session, 'watchExternalChanges').mockReturnValue(stop);
    const { unmount } = render(
      <AuthProvider session={session}>
        <Probe />
      </AuthProvider>,
    );
    expect(session.watchExternalChanges).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('signs out when another tab removes the persisted refresh token', async () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
    const { session } = createTestSession(
      authRoutes(clientUser),
      {},
      createBrowserTokenStore(() => storage),
    );
    await session.login({ email: clientUser.email, password: 'Test-pass-1' });
    render(
      <AuthProvider session={session}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

    act(() => {
      data.delete(REFRESH_TOKEN_STORAGE_KEY); // what the other tab did
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: REFRESH_TOKEN_STORAGE_KEY,
          oldValue: 'refresh-login',
          newValue: null,
        }),
      );
    });

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });
});

import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { clientUser, technicianUser } from '../../test/fakeApi';
import { AuthContext, type AuthContextValue } from './authContext';
import { RequireAuth, RequireRole } from './guards';

const actions = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

const loading: AuthContextValue = { status: 'loading', user: null, ...actions };
const anonymous: AuthContextValue = {
  status: 'anonymous',
  user: null,
  ...actions,
};
const signedIn = (user: typeof clientUser): AuthContextValue => ({
  status: 'authenticated',
  user,
  ...actions,
});

function LoginProbe() {
  const location = useLocation();
  return (
    <p data-testid="login-probe">
      {location.pathname}|{JSON.stringify(location.state)}
    </p>
  );
}

function renderGuarded(
  auth: AuthContextValue,
  path: string,
  guard: ReactElement,
) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginProbe /> },
      { path: '/unauthorized', element: <p>unauthorized page</p> },
      {
        element: guard,
        children: [{ path: '*', element: <p>protected content</p> }],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <AuthContext value={auth}>
      <RouterProvider router={router} />
    </AuthContext>,
  );
  return router;
}

const requireAuth = <RequireAuth />;
const requireClient = <RequireRole role="CLIENT" />;

describe('RequireAuth', () => {
  it('shows a loading state, and does not redirect, while the session loads', () => {
    const router = renderGuarded(loading, '/client', requireAuth);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session',
    );
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/client');
  });

  it('sends anonymous visitors to /login remembering the full location', () => {
    const router = renderGuarded(
      anonymous,
      '/client/requests?page=2#top',
      requireAuth,
    );
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.getByTestId('login-probe')).toHaveTextContent(
      '/login|{"from":"/client/requests?page=2#top"}',
    );
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('renders the protected routes for a signed-in user', () => {
    renderGuarded(signedIn(technicianUser), '/anything', requireAuth);
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});

describe('RequireRole', () => {
  it('renders the area for the matching role', () => {
    renderGuarded(signedIn(clientUser), '/client', requireClient);
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('sends the other role to /unauthorized', () => {
    const router = renderGuarded(
      signedIn(technicianUser),
      '/client',
      requireClient,
    );
    expect(router.state.location.pathname).toBe('/unauthorized');
    expect(screen.getByText('unauthorized page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('also protects on its own: anonymous goes to /login, loading waits', () => {
    const router = renderGuarded(anonymous, '/client', requireClient);
    expect(router.state.location.pathname).toBe('/login');
  });

  it('waits while the session loads instead of rejecting the role', () => {
    const router = renderGuarded(loading, '/client', requireClient);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/client');
  });
});

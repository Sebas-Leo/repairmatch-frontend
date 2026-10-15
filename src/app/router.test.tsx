import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientUser, technicianUser } from '../test/fakeApi';
import { authRoutes, createTestSession } from '../test/testSession';
import { renderApp } from '../test/renderApp';
import { createAppRouter } from './router';

afterEach(() => vi.unstubAllGlobals());

async function signedInSession(user: typeof clientUser) {
  const harness = createTestSession(authRoutes(user));
  await harness.session.login({ email: user.email, password: 'Test-pass-1' });
  return harness;
}

describe('role redirect at /', () => {
  it('sends anonymous visitors to the sign-in page', () => {
    const { session } = createTestSession(authRoutes(clientUser));
    const { router } = renderApp(session, '/');
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Sign in',
    );
  });

  it('sends a client to the client area', async () => {
    const { session } = await signedInSession(clientUser);
    const { router } = renderApp(session, '/');
    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/client');
  });

  it('sends a technician to the technician area', async () => {
    const { session } = await signedInSession(technicianUser);
    const { router } = renderApp(session, '/');
    expect(
      await screen.findByRole('heading', { name: 'Technician home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/technician');
  });

  it('waits for the session check before deciding', async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const { session } = createTestSession(
      authRoutes(technicianUser, {
        'POST /auth/refresh': async () => {
          await gate;
          return Response.json({
            accessToken: 'access-r',
            tokenType: 'Bearer',
            expiresIn: 3600,
            refreshToken: 'refresh-r',
            refreshExpiresIn: 604800,
          });
        },
      }),
      { refreshToken: 'refresh-persisted' },
    );
    const { router } = renderApp(session, '/');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session',
    );
    expect(router.state.location.pathname).toBe('/');

    release();
    expect(
      await screen.findByRole('heading', { name: 'Technician home' }),
    ).toBeInTheDocument();
  });
});

describe('guarded areas', () => {
  it('sends anonymous visitors from a protected area to /login', () => {
    const { session } = createTestSession(authRoutes(clientUser));
    const { router } = renderApp(session, '/technician');
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ from: '/technician' });
  });

  it('shows the client area to a client', async () => {
    const { session } = await signedInSession(clientUser);
    renderApp(session, '/client');
    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Signed in as Test Client.')).toBeInTheDocument();
  });

  it('blocks a technician from the client area', async () => {
    const { session } = await signedInSession(technicianUser);
    const { router } = renderApp(session, '/client');
    expect(
      await screen.findByRole('heading', {
        name: 'You do not have access to this page.',
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/unauthorized');
    expect(
      screen.queryByRole('heading', { name: 'Client home' }),
    ).not.toBeInTheDocument();
  });

  it('blocks a client from the technician area and links back home', async () => {
    const user = userEvent.setup();
    const { session } = await signedInSession(clientUser);
    const { router } = renderApp(session, '/technician');
    expect(router.state.location.pathname).toBe('/unauthorized');

    await user.click(screen.getByRole('link', { name: 'Go to your home' }));

    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/client');
  });

  it('shows the 404 page inside the area for unknown nested URLs', async () => {
    const { session } = await signedInSession(clientUser);
    renderApp(session, '/client/does-not-exist');
    expect(
      await screen.findByRole('heading', { name: 'This page is not here.' }),
    ).toBeInTheDocument();
  });

  it('keeps the unauthorized page reachable without a session', () => {
    const { session } = createTestSession(authRoutes(clientUser));
    renderApp(session, '/unauthorized');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'You do not have access to this page.',
    );
  });
});

describe('signing out', () => {
  it('ends the session, revokes the token and lands on /login', async () => {
    const user = userEvent.setup();
    const { session, api, tokenStore } = await signedInSession(clientUser);
    const { router } = renderApp(session, '/client');

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(api.callsTo('POST /auth/logout')[0]?.body).toEqual({
      refreshToken: 'refresh-login',
    });
    expect(tokenStore.getRefreshToken()).toBeNull();
    expect(tokenStore.getAccessToken()).toBeNull();
    // Deliberate sign-out does not remember "return here".
    expect(router.state.location.state).toBeNull();
  });

  it('protects the area again after signing out', async () => {
    const user = userEvent.setup();
    const { session } = await signedInSession(technicianUser);
    const { router } = renderApp(session, '/technician');
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));

    await router.navigate('/technician');

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});

describe('unknown URLs', () => {
  it('shows a 404 and can return home', async () => {
    const user = userEvent.setup();
    const { session } = await signedInSession(clientUser);
    renderApp(session, '/missing');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'This page is not here',
    );

    await user.click(screen.getByRole('link', { name: 'Back to home' }));

    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
  });
});

describe('layout', () => {
  it('provides landmarks and a skip link on every page', () => {
    const { session } = createTestSession(authRoutes(clientUser));
    renderApp(session, '/login');
    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});

describe('createAppRouter', () => {
  it('builds a browser router over the same route table', () => {
    const router = createAppRouter();
    expect(router.routes[0]?.children?.map((route) => route.path)).toContain(
      'login',
    );
    router.dispose();
  });
});

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientUser, errorResponse, technicianUser } from '../test/fakeApi';
import { authRoutes, createTestSession } from '../test/testSession';
import { renderApp } from '../test/renderApp';

afterEach(() => vi.unstubAllGlobals());

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  email = 'client@example.test',
  password = 'Test-pass-1',
) {
  // Pages are lazy: the first query waits for the page to download.
  const emailField = await screen.findByLabelText('Email');
  if (email) await user.type(emailField, email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('login form', () => {
  it('is an accessible form with labelled fields', async () => {
    const { session } = createTestSession(authRoutes(clientUser));
    renderApp(session, '/login');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Sign in',
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('validates on the client without calling the backend', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(authRoutes(clientUser));
    renderApp(session, '/login');

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Email: Enter your email address.');
    expect(alert).toHaveTextContent('Password: Enter your password.');
    expect(alert).toHaveFocus();
    const email = screen.getByLabelText('Email');
    expect(email).toBeInvalid();
    expect(email).toHaveAccessibleDescription('Enter your email address.');
    expect(api.adapter).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(authRoutes(clientUser));
    renderApp(session, '/login');
    await fillAndSubmit(user, 'not-an-email');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a valid email address.',
    );
    expect(api.adapter).not.toHaveBeenCalled();
  });

  it('moves focus to the offending field from the error summary', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(authRoutes(clientUser));
    renderApp(session, '/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    await user.click(
      within(screen.getByRole('alert')).getByRole('link', {
        name: 'Password: Enter your password.',
      }),
    );
    expect(screen.getByLabelText('Password')).toHaveFocus();
  });

  it('shows the server message and re-enables the form on bad credentials', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(
      authRoutes(clientUser, {
        'POST /auth/login': () => errorResponse(401, 'Credenciales inválidas'),
      }),
    );
    renderApp(session, '/login');

    await fillAndSubmit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Credenciales inválidas');
    expect(alert).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(screen.getByLabelText('Email')).toHaveValue('client@example.test');
  });

  it('shows field errors and unknown ones from a 400 response', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(
      authRoutes(clientUser, {
        'POST /auth/login': () =>
          errorResponse(400, 'Revisa los campos enviados', {
            email: 'El correo debe tener un formato válido',
            other: 'Algo más',
          }),
      }),
    );
    renderApp(session, '/login');

    await fillAndSubmit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Revisa los campos enviados');
    expect(alert).toHaveTextContent(
      'Email: El correo debe tener un formato válido',
    );
    expect(alert).toHaveTextContent('other: Algo más');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'El correo debe tener un formato válido',
    );
  });

  it('explains a network failure in the summary and in a toast', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(
      authRoutes(clientUser, {
        'POST /auth/login': () => {
          throw new TypeError('Failed to fetch');
        },
      }),
    );
    renderApp(session, '/login');
    await fillAndSubmit(user);

    const message = await screen.findByText(
      'We could not reach the server. Check your connection and try again.',
    );
    // The toast is extra: focus still goes to the form's error summary.
    expect(message.closest('[role="alert"]')).toHaveFocus();
    expect(screen.getByText('Connection problem')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('replaces internal server text with friendly copy', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(
      authRoutes(clientUser, {
        'POST /auth/login': () =>
          errorResponse(503, 'upstream database is down'),
      }),
    );
    renderApp(session, '/login');
    await fillAndSubmit(user);

    expect(
      await screen.findByText(
        'Something went wrong on our side. Try again in a few moments.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Server error')).toBeInTheDocument();
    expect(screen.queryByText(/upstream database/)).not.toBeInTheDocument();
  });

  it('disables the form while submitting', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const { session, api } = createTestSession(
      authRoutes(clientUser, {
        'POST /auth/login': async () => {
          await gate;
          return Response.json({
            accessToken: 'access-login',
            tokenType: 'Bearer',
            expiresIn: 3600,
            refreshToken: 'refresh-login',
            refreshExpiresIn: 604800,
          });
        },
      }),
    );
    renderApp(session, '/login');
    await fillAndSubmit(user);

    const busy = screen.getByRole('button', { name: 'Signing in…' });
    expect(busy).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Password')).toBeDisabled();
    await user.click(busy); // a second click must not send a second request
    expect(api.callsTo('POST /auth/login')).toHaveLength(1);

    release();
    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
  });

  it('sends the trimmed email and the untouched password', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(authRoutes(clientUser));
    renderApp(session, '/login');
    await fillAndSubmit(user, '  client@example.test ', ' Test-pass-1 ');
    await screen.findByRole('heading', { name: 'Client home' });
    expect(api.callsTo('POST /auth/login')[0]?.body).toEqual({
      email: 'client@example.test',
      password: ' Test-pass-1 ',
    });
  });
});

describe('after signing in', () => {
  it('goes to the client home', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(authRoutes(clientUser));
    const { router } = renderApp(session, '/login');
    await fillAndSubmit(user);
    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/client');
  });

  it('goes to the technician home', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(authRoutes(technicianUser));
    const { router } = renderApp(session, '/login');
    await fillAndSubmit(user, 'technician@example.test');
    expect(
      await screen.findByRole('heading', { name: 'Technician home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/technician');
  });

  it('returns to the location the visitor originally wanted', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(authRoutes(clientUser));
    const { router } = renderApp(session, '/client/requests?page=2');
    expect(router.state.location.pathname).toBe('/login');

    await fillAndSubmit(user);

    expect(
      await screen.findByRole('heading', { name: 'This page is not here.' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname + router.state.location.search).toBe(
      '/client/requests?page=2',
    );
  });

  it('ignores a preserved location of the other role area', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(authRoutes(technicianUser));
    const { router } = renderApp(session, '/client');
    await fillAndSubmit(user, 'technician@example.test');
    await screen.findByRole('heading', { name: 'Technician home' });
    expect(router.state.location.pathname).toBe('/technician');
  });

  it('skips the form when already signed in', async () => {
    const { session } = createTestSession(authRoutes(clientUser));
    await session.login({ email: clientUser.email, password: 'Test-pass-1' });
    const { router } = renderApp(session, '/login');
    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/client');
  });

  it('waits for the session check instead of showing the form', async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const { session } = createTestSession(
      authRoutes(clientUser, {
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
    renderApp(session, '/login');

    expect(
      await screen.findByText('Checking your session…'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();

    release();
    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
  });
});

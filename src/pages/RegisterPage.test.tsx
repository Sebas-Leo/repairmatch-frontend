import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clientUser,
  errorResponse,
  technicianUser,
  type Routes,
} from '../test/fakeApi';
import { authRoutes, createTestSession } from '../test/testSession';
import { renderApp } from '../test/renderApp';

afterEach(() => vi.unstubAllGlobals());

interface FormValues {
  name?: string;
  email?: string;
  password?: string;
  role?: 'Client' | 'Technician';
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  {
    name = 'Test Client',
    email = 'client@example.test',
    password = 'Test-pass-1',
    role = 'Client',
  }: FormValues = {},
) {
  if (name) await user.type(screen.getByLabelText('Name'), name);
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  if (role)
    await user.click(screen.getByRole('radio', { name: new RegExp(role) }));
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

function routesFor(user: typeof clientUser, extra: Routes = {}) {
  return authRoutes(user, {
    'POST /auth/register': () => Response.json(user, { status: 201 }),
    ...extra,
  });
}

describe('register form', () => {
  it('is an accessible form with a labelled role choice', () => {
    const { session } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Create your account',
    );
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      /8 to 72 characters with an uppercase letter/,
    );
    const group = screen.getByRole('group', { name: 'Account type' });
    expect(group).toContainElement(
      screen.getByRole('radio', { name: /Client/ }),
    );
    expect(group).toContainElement(
      screen.getByRole('radio', { name: /Technician/ }),
    );
    expect(screen.getByRole('radio', { name: /Client/ })).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('validates every field on the client without calling the backend', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const alert = screen.getByRole('alert');
    for (const message of [
      'Name: Enter your name.',
      'Email: Enter your email address.',
      'Password: Enter a password.',
      'Account type: Choose an account type.',
    ]) {
      expect(alert).toHaveTextContent(message);
    }
    expect(alert).toHaveFocus();
    expect(screen.getByLabelText('Name')).toBeInvalid();
    expect(
      screen.getByRole('group', { name: 'Account type' }),
    ).toHaveAccessibleDescription('Choose an account type.');
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it('applies the backend password rules', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');
    await fillAndSubmit(user, { password: 'alllowercase1' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Password needs an uppercase letter, a lowercase letter, a number and a symbol.',
    );
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it('focuses the role choice from the summary link', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await user.click(
      screen.getByRole('link', {
        name: 'Account type: Choose an account type.',
      }),
    );
    expect(screen.getByRole('radio', { name: /Client/ })).toHaveFocus();
  });

  it('shows the server message for a duplicate email', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(
      routesFor(clientUser, {
        'POST /auth/register': () =>
          errorResponse(409, 'El correo ya está registrado'),
      }),
    );
    renderApp(session, '/register');
    await fillAndSubmit(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El correo ya está registrado');
    expect(alert).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeEnabled();
    expect(api.callsTo('POST /auth/login')).toHaveLength(0);
  });

  it('shows per-field server errors', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(
      routesFor(clientUser, {
        'POST /auth/register': () =>
          errorResponse(400, 'Revisa los campos enviados', {
            password: 'Incluye mayúscula, minúscula, número y símbolo',
            role: 'El rol es obligatorio',
          }),
      }),
    );
    renderApp(session, '/register');
    await fillAndSubmit(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Revisa los campos enviados');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      /Incluye mayúscula, minúscula, número y símbolo/,
    );
    expect(
      screen.getByRole('group', { name: 'Account type' }),
    ).toHaveAccessibleDescription('El rol es obligatorio');
  });

  it('explains when the account exists but automatic sign-in failed', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(
      routesFor(clientUser, {
        'POST /auth/login': () => errorResponse(500, 'Error interno'),
      }),
    );
    renderApp(session, '/register');
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your account was created, but we could not sign you in.',
    );
  });

  it('explains a network failure', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(
      routesFor(clientUser, {
        'POST /auth/register': () => {
          throw new TypeError('Failed to fetch');
        },
      }),
    );
    renderApp(session, '/register');
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server',
    );
  });

  it('disables the form while submitting', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const { session } = createTestSession(
      routesFor(clientUser, {
        'POST /auth/register': async () => {
          await gate;
          return Response.json(clientUser, { status: 201 });
        },
      }),
    );
    renderApp(session, '/register');
    await fillAndSubmit(user);

    expect(
      screen.getByRole('button', { name: 'Creating account…' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Client/ })).toBeDisabled();

    release();
    await screen.findByRole('heading', { name: 'Client home' });
  });
});

describe('after registering', () => {
  it('registers with trimmed values, signs in and opens the client home', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(routesFor(clientUser));
    const { router } = renderApp(session, '/register');

    await fillAndSubmit(user, {
      name: '  Test Client ',
      email: ' client@example.test ',
    });

    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/client');
    expect(api.callsTo('POST /auth/register')[0]?.body).toEqual({
      name: 'Test Client',
      email: 'client@example.test',
      password: 'Test-pass-1',
      role: 'CLIENT',
    });
    expect(api.callsTo('POST /auth/login')[0]?.body).toEqual({
      email: 'client@example.test',
      password: 'Test-pass-1',
    });
  });

  it('opens the technician home for a technician', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(routesFor(technicianUser));
    const { router } = renderApp(session, '/register');

    await fillAndSubmit(user, {
      name: 'Test Technician',
      email: 'technician@example.test',
      role: 'Technician',
    });

    expect(
      await screen.findByRole('heading', { name: 'Technician home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/technician');
    expect(api.callsTo('POST /auth/register')[0]?.body).toMatchObject({
      role: 'TECHNICIAN',
    });
  });

  it('keeps the originally requested location through the register link', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(routesFor(clientUser));
    const { router } = renderApp(session, '/client');
    await user.click(await screen.findByRole('link', { name: 'Register' }));
    expect(router.state.location.pathname).toBe('/register');

    await fillAndSubmit(user);

    await screen.findByRole('heading', { name: 'Client home' });
    expect(router.state.location.pathname).toBe('/client');
  });

  it('skips the form when already signed in', async () => {
    const { session } = createTestSession(routesFor(clientUser));
    await session.login({ email: clientUser.email, password: 'Test-pass-1' });
    renderApp(session, '/register');
    expect(
      await screen.findByRole('heading', { name: 'Client home' }),
    ).toBeInTheDocument();
  });

  it('waits for the session check instead of showing the form', async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const { session } = createTestSession(
      routesFor(clientUser, {
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
    renderApp(session, '/register');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    release();
    await screen.findByRole('heading', { name: 'Client home' });
  });
});

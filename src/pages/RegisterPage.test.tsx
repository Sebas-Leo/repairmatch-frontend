import { act, fireEvent, screen } from '@testing-library/react';
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
  // Pages are lazy: the first query waits for the page to download.
  const nameField = await screen.findByLabelText('Nombre');
  if (name) await user.type(nameField, name);
  if (email)
    await user.type(screen.getByLabelText('Correo electrónico'), email);
  if (password) await user.type(screen.getByLabelText('Contraseña'), password);
  if (role)
    await user.click(
      screen.getByRole('radio', {
        name: new RegExp(role === 'Technician' ? 'Técnico' : 'Cliente'),
      }),
    );
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

function routesFor(user: typeof clientUser, extra: Routes = {}) {
  return authRoutes(user, {
    'POST /auth/register': () => Response.json(user, { status: 201 }),
    ...extra,
  });
}

describe('register form', () => {
  it('is an accessible form with a labelled role choice', async () => {
    const { session } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Crea tu cuenta',
    );
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      /8 a 72 caracteres con una mayúscula/,
    );
    const group = screen.getByRole('group', { name: 'Tipo de cuenta' });
    expect(group).toContainElement(
      screen.getByRole('radio', { name: /Client/ }),
    );
    expect(group).toContainElement(
      screen.getByRole('radio', { name: /Técnico/ }),
    );
    expect(screen.getByRole('radio', { name: /Client/ })).not.toBeChecked();
    expect(
      screen.getByRole('link', { name: 'Iniciar sesión' }),
    ).toHaveAttribute('href', '/login');
  });

  it('validates every field on the client without calling the backend', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');

    await user.click(
      await screen.findByRole('button', { name: 'Crear cuenta' }),
    );

    const alert = screen.getByRole('alert');
    for (const message of [
      'Nombre: Ingresa tu nombre.',
      'Correo electrónico: Ingresa tu correo electrónico.',
      'Contraseña: Ingresa una contraseña.',
      'Tipo de cuenta: Selecciona un tipo de cuenta.',
    ]) {
      expect(alert).toHaveTextContent(message);
    }
    expect(alert).toHaveFocus();
    expect(screen.getByLabelText('Nombre')).toBeInvalid();
    expect(
      screen.getByRole('group', { name: 'Tipo de cuenta' }),
    ).toHaveAccessibleDescription('Selecciona un tipo de cuenta.');
    expect(api.adapter).not.toHaveBeenCalled();
  });

  it('does not flash the busy state when the form is invalid', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');
    const submit = await screen.findByRole('button', {
      name: 'Crear cuenta',
    });

    const changes: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const { attributeName } of records) changes.push(`${attributeName}`);
    });
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['aria-busy', 'disabled'],
    });
    await user.click(submit);
    await screen.findByRole('alert');
    await new Promise((done) => setTimeout(done, 0));
    observer.disconnect();

    expect(changes).toEqual([]);
  });

  it('applies the backend password rules', async () => {
    const user = userEvent.setup();
    const { session, api } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');
    await fillAndSubmit(user, { password: 'alllowercase1' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La contraseña debe incluir una mayúscula, una minúscula, un número y un símbolo.',
    );
    expect(api.adapter).not.toHaveBeenCalled();
  });

  it('focuses the role choice from the summary link', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(routesFor(clientUser));
    renderApp(session, '/register');
    await user.click(
      await screen.findByRole('button', { name: 'Crear cuenta' }),
    );
    await user.click(
      screen.getByRole('link', {
        name: 'Tipo de cuenta: Selecciona un tipo de cuenta.',
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
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
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
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      /Incluye mayúscula, minúscula, número y símbolo/,
    );
    expect(
      screen.getByRole('group', { name: 'Tipo de cuenta' }),
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
      'Tu cuenta se creó, pero no pudimos iniciar sesión.',
    );
  });

  it('explains a network failure in the one error summary', async () => {
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

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos conectar con el servidor');
    expect(alert).toHaveFocus();
  });

  it('asks the user to wait after too many attempts', async () => {
    const user = userEvent.setup();
    const { session } = createTestSession(
      routesFor(clientUser, {
        'POST /auth/register': () => errorResponse(429, 'Rate limit exceeded'),
      }),
    );
    renderApp(session, '/register');
    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Has realizado demasiados intentos. Espera un momento e inténtalo nuevamente.',
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
      screen.getByRole('button', { name: 'Creando cuenta…' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Nombre')).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Client/ })).toBeDisabled();

    release();
    await screen.findByRole('heading', { name: /^Hola,/ });
  });

  it('sends one request when submitted twice before the form re-renders', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const { session, api } = createTestSession(
      routesFor(clientUser, {
        'POST /auth/register': async () => {
          await gate;
          return Response.json(clientUser, { status: 201 });
        },
      }),
    );
    renderApp(session, '/register');
    await user.type(await screen.findByLabelText('Nombre'), 'Test Client');
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'client@example.test',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'Test-pass-1');
    await user.click(screen.getByRole('radio', { name: /Client/ }));
    const form = screen
      .getByRole('button', { name: 'Crear cuenta' })
      .closest('form');

    // Both events land in the same batch, so the disabled fieldset is not
    // rendered yet: only the submit guard can stop the second one.
    act(() => {
      fireEvent.submit(form!);
      fireEvent.submit(form!);
    });
    release();

    await screen.findByRole('heading', { name: /^Hola,/ });
    expect(api.callsTo('POST /auth/register')).toHaveLength(1);
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
      await screen.findByRole('heading', { name: /^Hola,/ }),
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
      await screen.findByRole('heading', {
        name: '¿Quién necesita una reparación?',
      }),
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
    await user.click(await screen.findByRole('link', { name: 'Registrarse' }));
    expect(router.state.location.pathname).toBe('/register');

    await fillAndSubmit(user);

    await screen.findByRole('heading', { name: /^Hola,/ });
    expect(router.state.location.pathname).toBe('/client');
  });

  it('skips the form when already signed in', async () => {
    const { session } = createTestSession(routesFor(clientUser));
    await session.login({ email: clientUser.email, password: 'Test-pass-1' });
    renderApp(session, '/register');
    expect(
      await screen.findByRole('heading', { name: /^Hola,/ }),
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
    expect(
      await screen.findByText('Verificando tu sesión…'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    release();
    await screen.findByRole('heading', { name: /^Hola,/ });
  });
});

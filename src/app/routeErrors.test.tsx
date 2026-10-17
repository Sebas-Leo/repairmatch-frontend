import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { technicianUser } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';
import { authRoutes, createTestSession } from '../test/testSession';

// A page whose download fails, as when the network drops or a new deploy
// removed the old chunk.
vi.mock('../pages/TechnicianHomePage', () => {
  throw new Error(
    'Failed to fetch dynamically imported module: /secret/path.js',
  );
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

async function signedInTechnician() {
  const harness = createTestSession(authRoutes(technicianUser));
  await harness.session.login({
    email: technicianUser.email,
    password: 'Test-pass-1',
  });
  return harness;
}

describe('page errors in the app', () => {
  it('shows a friendly error inside the layout when a page fails to download', async () => {
    const { session } = await signedInTechnician();
    renderApp(session, '/technician');

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Something went wrong');
    expect(screen.queryByText(/secret\/path/)).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeVisible();
    expect(within(screen.getByRole('main')).getByRole('alert')).toBe(alert);
  });

  it('recovers as soon as the visitor goes to another page', async () => {
    const { session } = await signedInTechnician();
    const { router } = renderApp(session, '/technician');
    await screen.findByRole('alert');

    await router.navigate('/unauthorized');

    expect(
      await screen.findByRole('heading', {
        name: 'You do not have access to this page.',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});

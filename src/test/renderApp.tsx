import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { appRoutes } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import type { Session } from '../shared/auth/session';

/** Renders the real route table at `path` inside an `AuthProvider`. */
export function renderApp(session: Session, path = '/') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const view = render(
    <AuthProvider session={session}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return { router, ...view };
}

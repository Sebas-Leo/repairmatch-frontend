import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import {
  AuthContext,
  type AuthContextValue,
} from '../features/auth/authContext';
import type { Role } from '../shared/api/types';
import { ToastProvider } from '../shared/toast/ToastProvider';

export function fakeAuth(role: Role = 'CLIENT'): AuthContextValue {
  return {
    status: 'authenticated',
    user: {
      id: '7f1c2a3b-0000-4000-8000-000000000001',
      name: role === 'CLIENT' ? 'Ana Client' : 'Tito Tech',
      email: 'user@example.com',
      role,
    },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(async () => {}),
  };
}

interface RenderPageOptions {
  /** Route pattern of the page, for example `/client/requests/:requestId`. */
  path: string;
  /** URL to open; defaults to `path`. */
  url?: string;
  role?: Role;
}

/**
 * Renders one page on its route with toasts and a signed-in session, plus a
 * catch-all route that shows where a navigation landed.
 */
export function renderPage(
  element: ReactElement,
  { path, url = path, role = 'CLIENT' }: RenderPageOptions,
) {
  const router = createMemoryRouter(
    [
      { path, element },
      { path: '*', element: <p>Landed elsewhere</p> },
    ],
    { initialEntries: [url] },
  );
  const view = render(
    <AuthContext.Provider value={fakeAuth(role)}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthContext.Provider>,
  );
  return { router, ...view };
}

/** A backend page envelope around `content`. */
export function pageOf<T>(
  content: T[],
  { page = 0, size = 10, totalElements = content.length } = {},
) {
  const totalPages = Math.ceil(totalElements / size);
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  };
}

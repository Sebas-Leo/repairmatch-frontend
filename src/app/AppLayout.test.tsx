import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { lazy } from 'react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import {
  AuthContext,
  type AuthContextValue,
} from '../features/auth/authContext';
import { useToast } from '../shared/toast/toastContext';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('keeps the shell on screen while a page without its own boundary loads', async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const Slow = lazy(async () => {
      await gate;
      return { default: () => <h1>Slow page</h1> };
    });
    const router = createMemoryRouter([
      {
        element: <AppLayout />,
        children: [{ index: true, element: <Slow /> }],
      },
    ]);
    render(<RouterProvider router={router} />);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('contentinfo')).toBeVisible();

    release();

    expect(
      await within(main).findByRole('heading', { name: 'Slow page' }),
    ).toBeInTheDocument();
    expect(within(main).queryByRole('status')).not.toBeInTheDocument();
  });

  it('lets pages raise toasts that outlive the navigation', async () => {
    const user = userEvent.setup();
    function Saver() {
      const toast = useToast();
      const navigate = useNavigate();
      return (
        <button
          type="button"
          onClick={() => {
            toast.success('Saved');
            void navigate('/next');
          }}
        >
          Save
        </button>
      );
    }
    const router = createMemoryRouter([
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Saver /> },
          { path: 'next', element: <h1>Next page</h1> },
        ],
      },
    ]);
    render(<RouterProvider router={router} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('heading', { name: 'Next page' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeVisible();
    expect(
      within(screen.getByRole('main')).queryByText('Saved'),
    ).not.toBeInTheDocument();
  });
});

describe('AppLayout navigation', () => {
  it('shows the menu of the signed-in role and marks the current page', () => {
    const auth: AuthContextValue = {
      status: 'authenticated',
      user: {
        id: 'u1',
        name: 'Ana Client',
        email: 'ana@example.com',
        role: 'CLIENT',
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(async () => {}),
    };
    const router = createMemoryRouter(
      [
        {
          element: <AppLayout />,
          children: [{ path: '/client', element: <h1>Client home</h1> }],
        },
      ],
      { initialEntries: ['/client'] },
    );
    render(
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Ana Client')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Change theme/ }),
    ).toBeInTheDocument();
  });

  it('shows no menu while signed out', () => {
    const router = createMemoryRouter([
      {
        element: <AppLayout />,
        children: [{ index: true, element: <p>Hi</p> }],
      },
    ]);
    render(<RouterProvider router={router} />);
    expect(
      screen.queryByRole('navigation', { name: 'Main' }),
    ).not.toBeInTheDocument();
  });
});

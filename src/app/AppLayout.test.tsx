import { render, screen, within } from '@testing-library/react';
import { lazy } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
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
});

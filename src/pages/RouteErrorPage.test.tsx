import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  data,
  RouterProvider,
  type RouteObject,
} from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lazyPage } from '../shared/routing/lazyPage';
import { RootErrorPage, RouteErrorPage } from './RouteErrorPage';

beforeEach(() => {
  // React and react-router log every error a boundary catches.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function Boom(): never {
  throw new Error('database password leaked');
}

function renderBroken(
  broken: RouteObject,
  errorElement = <RouteErrorPage onReload={vi.fn()} />,
) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Home page</p> },
      {
        path: '/broken',
        errorElement,
        hydrateFallbackElement: <p>…</p>,
        ...broken,
      },
    ],
    { initialEntries: ['/broken'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('RouteErrorPage', () => {
  it('announces a friendly message for an unexpected error, without leaking it', async () => {
    renderBroken({ element: <Boom /> });

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByRole('heading', {
        level: 1,
        name: 'Something went wrong',
      }),
    ).toBeInTheDocument();
    expect(alert).toHaveAccessibleName('Something went wrong');
    expect(screen.queryByText(/database password/)).not.toBeInTheDocument();
  });

  it('moves focus to the alert', async () => {
    renderBroken({ element: <Boom /> });
    expect(await screen.findByRole('alert')).toHaveFocus();
  });

  it('reloads the page on request', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    renderBroken({ element: <Boom /> }, <RouteErrorPage onReload={onReload} />);

    await user.click(
      await screen.findByRole('button', { name: 'Reload page' }),
    );

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('takes the visitor home, which clears the error', async () => {
    const user = userEvent.setup();
    renderBroken({ element: <Boom /> });

    await user.click(await screen.findByRole('link', { name: 'Go to home' }));

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a 404 route error and offers no pointless reload', async () => {
    renderBroken({
      element: <p>never shown</p>,
      loader: () => {
        throw data('internal routing details', { status: 404 });
      },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('404 / Page not found');
    expect(alert).toHaveTextContent('This page is not here.');
    expect(screen.queryByRole('button', { name: 'Reload page' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Go to home' })).toBeVisible();
    expect(screen.queryByText(/internal routing details/)).toBeNull();
  });

  it('shows only the status of any other route error', async () => {
    renderBroken({
      element: <p>never shown</p>,
      loader: () => {
        throw data('stack trace and secrets', { status: 503 });
      },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('503 / Error');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible();
    expect(screen.queryByText(/stack trace/)).toBeNull();
  });
});

describe('a page that fails to download', () => {
  // React.lazy remembers a failed download, so going home and back (or a
  // retry) would fail again: only a reload is offered.
  it.each([
    [
      'Chrome',
      'Failed to fetch dynamically imported module: https://app.test/assets/RequestsPage-3f9a.js',
    ],
    ['Safari', 'Importing a module script failed.'],
    [
      'Firefox',
      'error loading dynamically imported module: https://app.test/assets/RequestsPage-3f9a.js',
    ],
  ])('offers only a reload (%s)', async (_browser, message) => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    function FailedDownload(): never {
      throw new TypeError(message);
    }
    renderBroken(
      { element: <FailedDownload /> },
      <RouteErrorPage onReload={onReload} />,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A new version may be available');
    expect(screen.queryByText(/app\.test/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to home' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('recognises the failure of a real lazyPage download', async () => {
    renderBroken({
      element: lazyPage(
        () =>
          Promise.reject<{ Page: () => null }>(
            new TypeError(
              'Failed to fetch dynamically imported module: https://app.test/assets/Page.js',
            ),
          ),
        'Page',
      ),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A new version may be available',
    );
    expect(screen.queryByRole('link', { name: 'Go to home' })).toBeNull();
  });
});

describe('RootErrorPage', () => {
  it('brings its own main landmark when the layout itself failed', async () => {
    renderBroken({ element: <Boom /> }, <RootErrorPage onReload={vi.fn()} />);

    const main = await screen.findByRole('main');
    expect(within(main).getByRole('alert')).toHaveTextContent(
      'Something went wrong',
    );
  });
});

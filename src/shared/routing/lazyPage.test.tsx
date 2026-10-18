import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { lazyPage } from './lazyPage';

function Hello() {
  return <h1>Hello page</h1>;
}

function Other() {
  return <h1>Other page</h1>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('lazyPage', () => {
  it('shows the loading state until the page has downloaded', async () => {
    const download = deferred<{ Hello: typeof Hello }>();
    render(lazyPage(() => download.promise, 'Hello'));

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();

    download.resolve({ Hello });

    expect(
      await screen.findByRole('heading', { name: 'Hello page' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the requested export of the module', async () => {
    render(lazyPage(() => Promise.resolve({ Other, Hello }), 'Hello'));
    expect(
      await screen.findByRole('heading', { name: 'Hello page' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Other page')).not.toBeInTheDocument();
  });

  it('accepts a custom fallback', async () => {
    const download = deferred<{ Hello: typeof Hello }>();
    render(lazyPage(() => download.promise, 'Hello', <p>Fetching the page</p>));

    expect(screen.getByText('Fetching the page')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    download.resolve({ Hello });
    await screen.findByRole('heading', { name: 'Hello page' });
  });

  it('downloads the page once, however often it renders', async () => {
    const load = vi.fn(() => Promise.resolve({ Hello }));
    const element = lazyPage(load, 'Hello');
    const { rerender } = render(element);
    await screen.findByRole('heading', { name: 'Hello page' });

    rerender(element);

    expect(screen.getByRole('heading', { name: 'Hello page' })).toBeVisible();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('remembers a failed download, so only a page reload can recover', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const load = vi.fn(() =>
      Promise.reject<{ Hello: typeof Hello }>(new TypeError('offline')),
    );
    const element = (
      <ErrorBoundary fallback={<p>Download failed</p>}>
        {lazyPage(load, 'Hello')}
      </ErrorBoundary>
    );

    const first = render(element);
    expect(await screen.findByText('Download failed')).toBeInTheDocument();
    first.unmount();
    render(element);

    expect(await screen.findByText('Download failed')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('only accepts exports that are components', () => {
    // @ts-expect-error `limit` is a number, not a page component
    lazyPage(() => Promise.resolve({ limit: 10, Hello }), 'limit');
  });
});

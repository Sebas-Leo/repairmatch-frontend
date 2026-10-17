import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

beforeEach(() => {
  // React logs every error a boundary catches; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function Boom(): never {
  throw new Error('database password leaked');
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a friendly alert instead of a failing child, without leaking details', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.queryByText(/database password/)).not.toBeInTheDocument();
  });

  it('keeps the rest of the page working', () => {
    render(
      <>
        <p>Navigation</p>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('reports the error and the component stack to onError', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'database password leaked' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('renders the children again when the visitor tries again', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    let broken = true;
    function Flaky() {
      if (broken) throw new Error('not yet');
      return <p>Recovered</p>;
    }
    render(
      <ErrorBoundary onReset={onReset}>
        <Flaky />
      </ErrorBoundary>,
    );

    broken = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows the fallback again when the children still fail', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('accepts a custom fallback element', () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('gives a fallback function the error and a way to reset', async () => {
    const user = userEvent.setup();
    let broken = true;
    function Flaky() {
      if (broken) throw new Error('boom');
      return <p>Recovered</p>;
    }
    render(
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <button type="button" onClick={reset}>
            Retry ({error instanceof Error ? error.message : 'unknown'})
          </button>
        )}
      >
        <Flaky />
      </ErrorBoundary>,
    );

    broken = false;
    await user.click(screen.getByRole('button', { name: 'Retry (boom)' }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('can render nothing when the fallback is null', () => {
    const { container } = render(
      <ErrorBoundary fallback={null}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

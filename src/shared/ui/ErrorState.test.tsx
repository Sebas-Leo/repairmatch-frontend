import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiErrorFromResponse, NetworkError } from '../api/http';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('announces a message with a heading', () => {
    render(<ErrorState title="Could not load requests" message="Try later." />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Could not load requests');
    expect(alert).toHaveTextContent('Try later.');
  });

  it('retries on request', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="Could not load." onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no retry button without onRetry', () => {
    render(<ErrorState message="Could not load." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('takes its wording from the error and offers a retry when it can help', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState error={new NetworkError('x')} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Connection problem');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not reach the server.',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('leaves out the retry when asking again cannot help', () => {
    const forbidden = apiErrorFromResponse(
      403,
      JSON.stringify({ message: 'No tienes permiso' }),
    );
    render(<ErrorState error={forbidden} onRetry={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets a title and message override the ones from the error', () => {
    render(
      <ErrorState
        error={new NetworkError('x')}
        title="Requests unavailable"
        message="Your requests could not be loaded."
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Requests unavailable');
    expect(alert).toHaveTextContent('Your requests could not be loaded.');
    expect(alert).not.toHaveTextContent('Connection problem');
  });

  it('falls back to a generic message', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('shows nothing for a cancelled call', () => {
    const { container } = render(
      <ErrorState error={new DOMException('aborted', 'AbortError')} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

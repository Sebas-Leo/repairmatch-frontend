import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiErrorFromResponse, NetworkError } from '../api/http';
import { ToastProvider } from '../toast/ToastProvider';
import type { FormFeedback } from '../ui/formFeedback';
import { useReportFormError } from './useReportFormError';

function Harness({
  error,
  show,
}: {
  error: unknown;
  show: (feedback: FormFeedback) => void;
}) {
  const report = useReportFormError(show);
  return (
    <button type="button" onClick={() => report(error)}>
      Fail
    </button>
  );
}

/** Reports `error` from a click and returns the `show` the form received. */
async function fail(error: unknown) {
  const show = vi.fn();
  render(
    <ToastProvider>
      <Harness error={error} show={show} />
    </ToastProvider>,
  );
  await userEvent.setup().click(screen.getByRole('button', { name: 'Fail' }));
  return show;
}

const apiError = (status: number, body: object = {}) =>
  apiErrorFromResponse(status, JSON.stringify(body));

describe('useReportFormError', () => {
  it('gives the form its summary and raises a toast for a connection problem', async () => {
    const show = await fail(new NetworkError('x'));

    expect(show).toHaveBeenCalledWith({
      message:
        'We could not reach the server. Check your connection and try again.',
      fieldErrors: {},
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Connection problem');
  });

  it('gives the form only the summary for something the user must fix', async () => {
    const show = await fail(
      apiError(400, {
        message: 'Revisa los campos enviados',
        errors: { email: 'Formato inválido' },
      }),
    );

    expect(show).toHaveBeenCalledWith({
      message: 'Revisa los campos enviados',
      fieldErrors: { email: 'Formato inválido' },
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows nothing for a cancelled call', async () => {
    const show = await fail(new DOMException('aborted', 'AbortError'));
    expect(show).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['a timeout', new DOMException('timed out', 'TimeoutError'), 'timed out'],
    ['a 429', apiError(429), 'Too many attempts'],
    ['a 503', apiError(503, { message: 'internal' }), 'Server error'],
  ])('raises a toast for %s', async (_name, error, title) => {
    await fail(error);
    expect(screen.getByRole('alert')).toHaveTextContent(title);
  });

  it.each([
    ['a 401', apiError(401)],
    ['a 403', apiError(403)],
    ['a 409', apiError(409)],
    ['an unknown error', new Error('boom')],
  ])('does not raise a toast for %s', async (_name, error) => {
    const show = await fail(error);
    expect(show).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

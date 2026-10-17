import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError } from '../api/http';
import { FormErrorSummary } from './FormErrorSummary';
import { feedbackFromError, hasFeedback } from './formFeedback';

describe('form feedback helpers', () => {
  it('detects when there is something to show', () => {
    expect(hasFeedback(null)).toBe(false);
    expect(hasFeedback({ fieldErrors: {} })).toBe(false);
    expect(hasFeedback({ message: 'Oops', fieldErrors: {} })).toBe(true);
    expect(hasFeedback({ fieldErrors: { email: 'Bad' } })).toBe(true);
  });

  it('shows backend text and field errors as-is', () => {
    // Built like the client builds it: the backend text lives in the body.
    const error = new ApiError(400, 'Revisa los campos enviados', {
      message: 'Revisa los campos enviados',
      errors: { email: 'Bad' },
    });
    expect(feedbackFromError(error)).toEqual({
      message: 'Revisa los campos enviados',
      fieldErrors: { email: 'Bad' },
    });
  });

  it('explains a connectivity failure', () => {
    expect(
      feedbackFromError(new NetworkError('Network request failed')),
    ).toEqual({
      message:
        'We could not reach the server. Check your connection and try again.',
      fieldErrors: {},
    });
  });

  it('hides internal server text behind friendly copy', () => {
    const error = new ApiError(500, 'NullPointerException at Foo.java:42', {
      message: 'NullPointerException at Foo.java:42',
    });
    expect(feedbackFromError(error)).toEqual({
      message: 'Something went wrong on our side. Try again in a few moments.',
      fieldErrors: {},
    });
  });

  // The client reports connectivity problems as NetworkError, so any other
  // stray error must not be blamed on the connection.
  it('does not blame the connection for an unexpected error', () => {
    expect(feedbackFromError(new TypeError('x is not a function'))).toEqual({
      message:
        'Something went wrong. Try again, and reload the page if it keeps happening.',
      fieldErrors: {},
    });
  });
});

describe('FormErrorSummary', () => {
  it('uses a generic title when there is only field feedback', () => {
    render(
      <FormErrorSummary
        feedback={{ fieldErrors: { email: 'Enter an email.' } }}
        fields={[{ name: 'email', id: 'e', label: 'Email' }]}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please fix the following.',
    );
    expect(
      screen.getByRole('link', { name: 'Email: Enter an email.' }),
    ).toHaveAttribute('href', '#e');
  });

  it('lists errors for unknown fields as plain text', () => {
    render(
      <FormErrorSummary
        feedback={{ message: 'Failed', fieldErrors: { extra: 'Odd' } }}
        fields={[]}
      />,
    );
    expect(screen.getByText('extra: Odd')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('omits the list when there are no field errors', () => {
    render(
      <FormErrorSummary
        feedback={{ message: 'Failed', fieldErrors: {} }}
        fields={[]}
      />,
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/http';
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
    const error = new ApiError(400, 'Revisa los campos enviados', {
      errors: { email: 'Bad' },
    });
    expect(feedbackFromError(error)).toEqual({
      message: 'Revisa los campos enviados',
      fieldErrors: { email: 'Bad' },
    });
  });

  it('turns anything else into a connectivity message', () => {
    expect(feedbackFromError(new TypeError('Failed to fetch'))).toEqual({
      message:
        'We could not reach the server. Check your connection and try again.',
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

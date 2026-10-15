import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('application routes', () => {
  it('explains the current product state honestly', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Good repairs start',
    );
    expect(screen.getByText(/not available yet/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#main-content');
  });

  it('shows a 404 and can return home', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/missing']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'This page is not here',
    );
    await user.click(screen.getByRole('link', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Good repairs start',
    );
  });
});

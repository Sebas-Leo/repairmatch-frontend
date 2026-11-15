import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { listServiceRequests } from '../features/requests/api';
import { renderPage, pageOf } from '../test/renderPage';
import { ClientHomePage } from './ClientHomePage';
vi.mock('../features/requests/api', () => ({ listServiceRequests: vi.fn() }));
describe('client overview', () => {
  it('links to request management without duplicating the publication form', async () => {
    vi.mocked(listServiceRequests).mockResolvedValue(
      pageOf([], { totalElements: 3 }),
    );
    renderPage(<ClientHomePage />, { path: '/client' });
    expect(
      await screen.findByRole('heading', { name: 'Resumen de solicitudes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ir a mis solicitudes' }),
    ).toHaveAttribute('href', '/client/requests');
    expect(screen.getByRole('link', { name: 'Ver servicios' })).toHaveAttribute(
      'href',
      '/client/services',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

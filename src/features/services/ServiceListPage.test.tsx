import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Service } from '../../shared/api/types';
import { renderPage } from '../../test/renderPage';
import { listServices } from './api';
import { ServiceListPage } from './ServiceListPage';

vi.mock('./api', () => ({
  listServices: vi.fn(),
}));

function aService(overrides: Partial<Service> = {}): Service {
  return {
    id: 12,
    proposalId: 31,
    status: 'PROGRAMADO',
    createdAt: '2026-11-11T14:00:00',
    requestId: 7,
    clientId: 'c1',
    technicianId: 't1',
    technicianName: 'Tito Tech',
    ...overrides,
  };
}

describe('ServiceListPage', () => {
  beforeEach(() => {
    vi.mocked(listServices).mockReset();
    vi.mocked(listServices).mockResolvedValue([
      aService({ id: 12, status: 'PROGRAMADO', technicianName: 'Tito Tech' }),
      aService({
        id: 15,
        status: 'COMPLETADO',
        technicianName: 'Rosa Repairs',
        createdAt: '2026-11-12T10:00:00',
      }),
    ]);
  });

  it('lists services for a client and filters by status', async () => {
    const user = userEvent.setup();
    renderPage(<ServiceListPage />, {
      path: '/client/services',
      role: 'CLIENT',
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Services' }),
    ).toBeInTheDocument();

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByText('Service #15')).toBeInTheDocument();
    expect(within(cards[1]!).getByText('Service #12')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), 'COMPLETADO');
    const filtered = screen.getAllByRole('article');
    expect(filtered).toHaveLength(1);
    expect(within(filtered[0]!).getByText(/Rosa Repairs/)).toBeInTheDocument();
  });

  it('shows technician empty state when there are no services', async () => {
    vi.mocked(listServices).mockResolvedValue([]);
    renderPage(<ServiceListPage />, {
      path: '/technician/services',
      role: 'TECHNICIAN',
    });

    expect(await screen.findByText('No services yet')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Browse opportunities' }),
    ).toHaveAttribute('href', '/technician/opportunities');
  });
});

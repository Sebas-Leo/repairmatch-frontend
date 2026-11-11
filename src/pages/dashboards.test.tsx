import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listServiceRequests } from '../features/requests/api';
import {
  getTechnicianReputation,
  listMatchingRequests,
  listOwnProposals,
} from '../features/technicians/api';
import { ApiError } from '../shared/api/http';
import { formatDateTime, formatMoney } from '../shared/format';
import { aRequest } from '../test/fixtures';
import { pageOf, renderPage } from '../test/renderPage';
import { ClientHomePage } from './ClientHomePage';
import { TechnicianHomePage } from './TechnicianHomePage';

vi.mock('../features/requests/api', () => ({ listServiceRequests: vi.fn() }));
vi.mock('../features/technicians/api', () => ({
  listMatchingRequests: vi.fn(),
  listOwnProposals: vi.fn(),
  getTechnicianReputation: vi.fn(),
}));

describe('ClientHomePage', () => {
  beforeEach(() => {
    vi.mocked(listServiceRequests).mockReset();
  });

  it('counts requests by status from the backend totals', async () => {
    const totals: Record<string, number> = {
      all: 9,
      PUBLICADA: 3,
      CON_PROPUESTAS: 2,
      CERRADA: 4,
    };
    vi.mocked(listServiceRequests).mockImplementation(async (query = {}) =>
      query.size === 1
        ? pageOf([], { size: 1, totalElements: totals[query.status ?? 'all']! })
        : pageOf([aRequest()], { size: 3 }),
    );
    renderPage(<ClientHomePage />, { path: '/client' });

    expect(
      await screen.findByRole('link', { name: /Waiting for offers\s*3/ }),
    ).toHaveAttribute('href', '/client/requests?status=PUBLICADA');
    expect(
      screen.getByRole('link', { name: /All requests\s*9/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Closed\s*4/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('article')).toHaveTextContent(
      'Refrigerator',
    );
  });

  it('invites a new client to publish', async () => {
    vi.mocked(listServiceRequests).mockResolvedValue(pageOf([]));
    renderPage(<ClientHomePage />, { path: '/client' });
    expect(
      await screen.findByText('Nothing published yet'),
    ).toBeInTheDocument();
  });

  it('shows errors in place of the figures and the list', async () => {
    vi.mocked(listServiceRequests).mockImplementation(() =>
      Promise.reject(new ApiError(403, 'Forbidden', {})),
    );
    renderPage(<ClientHomePage />, { path: '/client' });
    // Both calls fail, but one message (with one retry for both) is enough.
    await screen.findByRole('alert');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});

describe('TechnicianHomePage', () => {
  beforeEach(() => {
    vi.mocked(listMatchingRequests).mockReset();
    vi.mocked(listOwnProposals).mockReset();
    vi.mocked(getTechnicianReputation).mockReset();
  });

  it('shows opportunities, offers and rating', async () => {
    vi.mocked(listMatchingRequests).mockResolvedValue(
      pageOf([], { size: 1, totalElements: 5 }),
    );
    vi.mocked(listOwnProposals).mockResolvedValue(
      pageOf([], { size: 1, totalElements: 12 }),
    );
    vi.mocked(getTechnicianReputation).mockResolvedValue({
      technicianId: 't',
      averageRating: 4.567,
      reviewCount: 3,
    });
    renderPage(<TechnicianHomePage />, {
      path: '/technician',
      role: 'TECHNICIAN',
    });
    expect(
      await screen.findByRole('link', { name: /Opportunities nearby\s*5/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('4.6')).toBeInTheDocument();
    expect(screen.getByText('3 reviews')).toBeInTheDocument();
  });

  it('asks to set up the service area and marks failures', async () => {
    vi.mocked(listMatchingRequests).mockImplementation(() =>
      Promise.reject(
        new ApiError(400, 'Bad request', { message: 'Area not configured' }),
      ),
    );
    vi.mocked(listOwnProposals).mockImplementation(() =>
      Promise.reject(new ApiError(403, 'Forbidden', {})),
    );
    vi.mocked(getTechnicianReputation).mockResolvedValue({
      technicianId: 't',
      averageRating: 0,
      reviewCount: 0,
    });
    renderPage(<TechnicianHomePage />, {
      path: '/technician',
      role: 'TECHNICIAN',
    });
    const card = await screen.findByRole('link', {
      name: /Opportunities nearby/,
    });
    expect(
      await within(card).findByText('Set up your service area to see them'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Could not load right now'),
    ).toBeInTheDocument();
    expect(await screen.findByText('0 reviews')).toBeInTheDocument();
  });
});

describe('format helpers', () => {
  it('formats dates and money, with a dash for missing values', () => {
    expect(formatDateTime('2026-11-10T10:30:00')).toMatch(/10 Nov 2026/);
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
    expect(formatMoney(45.5)).toContain('45.50');
    expect(formatMoney(undefined)).toBe('—');
  });
});

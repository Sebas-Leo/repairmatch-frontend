import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listServiceRequests } from '../features/requests/api';
import { listServices } from '../features/services/api';
import {
  getOwnTechnicianProfile,
  getTechnicianReputation,
  listMatchingRequests,
  listOwnProposals,
  listRecommendedRequests,
  type RecommendedRequest,
} from '../features/technicians/api';
import { WorkDrawer } from '../features/technicians/WorkDrawer';
import { ApiError } from '../shared/api/http';
import { formatDateTime, formatMoney } from '../shared/format';
import { aRequest } from '../test/fixtures';
import { pageOf, renderPage } from '../test/renderPage';
import { ClientHomePage } from './ClientHomePage';
import { TechnicianHomePage } from './TechnicianHomePage';

vi.mock('../features/requests/api', () => ({
  listServiceRequests: vi.fn(),
  getServiceRequest: vi.fn(() => new Promise(() => {})),
}));
vi.mock('../features/services/api', () => ({ listServices: vi.fn() }));
vi.mock('../features/technicians/api', () => ({
  listMatchingRequests: vi.fn(),
  listOwnProposals: vi.fn(),
  getTechnicianReputation: vi.fn(),
  getOwnTechnicianProfile: vi.fn(),
  listRecommendedRequests: vi.fn(),
}));

function recommended(id: number, distanceKm: number): RecommendedRequest {
  return {
    request: {
      requestId: id,
      applianceTypeName: 'Washing machine',
      brand: 'Samsung',
      model: `WA${id}`,
      description: 'No bota el agua',
      status: 'PUBLICADA',
      distanceKm,
    },
    createdAt: new Date().toISOString(),
    proposalCount: 0,
    symptom: null,
    score: 0.5,
    reasons: [],
  };
}

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
      await screen.findByRole('link', { name: /Esperando ofertas\s*3/ }),
    ).toHaveAttribute('href', '/client/requests?status=PUBLICADA');
    expect(screen.getByRole('link', { name: /Todas\s*9/ })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Cerradas\s*4/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('article')).toHaveTextContent(
      'Refrigeradora',
    );
  });

  it('invites a new client to publish', async () => {
    vi.mocked(listServiceRequests).mockResolvedValue(pageOf([]));
    renderPage(<ClientHomePage />, { path: '/client' });
    expect(await screen.findByText('Aún no publicas nada')).toBeInTheDocument();
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
    vi.mocked(listRecommendedRequests).mockReset();
    vi.mocked(getOwnTechnicianProfile).mockReset();
  });

  it('lists recent requests and filters them by radius and search', async () => {
    vi.mocked(listMatchingRequests).mockResolvedValue(
      pageOf([], { size: 1, totalElements: 2 }),
    );
    vi.mocked(listRecommendedRequests).mockResolvedValue(
      pageOf([recommended(1, 1.2), recommended(2, 7.5)]),
    );
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue({
      id: 't',
      fullName: 'Test Tech',
      email: 't@example.com',
      latitude: -12.12,
      longitude: -77.03,
      maxRadiusKm: 15,
      applianceTypes: ['Washing machine'],
    });
    renderPage(<TechnicianHomePage />, {
      path: '/technician',
      role: 'TECHNICIAN',
    });
    expect(await screen.findByText('Samsung WA1')).toBeInTheDocument();
    expect(screen.getByText('Samsung WA2')).toBeInTheDocument();
    expect(await screen.findByText(/Cerca de Miraflores/)).toBeInTheDocument();

    screen.getByRole('button', { name: '2 km' }).click();
    expect(await screen.findByText(/a 2 km de ti/)).toBeInTheDocument();
    expect(screen.queryByText('Samsung WA2')).not.toBeInTheDocument();
  });

  it('asks to set up the service area first', async () => {
    const notConfigured = () =>
      Promise.reject(
        new ApiError(400, 'Bad request', { message: 'Area not configured' }),
      );
    vi.mocked(listMatchingRequests).mockImplementation(notConfigured);
    vi.mocked(listRecommendedRequests).mockImplementation(notConfigured);
    vi.mocked(getOwnTechnicianProfile).mockImplementation(notConfigured);
    renderPage(<TechnicianHomePage />, {
      path: '/technician',
      role: 'TECHNICIAN',
    });
    expect(
      await screen.findByText('Primero configura tu zona de servicio'),
    ).toBeInTheDocument();
  });
});

describe('WorkDrawer', () => {
  beforeEach(() => {
    vi.mocked(listMatchingRequests).mockReset();
    vi.mocked(listOwnProposals).mockReset();
    vi.mocked(getTechnicianReputation).mockReset();
    vi.mocked(getOwnTechnicianProfile).mockReset();
    vi.mocked(listServices).mockReset();
  });

  it('shows rating, recent offers and performance', async () => {
    vi.mocked(listMatchingRequests).mockResolvedValue(
      pageOf([], { size: 1, totalElements: 5 }),
    );
    vi.mocked(listOwnProposals).mockResolvedValue(
      pageOf(
        [
          {
            id: 1,
            requestId: 4,
            technicianId: 't',
            technicianName: 'T',
            diagnosticCost: 50,
            availableAt: '2026-11-20T09:00:00',
            conditions: 'x',
            createdAt: '2026-11-13T09:00:00',
            status: 'ACCEPTED',
          },
          {
            id: 2,
            requestId: 7,
            technicianId: 't',
            technicianName: 'T',
            diagnosticCost: 35,
            availableAt: '2026-11-21T09:00:00',
            conditions: 'x',
            createdAt: '2026-11-13T09:00:00',
            status: 'PENDING',
          },
        ],
        { totalElements: 2 },
      ),
    );
    vi.mocked(getTechnicianReputation).mockResolvedValue({
      technicianId: 't',
      averageRating: 4.567,
      reviewCount: 3,
    });
    vi.mocked(getOwnTechnicianProfile).mockResolvedValue({
      id: 't',
      fullName: 'Test Tech',
      email: 't@example.com',
      maxRadiusKm: 15,
      applianceTypes: ['Refrigerator'],
    });
    vi.mocked(listServices).mockResolvedValue([]);
    renderPage(
      <WorkDrawer open onClose={() => {}} userId="t" name="Test Tech" />,
      { path: '/technician', role: 'TECHNICIAN' },
    );
    expect(await screen.findByText('4.6')).toBeInTheDocument();
    expect(screen.getByText(/3 reseñas/)).toBeInTheDocument();
    expect(
      await screen.findByText('Atiende Refrigeradora'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Aceptada')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(await screen.findByText('50%')).toBeInTheDocument();
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.getByText(/Sin visitas pendientes/)).toBeInTheDocument();
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

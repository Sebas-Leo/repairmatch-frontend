import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/http';
import { pageOf, renderPage } from '../../test/renderPage';
import { listRecommendedRequests, type RecommendedRequest } from './api';
import { OpportunitiesPage } from './OpportunitiesPage';

vi.mock('./api', () => ({ listRecommendedRequests: vi.fn() }));
vi.mock('../proposals/api', () => ({ submitProposal: vi.fn() }));
const list = vi.mocked(listRecommendedRequests);
const PATH = '/technician/opportunities';

function item(
  id: number,
  distanceKm: number,
  proposalCount = 0,
  brand = 'Samsung',
): RecommendedRequest {
  return {
    request: {
      requestId: id,
      applianceTypeName: 'Refrigerator',
      brand,
      model: `M${id}`,
      description: 'Dejó de enfriar desde ayer',
      status: proposalCount ? 'CON_PROPUESTAS' : 'PUBLICADA',
      distanceKm,
    },
    createdAt: '2026-11-01T10:00:00',
    proposalCount,
    symptom: 'No enfría',
    score: 1 / distanceKm,
    reasons: [],
  };
}

function setup(url = PATH) {
  return renderPage(<OpportunitiesPage />, {
    path: PATH,
    url,
    role: 'TECHNICIAN',
  });
}

describe('OpportunitiesPage', () => {
  beforeEach(() => {
    list.mockReset();
  });

  it('lists open requests nearest first and pages them', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(
      pageOf([item(1, 4.2), item(2, 0.8)], { size: 25, totalElements: 60 }),
    );
    const { router } = setup(`${PATH}?size=25`);
    const cards = await screen.findAllByRole('article');
    expect(cards[0]).toHaveTextContent('Samsung M2');
    expect(cards[0]).toHaveTextContent('0.8 km');
    expect(list).toHaveBeenCalledWith({ page: 0, size: 25 }, expect.anything());
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(router.state.location.search).toContain('page=2');
  });

  it('filters by tab and by search', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(
      pageOf([item(1, 1.5, 0), item(2, 3, 2), item(3, 6, 0, 'LG')]),
    );
    setup();
    await screen.findAllByRole('article');

    await user.click(screen.getByRole('tab', { name: 'Sin ofertas aún' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'A menos de 2 km' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);

    await user.click(screen.getByRole('tab', { name: 'Todas' }));
    await user.type(screen.getByRole('searchbox'), 'lg');
    expect(await screen.findByText('LG M3')).toBeInTheDocument();
    expect(screen.queryByText('Samsung M1')).not.toBeInTheDocument();
  });

  it('asks to set up the service area first', async () => {
    list.mockImplementation(() =>
      Promise.reject(
        new ApiError(400, 'Bad request', { message: 'Area not configured' }),
      ),
    );
    setup();
    expect(
      await screen.findByText('Primero configura tu zona de servicio'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Configurar perfil' }),
    ).toHaveAttribute('href', '/technician/profile');
  });

  it('says when there is nothing nearby', async () => {
    list.mockResolvedValue(pageOf([]));
    setup();
    expect(
      await screen.findByText('No hay solicitudes cerca por ahora'),
    ).toBeInTheDocument();
  });
});

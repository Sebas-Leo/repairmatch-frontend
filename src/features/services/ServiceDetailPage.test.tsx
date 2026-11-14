import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/http';
import type { Review, Service } from '../../shared/api/types';
import { aRequest } from '../../test/fixtures';
import { renderPage } from '../../test/renderPage';
import { getServiceRequest } from '../requests/api';
import {
  createReview,
  getService,
  getServiceReview,
  updateServiceStatus,
} from './api';
import { ServiceDetailPage } from './ServiceDetailPage';

vi.mock('./api', () => ({
  getService: vi.fn(),
  updateServiceStatus: vi.fn(),
  getServiceReview: vi.fn(),
  createReview: vi.fn(),
}));

vi.mock('../requests/api', () => ({
  getServiceRequest: vi.fn(),
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

function aReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 4,
    serviceId: 12,
    rating: 5,
    comment: 'Llegó puntual y reparó la refrigeradora rápido.',
    createdAt: '2026-11-12T16:30:00',
    ...overrides,
  };
}

describe('ServiceDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getService).mockReset();
    vi.mocked(updateServiceStatus).mockReset();
    vi.mocked(getServiceReview).mockReset();
    vi.mocked(createReview).mockReset();
    vi.mocked(getServiceRequest).mockReset();
    vi.mocked(getServiceRequest).mockResolvedValue(
      aRequest({ id: 7, brand: 'Samsung', model: 'RT38' }),
    );
  });

  it('allows a technician to advance a scheduled service after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(getService).mockResolvedValue(aService({ status: 'PROGRAMADO' }));
    vi.mocked(updateServiceStatus).mockResolvedValue(
      aService({ status: 'EN_ATENCION' }),
    );

    renderPage(<ServiceDetailPage />, {
      path: '/technician/services/:serviceId',
      url: '/technician/services/12',
      role: 'TECHNICIAN',
    });

    await user.click(
      await screen.findByRole('button', { name: 'Iniciar atención' }),
    );
    const dialog = screen.getByRole('alertdialog', {
      name: '¿Iniciar este servicio ahora?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Iniciar atención' }),
    );

    expect(updateServiceStatus).toHaveBeenCalledWith(12, 'EN_ATENCION');
    expect(
      await screen.findByText('Servicio marcado como en atención.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(getService).toHaveBeenCalledTimes(2));
  });

  it('allows a client to cancel a scheduled service after confirmation, without showing Start', async () => {
    const user = userEvent.setup();
    vi.mocked(getService).mockResolvedValue(aService({ status: 'PROGRAMADO' }));
    vi.mocked(updateServiceStatus).mockResolvedValue(
      aService({ status: 'CANCELADO' }),
    );

    renderPage(<ServiceDetailPage />, {
      path: '/client/services/:serviceId',
      url: '/client/services/12',
      role: 'CLIENT',
    });

    expect(
      await screen.findByRole('button', { name: 'Cancelar servicio' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Iniciar atención' }),
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Cancelar servicio' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Cancelar servicio',
      }),
    );

    expect(updateServiceStatus).toHaveBeenCalledWith(12, 'CANCELADO');
    expect(await screen.findByText('Servicio cancelado.')).toBeInTheDocument();
  });

  it('lets a client submit a review on a completed service and displays it', async () => {
    const user = userEvent.setup();
    const savedReview = aReview({
      rating: 4,
      comment: 'Excelente diagnóstico.',
    });
    vi.mocked(getService).mockResolvedValue(aService({ status: 'COMPLETADO' }));
    vi.mocked(getServiceReview)
      .mockRejectedValueOnce(
        new ApiError(404, 'Not Found', { message: 'Review not found' }),
      )
      .mockResolvedValue(savedReview);
    vi.mocked(createReview).mockResolvedValue(savedReview);

    renderPage(<ServiceDetailPage />, {
      path: '/client/services/:serviceId',
      url: '/client/services/12',
      role: 'CLIENT',
    });

    await user.click(await screen.findByRole('radio', { name: '4 estrellas' }));
    await user.type(
      screen.getByLabelText('Comentario'),
      'Excelente diagnóstico.',
    );
    await user.click(screen.getByRole('button', { name: 'Publicar reseña' }));

    expect(createReview).toHaveBeenCalledWith(12, {
      rating: 4,
      comment: 'Excelente diagnóstico.',
    });
    expect(
      await screen.findByText('Excelente diagnóstico.'),
    ).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
  });

  it('shows an existing review without the form for a technician', async () => {
    vi.mocked(getService).mockResolvedValue(aService({ status: 'COMPLETADO' }));
    vi.mocked(getServiceReview).mockResolvedValue(aReview());

    renderPage(<ServiceDetailPage />, {
      path: '/technician/services/:serviceId',
      url: '/technician/services/12',
      role: 'TECHNICIAN',
    });

    expect(
      await screen.findByText(
        'Llegó puntual y reparó la refrigeradora rápido.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Publicar reseña' }),
    ).toBeNull();
  });

  it('refuses a non-numeric service id without calling the API', () => {
    renderPage(<ServiceDetailPage />, {
      path: '/client/services/:serviceId',
      url: '/client/services/abc',
      role: 'CLIENT',
    });

    expect(
      screen.getByRole('heading', { name: 'Servicio no encontrado' }),
    ).toBeInTheDocument();
    expect(getService).not.toHaveBeenCalled();
  });
});

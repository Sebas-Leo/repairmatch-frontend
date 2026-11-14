import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/http';
import type { Review, Service } from '../../shared/api/types';
import { renderPage } from '../../test/renderPage';
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
    comment: 'Arrived on time and fixed the fridge quickly.',
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
      await screen.findByRole('button', { name: 'Start service' }),
    );
    const dialog = screen.getByRole('alertdialog', {
      name: 'Start this service now?',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Start service' }),
    );

    expect(updateServiceStatus).toHaveBeenCalledWith(12, 'EN_ATENCION');
    expect(
      await screen.findByText('Service marked as in progress.'),
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
      await screen.findByRole('button', { name: 'Cancel service' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start service' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Cancel service' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Cancel service',
      }),
    );

    expect(updateServiceStatus).toHaveBeenCalledWith(12, 'CANCELADO');
    expect(await screen.findByText('Service cancelled.')).toBeInTheDocument();
  });

  it('lets a client submit a review on a completed service and displays it', async () => {
    const user = userEvent.setup();
    const savedReview = aReview({ rating: 4, comment: 'Great diagnosis.' });
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

    await user.click(await screen.findByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByLabelText('Comment'), 'Great diagnosis.');
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(createReview).toHaveBeenCalledWith(12, {
      rating: 4,
      comment: 'Great diagnosis.',
    });
    expect(await screen.findByText('Great diagnosis.')).toBeInTheDocument();
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
      await screen.findByText('Arrived on time and fixed the fridge quickly.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit review' })).toBeNull();
  });

  it('refuses a non-numeric service id without calling the API', () => {
    renderPage(<ServiceDetailPage />, {
      path: '/client/services/:serviceId',
      url: '/client/services/abc',
      role: 'CLIENT',
    });

    expect(
      screen.getByRole('heading', { name: 'Service not found' }),
    ).toBeInTheDocument();
    expect(getService).not.toHaveBeenCalled();
  });
});

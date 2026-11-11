import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptProposal, listRequestProposals } from '../proposals/api';
import { describeApiError } from '../../shared/api/errorMessages';
import { ApiError } from '../../shared/api/http';
import { aProposal, aRequest } from '../../test/fixtures';
import { renderPage } from '../../test/renderPage';
import { cancelServiceRequest, getServiceRequest, listEvidences } from './api';
import { RequestDetailPage } from './RequestDetailPage';

vi.mock('./api', () => ({
  getServiceRequest: vi.fn(),
  listEvidences: vi.fn(),
  cancelServiceRequest: vi.fn(),
}));
vi.mock('../proposals/api', () => ({
  listRequestProposals: vi.fn(),
  acceptProposal: vi.fn(),
}));

const PATH = '/client/requests/:requestId';

function setup(url = '/client/requests/7') {
  return renderPage(<RequestDetailPage />, { path: PATH, url });
}

describe('RequestDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getServiceRequest).mockReset();
    vi.mocked(listEvidences).mockReset();
    vi.mocked(listRequestProposals).mockReset();
    vi.mocked(acceptProposal).mockReset();
    vi.mocked(cancelServiceRequest).mockReset();
    vi.mocked(getServiceRequest).mockResolvedValue(
      aRequest({ status: 'CON_PROPUESTAS' }),
    );
    vi.mocked(listEvidences).mockResolvedValue([
      {
        requestId: 7,
        evidenceNumber: 1,
        mediaUrl: 'https://img.example.com/1.jpg',
        mediaType: 'image/jpeg',
      },
    ]);
    vi.mocked(listRequestProposals).mockResolvedValue([
      aProposal({ id: 31, diagnosticCost: 45.5 }),
      aProposal({ id: 32, technicianName: 'Rosa Repairs', diagnosticCost: 30 }),
    ]);
  });

  it('shows the request, its photos and its offers with the cheapest marked', async () => {
    setup();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Refrigerator · Samsung RT38',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toHaveTextContent('Request #7');
    expect(
      await screen.findByRole('img', { name: 'Photo 1 of the appliance' }),
    ).toHaveAttribute('src', 'https://img.example.com/1.jpg');
    const offers = await screen.findAllByRole('article');
    expect(offers).toHaveLength(2);
    expect(within(offers[1]!).getByText('Lowest cost')).toBeInTheDocument();
    expect(within(offers[0]!).queryByText('Lowest cost')).toBeNull();
  });

  it('accepts an offer only after confirming', async () => {
    const user = userEvent.setup();
    vi.mocked(acceptProposal).mockResolvedValue({} as never);
    setup();
    const offers = await screen.findAllByRole('article');
    await user.click(
      within(offers[1]!).getByRole('button', { name: 'Accept offer' }),
    );
    const dialog = screen.getByRole('alertdialog', {
      name: 'Accept the offer from Rosa Repairs?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Not yet' }));
    expect(acceptProposal).not.toHaveBeenCalled();

    await user.click(
      within(offers[1]!).getByRole('button', { name: 'Accept offer' }),
    );
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Accept offer',
      }),
    );
    expect(acceptProposal).toHaveBeenCalledWith(32);
    expect(
      await screen.findByText(
        'Offer from Rosa Repairs accepted. The service is scheduled.',
      ),
    ).toBeInTheDocument();
    // The page asks again so it shows the closed request, and focus lands on
    // the title because the button that opened the dialog may be gone.
    await waitFor(() => expect(getServiceRequest).toHaveBeenCalledTimes(2));
    expect(listRequestProposals).toHaveBeenCalledTimes(2);
  });

  it('cancels the request after confirming, and reports a refusal', async () => {
    const user = userEvent.setup();
    const refusal = new ApiError(409, 'Conflict', {
      message: 'Request already closed',
    });
    vi.mocked(cancelServiceRequest).mockImplementation(() =>
      Promise.reject(refusal),
    );
    setup();
    await user.click(
      await screen.findByRole('button', { name: 'Cancel request' }),
    );
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Cancel request',
      }),
    );
    expect(cancelServiceRequest).toHaveBeenCalledWith(7);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(
      await screen.findByText(describeApiError(refusal).message),
    ).toBeInTheDocument();
    // A 409 means the request changed elsewhere: it is loaded again.
    await waitFor(() => expect(getServiceRequest).toHaveBeenCalledTimes(2));
  });

  it('hides the actions on a closed request without offers', async () => {
    vi.mocked(getServiceRequest).mockResolvedValue(
      aRequest({ status: 'CERRADA', latitude: null, longitude: null }),
    );
    vi.mocked(listEvidences).mockResolvedValue([]);
    vi.mocked(listRequestProposals).mockResolvedValue([]);
    setup();
    expect(
      await screen.findByText('This request closed without offers.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull();
    expect(screen.getByText(/No photos yet/)).toBeInTheDocument();
    expect(screen.getByText(/No location yet/)).toBeInTheDocument();
  });

  it('explains a request that does not exist', async () => {
    vi.mocked(getServiceRequest).mockRejectedValue(
      new ApiError(404, 'Not found', { message: 'Request not found' }),
    );
    setup();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('refuses an id that is not a number without calling the backend', () => {
    setup('/client/requests/abc');
    expect(
      screen.getByRole('heading', { name: 'Request not found' }),
    ).toBeInTheDocument();
    expect(getServiceRequest).not.toHaveBeenCalled();
  });

  it('never turns a stored address that is not http(s) into a link', async () => {
    vi.mocked(listEvidences).mockResolvedValue([
      {
        requestId: 7,
        evidenceNumber: 2,
        mediaUrl: 'javascript:alert(1)',
        mediaType: 'image/jpeg',
      },
    ]);
    setup();
    expect(
      await screen.findByText('Photo 2 has an invalid address'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});

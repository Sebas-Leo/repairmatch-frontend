import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/authContext';
import { listOwnProposals } from '../technicians/api';
import { describeApiError } from '../../shared/api/errorMessages';
import { ApiError } from '../../shared/api/http';
import { ToastProvider } from '../../shared/toast/ToastProvider';
import { anOpportunity, aProposal } from '../../test/fixtures';
import { fakeAuth, pageOf, renderPage } from '../../test/renderPage';
import { submitProposal } from './api';
import { MyProposalsPage } from './MyProposalsPage';
import { SubmitProposalPage } from './SubmitProposalPage';
import { parseCost, toLocalDateTime, validateProposal } from './validation';

vi.mock('./api', () => ({ submitProposal: vi.fn() }));
vi.mock('../technicians/api', () => ({ listOwnProposals: vi.fn() }));

const OFFER_PATH = '/technician/opportunities/:requestId/offer';

/** Opens the offer page the way the opportunity card does: with its summary as state. */
function openOffer(url: string, state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: OFFER_PATH, element: <SubmitProposalPage /> },
      { path: '*', element: <p>Landed elsewhere</p> },
    ],
    { initialEntries: [{ pathname: url, state }] },
  );
  render(
    <AuthContext.Provider value={fakeAuth('TECHNICIAN')}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthContext.Provider>,
  );
  return router;
}

describe('SubmitProposalPage', () => {
  beforeEach(() => {
    vi.mocked(submitProposal).mockReset();
  });

  it('shows the request summary passed by the card and sends the offer', async () => {
    const user = userEvent.setup();
    vi.mocked(submitProposal).mockResolvedValue(aProposal());
    const router = openOffer(
      '/technician/opportunities/7/offer',
      anOpportunity({ requestId: 7 }),
    );
    expect(screen.getByText('It does not spin.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Diagnostic cost (S/)'), '45.50');
    await user.type(
      screen.getByLabelText('Available from'),
      '2099-01-15T09:30',
    );
    await user.type(
      screen.getByLabelText('What it includes'),
      '  Diagnosis at home.  ',
    );
    await user.click(screen.getByRole('button', { name: 'Send offer' }));

    expect(submitProposal).toHaveBeenCalledWith(7, {
      diagnosticCost: 45.5,
      availableAt: '2099-01-15T09:30:00',
      conditions: 'Diagnosis at home.',
    });
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/technician/proposals'),
    );
  });

  it('validates before sending and ignores a summary of another request', async () => {
    const user = userEvent.setup();
    openOffer(
      '/technician/opportunities/7/offer',
      anOpportunity({ requestId: 99 }),
    );
    expect(screen.queryByText('It does not spin.')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Send offer' }));
    expect(
      (await screen.findAllByText('Enter the diagnostic cost.')).length,
    ).toBeGreaterThan(0);
    expect(submitProposal).not.toHaveBeenCalled();
  });

  it('shows why the backend refused the offer', async () => {
    const user = userEvent.setup();
    const refusal = new ApiError(403, 'Forbidden', {
      message: 'Request is outside the technician service radius',
    });
    vi.mocked(submitProposal).mockImplementation(() => Promise.reject(refusal));
    openOffer('/technician/opportunities/7/offer');
    await user.type(screen.getByLabelText('Diagnostic cost (S/)'), '30');
    await user.type(
      screen.getByLabelText('Available from'),
      '2099-01-15T09:30',
    );
    await user.type(screen.getByLabelText('What it includes'), 'Diagnosis');
    await user.click(screen.getByRole('button', { name: 'Send offer' }));
    expect(
      (await screen.findAllByText(describeApiError(refusal).message)).length,
    ).toBeGreaterThan(0);
  });

  it('ignores router state that does not look like an opportunity', () => {
    openOffer('/technician/opportunities/7/offer', {
      requestId: 7,
      applianceTypeName: 'Fridge',
      description: 'x',
      distanceKm: 'far',
    });
    expect(
      screen.getByRole('heading', { name: 'Send an offer for request #7' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Fridge')).toBeNull();
  });

  it('accepts a decimal comma in the cost', async () => {
    const user = userEvent.setup();
    vi.mocked(submitProposal).mockResolvedValue(aProposal());
    openOffer('/technician/opportunities/7/offer');
    await user.type(screen.getByLabelText('Diagnostic cost (S/)'), '45,5');
    await user.type(
      screen.getByLabelText('Available from'),
      '2099-01-15T09:30',
    );
    await user.type(screen.getByLabelText('What it includes'), 'Diagnosis');
    await user.click(screen.getByRole('button', { name: 'Send offer' }));
    expect(submitProposal).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ diagnosticCost: 45.5 }),
    );
  });

  it('refuses an id that is not a number', () => {
    openOffer('/technician/opportunities/abc/offer');
    expect(
      screen.getByRole('heading', { name: 'Request not found' }),
    ).toBeInTheDocument();
  });
});

describe('MyProposalsPage', () => {
  beforeEach(() => {
    vi.mocked(listOwnProposals).mockReset();
  });

  it('lists the offers with their request and pages them', async () => {
    vi.mocked(listOwnProposals).mockResolvedValue(
      pageOf(
        [
          aProposal({ requestId: 12 }),
          aProposal({ id: 32, status: 'ACCEPTED' }),
        ],
        {
          totalElements: 14,
        },
      ),
    );
    renderPage(<MyProposalsPage />, {
      path: '/technician/proposals',
      role: 'TECHNICIAN',
    });
    expect(
      await screen.findByRole('heading', { name: 'Request #12' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–10 of 14')).toBeInTheDocument();
  });

  it('points a new technician to the opportunities', async () => {
    vi.mocked(listOwnProposals).mockResolvedValue(pageOf([]));
    renderPage(<MyProposalsPage />, {
      path: '/technician/proposals',
      role: 'TECHNICIAN',
    });
    expect(
      await screen.findByRole('link', { name: 'See opportunities' }),
    ).toHaveAttribute('href', '/technician/opportunities');
  });

  it('sends a visitor past the end to the last page', async () => {
    const user = userEvent.setup();
    vi.mocked(listOwnProposals).mockResolvedValue(
      pageOf([], { page: 5, totalElements: 14 }),
    );
    const { router } = renderPage(<MyProposalsPage />, {
      path: '/technician/proposals',
      url: '/technician/proposals?page=6',
      role: 'TECHNICIAN',
    });
    await user.click(
      await screen.findByRole('button', { name: 'Go to the last page' }),
    );
    expect(router.state.location.search).toBe('?page=2');
  });

  it('shows an error when the offers do not load', async () => {
    vi.mocked(listOwnProposals).mockImplementation(() =>
      Promise.reject(new ApiError(403, 'Forbidden', {})),
    );
    renderPage(<MyProposalsPage />, {
      path: '/technician/proposals',
      role: 'TECHNICIAN',
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('validateProposal', () => {
  const now = new Date('2026-11-11T12:00:00');
  const valid = {
    diagnosticCost: '45.5',
    availableAt: '2026-11-12T09:00',
    conditions: 'Diagnosis at home',
  };

  it('accepts a complete offer and formats the date for the backend', () => {
    expect(validateProposal(valid, now)).toEqual({});
    expect(toLocalDateTime('2026-11-12T09:00')).toBe('2026-11-12T09:00:00');
    expect(toLocalDateTime('2026-11-12T09:00:30')).toBe('2026-11-12T09:00:30');
  });

  it('applies the backend rules', () => {
    expect(
      validateProposal(
        {
          diagnosticCost: '-1',
          availableAt: '2026-11-10T09:00',
          conditions: ' ',
        },
        now,
      ),
    ).toEqual({
      diagnosticCost: 'The cost cannot be negative.',
      availableAt: 'Choose a date and time in the future.',
      conditions: 'Explain what the offer includes.',
    });
    for (const ok of ['0', '5', '45.5', '45.50', '.5', '5.', '45,5', ' 7 ']) {
      expect(validateProposal({ ...valid, diagnosticCost: ok }, now)).toEqual(
        {},
      );
    }
    for (const bad of ['1.234', '1e3', '0x10', 'abc', '4 5']) {
      expect(
        validateProposal({ ...valid, diagnosticCost: bad }, now).diagnosticCost,
      ).toBe('Use a number like 45 or 45.50 (two decimals at most).');
    }
    expect(parseCost('45,5')).toBe(45.5);
    expect(
      validateProposal({ ...valid, diagnosticCost: '99999999999' }, now)
        .diagnosticCost,
    ).toBe('That cost is too high.');
    expect(
      validateProposal({ ...valid, availableAt: '' }, now).availableAt,
    ).toBe('Choose when you can go.');
    expect(
      validateProposal({ ...valid, conditions: 'x'.repeat(1001) }, now)
        .conditions,
    ).toBe('Keep it under 1000 characters.');
  });
});

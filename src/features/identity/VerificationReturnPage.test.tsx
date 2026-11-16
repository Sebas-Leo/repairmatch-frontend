import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdentityState } from '../../shared/api/types';
import { renderPage } from '../../test/renderPage';
import { getIdentityState } from './api';
import {
  MAX_POLLS,
  POLL_MS,
  VerificationReturnPage,
} from './VerificationReturnPage';

vi.mock('./api', () => ({ getIdentityState: vi.fn() }));

const PATH = '/verification/return';

function stateOf(status: IdentityState['status']): IdentityState {
  return {
    status,
    verifiedAt: status === 'VERIFIED' ? '2026-11-14T10:30:00' : null,
  };
}

describe('VerificationReturnPage', () => {
  beforeEach(() => {
    vi.mocked(getIdentityState).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores the Didit query string and shows the status our server reports', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('VERIFIED'));
    renderPage(<VerificationReturnPage />, {
      path: PATH,
      url: `${PATH}?verificationSessionId=abc&status=Declined`,
    });
    expect(
      await screen.findByText('¡Listo! Tu identidad quedó verificada.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Identidad verificada')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ir a mi cuenta' })).toBeNull();
    expect(getIdentityState).toHaveBeenCalledTimes(1);
  });

  it('says it was rejected and links to the role account page', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('REJECTED'));
    renderPage(<VerificationReturnPage />, { path: PATH, role: 'TECHNICIAN' });
    expect(
      await screen.findByText('No pudimos verificar tu identidad.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ir a mi cuenta' }),
    ).toHaveAttribute('href', '/technician/profile');
  });

  it('sends clients to their account page when it did not complete', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('NOT_STARTED'));
    renderPage(<VerificationReturnPage />, { path: PATH, role: 'CLIENT' });
    expect(
      await screen.findByText('Tu verificación no se completó.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ir a mi cuenta' }),
    ).toHaveAttribute('href', '/client/account');
  });

  it('polls while pending and shows the result once the webhook lands', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getIdentityState)
      .mockResolvedValueOnce(stateOf('PENDING'))
      .mockResolvedValue(stateOf('VERIFIED'));
    renderPage(<VerificationReturnPage />, { path: PATH });
    expect(
      await screen.findByText('Tu verificación está en revisión.'),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS + 50);
    });
    expect(
      await screen.findByText('¡Listo! Tu identidad quedó verificada.'),
    ).toBeInTheDocument();
    expect(getIdentityState).toHaveBeenCalledTimes(2);
  });

  it('stops polling after a few tries and reassures the user', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('PENDING'));
    renderPage(<VerificationReturnPage />, { path: PATH });
    await screen.findByText('Tu verificación está en revisión.');

    for (let i = 0; i < MAX_POLLS + 2; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS + 50);
      });
    }
    expect(getIdentityState).toHaveBeenCalledTimes(MAX_POLLS + 1);
    expect(screen.getByText(/Está tardando un poco más/)).toBeInTheDocument();
  });
});

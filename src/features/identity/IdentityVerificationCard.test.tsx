import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/http';
import type { IdentityState } from '../../shared/api/types';
import { renderPage } from '../../test/renderPage';
import { getIdentityState, startIdentityVerification } from './api';
import { IdentityVerificationCard } from './IdentityVerificationCard';
import { openVerificationPage } from './openExternal';

vi.mock('./api', () => ({
  getIdentityState: vi.fn(),
  startIdentityVerification: vi.fn(),
}));
vi.mock('./openExternal', () => ({ openVerificationPage: vi.fn() }));

function stateOf(
  status: IdentityState['status'],
  verifiedAt: string | null = null,
): IdentityState {
  return { status, verifiedAt };
}

function setup(role: 'CLIENT' | 'TECHNICIAN' = 'CLIENT') {
  return renderPage(<IdentityVerificationCard />, { path: '/account', role });
}

describe('IdentityVerificationCard', () => {
  beforeEach(() => {
    vi.mocked(getIdentityState).mockReset();
    vi.mocked(startIdentityVerification).mockReset();
    vi.mocked(openVerificationPage).mockReset();
  });

  it('offers to start when the verification was never started', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('NOT_STARTED'));
    setup();
    expect(
      await screen.findByText('Aún no verificas tu identidad'),
    ).toBeInTheDocument();
    expect(screen.getByText('No iniciada')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Verificar mi identidad' }),
    ).toBeInTheDocument();
  });

  it('shows the review state with a way to continue and to refresh', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('PENDING'));
    setup('TECHNICIAN');
    expect(
      await screen.findByText('Verificación en revisión'),
    ).toBeInTheDocument();
    expect(screen.getByText('En revisión')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continuar verificación' }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Actualizar estado' }),
    );
    await waitFor(() => expect(getIdentityState).toHaveBeenCalledTimes(2));
  });

  it('shows the verified badge and no button once verified', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(
      stateOf('VERIFIED', '2026-11-14T10:30:00'),
    );
    setup();
    expect(
      await screen.findByText(
        'Listo: tu perfil muestra la insignia de identidad verificada.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Identidad verificada').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/Verificada el/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Verificar|Intentar/ }),
    ).toBeNull();
  });

  it('lets a rejected user try again', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('REJECTED'));
    setup();
    expect(
      await screen.findByText('No pudimos verificar tu identidad'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Intentar de nuevo' }),
    ).toBeInTheDocument();
  });

  it('opens the Didit page after validating the URL', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('NOT_STARTED'));
    vi.mocked(startIdentityVerification).mockResolvedValue({
      url: 'https://verify.didit.me/session/abc',
      status: 'PENDING',
    });
    setup();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Verificar mi identidad' }),
    );
    await waitFor(() =>
      expect(openVerificationPage).toHaveBeenCalledWith(
        'https://verify.didit.me/session/abc',
      ),
    );
  });

  it('refuses a non-http URL from the server and tells the user', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('NOT_STARTED'));
    vi.mocked(startIdentityVerification).mockResolvedValue({
      url: 'javascript:alert(1)',
      status: 'PENDING',
    });
    setup();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Verificar mi identidad' }),
    );
    expect(
      await screen.findByText(/No pudimos abrir la verificación/),
    ).toBeInTheDocument();
    expect(openVerificationPage).not.toHaveBeenCalled();
  });

  it('shows an error toast when the server cannot start a session', async () => {
    vi.mocked(getIdentityState).mockResolvedValue(stateOf('NOT_STARTED'));
    vi.mocked(startIdentityVerification).mockRejectedValue(
      new ApiError(
        503,
        'La verificación de identidad no está disponible por ahora',
        undefined,
      ),
    );
    setup();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Verificar mi identidad' }),
    );
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(openVerificationPage).not.toHaveBeenCalled();
  });

  it('shows a retryable error when the status cannot load', async () => {
    vi.mocked(getIdentityState).mockRejectedValue(
      new ApiError(404, 'x', undefined),
    );
    setup();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

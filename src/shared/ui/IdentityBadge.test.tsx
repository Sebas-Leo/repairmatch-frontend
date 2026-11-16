import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ProposalCard } from '../../features/proposals/ProposalCard';
import { aProposal } from '../../test/fixtures';
import { IdentityBadge } from './IdentityBadge';

describe('IdentityBadge', () => {
  it('renders the default and a custom label', () => {
    const { rerender } = render(<IdentityBadge />);
    expect(screen.getByText('Identidad verificada')).toBeInTheDocument();
    rerender(<IdentityBadge label="Cliente verificado" />);
    expect(screen.getByText('Cliente verificado')).toBeInTheDocument();
  });

  it('hides its icon from assistive technology', () => {
    const { container } = render(<IdentityBadge />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});

describe('ProposalCard identity badge', () => {
  function renderCard(identityVerified: boolean | undefined) {
    render(
      <MemoryRouter>
        <ProposalCard
          proposal={
            identityVerified === undefined
              ? aProposal()
              : aProposal({ identityVerified })
          }
        />
      </MemoryRouter>,
    );
  }

  it('shows the badge on a verified technician', () => {
    renderCard(true);
    expect(screen.getByText('Identidad verificada')).toBeInTheDocument();
  });

  it('shows nothing for an unverified or unknown technician', () => {
    renderCard(false);
    expect(screen.queryByText('Identidad verificada')).toBeNull();
  });

  it('treats a server that omits the flag as not verified', () => {
    renderCard(undefined);
    expect(screen.queryByText('Identidad verificada')).toBeNull();
  });
});

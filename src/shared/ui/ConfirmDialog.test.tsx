import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function Harness({
  onConfirm = vi.fn(),
  busy = false,
}: {
  onConfirm?: () => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Cancel request
      </button>
      <ConfirmDialog
        open={open}
        busy={busy}
        title="Cancel this request?"
        description="Technicians will no longer see it."
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep it"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('opens on the safe choice and returns focus when closed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Cancel request' });
    await user.click(trigger);

    const dialog = screen.getByRole('alertdialog', {
      name: 'Cancel this request?',
    });
    expect(dialog).toHaveAccessibleDescription(
      'Technicians will no longer see it.',
    );
    expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Cancel request' }));
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Yes, cancel it' }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(
      screen.getByRole('button', { name: 'Yes, cancel it' }),
    ).toHaveFocus();
  });

  it('confirms with the confirm button', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Cancel request' }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel it' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cannot be dismissed while the action runs', async () => {
    const user = userEvent.setup();
    render(<Harness busy />);
    await user.click(screen.getByRole('button', { name: 'Cancel request' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Yes, cancel it' }),
    ).toBeDisabled();
  });
});

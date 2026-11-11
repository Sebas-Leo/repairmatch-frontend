import { TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive actions (cancel a request, reject a proposal). */
  tone?: 'danger' | 'primary';
  /** Shows a spinner on the confirm button while the action runs. */
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/**
 * Modal confirmation for actions that cannot be undone. Focus moves to the
 * cancel button (the safe choice), Tab stays inside, Escape and the backdrop
 * cancel, and focus returns to where it was on close.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, [open]);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !busy) {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={busy ? undefined : onCancel}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative grid w-full max-w-md gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-start gap-3">
          {tone === 'danger' ? (
            <span className="mt-0.5 text-danger" aria-hidden="true">
              <TriangleAlert size={22} />
            </span>
          ) : null}
          <div className="grid gap-1">
            <h2 id={titleId} className="m-0 text-xl">
              {title}
            </h2>
            <p id={descriptionId} className="m-0 text-muted">
              {description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

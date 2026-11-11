import { TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
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
 * cancel, the page behind does not scroll, and focus returns to where it was
 * on close. Keys are handled on the document, so they keep working when focus
 * sits on the panel itself (a click on its text, or while the buttons are busy).
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
  const latest = useRef({ busy, onCancel });
  useEffect(() => {
    latest.current = { busy, onCancel };
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!latest.current.busy) latest.current.onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>('button:not([disabled])'),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement;
      const inside = active instanceof Node && panel.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  // While the buttons are disabled, keep focus inside instead of on <body>.
  useEffect(() => {
    if (open && busy) panelRef.current?.focus();
  }, [open, busy]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
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
        aria-busy={busy || undefined}
        tabIndex={-1}
        className="relative grid w-full max-w-md gap-3 rounded-card border border-line bg-surface p-5 shadow-card focus:outline-none"
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

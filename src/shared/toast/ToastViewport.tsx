import { useEffect, useState } from 'react';
import type { ToastKind } from './toastContext';

export interface ToastEntry {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs: number;
}

const ICONS: Record<ToastKind, string> = {
  success: '✓',
  error: '!',
  info: 'i',
};

// Said before the message so the kind never depends on color alone.
const LABELS: Record<ToastKind, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Notice',
};

interface ToastItemProps {
  toast: ToastEntry;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [paused, setPaused] = useState(false);

  // The countdown stops while the toast is hovered or focused, so there is
  // time to read it, and restarts when the pointer or focus leaves.
  useEffect(() => {
    if (toast.durationMs <= 0 || paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, paused, onDismiss]);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : undefined}
      className={`toast toast-${toast.kind}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDismiss(toast.id);
      }}
    >
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.kind]}
      </span>
      <p className="toast-message">
        <span className="visually-hidden">{LABELS[toast.kind]}: </span>
        {toast.message}
      </p>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

interface ToastViewportProps {
  toasts: readonly ToastEntry[];
  onDismiss: (id: string) => void;
}

/**
 * Where toasts appear. Success and info toasts go in a polite live region (read
 * when the screen reader is idle); errors are `role="alert"` items, read at once.
 * Both containers stay mounted so announcements are reliable.
 */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const render = (toast: ToastEntry) => (
    <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
  );
  return (
    <div className="toast-viewport">
      <div className="toast-stack" aria-live="polite">
        {toasts.filter((toast) => toast.kind !== 'error').map(render)}
      </div>
      <div className="toast-stack">
        {toasts.filter((toast) => toast.kind === 'error').map(render)}
      </div>
    </div>
  );
}

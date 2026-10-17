import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ToastContext,
  type ToastApi,
  type ToastKind,
  type ToastOptions,
} from './toastContext';
import { ToastViewport, type ToastEntry } from './ToastViewport';

const DEFAULT_DURATION_MS = 5_000;
// Errors stay longer: they are the messages people most need to finish reading.
const DEFAULT_ERROR_DURATION_MS = 8_000;
const DEFAULT_MAX_VISIBLE = 3;

interface ToastProviderProps {
  children: ReactNode;
  /** How long a toast stays when the call does not say. Defaults to 5 s (8 s for errors). */
  durationMs?: number;
  /** Toasts on screen at once; showing one more closes the oldest. */
  maxVisible?: number;
}

/** Provides `useToast()` and renders the toasts. Mount it once, above the pages. */
export function ToastProvider({
  children,
  durationMs,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<readonly ToastEntry[]>([]);
  const lastId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const limit = Math.max(1, maxVisible);
    const show = (kind: ToastKind, message: string, options?: ToastOptions) => {
      lastId.current += 1;
      const id = `toast-${lastId.current}`;
      const entry: ToastEntry = {
        id,
        kind,
        message,
        durationMs:
          options?.durationMs ??
          durationMs ??
          (kind === 'error' ? DEFAULT_ERROR_DURATION_MS : DEFAULT_DURATION_MS),
      };
      setToasts((current) => [...current, entry].slice(-limit));
      return id;
    };
    return {
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
      dismiss,
    };
  }, [dismiss, durationMs, maxVisible]);

  return (
    <ToastContext value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  );
}

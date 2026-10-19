import { createContext, useContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  /** Milliseconds before the toast closes by itself. `0` keeps it until dismissed. */
  durationMs?: number;
}

export interface ToastApi {
  /** Each call returns the id of the toast, for `dismiss`. */
  success(message: string, options?: ToastOptions): string;
  error(message: string, options?: ToastOptions): string;
  info(message: string, options?: ToastOptions): string;
  /** Closes a toast. An id that is already gone is ignored. */
  dismiss(id: string): void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Shows short, non-blocking notifications. Must be used inside `<ToastProvider>`. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

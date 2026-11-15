import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../ui/ErrorState';
import { isChunkLoadError } from './chunkLoadError';
import { reloadPage } from './reloadPage';

export interface ErrorBoundaryFallbackProps {
  /** What was thrown. Log it or classify it; do not render it, it can hold internals. */
  error: unknown;
  /** Clears the failure and renders the children again. */
  reset: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * What to show instead of the children. A function receives the error and
   * `reset`. Defaults to a short message with a "Try again" button, or with a
   * "Reload page" button when a lazy page failed to download (see
   * `isChunkLoadError`: rendering again cannot fix that).
   */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /** Called once per caught error, for example to log it. */
  onError?: (error: unknown, info: ErrorInfo) => void;
  /** Called when the boundary is reset, before the children render again. */
  onReset?: () => void;
  /** Reloads the page after a failed download. Defaults to `window.location.reload()`. */
  onReload?: () => void;
}

interface ErrorBoundaryState {
  /** Wrapped so that a thrown `undefined` still counts as a failure. */
  failure: { error: unknown } | null;
}

/**
 * Catches render errors in its subtree so one broken widget does not blank the
 * page. It does not catch errors in event handlers or async code: handle those
 * where they happen (see `describeApiError`). Route screens are already covered
 * by the router's `errorElement`; use this to isolate a part of a screen.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failure: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failure: { error } };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ failure: null });
  };

  render() {
    const { failure } = this.state;
    if (!failure) return this.props.children;
    const { fallback, onReload = reloadPage } = this.props;
    if (typeof fallback === 'function') {
      return fallback({ error: failure.error, reset: this.reset });
    }
    if (fallback !== undefined) return fallback;
    return isChunkLoadError(failure.error) ? (
      <ErrorState
        title="Puede haber una nueva versión disponible"
        message="No se pudo cargar esta sección. Recarga la página para obtener la última versión."
        retryLabel="Recargar página"
        onRetry={onReload}
      />
    ) : (
      <ErrorState
        title="Ocurrió un error"
        message="No se pudo mostrar esta sección. Inténtalo nuevamente."
        onRetry={this.reset}
      />
    );
  }
}

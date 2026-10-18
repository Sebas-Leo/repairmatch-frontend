import { describeApiError } from '../api/errorMessages';

interface ErrorStateProps {
  /**
   * What a call rejected with. The wording and whether trying again can help
   * come from `describeApiError`. A cancelled call renders nothing.
   */
  error?: unknown;
  /** Replaces the heading derived from `error`. */
  title?: string;
  /** Replaces the text derived from `error`. */
  message?: string;
  /**
   * Shows a button that calls this. With an `error`, the button is left out
   * when asking again cannot help (403, 404, a validation error...).
   */
  onRetry?: () => void;
  /** Text of the button. Defaults to "Try again". */
  retryLabel?: string;
}

/**
 * Inline failure of a list or panel that could not load, announced to screen
 * readers, with an optional retry. Use `ErrorBoundary` for crashes instead.
 */
export function ErrorState({
  error,
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  const description = describeApiError(error);
  if (description.kind === 'cancelled') return null;
  const canRetry =
    onRetry !== undefined && (error === undefined || description.retryable);
  return (
    <div role="alert" className="error-state">
      <p className="error-state-title">{title ?? description.title}</p>
      <p>{message ?? description.message}</p>
      {canRetry ? (
        <button type="button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

import {
  ApiError,
  isAbortError,
  isTimeoutError,
  NetworkError,
  serverMessageOf,
  type FieldErrors,
} from './http';

export type ApiErrorKind =
  | 'cancelled'
  | 'offline'
  | 'network'
  | 'timeout'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  | 'server'
  | 'unknown';

export interface ApiErrorDescription {
  kind: ApiErrorKind;
  /** Short heading, for example for a toast. */
  title: string;
  /** What happened and what to do about it, ready to show to the user. */
  message: string;
  /**
   * Whether asking again can reasonably work (connection, timeout, rate limit,
   * server). It does not say a retry is safe: after a network failure or a
   * timeout the server may have processed a POST already.
   */
  retryable: boolean;
  /** Per-field messages of a validation error; empty otherwise. */
  fieldErrors: FieldErrors;
}

interface Copy {
  title: string;
  message: string;
  retryable: boolean;
}

const COPY: Record<ApiErrorKind, Copy> = {
  cancelled: {
    title: 'Request cancelled',
    message: 'The request was cancelled.',
    retryable: false,
  },
  offline: {
    title: 'You are offline',
    message: 'You appear to be offline. Check your connection and try again.',
    retryable: true,
  },
  network: {
    title: 'Connection problem',
    message:
      'We could not reach the server. Check your connection and try again.',
    retryable: true,
  },
  timeout: {
    title: 'The request timed out',
    message: 'The server took too long to answer. Try again.',
    retryable: true,
  },
  validation: {
    title: 'Check your information',
    message: 'Some of the information is not valid. Review it and try again.',
    retryable: false,
  },
  unauthorized: {
    title: 'Sign-in required',
    message:
      'Your session has expired or your credentials are not valid. Sign in and try again.',
    retryable: false,
  },
  forbidden: {
    title: 'Access denied',
    message: 'You do not have permission to do this.',
    retryable: false,
  },
  'not-found': {
    title: 'Not found',
    message: 'We could not find what you were looking for. It may be gone.',
    retryable: false,
  },
  conflict: {
    title: 'Already exists or changed',
    message:
      'This conflicts with existing data, for example something that already exists. Review it and try again.',
    retryable: false,
  },
  'rate-limited': {
    title: 'Too many attempts',
    message: 'You are doing that too often. Wait a moment and try again.',
    retryable: true,
  },
  server: {
    title: 'Server error',
    message: 'Something went wrong on our side. Try again in a few moments.',
    retryable: true,
  },
  // Cannot tell what failed, so asking again is offered rather than ruled out.
  unknown: {
    title: 'Something went wrong',
    message:
      'Something went wrong. Try again, and reload the page if it keeps happening.',
    retryable: true,
  },
};

// The kinds the user can fix. The backend writes their message and per-field
// errors for the user and they name the exact problem ("that email is already
// registered"), so they win over the generic copy. Anything the backend says
// in a 429, 5xx or unexpected answer is internal and is never exposed.
const SERVER_TEXT_KINDS: ReadonlySet<ApiErrorKind> = new Set([
  'validation',
  'unauthorized',
  'forbidden',
  'not-found',
  'conflict',
]);

const NO_FIELD_ERRORS: FieldErrors = Object.freeze({});

function kindForStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
    case 422:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    case 408:
      return 'timeout';
    case 409:
      return 'conflict';
    case 429:
      return 'rate-limited';
    default:
      return status >= 500 ? 'server' : 'unknown';
  }
}

function kindOf(error: unknown): ApiErrorKind {
  if (isAbortError(error)) return 'cancelled';
  if (error instanceof ApiError) return kindForStatus(error.status);
  if (error instanceof NetworkError) {
    return typeof navigator !== 'undefined' && !navigator.onLine
      ? 'offline'
      : 'network';
  }
  if (isTimeoutError(error)) return 'timeout';
  return 'unknown';
}

/**
 * Turns whatever a call rejected with into text for the user, so every screen
 * explains failures the same way. Never shows internals (stack, status line,
 * 5xx bodies): the backend's text and field errors come through only for the
 * errors the user can fix. A `cancelled` call was the caller's own decision: do
 * not show it.
 */
export function describeApiError(error: unknown): ApiErrorDescription {
  const kind = kindOf(error);
  const copy = COPY[kind];
  const userFixable =
    error instanceof ApiError && SERVER_TEXT_KINDS.has(kind)
      ? error
      : undefined;
  return {
    kind,
    title: copy.title,
    message: (userFixable && serverMessageOf(userFixable)) ?? copy.message,
    retryable: copy.retryable,
    fieldErrors: userFixable?.errors ?? NO_FIELD_ERRORS,
  };
}

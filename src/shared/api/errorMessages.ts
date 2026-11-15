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
    title: 'Solicitud cancelada',
    message: 'La solicitud fue cancelada.',
    retryable: false,
  },
  offline: {
    title: 'Sin conexión',
    message: 'Parece que no tienes conexión. Revísala e inténtalo nuevamente.',
    retryable: true,
  },
  network: {
    title: 'Problema de conexión',
    message:
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.',
    retryable: true,
  },
  timeout: {
    title: 'Se agotó el tiempo de espera',
    message: 'El servidor tardó demasiado en responder. Inténtalo nuevamente.',
    retryable: true,
  },
  validation: {
    title: 'Revisa tus datos',
    message: 'Algunos datos no son válidos. Revísalos e inténtalo nuevamente.',
    retryable: false,
  },
  unauthorized: {
    title: 'Debes iniciar sesión',
    message:
      'Tu sesión venció o los datos de acceso no son válidos. Inicia sesión e inténtalo nuevamente.',
    retryable: false,
  },
  forbidden: {
    title: 'Acceso denegado',
    message: 'No tienes permiso para realizar esta acción.',
    retryable: false,
  },
  'not-found': {
    title: 'No encontrado',
    message:
      'No encontramos lo que buscas. Es posible que ya no esté disponible.',
    retryable: false,
  },
  conflict: {
    title: 'Ya existe o fue modificado',
    message:
      'Los datos entran en conflicto con información existente. Revísalos e inténtalo nuevamente.',
    retryable: false,
  },
  'rate-limited': {
    title: 'Demasiados intentos',
    message:
      'Has realizado demasiados intentos. Espera un momento e inténtalo nuevamente.',
    retryable: true,
  },
  server: {
    title: 'Error del servidor',
    message: 'Ocurrió un error en el servidor. Inténtalo en unos momentos.',
    retryable: true,
  },
  // Cannot tell what failed, so asking again is offered rather than ruled out.
  unknown: {
    title: 'Ocurrió un error',
    message:
      'Ocurrió un error. Inténtalo nuevamente y recarga la página si continúa.',
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

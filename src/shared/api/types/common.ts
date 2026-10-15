/**
 * Shared primitives of the backend contract (docs/API_CONTRACT.md in the
 * backend repository). Types describe the expected JSON; they are NOT runtime
 * validation, so treat every response as external data.
 */

/** UUID string. Used for user and technician ids. */
export type Uuid = string;

/**
 * ISO-8601 local date-time WITHOUT timezone (Java `LocalDateTime`), e.g.
 * `2026-10-14T22:02:19.123`. Send `availableAt` in the same format.
 */
export type LocalDateTimeString = string;

/** ISO-8601 instant WITH timezone (`Z`). Only used by the error `timestamp`. */
export type InstantString = string;

/**
 * Body of every backend error response (400, 401, 403, 404, 405, 409, 415,
 * 500, including Spring Security 401/403).
 */
export interface ErrorResponse {
  timestamp: InstantString;
  status: number;
  error: string;
  /** Human-readable text, always present. Mixed Spanish/English. */
  message: string;
  path: string;
  /** `{}` except validation (field -> message) and invalid query parameters. */
  errors: Record<string, string>;
  /** Legacy duplicate of `message`, kept by the backend for compatibility. */
  detail?: string;
}

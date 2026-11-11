import { ApiError } from '../../shared/api/http';

/** 404 = no profile yet, 400 = no service area: the setup is missing, not a failure. */
export function needsSetup(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 404 || error.status === 400)
  );
}

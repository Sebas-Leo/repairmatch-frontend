import type { Role } from '../../shared/api/types';

/** Router state attached when an anonymous visitor is sent to /login. */
export interface ReturnLocationState {
  from?: string;
}

export function roleHome(role: Role): string {
  return role === 'CLIENT' ? '/client' : '/technician';
}

const AREA_ROLES: ReadonlyArray<readonly [prefix: string, role: Role]> = [
  ['/client', 'CLIENT'],
  ['/technician', 'TECHNICIAN'],
];

const NEVER_RETURN_TO = new Set(['/', '/login', '/register', '/unauthorized']);

function pathnameOf(path: string): string {
  return path.split(/[?#]/, 1)[0] ?? path;
}

/**
 * Reads the preserved location from router state. Only same-origin, in-app
 * paths pass: anything else (absolute URLs, `//host`, backslashes, control
 * characters) is dropped so the login redirect can never be abused.
 */
export function readReturnPath(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;
  const from = (state as ReturnLocationState).from;
  if (typeof from !== 'string') return null;
  if (!from.startsWith('/') || from.startsWith('//')) return null;
  // eslint-disable-next-line no-control-regex
  if (from.includes('\\') || /[\u0000-\u001f\u007f]/.test(from)) return null;
  return from;
}

/**
 * Where to go once signed in: the preserved location when the role may open
 * it, otherwise the role home. This is UX only; the backend still authorizes.
 */
export function resolvePostLoginTarget(state: unknown, role: Role): string {
  const from = readReturnPath(state);
  if (!from) return roleHome(role);
  const pathname = pathnameOf(from);
  if (NEVER_RETURN_TO.has(pathname)) return roleHome(role);
  for (const [prefix, areaRole] of AREA_ROLES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return areaRole === role ? from : roleHome(role);
    }
  }
  return from;
}

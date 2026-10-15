import type { Uuid } from './common';

export const ROLES = ['CLIENT', 'TECHNICIAN'] as const;
export type Role = (typeof ROLES)[number];

/** POST /auth/register */
export interface RegisterRequest {
  /** Required, at most 100 characters (the backend strips surrounding spaces). */
  name: string;
  /** Required, valid email, at most 254 characters (stored lowercase). */
  email: string;
  /**
   * 8-72 characters (and at most 72 UTF-8 bytes) with an uppercase letter, a
   * lowercase letter, a digit and a symbol.
   */
  password: string;
  role: Role;
}

/** POST /auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /auth/refresh and POST /auth/logout. At most 512 characters. */
export interface RefreshRequest {
  refreshToken: string;
}

/** Response of POST /auth/login and POST /auth/refresh. */
export interface TokenPair {
  accessToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds (3600). */
  expiresIn: number;
  /** Single-use: every refresh revokes it and returns a new pair. */
  refreshToken: string;
  /** Refresh token lifetime in seconds (604800). */
  refreshExpiresIn: number;
}

/** Response of POST /auth/register (201) and GET /users/me. */
export interface UserResponse {
  id: Uuid;
  name: string;
  email: string;
  role: Role;
}

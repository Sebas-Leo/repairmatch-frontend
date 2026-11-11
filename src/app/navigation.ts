import type { Role } from '../shared/api/types';

export interface NavItem {
  label: string;
  to: string;
  /** Matches only the exact path (for area homes such as `/client`). */
  end?: boolean;
}

/**
 * Main navigation per role. A module owner adds the entry of their screen here
 * once its route exists, so the menu never links to a 404.
 */
export const NAVIGATION: Record<Role, readonly NavItem[]> = {
  CLIENT: [{ label: 'Dashboard', to: '/client', end: true }],
  TECHNICIAN: [{ label: 'Dashboard', to: '/technician', end: true }],
};

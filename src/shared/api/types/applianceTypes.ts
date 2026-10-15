/** GET /appliance-types (any authenticated account), sorted by name. */
export interface ApplianceType {
  id: number;
  name: string;
  /** Nullable column (255 characters). */
  description: string | null;
}

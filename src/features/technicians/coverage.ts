/** Radius filters of the coverage panel, in km; null means the whole zone. */
export const RADIUS_OPTIONS = [2, 5, 10, null] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'near', label: 'Más cercanos' },
  { value: 'no-offers', label: 'Sin ofertas aún' },
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

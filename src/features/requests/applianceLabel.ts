/** Spanish names for the catalog types, which the backend still sends in English. */
const LABELS: Record<string, string> = {
  'air conditioner': 'Aire acondicionado',
  'washing machine': 'Lavadora',
  refrigerator: 'Refrigeradora',
  fridge: 'Refrigeradora',
  oven: 'Horno',
  microwave: 'Microondas',
  dishwasher: 'Lavavajillas',
  dryer: 'Secadora',
  stove: 'Cocina',
};

export function applianceLabel(name: string): string {
  return LABELS[name.trim().toLowerCase()] ?? name;
}

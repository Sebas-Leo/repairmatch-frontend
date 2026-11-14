/**
 * Approximate centres of Lima districts, enough to name the area around a
 * point. It is a label for humans ("near Miraflores"), not a geocoder.
 */
const DISTRICTS: readonly { name: string; lat: number; lon: number }[] = [
  { name: 'Miraflores', lat: -12.1211, lon: -77.0297 },
  { name: 'San Isidro', lat: -12.0977, lon: -77.0365 },
  { name: 'Santiago de Surco', lat: -12.1356, lon: -77.0088 },
  { name: 'Barranco', lat: -12.1497, lon: -77.0219 },
  { name: 'San Borja', lat: -12.1027, lon: -76.9997 },
  { name: 'Surquillo', lat: -12.1129, lon: -77.0181 },
  { name: 'Lince', lat: -12.0844, lon: -77.0353 },
  { name: 'Jesús María', lat: -12.0773, lon: -77.0494 },
  { name: 'Magdalena del Mar', lat: -12.0912, lon: -77.0717 },
  { name: 'San Miguel', lat: -12.0776, lon: -77.0906 },
  { name: 'Pueblo Libre', lat: -12.0756, lon: -77.0628 },
  { name: 'La Molina', lat: -12.0857, lon: -76.9364 },
  { name: 'Chorrillos', lat: -12.1747, lon: -77.0188 },
  { name: 'Lima Cercado', lat: -12.0464, lon: -77.0428 },
  { name: 'Los Olivos', lat: -11.9925, lon: -77.0703 },
  { name: 'San Juan de Lurigancho', lat: -11.9766, lon: -77.0026 },
  { name: 'Ate', lat: -12.0258, lon: -76.9183 },
];

/** The closest district centre, or null when the point is far from Lima. */
export function nearestLimaDistrict(lat: number, lon: number): string | null {
  let best: { name: string; d: number } | null = null;
  for (const district of DISTRICTS) {
    const d = (district.lat - lat) ** 2 + (district.lon - lon) ** 2;
    if (!best || d < best.d) best = { name: district.name, d };
  }
  // ~0.15 degrees is roughly 16 km: beyond that the label would mislead.
  return best && best.d < 0.15 ** 2 ? best.name : null;
}

export interface ProfileForm {
  experienceYears: string;
  phone: string;
  bio: string;
  applianceTypeIds: number[];
}

export interface ServiceAreaForm {
  latitude: string;
  longitude: string;
  maxRadiusKm: string;
}

export interface AddressSuggestion {
  id: string;
  primary: string;
  secondary: string;
  latitude: number;
  longitude: number;
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state_district?: string;
  state?: string;
  country?: string;
}

interface NominatimItem {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
}

export const EXPERIENCE_MAX = 70;
export const PHONE_MAX = 20;
export const BIO_MAX = 1000;
export const RADIUS_MIN = 1;
export const RADIUS_MAX = 300;
export const TILE_SIZE = 256;

const INTEGER_FORMAT = /^\d+$/;
const DECIMAL_FORMAT = /^-?(\d+(\.\d+)?|\.\d+)$/;
const COORD_PAIR = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/;

export function normalizeDecimal(value: string): string {
  return value.trim().replace(',', '.');
}

export function parseDecimal(value: string): number {
  return Number(normalizeDecimal(value));
}

/** Extrae latitud y longitud si el técnico pega un enlace de Google Maps o coordenadas. */
export function extractCoordsFromText(
  text: string,
): { latitude: number; longitude: number } | null {
  const match = COORD_PAIR.exec(text);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return { latitude, longitude };
  }
  return null;
}

/**
 * Convierte latitud/longitud a píxeles globales Web Mercator (EPSG:3857)
 * en el nivel de zoom indicado, idéntico al sistema de Google Maps.
 */
export function latLngToWorldPx(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Convierte píxeles globales Web Mercator (EPSG:3857) en el nivel de zoom
 * actual de vuelta a coordenadas exactas de latitud y longitud.
 */
export function worldPxToLatLng(
  x: number,
  y: number,
  zoom: number,
): { latitude: number; longitude: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    latitude: Number(Math.max(-85, Math.min(85, lat)).toFixed(6)),
    longitude: Number(Math.max(-180, Math.min(180, lng)).toFixed(6)),
  };
}

/** Formatea un resultado geocodificado al estilo limpio de Google Maps / Inkafarma. */
export function formatGeocodedItem(item: NominatimItem): AddressSuggestion {
  const addr = item.address;
  const street = [
    addr?.road ?? addr?.pedestrian ?? item.name,
    addr?.house_number,
  ]
    .filter(Boolean)
    .join(' ');
  const locality =
    addr?.suburb ??
    addr?.city_district ??
    addr?.neighbourhood ??
    addr?.town ??
    addr?.village;
  const city = addr?.city ?? addr?.state_district ?? addr?.state;
  const country = addr?.country ?? 'Perú';

  const parts = [street, locality, city, country]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));

  const deduped: string[] = [];
  for (const part of parts) {
    if (
      !deduped.some((existing) => existing.toLowerCase() === part.toLowerCase())
    ) {
      deduped.push(part);
    }
  }

  const cleanDisplay = item.display_name
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !/^\d{4,6}$/.test(s))
    .slice(0, 4)
    .join(', ');

  const primary = deduped.length >= 2 ? deduped.join(', ') : cleanDisplay;

  return {
    id: String(item.place_id),
    primary,
    secondary: cleanDisplay || primary,
    latitude: Number(Number(item.lat).toFixed(6)),
    longitude: Number(Number(item.lon).toFixed(6)),
  };
}

/** Consulta direcciones reales registradas en el mapa dentro de Perú. */
export async function searchMapAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2 || extractCoordsFromText(trimmed)) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pe&addressdetails=1&limit=5&accept-language=es&q=${encodeURIComponent(trimmed)}`;
  const response = await fetch(url, {
    signal: signal ?? null,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as NominatimItem[];
  if (!Array.isArray(data)) return [];
  return data.map(formatGeocodedItem);
}

/** Obtiene el nombre de la calle/distrito real al soltar el pin en el mapa. */
export async function reverseGeocodeMapPin(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=es`;
  const response = await fetch(url, {
    signal: signal ?? null,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as NominatimItem;
  if (!data || typeof data.display_name !== 'string') return null;
  return formatGeocodedItem(data).primary;
}

/** Mismas reglas que el backend (`TechnicianProfileUpdate`), validadas antes de enviar. */
export function validateProfile(
  form: ProfileForm,
): Partial<Record<keyof ProfileForm, string>> {
  const errors: Partial<Record<keyof ProfileForm, string>> = {};
  const exp = form.experienceYears.trim();
  if (
    exp &&
    (!INTEGER_FORMAT.test(exp) ||
      Number(exp) < 0 ||
      Number(exp) > EXPERIENCE_MAX)
  ) {
    errors.experienceYears = `Ingresa un número entero entre 0 y ${EXPERIENCE_MAX}.`;
  }
  if (form.phone.trim().length > PHONE_MAX) {
    errors.phone = `Usa como máximo ${PHONE_MAX} caracteres.`;
  }
  if (form.bio.trim().length > BIO_MAX) {
    errors.bio = `Usa menos de ${BIO_MAX} caracteres.`;
  }
  return errors;
}

/** Mismas reglas que el backend (`ServiceAreaUpdate`), validadas antes de enviar. */
export function validateServiceArea(
  form: ServiceAreaForm,
): Partial<Record<keyof ServiceAreaForm, string>> {
  const errors: Partial<Record<keyof ServiceAreaForm, string>> = {};

  const lat = normalizeDecimal(form.latitude);
  if (!lat)
    errors.latitude =
      'Busca tu dirección en Google Maps o usa tu ubicación actual.';
  else if (!DECIMAL_FORMAT.test(lat) || Number(lat) < -90 || Number(lat) > 90)
    errors.latitude = 'Usa una latitud entre -90 y 90.';

  const lng = normalizeDecimal(form.longitude);
  if (!lng)
    errors.longitude = 'Selecciona un punto en el mapa para fijar la longitud.';
  else if (!DECIMAL_FORMAT.test(lng) || Number(lng) < -180 || Number(lng) > 180)
    errors.longitude = 'Usa una longitud entre -180 y 180.';

  const radius = normalizeDecimal(form.maxRadiusKm);
  if (!radius) errors.maxRadiusKm = 'Ingresa el radio de cobertura.';
  else if (
    !DECIMAL_FORMAT.test(radius) ||
    Number(radius) < RADIUS_MIN ||
    Number(radius) > RADIUS_MAX
  ) {
    errors.maxRadiusKm = `Elige un radio entre ${RADIUS_MIN} y ${RADIUS_MAX} km.`;
  }

  return errors;
}

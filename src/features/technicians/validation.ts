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

export const EXPERIENCE_MAX = 70;
export const PHONE_MAX = 20;
export const BIO_MAX = 1000;
export const RADIUS_MIN = 1;
export const RADIUS_MAX = 300;

const INTEGER_FORMAT = /^\d+$/;
const DECIMAL_FORMAT = /^-?(\d+(\.\d+)?|\.\d+)$/;

export function normalizeDecimal(value: string): string {
  return value.trim().replace(',', '.');
}

export function parseDecimal(value: string): number {
  return Number(normalizeDecimal(value));
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
  if (!lat) errors.latitude = 'Ingresa la latitud.';
  else if (!DECIMAL_FORMAT.test(lat) || Number(lat) < -90 || Number(lat) > 90)
    errors.latitude = 'Usa una latitud entre -90 y 90.';

  const lng = normalizeDecimal(form.longitude);
  if (!lng) errors.longitude = 'Ingresa la longitud.';
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

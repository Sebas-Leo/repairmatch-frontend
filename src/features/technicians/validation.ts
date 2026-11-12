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

export const EXPERIENCE_MIN = 0;
export const EXPERIENCE_MAX = 70;
export const PHONE_MAX = 20;
export const BIO_MAX = 1000;
export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;
export const RADIUS_MIN = 1;
export const RADIUS_MAX = 300;

const INTEGER_FORMAT = /^\d+$/;
const DECIMAL_FORMAT = /^-?(\d+(\.\d+)?|\.\d+)$/;

/** Limpia espacios y convierte la coma decimal en punto: `-12,04` pasa a `-12.04`. */
export function normalizeNumber(value: string): string {
  return value.trim().replace(',', '.');
}

/** Convierte el texto normalizado a número para enviarlo a la API. */
export function parseNumber(value: string): number {
  return Number(normalizeNumber(value));
}

/** Valida los campos del perfil profesional según los límites del backend (`TechnicianProfileUpdate`). */
export function validateProfile(
  form: ProfileForm,
): Partial<Record<keyof ProfileForm, string>> {
  const errors: Partial<Record<keyof ProfileForm, string>> = {};
  const expRaw = form.experienceYears.trim();

  if (expRaw !== '') {
    if (!INTEGER_FORMAT.test(expRaw)) {
      errors.experienceYears = 'Ingresa un número entero de años entre 0 y 70.';
    } else {
      const years = Number(expRaw);
      if (years < EXPERIENCE_MIN || years > EXPERIENCE_MAX) {
        errors.experienceYears =
          'Ingresa un número entero de años entre 0 y 70.';
      }
    }
  }

  if (form.phone.trim().length > PHONE_MAX) {
    errors.phone = `Usa como máximo ${PHONE_MAX} caracteres.`;
  }

  if (form.bio.trim().length > BIO_MAX) {
    errors.bio = `Mantén la biografía bajo los ${BIO_MAX} caracteres.`;
  }

  return errors;
}

/** Valida las coordenadas y el radio de cobertura según el contrato del backend (`ServiceAreaUpdate`). */
export function validateServiceArea(
  form: ServiceAreaForm,
): Partial<Record<keyof ServiceAreaForm, string>> {
  const errors: Partial<Record<keyof ServiceAreaForm, string>> = {};

  const latRaw = normalizeNumber(form.latitude);
  if (!latRaw) {
    errors.latitude = 'Ingresa la latitud.';
  } else if (!DECIMAL_FORMAT.test(latRaw)) {
    errors.latitude = 'Ingresa una latitud válida entre -90 y 90.';
  } else {
    const lat = Number(latRaw);
    if (lat < LATITUDE_MIN || lat > LATITUDE_MAX) {
      errors.latitude = 'Ingresa una latitud válida entre -90 y 90.';
    }
  }

  const lngRaw = normalizeNumber(form.longitude);
  if (!lngRaw) {
    errors.longitude = 'Ingresa la longitud.';
  } else if (!DECIMAL_FORMAT.test(lngRaw)) {
    errors.longitude = 'Ingresa una longitud válida entre -180 y 180.';
  } else {
    const lng = Number(lngRaw);
    if (lng < LONGITUDE_MIN || lng > LONGITUDE_MAX) {
      errors.longitude = 'Ingresa una longitud válida entre -180 y 180.';
    }
  }

  const radiusRaw = normalizeNumber(form.maxRadiusKm);
  if (!radiusRaw) {
    errors.maxRadiusKm = 'Ingresa el radio de cobertura.';
  } else if (!DECIMAL_FORMAT.test(radiusRaw)) {
    errors.maxRadiusKm = 'Ingresa un radio de cobertura entre 1 y 300 km.';
  } else {
    const radius = Number(radiusRaw);
    if (radius < RADIUS_MIN || radius > RADIUS_MAX) {
      errors.maxRadiusKm = 'Ingresa un radio de cobertura entre 1 y 300 km.';
    }
  }

  return errors;
}

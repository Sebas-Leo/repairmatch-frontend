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

/** Same limits as the backend (`TechnicianProfileUpdate`), checked before sending. */
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
    errors.experienceYears = `Enter a whole number between 0 and ${EXPERIENCE_MAX}.`;
  }
  if (form.phone.trim().length > PHONE_MAX) {
    errors.phone = `Use at most ${PHONE_MAX} characters.`;
  }
  if (form.bio.trim().length > BIO_MAX) {
    errors.bio = `Keep it under ${BIO_MAX} characters.`;
  }
  return errors;
}

/** Same limits as the backend (`ServiceAreaUpdate`), checked before sending. */
export function validateServiceArea(
  form: ServiceAreaForm,
): Partial<Record<keyof ServiceAreaForm, string>> {
  const errors: Partial<Record<keyof ServiceAreaForm, string>> = {};

  const lat = normalizeDecimal(form.latitude);
  if (!lat) errors.latitude = 'Enter the latitude.';
  else if (!DECIMAL_FORMAT.test(lat) || Number(lat) < -90 || Number(lat) > 90)
    errors.latitude = 'Use a latitude between -90 and 90.';

  const lng = normalizeDecimal(form.longitude);
  if (!lng) errors.longitude = 'Enter the longitude.';
  else if (!DECIMAL_FORMAT.test(lng) || Number(lng) < -180 || Number(lng) > 180)
    errors.longitude = 'Use a longitude between -180 and 180.';

  const radius = normalizeDecimal(form.maxRadiusKm);
  if (!radius) errors.maxRadiusKm = 'Enter the coverage radius.';
  else if (
    !DECIMAL_FORMAT.test(radius) ||
    Number(radius) < RADIUS_MIN ||
    Number(radius) > RADIUS_MAX
  ) {
    errors.maxRadiusKm = `Choose a radius between ${RADIUS_MIN} and ${RADIUS_MAX} km.`;
  }

  return errors;
}

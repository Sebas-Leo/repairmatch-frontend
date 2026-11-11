export interface NewRequestForm {
  applianceTypeId: string;
  originalDescription: string;
  brand: string;
  model: string;
}

export const DESCRIPTION_MAX = 5000;
export const DESCRIPTION_MIN = 10;
export const BRAND_MAX = 100;

/** Same limits as the backend (`CreateRequestDto`), checked before sending. */
export function validateNewRequest(
  form: NewRequestForm,
): Partial<Record<keyof NewRequestForm, string>> {
  const errors: Partial<Record<keyof NewRequestForm, string>> = {};
  if (!form.applianceTypeId) errors.applianceTypeId = 'Choose the appliance.';
  const description = form.originalDescription.trim();
  if (!description) errors.originalDescription = 'Describe what is wrong.';
  else if (description.length < DESCRIPTION_MIN)
    errors.originalDescription = `Add a little more detail (at least ${DESCRIPTION_MIN} characters).`;
  else if (description.length > DESCRIPTION_MAX)
    errors.originalDescription = `Keep it under ${DESCRIPTION_MAX} characters.`;
  if (form.brand.trim().length > BRAND_MAX)
    errors.brand = `Use at most ${BRAND_MAX} characters.`;
  if (form.model.trim().length > BRAND_MAX)
    errors.model = `Use at most ${BRAND_MAX} characters.`;
  return errors;
}

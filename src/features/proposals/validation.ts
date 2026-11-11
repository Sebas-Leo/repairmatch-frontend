export interface ProposalForm {
  diagnosticCost: string;
  /** Value of a `datetime-local` input: `2026-11-13T09:00`. */
  availableAt: string;
  conditions: string;
}

export const CONDITIONS_MAX = 1000;
const COST_MAX = 9_999_999_999.99;
/** Digits with up to two decimals: 45, 45.5, 45.50, .5 and 5. are all fine. */
const COST_FORMAT = /^(\d+(\.\d{0,2})?|\.\d{1,2})$/;

/** Trims and accepts a decimal comma, common in Peru: `45,5` is 45.5. */
export function normalizeCost(value: string): string {
  return value.trim().replace(',', '.');
}

/** The cost to send, from a value that passed `validateProposal`. */
export function parseCost(value: string): number {
  return Number(normalizeCost(value));
}

/** Same rules as the backend (`CreateProposalDto`), checked before sending. */
export function validateProposal(
  form: ProposalForm,
  now: Date = new Date(),
): Partial<Record<keyof ProposalForm, string>> {
  const errors: Partial<Record<keyof ProposalForm, string>> = {};
  const raw = normalizeCost(form.diagnosticCost);
  if (!raw) errors.diagnosticCost = 'Enter the diagnostic cost.';
  else if (raw.startsWith('-'))
    errors.diagnosticCost = 'The cost cannot be negative.';
  else if (!COST_FORMAT.test(raw))
    errors.diagnosticCost =
      'Use a number like 45 or 45.50 (two decimals at most).';
  else if (Number(raw) > COST_MAX)
    errors.diagnosticCost = 'That cost is too high.';

  const when = new Date(form.availableAt);
  if (!form.availableAt || Number.isNaN(when.getTime()))
    errors.availableAt = 'Choose when you can go.';
  else if (when.getTime() <= now.getTime())
    errors.availableAt = 'Choose a date and time in the future.';

  const conditions = form.conditions.trim();
  if (!conditions) errors.conditions = 'Explain what the offer includes.';
  else if (conditions.length > CONDITIONS_MAX)
    errors.conditions = `Keep it under ${CONDITIONS_MAX} characters.`;
  return errors;
}

/** `datetime-local` value to the backend `LocalDateTime` format (with seconds). */
export function toLocalDateTime(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}

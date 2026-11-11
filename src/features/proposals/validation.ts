export interface ProposalForm {
  diagnosticCost: string;
  /** Value of a `datetime-local` input: `2026-11-13T09:00`. */
  availableAt: string;
  conditions: string;
}

export const CONDITIONS_MAX = 1000;
const COST_MAX = 9_999_999_999.99;

/** Same rules as the backend (`CreateProposalDto`), checked before sending. */
export function validateProposal(
  form: ProposalForm,
  now: Date = new Date(),
): Partial<Record<keyof ProposalForm, string>> {
  const errors: Partial<Record<keyof ProposalForm, string>> = {};
  const cost = Number(form.diagnosticCost);
  if (form.diagnosticCost.trim() === '' || !Number.isFinite(cost))
    errors.diagnosticCost = 'Enter the diagnostic cost.';
  else if (cost < 0) errors.diagnosticCost = 'The cost cannot be negative.';
  else if (cost > COST_MAX) errors.diagnosticCost = 'That cost is too high.';
  else if (!/^\d+(\.\d{1,2})?$/.test(form.diagnosticCost.trim()))
    errors.diagnosticCost = 'Use at most two decimals.';

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

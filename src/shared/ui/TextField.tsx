import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'aria-describedby' | 'aria-invalid'
> {
  id: string;
  label: string;
  /** Helper text, announced with the input. */
  hint?: string;
  error?: string | undefined;
}

/** A labelled input whose hint and error are wired to it for assistive tech. */
export function TextField({
  id,
  label,
  hint,
  error,
  ...inputProps
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') ||
    undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      <input
        {...inputProps}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

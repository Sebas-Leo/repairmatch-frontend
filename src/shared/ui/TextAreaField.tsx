import type { TextareaHTMLAttributes } from 'react';

interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'aria-describedby' | 'aria-invalid'
> {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
}

/** A labelled multi-line input with a live character count when `maxLength` is set. */
export function TextAreaField({
  id,
  label,
  hint,
  error,
  maxLength,
  value,
  ...props
}: TextAreaFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const countId = `${id}-count`;
  const length = typeof value === 'string' ? value.length : 0;
  const describedBy =
    [hint ? hintId : '', maxLength ? countId : '', error ? errorId : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      <textarea
        {...props}
        id={id}
        value={value}
        maxLength={maxLength}
        rows={props.rows ?? 4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {maxLength ? (
        <p id={countId} className="field-hint text-right">
          {length}/{maxLength}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

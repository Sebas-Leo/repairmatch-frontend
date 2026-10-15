import type { MouseEvent, Ref } from 'react';
import type { FormFeedback } from './formFeedback';

export interface SummaryField {
  /** Key used in `FormFeedback.fieldErrors`. */
  name: string;
  /** DOM id of the control to focus. */
  id: string;
  label: string;
}

interface FormErrorSummaryProps {
  feedback: FormFeedback;
  fields: readonly SummaryField[];
  ref?: Ref<HTMLDivElement>;
}

function focusField(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  document.getElementById(id)?.focus();
}

/** Announced (role="alert") and focusable so it can receive focus after a failed submit. */
export function FormErrorSummary({
  feedback,
  fields,
  ref,
}: FormErrorSummaryProps) {
  const known = new Map(fields.map((field) => [field.name, field]));
  const items = Object.entries(feedback.fieldErrors).map(([name, message]) => {
    const field = known.get(name);
    return {
      key: name,
      field,
      text: field ? `${field.label}: ${message}` : `${name}: ${message}`,
    };
  });
  return (
    <div role="alert" tabIndex={-1} ref={ref} className="error-summary">
      <p className="error-summary-title">
        {feedback.message ?? 'Please fix the following.'}
      </p>
      {items.length > 0 ? (
        <ul>
          {items.map(({ key, field, text }) => (
            <li key={key}>
              {field ? (
                <a
                  href={`#${field.id}`}
                  onClick={(event) => focusField(event, field.id)}
                >
                  {text}
                </a>
              ) : (
                text
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

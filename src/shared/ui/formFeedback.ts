import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/http';

/** What a failed or invalid submit shows: one summary plus per-field messages. */
export interface FormFeedback {
  /** Form-level text, for example the server `message`. */
  message?: string;
  /** Field name -> message. */
  fieldErrors: Readonly<Record<string, string>>;
}

export function hasFeedback(feedback: FormFeedback | null): boolean {
  return (
    feedback !== null &&
    (Boolean(feedback.message) || Object.keys(feedback.fieldErrors).length > 0)
  );
}

/** Builds feedback from a rejected submit. Backend text is shown as-is. */
export function feedbackFromError(error: unknown): FormFeedback {
  if (error instanceof ApiError) {
    return { message: error.message, fieldErrors: error.errors };
  }
  return {
    message:
      'We could not reach the server. Check your connection and try again.',
    fieldErrors: {},
  };
}

/**
 * Holds the feedback of a form and moves focus to the error summary every time
 * new feedback arrives, so keyboard and screen-reader users land on it.
 */
export function useFormFeedback() {
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [version, setVersion] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (version > 0) summaryRef.current?.focus();
  }, [version]);

  return {
    feedback,
    summaryRef,
    show(next: FormFeedback) {
      setFeedback(next);
      setVersion((current) => current + 1);
    },
    clear() {
      setFeedback(null);
    },
  };
}

import { useCallback } from 'react';
import { describeApiError } from '../api/errorMessages';
import { useToast } from '../toast/toastContext';
import { feedbackFromError, type FormFeedback } from '../ui/formFeedback';

/**
 * Reports a rejected submit. The form gets the error summary (pass the `show`
 * of `useFormFeedback`), which is where focus goes. When the failure is
 * transient (connection, timeout, rate limit, server) a toast adds a short
 * heading as well, because the summary can be scrolled out of view and the
 * person just needs to try again. Errors the user must fix in the form get no
 * toast: the summary and the fields already say it. A cancelled call is shown
 * nowhere.
 */
export function useReportFormError(show: (feedback: FormFeedback) => void) {
  const toast = useToast();
  return useCallback(
    (error: unknown) => {
      const { kind, retryable, title } = describeApiError(error);
      if (kind === 'cancelled') return;
      show(feedbackFromError(error));
      if (retryable) toast.error(title);
    },
    [show, toast],
  );
}

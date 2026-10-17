import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async action one call at a time: a second call while the first is
 * still pending is ignored and resolves with `undefined`. The check uses a ref,
 * not state, so it also stops a double click or a repeated Enter that arrives
 * before React has re-rendered with `isSubmitting`.
 *
 * Use it for anything that must not be sent twice (create, pay, accept) and
 * disable the controls with `isSubmitting` as feedback. A rejection of the
 * action is passed on to the caller after the guard is released, so handle
 * errors inside the action or around `run`. State is not touched once the
 * component has unmounted (for example after a redirect).
 */
export function useSubmitGuard<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  const running = useRef(false);
  const mounted = useRef(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set to true again on every mount: StrictMode runs the cleanup in between.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      if (running.current) return undefined;
      running.current = true;
      setIsSubmitting(true);
      try {
        return await action(...args);
      } finally {
        running.current = false;
        if (mounted.current) setIsSubmitting(false);
      }
    },
    [action],
  );

  return { run, isSubmitting };
}

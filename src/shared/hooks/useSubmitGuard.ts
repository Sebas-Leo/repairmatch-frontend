import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Runs an async action one call at a time: a second call while the first is
 * still pending is ignored and resolves with `undefined`. The check uses a ref,
 * not state, so it also stops a double click or a repeated Enter that arrives
 * before React has re-rendered with `isSubmitting`.
 *
 * Use it for anything that must not be sent twice (create, pay, accept) and
 * disable the controls with `isSubmitting` as feedback. Validate before calling
 * `run`, so an invalid form does not flash the busy state. A rejection of the
 * action is passed on to the caller after the guard is released, so handle
 * errors inside the action or around `run`.
 *
 * `run` keeps its identity across renders (it always calls the action of the
 * latest render), so it is safe in dependency arrays.
 */
export function useSubmitGuard<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  const running = useRef(false);
  const latestAction = useRef(action);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLayoutEffect(() => {
    latestAction.current = action;
  });

  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      if (running.current) return undefined;
      running.current = true;
      setIsSubmitting(true);
      try {
        return await latestAction.current(...args);
      } finally {
        running.current = false;
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { run, isSubmitting };
}

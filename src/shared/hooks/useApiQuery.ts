import { useCallback, useEffect, useRef, useState } from 'react';
import { describeApiError } from '../api/errorMessages';
import { isAbortError } from '../api/http';

export type QueryStatus = 'loading' | 'success' | 'error';

export interface QueryOptions {
  /** `false` skips the call (for example until an id is known). */
  enabled?: boolean;
  /**
   * Extra attempts for failures that may pass on their own (network errors,
   * timeouts, 5xx), with exponential backoff. Never for 4xx. Default 2.
   */
  retries?: number;
  /** Delay before the first retry; doubles on each attempt. Default 600 ms. */
  retryDelayMs?: number;
  /**
   * Keep showing the data of the previous key while a new key loads (default).
   * Pass `false` for detail views, so `/requests/5` never shows request 4.
   * A reload of the same key always keeps its data.
   */
  keepPreviousData?: boolean;
}

export interface QueryResult<T> {
  status: QueryStatus;
  /** The last data that loaded. Kept while a new key loads (no flicker between pages). */
  data: T | undefined;
  error: unknown;
  /** A call for the current key is in flight (also true on the first load). */
  isFetching: boolean;
  /** Asks again with the same key. */
  reload(): void;
}

interface Settled<T> {
  key: string;
  requestId: string;
  ok: boolean;
  data: T | undefined;
  error: unknown;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

async function withRetries<T>(
  call: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
  retries: number,
  delayMs: number,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call(signal);
    } catch (error) {
      const canRetry =
        attempt < retries &&
        !signal.aborted &&
        !isAbortError(error) &&
        describeApiError(error).retryable;
      if (!canRetry) throw error;
      await sleep(delayMs * 2 ** attempt, signal);
    }
  }
}

/**
 * Loads data for a read-only call and tracks loading, error and retry.
 *
 * `key` identifies the request (endpoint plus its parameters): when it
 * changes, the previous call is cancelled through its `AbortSignal` and a new
 * one starts. The fetcher always gets that signal; pass it to the API call.
 *
 *   const requests = useApiQuery(['requests', page, size, search],
 *     (signal) => listRequests({ page, size, search }, { signal }));
 */
export function useApiQuery<T>(
  key: readonly unknown[],
  fetcher: (signal: AbortSignal) => Promise<T>,
  {
    enabled = true,
    retries = 2,
    retryDelayMs = 600,
    keepPreviousData = true,
  }: QueryOptions = {},
): QueryResult<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const keyString = JSON.stringify(key);
  const requestId = `${keyString}#${nonce}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    withRetries(
      (signal) => fetcherRef.current(signal),
      controller.signal,
      retries,
      retryDelayMs,
    ).then(
      (data) => {
        // A fetcher that ignores the signal may still resolve after a newer key.
        if (controller.signal.aborted) return;
        setSettled({
          key: keyString,
          requestId,
          ok: true,
          data,
          error: undefined,
        });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setSettled((previous) => ({
          key: keyString,
          requestId,
          ok: false,
          data: previous?.data,
          error,
        }));
      },
    );
    return () => controller.abort();
  }, [requestId, keyString, enabled, retries, retryDelayMs]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  // What we hold belongs to another key and must not be shown: start over.
  const visible =
    keepPreviousData || settled?.key === keyString ? settled : null;
  const current = visible?.requestId === requestId;
  const isFetching = enabled && !current;
  let status: QueryStatus;
  if (current) status = visible.ok ? 'success' : 'error';
  else if (visible?.ok) status = 'success';
  else status = enabled ? 'loading' : visible ? 'error' : 'loading';

  return {
    status,
    data: visible?.data,
    error: current && !visible.ok ? visible.error : undefined,
    isFetching,
    reload,
  };
}

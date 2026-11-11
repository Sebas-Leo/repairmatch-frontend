import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError } from '../api/http';
import { useApiQuery } from './useApiQuery';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('useApiQuery', () => {
  it('loads, then exposes the data', async () => {
    const fetcher = vi.fn<(signal: AbortSignal) => Promise<string[]>>(
      async () => ['a'],
    );
    const { result } = renderHook(() => useApiQuery(['list'], fetcher));
    expect(result.current.status).toBe('loading');
    expect(result.current.isFetching).toBe(true);
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual(['a']);
    expect(result.current.isFetching).toBe(false);
    expect(fetcher.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal);
  });

  it('cancels the previous call and keeps its data while the new key loads', async () => {
    const calls: Array<{
      signal: AbortSignal;
      d: ReturnType<typeof deferred<string>>;
    }> = [];
    const fetcher = (signal: AbortSignal) => {
      const d = deferred<string>();
      calls.push({ signal, d });
      return d.promise;
    };
    const { result, rerender } = renderHook(
      ({ page }) => useApiQuery(['list', page], fetcher),
      {
        initialProps: { page: 0 },
      },
    );
    await act(async () => calls[0]!.d.resolve('page 0'));
    expect(result.current.data).toBe('page 0');

    rerender({ page: 1 });
    expect(result.current.isFetching).toBe(true);
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe('page 0');

    rerender({ page: 2 });
    expect(calls[1]!.signal.aborted).toBe(true);
    await act(async () => calls[2]!.d.resolve('page 2'));
    expect(result.current.data).toBe('page 2');
    expect(result.current.isFetching).toBe(false);
  });

  it('reports a 4xx at once, without retrying', async () => {
    const error = new ApiError(404, 'Not found', {
      message: 'Request not found',
    });
    const fetcher = vi.fn(async () => {
      throw error;
    });
    const { result } = renderHook(() =>
      useApiQuery(['one', 9], fetcher, { retryDelayMs: 1 }),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(error);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('retries network failures with backoff before giving up', async () => {
    const fetcher = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockRejectedValueOnce(new NetworkError('offline'))
      .mockResolvedValueOnce('back online');
    const { result } = renderHook(() =>
      useApiQuery(['flaky'], fetcher, { retryDelayMs: 1 }),
    );
    await waitFor(() => expect(result.current.data).toBe('back online'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('stops after the allowed retries', async () => {
    const fetcher = vi.fn(async () => {
      throw new ApiError(503, 'Unavailable', null);
    });
    const { result } = renderHook(() =>
      useApiQuery(['down'], fetcher, { retries: 1, retryDelayMs: 1 }),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reloads on demand', async () => {
    let count = 0;
    const { result } = renderHook(() =>
      useApiQuery(['count'], async () => ++count),
    );
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.reload());
    expect(result.current.isFetching).toBe(true);
    await waitFor(() => expect(result.current.data).toBe(2));
  });

  it('waits while disabled', async () => {
    const fetcher = vi.fn(async () => 'x');
    const { result, rerender } = renderHook(
      ({ on }) => useApiQuery(['gated'], fetcher, { enabled: on }),
      {
        initialProps: { on: false },
      },
    );
    expect(result.current.isFetching).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(result.current.data).toBe('x'));
  });

  it('ignores the result of a call cancelled by unmounting', async () => {
    const d = deferred<string>();
    let seen: AbortSignal | undefined;
    const { unmount } = renderHook(() =>
      useApiQuery(['slow'], (signal) => {
        seen = signal;
        return d.promise;
      }),
    );
    unmount();
    expect(seen?.aborted).toBe(true);
    await act(async () => d.resolve('late'));
  });
});

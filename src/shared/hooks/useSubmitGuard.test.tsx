import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSubmitGuard } from './useSubmitGuard';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('useSubmitGuard', () => {
  it('runs the action with its arguments and returns its result', async () => {
    const action = vi.fn(async (a: number, b: number) => a + b);
    const { result } = renderHook(() => useSubmitGuard(action));

    let value: number | undefined;
    await act(async () => {
      value = await result.current.run(2, 3);
    });

    expect(value).toBe(5);
    expect(action).toHaveBeenCalledWith(2, 3);
  });

  it('reports isSubmitting while the action is pending', async () => {
    const gate = deferred();
    const { result } = renderHook(() => useSubmitGuard(() => gate.promise));
    expect(result.current.isSubmitting).toBe(false);

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.run();
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      gate.resolve();
      await pending;
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('ignores a second call made before React re-renders', async () => {
    const gate = deferred<string>();
    const action = vi.fn(() => gate.promise);
    const { result } = renderHook(() => useSubmitGuard(action));

    let first!: Promise<string | undefined>;
    let second!: Promise<string | undefined>;
    act(() => {
      // Same render, so `isSubmitting` is still false for both calls: only the
      // synchronous guard can stop the second one.
      first = result.current.run();
      second = result.current.run();
    });
    await act(async () => {
      gate.resolve('done');
      await first;
    });

    expect(action).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toBe('done');
    await expect(second).resolves.toBeUndefined();
  });

  it('accepts a new call once the previous one has finished', async () => {
    const action = vi.fn(async () => 'ok');
    const { result } = renderHook(() => useSubmitGuard(action));

    await act(async () => {
      await result.current.run();
    });
    await act(async () => {
      await result.current.run();
    });

    expect(action).toHaveBeenCalledTimes(2);
  });

  it('releases the guard when the action rejects and passes the error on', async () => {
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce('second try');
    const { result } = renderHook(() => useSubmitGuard(action));

    let error: unknown;
    await act(async () => {
      try {
        await result.current.run();
      } catch (caught) {
        error = caught;
      }
    });
    expect(error).toEqual(new Error('network down'));
    expect(result.current.isSubmitting).toBe(false);

    let value: string | undefined;
    await act(async () => {
      value = await result.current.run();
    });
    expect(value).toBe('second try');
  });

  it('uses the action of the latest render', async () => {
    const first = vi.fn(async () => 'first');
    const second = vi.fn(async () => 'second');
    const { result, rerender } = renderHook(
      ({ action }) => useSubmitGuard(action),
      { initialProps: { action: first } },
    );

    rerender({ action: second });
    await act(async () => {
      await result.current.run();
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('settles quietly when the component unmounts mid-flight', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const gate = deferred<string>();
    const { result, unmount } = renderHook(() =>
      useSubmitGuard(() => gate.promise),
    );

    let pending!: Promise<string | undefined>;
    act(() => {
      pending = result.current.run();
    });
    unmount();
    gate.resolve('late');

    await expect(pending).resolves.toBe('late');
    expect(error).not.toHaveBeenCalled();
  });

  it('keeps working under StrictMode, which mounts effects twice', async () => {
    const { result } = renderHook(() => useSubmitGuard(async () => 'ok'), {
      wrapper: StrictMode,
    });

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});

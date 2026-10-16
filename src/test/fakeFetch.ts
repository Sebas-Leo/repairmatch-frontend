import { vi } from 'vitest';

/**
 * Stands in for the network underneath the real axios fetch adapter, which
 * hands `fetch` a fully built `Request`: what a test inspects is what would go
 * on the wire. Remember `vi.unstubAllGlobals()`.
 */
export function stubFetch(
  handler: (request: Request) => Response | Promise<Response>,
) {
  const fetchMock = vi.fn((request: Request) =>
    Promise.resolve().then(() => handler(request)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return {
    fetchMock,
    requests: () => fetchMock.mock.calls.map(([request]) => request),
  };
}

/** Like a real `fetch`: rejects with the reason as soon as the signal aborts. */
export const untilAborted = (request: Request) =>
  new Promise<Response>((_resolve, reject) => {
    if (request.signal.aborted) return reject(request.signal.reason);
    request.signal.addEventListener('abort', () =>
      reject(request.signal.reason),
    );
  });

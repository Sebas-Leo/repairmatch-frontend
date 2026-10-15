import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createBrowserTokenStore,
  createMemoryTokenStore,
  REFRESH_TOKEN_STORAGE_KEY,
} from './tokenStore';

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn((key: string) => void data.delete(key)),
  };
}

describe('browser token store', () => {
  it('keeps the access token in memory and persists only the refresh token', () => {
    const storage = fakeStorage();
    const store = createBrowserTokenStore(() => storage);
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBeNull();

    store.setTokens(tokens);

    expect(store.getAccessToken()).toBe('access-1');
    expect(store.getRefreshToken()).toBe('refresh-1');
    expect([...storage.data.entries()]).toEqual([
      [REFRESH_TOKEN_STORAGE_KEY, 'refresh-1'],
    ]);
  });

  it('reads a refresh token persisted by an earlier page load', () => {
    const store = createBrowserTokenStore(() =>
      fakeStorage({ [REFRESH_TOKEN_STORAGE_KEY]: 'refresh-persisted' }),
    );
    expect(store.getRefreshToken()).toBe('refresh-persisted');
    expect(store.getAccessToken()).toBeNull();
  });

  it('treats storage as the source of truth for the refresh token', () => {
    const storage = fakeStorage();
    const store = createBrowserTokenStore(() => storage);
    store.setTokens(tokens);
    storage.data.set(REFRESH_TOKEN_STORAGE_KEY, 'refresh-rotated-elsewhere');
    expect(store.getRefreshToken()).toBe('refresh-rotated-elsewhere');
    storage.data.delete(REFRESH_TOKEN_STORAGE_KEY);
    expect(store.getRefreshToken()).toBeNull();
  });

  it('clearAccessToken keeps the persisted refresh token', () => {
    const storage = fakeStorage();
    const store = createBrowserTokenStore(() => storage);
    store.setTokens(tokens);
    store.clearAccessToken();
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBe('refresh-1');
  });

  it('clear forgets both tokens, including the persisted one', () => {
    const storage = fakeStorage();
    const store = createBrowserTokenStore(() => storage);
    store.setTokens(tokens);
    store.clear();
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it('ignores an empty persisted value', () => {
    const storage = fakeStorage({ [REFRESH_TOKEN_STORAGE_KEY]: '' });
    const store = createBrowserTokenStore(() => storage);
    expect(store.getRefreshToken()).toBeNull();
  });

  it('keeps working in memory when every storage call throws', () => {
    const boom = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    const store = createBrowserTokenStore(() => ({
      getItem: boom,
      setItem: boom,
      removeItem: boom,
    }));
    expect(store.getRefreshToken()).toBeNull();

    store.setTokens(tokens);
    expect(store.getAccessToken()).toBe('access-1');
    expect(store.getRefreshToken()).toBe('refresh-1');

    store.clearAccessToken();
    expect(store.getRefreshToken()).toBe('refresh-1');

    expect(() => store.clear()).not.toThrow();
    expect(store.getRefreshToken()).toBeNull();
  });

  it('keeps working when accessing the storage object itself throws', () => {
    const store = createBrowserTokenStore(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    store.setTokens(tokens);
    expect(store.getRefreshToken()).toBe('refresh-1');
    expect(() => store.clear()).not.toThrow();
  });

  it('works without any storage object', () => {
    const store = createBrowserTokenStore(() => null);
    expect(store.getRefreshToken()).toBeNull();
    store.setTokens(tokens);
    expect(store.getRefreshToken()).toBe('refresh-1');
    store.clear();
    expect(store.getRefreshToken()).toBeNull();
  });

  it('never replays a stale persisted token when a write fails', () => {
    const storage = fakeStorage({ [REFRESH_TOKEN_STORAGE_KEY]: 'refresh-old' });
    storage.setItem.mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const store = createBrowserTokenStore(() => storage);

    store.setTokens(tokens);

    expect(storage.data.has(REFRESH_TOKEN_STORAGE_KEY)).toBe(false);
    expect(store.getRefreshToken()).toBe('refresh-1');
  });

  it('goes back to storage after a later write succeeds', () => {
    const storage = fakeStorage();
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const store = createBrowserTokenStore(() => storage);
    store.setTokens(tokens);
    store.setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    expect(storage.data.get(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-2');
    expect(store.getRefreshToken()).toBe('refresh-2');
  });

  it('uses the global localStorage by default', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    const store = createBrowserTokenStore();
    store.setTokens(tokens);
    expect(storage.data.get(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1');
    store.clear();
    expect(storage.data.size).toBe(0);
    vi.unstubAllGlobals();
  });

  it('survives the browser throwing when localStorage is merely accessed', () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    );
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    try {
      const store = createBrowserTokenStore();
      expect(store.getRefreshToken()).toBeNull();
      store.setTokens(tokens);
      expect(store.getRefreshToken()).toBe('refresh-1');
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});

describe('memory token store', () => {
  it('starts from the given tokens and clears them', () => {
    const store = createMemoryTokenStore({ refreshToken: 'refresh-1' });
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBe('refresh-1');

    store.setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    expect(store.getAccessToken()).toBe('access-2');

    store.clearAccessToken();
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBe('refresh-2');

    store.clear();
    expect(store.getRefreshToken()).toBeNull();
  });

  it('starts empty by default', () => {
    expect(createMemoryTokenStore().getRefreshToken()).toBeNull();
  });
});

function storageEvent(init: StorageEventInit) {
  window.dispatchEvent(new StorageEvent('storage', init));
}

describe('browser token store: changes made by other tabs', () => {
  afterEach(() => vi.unstubAllGlobals());

  const store = () => createBrowserTokenStore(() => fakeStorage());

  it('notifies when the persisted refresh token is removed, rotated or replaced', () => {
    const listener = vi.fn();
    const stop = store().subscribe?.(listener);
    storageEvent({
      key: REFRESH_TOKEN_STORAGE_KEY,
      oldValue: 'a',
      newValue: null,
    });
    storageEvent({
      key: REFRESH_TOKEN_STORAGE_KEY,
      oldValue: 'a',
      newValue: 'b',
    });
    storageEvent({
      key: REFRESH_TOKEN_STORAGE_KEY,
      oldValue: null,
      newValue: 'c',
    });
    expect(listener).toHaveBeenCalledTimes(3);
    stop?.();
  });

  it('notifies when another tab clears the whole storage', () => {
    const listener = vi.fn();
    const stop = store().subscribe?.(listener);
    storageEvent({ key: null });
    expect(listener).toHaveBeenCalledTimes(1);
    stop?.();
  });

  it('ignores other keys and writes that change nothing', () => {
    const listener = vi.fn();
    const stop = store().subscribe?.(listener);
    storageEvent({ key: 'unrelated', oldValue: 'a', newValue: 'b' });
    storageEvent({
      key: REFRESH_TOKEN_STORAGE_KEY,
      oldValue: 'a',
      newValue: 'a',
    });
    expect(listener).not.toHaveBeenCalled();
    stop?.();
  });

  it('stops notifying after unsubscribing', () => {
    const listener = vi.fn();
    const stop = store().subscribe?.(listener);
    stop?.();
    storageEvent({
      key: REFRESH_TOKEN_STORAGE_KEY,
      oldValue: 'a',
      newValue: null,
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it('is a safe no-op when there is no window', () => {
    vi.stubGlobal('window', undefined);
    const stop = store().subscribe?.(vi.fn());
    expect(stop).toBeTypeOf('function');
    expect(() => stop?.()).not.toThrow();
  });

  it('is a safe no-op when window cannot listen for events', () => {
    vi.stubGlobal('window', {});
    const stop = store().subscribe?.(vi.fn());
    expect(() => stop?.()).not.toThrow();
  });

  it('is not offered by the memory store, which persists nothing', () => {
    expect(createMemoryTokenStore().subscribe).toBeUndefined();
  });
});

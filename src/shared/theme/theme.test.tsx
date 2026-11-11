import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  readPreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writePreference,
} from './theme';
import { useTheme } from './themeContext';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

function stubDarkSystem(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    flip(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

let storage = memoryStorage();
beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme helpers', () => {
  it('resolves the system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('reads and writes the saved preference, ignoring junk', () => {
    expect(readPreference()).toBe('system');
    writePreference('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readPreference()).toBe('dark');
    storage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(readPreference()).toBe('system');
  });

  it('survives blocked storage', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(readPreference()).toBe('system');
    expect(() => writePreference('light')).not.toThrow();
  });

  it('sets the attribute the CSS tokens switch on', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});

describe('ThemeProvider and ThemeToggle', () => {
  it('follows the system until the user picks, and cycles on click', async () => {
    const user = userEvent.setup();
    const system = stubDarkSystem(true);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    act(() => system.flip(false));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(screen.getByRole('button', { name: /Theme: system/ }));
    expect(
      screen.getByRole('button', { name: /Theme: light/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Theme: light/ }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    await user.click(screen.getByRole('button', { name: /Theme: dark/ }));
    expect(
      screen.getByRole('button', { name: /Theme: system/ }),
    ).toBeInTheDocument();
  });

  it('works without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('requires the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used inside ThemeProvider',
    );
  });
});

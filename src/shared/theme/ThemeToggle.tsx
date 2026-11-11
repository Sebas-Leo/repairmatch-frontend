import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from './theme';
import { useTheme } from './themeContext';

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const LABEL: Record<ThemePreference, string> = {
  system: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

/** Cycles system → light → dark. The label says the current choice. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const Icon =
    preference === 'dark' ? Moon : preference === 'light' ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={() => setPreference(NEXT[preference])}
      aria-label={`${LABEL[preference]}. Change theme`}
      title={LABEL[preference]}
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[10px] border border-line bg-surface text-ink hover:bg-surface-2"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

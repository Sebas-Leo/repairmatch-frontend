import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyTheme,
  onSystemThemeChange,
  readPreference,
  resolveTheme,
  systemPrefersDark,
  writePreference,
  type ThemePreference,
} from './theme';
import { ThemeContext } from './themeContext';

/** Owns the light/dark preference and keeps <html data-theme> in sync. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readPreference);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  useEffect(
    () => onSystemThemeChange(() => setPrefersDark(systemPrefersDark())),
    [],
  );

  const theme = resolveTheme(preference, prefersDark);
  useEffect(() => applyTheme(theme), [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    writePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

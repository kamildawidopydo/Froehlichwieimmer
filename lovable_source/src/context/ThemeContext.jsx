import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'theme';

const applyDom = (resolved) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = resolved;
};

const readStored = () => {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : null;
  } catch { return null; }
};

const systemPrefersDark = () =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolve = (theme) => (theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme);

if (typeof document !== 'undefined') {
  const initial = readStored() || 'light';
  applyDom(resolve(initial));
}

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => readStored() || 'light');
  const [resolvedTheme, setResolvedTheme] = useState(() => resolve(readStored() || 'light'));

  useEffect(() => {
    const next = resolve(theme);
    setResolvedTheme(next);
    applyDom(next);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next = mql.matches ? 'dark' : 'light';
      setResolvedTheme(next);
      applyDom(next);
    };
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (next !== 'light' && next !== 'dark' && next !== 'system') return;
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (resolve(prev) === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const KEY = 'dashboard_it_theme';

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F2F5FA' : '#0B1220');
}

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(KEY) || 'dark';
    } catch (e) { return 'dark'; }
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

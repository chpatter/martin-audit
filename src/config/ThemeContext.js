import React, { createContext, useContext, useState, useEffect } from 'react';
import { darkTheme, lightTheme } from '../config/theme';

const ThemeContext = createContext();

/**
 * Hook to access the current theme and toggle function.
 * Returns: { theme, isDark, toggleTheme }
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider — wraps the app to provide theme context.
 * Reads initial mode from localStorage, defaults to dark.
 */
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('martin-audit-theme');
      return saved ? saved === 'dark' : true; // Default to dark
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('martin-audit-theme', isDark ? 'dark' : 'light');
    } catch {
      // localStorage not available
    }
  }, [isDark]);

  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark(d => !d);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

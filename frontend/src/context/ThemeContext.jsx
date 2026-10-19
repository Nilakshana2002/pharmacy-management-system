import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Application is exclusively light healthcare theme
  const [theme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
    localStorage.setItem('vdc_theme', 'light');
  }, []);

  const toggleTheme = () => {
    // Kept as no-op for backward compatibility
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: () => {}, toggleTheme, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'app_theme';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.backgroundColor = theme === 'light' ? '#dedede' : '#000000';
    document.body.style.backgroundColor = theme === 'light' ? '#dedede' : '#000000';
    document.body.style.color = theme === 'light' ? '#111827' : 'rgba(255, 255, 255, 0.87)';
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme };
};

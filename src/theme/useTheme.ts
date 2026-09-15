import { useContext } from 'react';
import { ThemeContext } from './context';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme muss innerhalb des ThemeProvider verwendet werden');
  return ctx;
}

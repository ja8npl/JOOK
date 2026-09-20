import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, readStoredTheme, storeTheme } from './themes';
import { ThemeContext } from './context';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(() => readStoredTheme());

  const setTheme = useCallback((next: Parameters<typeof storeTheme>[0]) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const update = () => {
      setThemeState(next);
      storeTheme(next);
      applyTheme(next);
    };

    const viewTransitionApi = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };

    if (viewTransitionApi.startViewTransition && !reduceMotion && window.innerWidth > 520) {
      viewTransitionApi.startViewTransition(update);
    } else {
      update();
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

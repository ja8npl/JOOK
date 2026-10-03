/** Verfügbare Themes. `garmin` ist der historische Default. */
export const THEMES = ['garmin', 'bordeaux', 'whoop', 'ember'] as const;

export type ThemeName = (typeof THEMES)[number];

export interface ThemeMeta {
  label: string;
  /** Swatch-Farbe für den Theme-Switcher */
  swatch: string;
}

export const THEME_META: Record<ThemeName, ThemeMeta> = {
  garmin: { label: 'Garmin', swatch: '#C8FF00' },
  bordeaux: { label: 'Bordeaux', swatch: '#8C232B' },
  whoop: { label: 'Whoop', swatch: '#5CB88E' },
  ember: { label: 'Ember', swatch: '#D58936' },
};

const STORAGE_KEY = 'gymlog.theme';

/** Gespeichertes Theme lesen (validiert), sonst Default. */
export function readStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (THEMES as readonly string[]).includes(stored)) {
      return stored as ThemeName;
    }
  } catch {
    // localStorage nicht verfügbar (z. B. Privacy-Modus)
  }
  return 'garmin';
}

export function storeTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // nicht persistierbar — Theme gilt nur für die Session
  }
}

/**
 * Status-Bar-Farbe (theme-color) pro Theme — V2 „Night Graphite": jedes Theme hat
 * eine eigene Near-Black --bg-base, Status-Bar und Boot-Flash (index.html) folgen ihr.
 */
const THEME_COLOR: Record<ThemeName, string> = {
  garmin: '#0e0f13',
  bordeaux: '#110d10',
  whoop: '#0b0b0d',
  ember: '#12100e',
};

/** Wendet das Theme auf <html data-theme> und die theme-color-Meta an. */
export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[theme];
}

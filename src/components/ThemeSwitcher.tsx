import { motion } from 'framer-motion';
import { THEMES, THEME_META, type ThemeName } from '../theme/themes';
import { useTheme } from '../theme/useTheme';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Segment-Control zum Umschalten der Themes — kompakt: nur das aktive Segment zeigt sein Label. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const reduced = useReducedMotion();

  return (
    <div
      role="group"
      aria-label="Farbschema wählen"
      style={{
        display: 'inline-flex',
        gap: '4px',
        padding: '4px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      {THEMES.map((t: ThemeName) => {
        const active = theme === t;
        const meta = THEME_META[t];
        return (
          <motion.button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            aria-pressed={active}
            aria-label={`Farbschema ${meta.label}`}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            layout
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 34 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 12px',
              minHeight: '32px',
              background: active ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${active ? 'var(--border-accent)' : 'transparent'}`,
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: meta.swatch,
                boxShadow: active ? '0 0 8px 1px var(--accent-glow)' : 'none',
                flexShrink: 0,
              }}
            />
            {active && (
              <motion.span
                initial={reduced ? false : { width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                style={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  letterSpacing: '0.02em',
                }}
              >
                {meta.label}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

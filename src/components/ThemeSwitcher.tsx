import { motion } from 'framer-motion';
import { THEMES, THEME_META, type ThemeName } from '../theme/themes';
import { useTheme } from '../theme/useTheme';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Segment-Control — aktives Segment konvex aus dem pressed Track herausgehoben.
 * Inaktive Segmente liegen im eingestanzten Haupt-Track.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const reduced = useReducedMotion();

  return (
    <div
      role="group"
      aria-label="Farbschema wählen"
      className="theme-switcher"
      style={{
        display: 'inline-flex',
        gap: '3px',
        padding: '4px',
        background: 'var(--bg-input)',
        boxShadow: 'var(--neo-pressed)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      {THEMES.map((t: ThemeName) => {
        const active = theme === t;
        const meta   = THEME_META[t];
        return (
          <motion.button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            aria-pressed={active}
            aria-label={`Farbschema ${meta.label}`}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            transition={reduced ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: active ? '6px 14px 6px 10px' : '6px 10px',
              minHeight: '44px',
              minWidth: '44px',
              /* Aktiv: konvex aus dem Track gehoben — Inaktiv: transparent im Well */
              background: active ? 'var(--bg-surface)' : 'transparent',
              boxShadow: active ? 'var(--neo-knob)' : 'none',
              border: `1px solid ${active ? 'var(--border-highlight)' : 'transparent'}`,
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              transition:
                'background 160ms var(--ease-out), box-shadow 160ms var(--ease-out), border-color 160ms var(--ease-out)',
            }}
          >
            {/* Farbpunkt */}
            <span
              aria-hidden="true"
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: meta.swatch,
                transform: active ? 'scale(1.2)' : 'scale(1)',
                boxShadow: active
                  ? `0 0 8px 2px ${meta.swatch}55, inset 0 1px 0 rgba(255,255,255,0.4)`
                  : 'none',
                flexShrink: 0,
                transition: 'transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out)',
              }}
            />
            {/* Label nur beim aktiven Theme */}
            {active && (
              <span
                className="theme-switcher-label"
                style={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.03em',
                }}
              >
                {meta.label}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

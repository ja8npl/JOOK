import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Activity, Plus } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const tabs = [
  { path: '/',       icon: Home,     label: 'Übersicht' },
  { path: '/warmup', icon: Activity, label: 'Rechner'   },
  { path: '/search', icon: Search,   label: 'Suche'     },
];

export function BottomNav() {
  const location = useLocation();
  const navigate  = useNavigate();
  const reduced   = useReducedMotion();

  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(var(--tab-bar-height) + var(--safe-bottom))',
        paddingBottom: 'var(--safe-bottom)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        /* Top-Kante als feiner Lichtreflex */
        borderTop: '1px solid var(--border-highlight)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.055)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: '10px',
        zIndex: 100,
      }}
    >
      {/* Tab 1 */}
      <TabButton tab={tabs[0]} location={location} navigate={navigate} reduced={reduced} />

      {/* Tab 2 */}
      <TabButton tab={tabs[1]} location={location} navigate={navigate} reduced={reduced} />

      {/* FAB — mittig, schwebend über der Bar */}
      <div style={{ position: 'relative', width: 64, display: 'flex', justifyContent: 'center' }}>
        <motion.button
          aria-label="Neuer Eintrag"
          onClick={() => navigate('/new')}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          style={{
            position: 'absolute',
            top: '-36px',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'var(--accent)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            /* Konvex + Accent-Glow */
            boxShadow: 'var(--neo-convex), 0 0 0 3px var(--bg-base), 0 0 18px 2px var(--accent-glow)',
            color: 'var(--text-on-accent)',
            zIndex: 10,
            transition: 'box-shadow 200ms var(--ease-out)',
          }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Tab 3 */}
      <TabButton tab={tabs[2]} location={location} navigate={navigate} reduced={reduced} />
    </nav>
  );
}

function TabButton({ tab, location, navigate, reduced }: {
  tab: { path: string; icon: React.ElementType; label: string };
  location: ReturnType<typeof useLocation>;
  navigate: ReturnType<typeof useNavigate>;
  reduced: boolean;
}) {
  const { path, icon: Icon, label } = tab;
  const active = location.pathname === path;

  return (
    <motion.button
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(path)}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        background: active ? 'var(--bg-chip-inset)' : 'none',
        /* Aktiver Tab: Pressed-Well — Element sinkt ein */
        boxShadow: active ? 'var(--neo-pressed)' : 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 16px',
        borderRadius: '14px',
        minWidth: '56px',
        minHeight: '48px',
        color: active ? 'var(--accent-secondary-text)' : 'var(--text-tertiary)',
        transition:
          'color 160ms var(--ease-out), background 160ms var(--ease-out), box-shadow 160ms var(--ease-out)',
        position: 'relative',
      }}
    >
      <Icon size={22} strokeWidth={active ? 2.2 : 1.5} />
      <span style={{
        fontSize: '10px',
        fontWeight: active ? 700 : 400,
        letterSpacing: '0.02em',
      }}>
        {label}
      </span>

      {/* Aktiver Indikator: Kapsel-Balken oben */}
      <AnimatePresence>
        {active && (
          <motion.span
            key="indicator"
            initial={reduced ? false : { scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }}
            style={{
              position: 'absolute',
              top: '-6px',
              width: '28px',
              height: '3px',
              borderRadius: '2px',
              background: 'var(--accent-secondary-text)',
              boxShadow: '0 0 8px var(--accent-secondary-text)',
              transformOrigin: 'center',
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

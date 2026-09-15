import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Activity, PlusCircle } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const tabs = [
  { path: '/', icon: Home, label: 'Übersicht' },
  { path: '/warmup', icon: Activity, label: 'Rechner' },
  { path: '/search', icon: Search, label: 'Suche' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

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
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: '8px',
        zIndex: 100,
      }}
    >
      {/* Linke Tabs */}
      <div style={{ display: 'flex', gap: '0', flex: 1, justifyContent: 'space-around', alignItems: 'center' }}>
        {/* 1. Tab: Übersicht */}
        <TabButton tab={tabs[0]} location={location} navigate={navigate} reduced={reduced} />
        
        {/* 2. Tab: Rechner */}
        <TabButton tab={tabs[1]} location={location} navigate={navigate} reduced={reduced} />

        {/* FAB (in den Flex-Flow integriert, um Overlaps zu vermeiden) */}
        <div style={{ position: 'relative', width: '60px', display: 'flex', justifyContent: 'center' }}>
          <motion.button
            aria-label="Neuer Eintrag"
            onClick={() => navigate('/new')}
            whileTap={reduced ? undefined : { scale: 0.92 }}
            style={{
              position: 'absolute',
              top: '-34px', // Etwas weiter nach oben gezogen
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--accent)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px var(--accent-glow), 0 0 0 1px var(--border-accent)',
              color: 'var(--text-on-accent)',
              zIndex: 10,
            }}
          >
            <PlusCircle size={26} strokeWidth={2} />
          </motion.button>
        </div>

        {/* 3. Tab: Suche */}
        <TabButton tab={tabs[2]} location={location} navigate={navigate} reduced={reduced} />
      </div>
    </nav>
  );
}

// Hilfskomponente für die Tabs
function TabButton({ tab, location, navigate, reduced }: any) {
  const { path, icon: Icon, label } = tab;
  const active = location.pathname === path;
  
  return (
    <motion.button
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(path)}
      whileTap={reduced ? undefined : { scale: 0.90 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 12px',
        borderRadius: '12px',
        minWidth: '44px',
        minHeight: '44px',
        color: active ? 'var(--accent-secondary-text)' : 'var(--text-secondary)',
        transition: 'color 150ms ease',
        position: 'relative',
      }}
    >
      <Icon size={22} strokeWidth={active ? 2 : 1.5} />
      <span style={{
        fontSize: '10px',
        fontWeight: active ? 600 : 400,
        letterSpacing: '0.02em',
        color: active ? 'var(--accent-secondary-text)' : 'var(--text-tertiary)',
      }}>
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="tab-indicator"
          style={{
            position: 'absolute',
            bottom: '-4px', // Relativ zum Button anstatt absolut zur Bar
            width: '4px',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--accent-secondary-text)',
          }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

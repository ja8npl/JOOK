import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Activity, BarChart3, Dumbbell, Home, Plus, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useWorkoutSession } from '../hooks/useWorkoutSession';

const tabs = [
  { path: '/', icon: Home, label: 'Heute' },
  { path: '/warmup', icon: Activity, label: 'Warmup' },
  { path: '/progress', icon: BarChart3, label: 'Progress' },
  { path: '/search', icon: Search, label: 'Suchen' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { activeSession, openStartMenu } = useWorkoutSession();

  const navigation = (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      <div className="nav-inner">
        <TabButton tab={tabs[0]} active={location.pathname === '/'} navigate={navigate} reduced={reduced} />
        <TabButton tab={tabs[1]} active={location.pathname === '/warmup'} navigate={navigate} reduced={reduced} />
        <motion.button
          className="create-button"
          type="button"
          aria-label={activeSession ? 'Aktives Training öffnen' : 'Training starten oder Vorlage wählen'}
          onClick={openStartMenu}
          whileTap={reduced ? undefined : { scale: 0.92 }}
        >
          {activeSession ? <Dumbbell size={21} strokeWidth={2.1} /> : <Plus size={22} strokeWidth={2.2} />}
        </motion.button>
        <TabButton tab={tabs[2]} active={location.pathname === '/progress'} navigate={navigate} reduced={reduced} />
        <TabButton tab={tabs[3]} active={location.pathname === '/search'} navigate={navigate} reduced={reduced} />
      </div>
    </nav>
  );

  // Keep the fixed dock outside the app shell. This prevents future transforms,
  // filters, or motion wrappers in the shell from changing its containing block.
  return createPortal(navigation, document.body);
}

function TabButton({ tab, active, navigate, reduced }: {
  tab: { path: string; icon: React.ElementType; label: string };
  active: boolean;
  navigate: ReturnType<typeof useNavigate>;
  reduced: boolean;
}) {
  const Icon = tab.icon;
  return (
    <motion.button
      className={`nav-tab${active ? ' is-active' : ''}`}
      type="button"
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(tab.path)}
      whileTap={reduced ? undefined : { scale: 0.9 }}
    >
      <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
      <span>{tab.label}</span>
      <AnimatePresence>
        {active && <motion.i className="nav-dot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} aria-hidden="true" />}
      </AnimatePresence>
    </motion.button>
  );
}

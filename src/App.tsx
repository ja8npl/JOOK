import { useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashIntro } from './components/SplashIntro';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';
import { NewEntry } from './pages/NewEntry';
import { EditEntry } from './pages/EditEntry';
import { Search } from './pages/Search';
import { Warmup } from './pages/Warmup';
import { ThemeProvider } from './theme/ThemeContext';
import { useReducedMotion } from './hooks/useReducedMotion';
import { WorkoutSessionProvider } from './hooks/useWorkoutSession';
import { WorkoutSessionModal } from './components/WorkoutSessionModal';
import { WorkoutLauncher } from './components/WorkoutLauncher';
import { Progress } from './pages/Progress';
import { Settings } from './pages/Settings';

// Seitenwechsel-Transition — Fade + leichter Y-Slide
function AnimatedRoutes() {
  const location = useLocation();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -8 }}
        transition={reduced
          ? { duration: 0 }
          : { duration: 0.18, ease: 'easeOut' }
        }
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/machine/:machineId" element={<Detail />} />
          <Route path="/new" element={<NewEntry />} />
          <Route path="/edit/:id" element={<EditEntry />} />
          <Route path="/search" element={<Search />} />
          <Route path="/warmup" element={<Warmup />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  // Launch-Sequenz: Das Intro-Overlay liegt über der bereits gerenderten App,
  // damit nach dem Abflug der Kachel sofort echte Inhalte sichtbar sind.
  // SplashIntro terminiert selbst (onDone) und braucht hier keinen State.
  const [introDone, setIntroDone] = useState(false);

  return (
    <ThemeProvider>
      <WorkoutSessionProvider>
      <HashRouter>
        <div
          className="app-shell"
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100vh',
            minHeight: '100vh',
            background: 'var(--bg-app)',
            position: 'fixed',
            inset: 0,
            overflow: 'hidden',
          }}
        >
          <AnimatedRoutes />
          <BottomNav />
          <WorkoutSessionModal />
          <WorkoutLauncher />
          {!introDone && (
            <SplashIntro onDone={() => setIntroDone(true)} />
          )}
        </div>
      </HashRouter>
      </WorkoutSessionProvider>
    </ThemeProvider>
  );
}

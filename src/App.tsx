import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';
import { NewEntry } from './pages/NewEntry';
import { EditEntry } from './pages/EditEntry';
import { Search } from './pages/Search';
import { Warmup } from './pages/Warmup';
import { ThemeProvider } from './theme/ThemeContext';
import { useReducedMotion } from './hooks/useReducedMotion';

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
          : { type: 'spring', stiffness: 380, damping: 35 }
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
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          background: 'var(--bg-app)',
          position: 'relative',
        }}>
          <AnimatedRoutes />
          <BottomNav />
        </div>
      </HashRouter>
    </ThemeProvider>
  );
}

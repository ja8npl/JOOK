import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Activity, ArrowUpRight, Dumbbell, Settings, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMachineSummaries } from '../hooks/useEntries';
import { MachineCard } from '../components/MachineCard';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function Home() {
  const summaries = useMachineSummaries();
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const totalEntries = summaries?.reduce((total, item) => total + item.count, 0) ?? 0;

  return (
    <main className="home page-container">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="home-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><Sparkles size={17} /></div>
          <div>
            <span className="eyebrow">Personal training log</span>
            <h1 className="brand-title">Gym Log</h1>
          </div>
        </div>
        <div className="home-header-actions">
          <button className="header-icon-button" type="button" onClick={() => navigate('/settings')} aria-label="Einstellungen öffnen"><Settings size={17} /></button>
          <ThemeSwitcher />
        </div>
      </header>

      <section className="hero-panel glass-panel" aria-labelledby="home-heading">
        <div className="hero-copy">
          <span className="eyebrow accent-copy">{summaries?.length ? 'Dein Rhythmus' : 'Dein nächster Schritt'}</span>
          <h2 id="home-heading">Trainiere mit<br /><em>Gedächtnis.</em></h2>
          <p>Maschinen, Einstellungen und Fortschritt. Alles an einem ruhigen Ort.</p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="orbit-core"><Activity size={27} /></div>
        </div>
        <button className="hero-link" type="button" onClick={() => navigate('/new')}>
          <span>{summaries?.length ? 'Eintrag hinzufügen' : 'Erste Übung loggen'}</span>
          <ArrowUpRight size={17} />
        </button>
      </section>

      {summaries && summaries.length > 0 && (
        <motion.section
          className="metrics-grid"
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Trainingsübersicht"
        >
          <Metric label="Übungen" value={summaries.length} icon={<Dumbbell size={16} />} />
          <Metric label="Einträge" value={totalEntries} icon={<TrendingUp size={16} />} />
        </motion.section>
      )}

      <section className="library-section" aria-labelledby="library-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Deine Bibliothek</span>
            <h2 id="library-heading">Übungen</h2>
          </div>
          {summaries && summaries.length > 0 && <span className="count-pill">{summaries.length}</span>}
        </div>

        {summaries === undefined ? (
          <SkeletonList />
        ) : summaries.length === 0 ? (
          <EmptyState onCreate={() => navigate('/new')} />
        ) : (
          <div className="machine-list">
            {summaries.map((summary, index) => (
              <MachineCard key={summary.machineId} summary={summary} index={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ value, label, icon }: { value: number; label: string; icon: ReactNode }) {
  return (
    <div className="metric-card glass-panel">
      <span className="metric-icon">{icon}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      className="empty-state glass-panel"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="empty-icon"><Dumbbell size={25} /></div>
      <div>
        <h3>Dein Log ist bereit.</h3>
        <p>Speichere deine erste Maschine und finde beim nächsten Training sofort zurück.</p>
      </div>
      <button className="primary-button" type="button" onClick={onCreate}>Übung anlegen <ArrowUpRight size={16} /></button>
    </motion.div>
  );
}

function SkeletonList() {
  return <div className="machine-list" aria-label="Laden"><div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" /></div>;
}

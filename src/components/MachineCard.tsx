import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Flame, History } from 'lucide-react';
import { type MachineSummary } from '../db/schema';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  summary: MachineSummary;
  index: number;
  onOpenHistory: (summary: MachineSummary) => void;
  onOpenWarmup: (summary: MachineSummary) => void;
  /** Heutige Warm-up-Konfiguration vorhanden (Button zeigt aktiven Zustand). */
  hasWarmupToday?: boolean;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now   = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7)  return `Vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export function MachineCard({ summary, index, onOpenHistory, onOpenWarmup, hasWarmupToday = false }: Props) {
  const navigate = useNavigate();
  const reduced  = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced
        ? { duration: 0 }
        : { duration: 0.24, ease: 'easeOut', delay: Math.min(index, 5) * 0.03 }
      }
      className="neo-card machine-card"
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 12px 12px 14px' }}
    >
      {/* Tap-Zone 1: Karte öffnen (Detail) — Icon, Name, Einstellung, Meta */}
      <button
        type="button"
        onClick={() => navigate(`/machine/${encodeURIComponent(summary.machineId)}`)}
        aria-label={`${summary.name}, zuletzt ${formatDate(summary.lastDatum)} — Details öffnen`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1,
          minWidth: 0,
          padding: '2px 0',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {/* Icon-Well — Squircle, eingestanzt */}
        <div className="machine-card-well">
          <Dumbbell size={20} color="var(--accent-text)" strokeWidth={1.5} />
        </div>

        {/* Content — Name bekommt die volle Breite, Meta als Mikro-Zeile */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="machine-card-name">{summary.name}</div>
          <div className="machine-card-sub">{summary.lastEinstellung || 'Keine Einstellung'}</div>
          <div className="machine-card-meta">
            {formatDate(summary.lastDatum)}
            <span aria-hidden="true"> · </span>
            <span style={{ color: 'var(--accent-text)', fontWeight: 700 }}>
              {summary.count} {summary.count === 1 ? 'Eintrag' : 'Einträge'}
            </span>
          </div>
        </div>
      </button>

      {/* Tap-Zone 2 + 3: Warm-up und Verlauf — randlose Ghost-Buttons */}
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <motion.button
          type="button"
          onClick={() => onOpenWarmup(summary)}
          whileTap={reduced ? undefined : { scale: 0.94 }}
          aria-label={`Warm-up für ${summary.name} ${hasWarmupToday ? 'ändern' : 'einrichten'}`}
          aria-pressed={hasWarmupToday}
          className={`machine-card-action${hasWarmupToday ? ' is-active' : ''}`}
        >
          <Flame size={19} strokeWidth={hasWarmupToday ? 2.2 : 1.8} />
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onOpenHistory(summary)}
          whileTap={reduced ? undefined : { scale: 0.94 }}
          aria-label={`Verlauf von ${summary.name} anzeigen`}
          className="machine-card-action"
        >
          <History size={19} strokeWidth={1.8} />
        </motion.button>
      </div>
    </motion.div>
  );
}

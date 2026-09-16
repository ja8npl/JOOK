import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { type MachineSummary } from '../db/schema';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  summary: MachineSummary;
  index: number;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export function MachineCard({ summary, index }: Props) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  return (
    <motion.button
      layout
      layoutId={`machine-card-${summary.machineId}`}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 300, damping: 26, delay: index * 0.05 }
      }
      whileTap={reduced ? undefined : { scale: 0.97 }}
      onClick={() => navigate(`/machine/${encodeURIComponent(summary.machineId)}`)}
      aria-label={`${summary.name}, zuletzt ${formatDate(summary.lastDatum)}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 18px',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: 'var(--shadow-card)',
        transition: 'border-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Icon */}
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: 'var(--accent-dim)',
        boxShadow: 'var(--neo-pressed)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Dumbbell size={20} color="var(--accent-text)" strokeWidth={1.5} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {summary.name}
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {summary.lastEinstellung || 'Keine Einstellung'}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {formatDate(summary.lastDatum)}
        </span>
        <span style={{
          fontSize: '11px',
          color: 'var(--accent-text)',
          fontWeight: 500,
        }}>
          {summary.count} {summary.count === 1 ? 'Eintrag' : 'Einträge'}
        </span>
      </div>

      <ChevronRight size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
    </motion.button>
  );
}

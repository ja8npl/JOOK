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
  const now   = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7)  return `Vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export function MachineCard({ summary, index }: Props) {
  const navigate = useNavigate();
  const reduced  = useReducedMotion();

  return (
    <motion.button
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced
        ? { duration: 0 }
        : { duration: 0.24, ease: 'easeOut', delay: Math.min(index, 5) * 0.03 }
      }
      whileTap={reduced ? undefined : { scale: 0.96 }}
      onClick={() => navigate(`/machine/${encodeURIComponent(summary.machineId)}`)}
      aria-label={`${summary.name}, zuletzt ${formatDate(summary.lastDatum)}`}
      className="neo-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
        padding: '16px 18px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Icon-Well — eingestanzt */}
      <div style={{
        width: '46px',
        height: '46px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-dim)',
        boxShadow: 'var(--neo-pressed)',
        border: '1px solid var(--border-accent)',
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
          fontFamily: 'var(--font-display)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: 'var(--tracking-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2,
        }}>
          {summary.name}
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          marginTop: '3px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {summary.lastEinstellung || 'Keine Einstellung'}
        </div>
      </div>

      {/* Meta — rechts */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatDate(summary.lastDatum)}
        </span>
        <span style={{
          fontSize: '11px',
          color: 'var(--accent-text)',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
        }}>
          {summary.count} {summary.count === 1 ? 'Eintrag' : 'Einträge'}
        </span>
      </div>

      <ChevronRight size={15} color="var(--text-tertiary)" style={{ flexShrink: 0, opacity: 0.6 }} />
    </motion.button>
  );
}

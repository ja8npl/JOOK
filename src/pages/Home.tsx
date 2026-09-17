import { motion } from 'framer-motion';
import { Dumbbell, TrendingUp } from 'lucide-react';
import { useMachineSummaries } from '../hooks/useEntries';
import { MachineCard } from '../components/MachineCard';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function Home() {
  const summaries = useMachineSummaries();
  const reduced   = useReducedMotion();

  return (
    <div className="page-container">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {/* App-Icon als Pressed-Well */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-dim)',
              boxShadow: 'var(--neo-pressed)',
              border: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Dumbbell size={18} color="var(--accent-text)" strokeWidth={1.5} />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '30px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: 'var(--tracking-display)',
              whiteSpace: 'nowrap',
            }}>
              Gym Log
            </h1>
          </div>
          <ThemeSwitcher />
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', paddingLeft: '48px' }}>
          Deine Maschineneinstellungen
        </p>
      </header>

      {/* ── Stats Bar ──────────────────────────────────────────────────── */}
      {summaries && summaries.length > 0 && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.05 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}
        >
          <StatChip
            value={summaries.length}
            label={summaries.length === 1 ? 'Maschine' : 'Maschinen'}
            icon={<Dumbbell size={14} color="var(--accent-text)" />}
          />
          <StatChip
            value={summaries.reduce((acc, s) => acc + s.count, 0)}
            label="Einträge gesamt"
            icon={<TrendingUp size={14} color="var(--accent-text)" />}
          />
        </motion.div>
      )}

      {/* ── Maschinenliste ─────────────────────────────────────────────── */}
      {summaries === undefined ? (
        <SkeletonList />
      ) : summaries.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {summaries.map((summary, index) => (
            <MachineCard key={summary.machineId} summary={summary} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatChip({ value, label, icon }: {
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--neo-raised)',
      /* Erhöhtes Inset-Padding für Atmen / Anti-Hit Schattenkante */
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Icon in kleinem Pressed-Well */}
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '8px',
          background: 'var(--accent-dim)',
          boxShadow: 'var(--neo-pressed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '36px',
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}>
          {value}
        </span>
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}>
        {label}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        paddingTop: '80px',
        textAlign: 'center',
      }}
    >
      {/* Großes Dumbbell-Icon im tiefen Pressed-Well */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '26px',
        background: 'var(--accent-dim)',
        boxShadow: 'var(--neo-pressed)',
        border: '1px solid var(--border-accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Dumbbell size={36} color="var(--accent-text)" strokeWidth={1.5} />
      </div>
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '8px',
          letterSpacing: 'var(--tracking-display)',
        }}>
          Noch nichts eingetragen
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Tippe auf das{' '}
          <span style={{
            color: 'var(--accent-text)',
            fontWeight: 700,
          }}>
            +
          </span>
          {' '}um deine erste<br />Maschine einzutragen.
        </p>
      </div>
    </motion.div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: '78px',
            borderRadius: 'var(--radius-card)',
            opacity: 1 - i * 0.22,
          }}
        />
      ))}
    </div>
  );
}

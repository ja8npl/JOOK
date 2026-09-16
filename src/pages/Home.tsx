import { motion } from 'framer-motion';
import { Dumbbell, TrendingUp } from 'lucide-react';
import { useMachineSummaries } from '../hooks/useEntries';
import { MachineCard } from '../components/MachineCard';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function Home() {
  const summaries = useMachineSummaries();
  const reduced = useReducedMotion();

  return (
    <div className="page-container">
      {/* Header */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'var(--accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Dumbbell size={18} color="var(--accent-text)" strokeWidth={1.5} />
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}>
              Gym Log
            </h1>
          </div>
          <ThemeSwitcher />
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          Deine Maschineneinstellungen
        </p>
      </header>

      {/* Stats Bar */}
      {summaries && summaries.length > 0 && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.05 }}
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
          }}
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

      {/* Maschinenliste */}
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

function StatChip({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      boxShadow: 'var(--neo-raised)',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon}
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: '26px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}>
          {value}
        </span>
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{label}</span>
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
        gap: '16px',
        paddingTop: '80px',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '24px',
        background: 'var(--accent-dim)',
        boxShadow: 'var(--neo-pressed)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Dumbbell size={32} color="var(--accent-text)" strokeWidth={1.5} />
      </div>
      <div>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: '22px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '6px',
        }}>
          Noch nichts eingetragen
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Tippe auf das <span style={{ color: 'var(--accent-text)' }}>+</span> um deine erste<br />Maschine einzutragen.
        </p>
      </div>
    </motion.div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            height: '74px',
            borderRadius: 'var(--radius-card)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: 1 - i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

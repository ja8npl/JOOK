import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, CalendarDays, Dumbbell, Settings, Target } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useEntriesForMachine } from '../hooks/useEntries';
import { bestSetOf, setsOf } from '../hooks/useSets';
import { historyPoints } from '../hooks/warmup';
import { type GymEntry } from '../db/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  machineId: string;
  exerciseName: string;
}

const SPARK_W = 300;
const SPARK_H = 64;
const SPARK_PAD = 6;

/** Mini-Verlauf der Gewichtssteigerung (max. Gewicht pro Eintrag, chronologisch). */
function WeightSparkline({ points }: { points: { datum: number; maxGewicht: number }[] }) {
  const { line, area, dots, min, max } = useMemo(() => {
    if (points.length === 0) return { line: '', area: '', dots: [] as { x: number; y: number; v: number }[], min: 0, max: 0 };
    const values = points.map((p) => p.maxGewicht);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const stepX = points.length > 1 ? (SPARK_W - SPARK_PAD * 2) / (points.length - 1) : 0;
    const coords = points.map((p, i) => ({
      x: SPARK_PAD + i * stepX,
      y: SPARK_H - SPARK_PAD - ((p.maxGewicht - min) / span) * (SPARK_H - SPARK_PAD * 2),
      v: p.maxGewicht,
    }));
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L${(SPARK_W - SPARK_PAD).toFixed(1)},${SPARK_H - SPARK_PAD} L${SPARK_PAD},${SPARK_H - SPARK_PAD} Z`;
    return { line, area, dots: coords, min, max };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <div
      className="history-sparkline"
      style={{
        padding: '14px 14px 10px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-input)',
        boxShadow: 'var(--neo-pressed)',
        border: '1px solid var(--border)',
        marginBottom: '18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span className="eyebrow">Verlauf Max-Gewicht</span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {min.toLocaleString('de-DE')} → {max.toLocaleString('de-DE')} kg
        </span>
      </div>
      <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width="100%" height={SPARK_H} role="img" aria-label="Verlauf der Gewichtssteigerung" preserveAspectRatio="none">
        <defs>
          <linearGradient id="history-spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-text)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent-text)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {area && <path d={area} fill="url(#history-spark-fill)" />}
        {line && <motion.path d={line} fill="none" stroke="var(--accent-text)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }} />}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={i === dots.length - 1 ? 4 : 2.5} fill={i === dots.length - 1 ? 'var(--accent-text)' : 'var(--bg-elevated)'} stroke="var(--accent-text)" strokeWidth={1.5} />
        ))}
      </svg>
    </div>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function HistoryRow({ entry, index, reduced }: { entry: GymEntry; index: number; reduced: boolean }) {
  const sets = setsOf(entry);
  const best = bestSetOf(entry);
  const totalReps = sets.reduce((sum, set) => sum + set.wiederholungen, 0);

  return (
    <motion.article
      className="history-row"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 26, delay: Math.min(index, 6) * 0.035 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px', color: 'var(--text-tertiary)', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
        <CalendarDays size={13} />
        {formatDate(entry.datum)}
      </div>

      {sets.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {sets.map((set, i) => (
            <span key={`${set.timestamp}-${i}`} className="history-set-chip">
              {set.gewicht.toLocaleString('de-DE')} kg × {set.wiederholungen}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
          <Dumbbell size={13} /> Keine Sätze geloggt
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {entry.einstellung && (
          <HistoryField icon={<Settings size={12} color="var(--accent-text)" />} label="Einstellung" value={entry.einstellung} />
        )}
        {entry.problem && (
          <HistoryField icon={<AlertCircle size={12} color="var(--warning)" />} label="Problem" value={entry.problem} />
        )}
        {entry.ziel && (
          <HistoryField icon={<Target size={12} color="var(--info)" />} label="Ziel" value={entry.ziel} />
        )}
      </div>

      {best && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          Best {best.gewicht.toLocaleString('de-DE')} kg × {best.wiederholungen} · {sets.length} Sätze · {totalReps} Reps
        </div>
      )}
    </motion.article>
  );
}

function HistoryField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: '6px', alignItems: 'start' }}>
      <span style={{ marginTop: '2px' }}>{icon}</span>
      <div>
        <span className="eyebrow">{label}</span>
        <p style={{ marginTop: '2px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{value}</p>
      </div>
    </div>
  );
}

export function HistorySheet({ isOpen, onClose, machineId, exerciseName }: Props) {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const entries = useEntriesForMachine(machineId);
  const points = useMemo(() => (entries ? historyPoints(entries) : []), [entries]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} eyebrow="Dein Verlauf" title={`Verlauf · ${exerciseName}`}>
      {entries === undefined ? (
        <div aria-label="Laden" style={{ display: 'grid', gap: '10px' }}>
          <div className="skeleton-row" style={{ height: '92px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton-row" style={{ height: '104px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton-row" style={{ height: '104px', borderRadius: 'var(--radius-md)' }} />
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          className="history-empty"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
        >
          {/* Geister-Verlauf: Silhouette der zukünftigen Kurve */}
          <div className="history-empty-ghost" aria-hidden="true">
            <svg viewBox="0 0 300 64" width="100%" height="64" preserveAspectRatio="none">
              <path
                d="M8 52 C 58 50, 92 46, 128 40 S 208 26, 292 10"
                fill="none"
                stroke="var(--border-highlight)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="1 7"
              />
              <motion.path
                d="M206 28 C 238 22, 264 16, 292 10"
                fill="none"
                stroke="var(--accent-text)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity={0.75}
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
              />
              <circle cx="292" cy="10" r="4" fill="var(--accent-text)" opacity={0.9} />
            </svg>
          </div>
          <span className="eyebrow">Noch ruhig hier</span>
          <h3>Noch keine Einträge</h3>
          <p>
            Logge die erste Einheit für {exerciseName} — danach zeichnet sich hier deine
            Gewichtssteigerung über die Zeit.
          </p>
          <button
            type="button"
            className="history-empty-cta"
            onClick={() => { onClose(); navigate(`/new?name=${encodeURIComponent(exerciseName)}`); }}
          >
            Erste Einheit loggen <ArrowUpRight size={15} />
          </button>
        </motion.div>
      ) : (
        <>
          <WeightSparkline points={points} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {entries.map((entry, index) => (
              <HistoryRow key={entry.id} entry={entry} index={index} reduced={reduced} />
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

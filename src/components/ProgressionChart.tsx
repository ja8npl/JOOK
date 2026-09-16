import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import { type GymEntry } from '../db/schema';
import { bestSetOf, entryLoadPoint, type EntryLoadPoint } from '../hooks/useSets';

type Zeitraum = '4w' | '3m' | 'alle';

const ZEITRAUM_LABELS: Record<Zeitraum, string> = {
  '4w': '4 Wochen',
  '3m': '3 Monate',
  'alle': 'Alle',
};

const ZEITRAUM_MS: Record<Exclude<Zeitraum, 'alle'>, number> = {
  '4w': 28 * 24 * 60 * 60 * 1000,
  '3m': 91 * 24 * 60 * 60 * 1000,
};

interface Props {
  entries: GymEntry[];
  reduced: boolean;
}

/** Progressions-Analyse: max./Ø Arbeitsgewicht über Zeit (Whoop-Look) */
export function ProgressionChart({ entries, reduced }: Props) {
  const [zeitraum, setZeitraum] = useState<Zeitraum>('alle');
  // Zeitraum-Grenze einmal pro Mount fixieren (Render-Purity: kein Date.now() im useMemo)
  const [jetzt] = useState(() => Date.now());

  const punkte = useMemo<EntryLoadPoint[]>(() => {
    const alle = entries
      .map(entryLoadPoint)
      .filter((p): p is EntryLoadPoint => p !== null)
      .sort((a, b) => a.datum - b.datum);
    if (zeitraum === 'alle') return alle;
    const cutoff = jetzt - ZEITRAUM_MS[zeitraum];
    const gefiltert = alle.filter((p) => p.datum >= cutoff);
    // Zu wenig Daten im Zeitraum → alles zeigen statt leeres Chart
    return gefiltert.length >= 2 ? gefiltert : alle;
  }, [entries, zeitraum, jetzt]);

  const chartData = useMemo(() => punkte.map((p) => ({
    ...p,
    label: new Date(p.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }),
  })), [punkte]);

  // Persönliche Bestleistung über alle Einträge (nicht zeitraumabhängig)
  const pr = useMemo(() => {
    let best: { satz: ReturnType<typeof bestSetOf>; datum: number } | null = null;
    for (const entry of entries) {
      const satz = bestSetOf(entry);
      if (!satz) continue;
      if (!best || satz.gewicht > best.satz!.gewicht) {
        best = { satz, datum: entry.datum };
      }
    }
    return best;
  }, [entries]);

  // Trend: max. Gewicht neuester vs. vorheriger Eintrag (±2,5 kg Toleranz)
  const trend = useMemo<'up' | 'down' | 'flat'>(() => {
    if (punkte.length < 2) return 'flat';
    const neu = punkte[punkte.length - 1].maxGewicht;
    const alt = punkte[punkte.length - 2].maxGewicht;
    if (neu > alt + 2.5) return 'up';
    if (neu < alt - 2.5) return 'down';
    return 'flat';
  }, [punkte]);

  if (punkte.length === 0) return null;

  const yMin = Math.min(...punkte.map((p) => p.avgGewicht));
  const yMax = Math.max(...punkte.map((p) => p.maxGewicht));
  const padding = Math.max(2.5, (yMax - yMin) * 0.2);

  return (
    <section aria-label="Progression" style={{ marginBottom: '24px' }}>
      {/* Header mit Trend */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          Progression
        </h2>
        <TrendBadge trend={trend} reduced={reduced} />
      </div>

      {/* PR-Banner */}
      {pr?.satz && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          marginBottom: '12px',
          background: 'var(--accent-dim)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-accent)',
        }}>
          <Trophy size={16} color="var(--accent-text)" />
          <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
            Bestleistung{' '}
            <strong style={{ color: 'var(--accent-text)' }}>
              {pr.satz.gewicht.toLocaleString('de-DE')} kg × {pr.satz.wiederholungen}
            </strong>
            {' '}· {new Date(pr.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}

      {/* Zeitraum-Pills */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {(Object.keys(ZEITRAUM_LABELS) as Zeitraum[]).map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZeitraum(z)}
            aria-pressed={zeitraum === z}
            style={{
              padding: '5px 12px',
              background: zeitraum === z ? 'var(--accent-dim)' : 'var(--bg-input)',
              border: `1px solid ${zeitraum === z ? 'var(--border-accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-pill)',
              color: zeitraum === z ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {ZEITRAUM_LABELS[z]}
          </button>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '16px 8px 4px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
            <defs>
              <linearGradient id="progressionMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-text)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent-text)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="progressionAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--text-tertiary)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--text-tertiary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[Math.floor(yMin - padding), Math.ceil(yMax + padding)]}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={34}
              tickFormatter={(v: number) => v.toLocaleString('de-DE')}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border-accent)', strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-accent)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    boxShadow: 'var(--shadow-float)',
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      {label}
                    </div>
                    {payload.map((p) => (
                      <div key={p.dataKey as string} style={{
                        fontSize: '13px',
                        color: p.dataKey === 'maxGewicht' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {p.dataKey === 'maxGewicht' ? 'Max ' : 'Ø '}
                        {Number(p.value).toLocaleString('de-DE')} kg
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="maxGewicht"
              stroke="var(--accent-text)"
              strokeWidth={2.5}
              fill="url(#progressionMax)"
              dot={{ r: 3, fill: 'var(--accent-text)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: 'var(--accent-text)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
              animationDuration={reduced ? 0 : 700}
            />
            <Area
              type="monotone"
              dataKey="avgGewicht"
              stroke="var(--text-tertiary)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#progressionAvg)"
              dot={false}
              animationDuration={reduced ? 0 : 700}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Eigene Legende (keine Chart-Standardlegende) */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          padding: '8px 0 12px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '2px', background: 'var(--accent-text)', borderRadius: '1px' }} />
            Max Arbeitsgewicht (kg)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '0', borderTop: '2px dashed var(--text-tertiary)' }} />
            Ø Gewicht
          </span>
        </div>
      </motion.div>
    </section>
  );
}

function TrendBadge({ trend, reduced }: { trend: 'up' | 'down' | 'flat'; reduced: boolean }) {
  const config = {
    up: { Icon: TrendingUp, color: 'var(--accent-text)', label: 'Steigend' },
    down: { Icon: TrendingDown, color: 'var(--danger)', label: 'Fallend' },
    flat: { Icon: Minus, color: 'var(--text-tertiary)', label: 'Konstant' },
  }[trend];

  return (
    <motion.span
      initial={reduced ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduced ? { duration: 0 } : { delay: 0.15 }}
      aria-label={`Trend: ${config.label}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        fontWeight: 600,
        color: config.color,
      }}
    >
      <config.Icon size={14} />
      {config.label}
    </motion.span>
  );
}

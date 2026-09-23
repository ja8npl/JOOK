import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight, Check, ChevronDown, ChevronUp, Dumbbell, Flame, History,
  Scale, Settings, TrendingDown, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMachineSummaries } from '../hooks/useEntries';
import { MachineCard } from '../components/MachineCard';
import { HistorySheet } from '../components/HistorySheet';
import { WarmupSheet } from '../components/WarmupSheet';
import { BottomSheet } from '../components/BottomSheet';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  applyWarmupToSessionExercise, matchesMachineId, parseKgInput, setWarmupConfig,
  todayKey, useTodayWarmupConfig, useTodayWarmupMachineIds,
} from '../hooks/warmup';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import {
  ANALYSE_WINDOW_DAYS, averageOfLast7Days, currentBodyWeight, daysInMode,
  saveBodyWeight, setTrainingMode, useAppSettings, useBodyWeights,
  useTrainingAnalyse, MUSTER_LABELS,
} from '../hooks/useTrainingStats';
import { TRAINING_MODES, type MachineSummary, type TrainingMode } from '../db/schema';
import { db } from '../db/db';

/* ════════════════════════ Formatierung ════════════════════════ */

const fmtKg = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtSignedKg = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' });
const fmtPct = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0 });
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const MODE_SHORT: Record<TrainingMode, string> = { bulk: 'Bulk', cut: 'Cut', recomp: 'Recomp' };

/* ════════════════════════ Seite ════════════════════════ */

export function Home() {
  const summaries = useMachineSummaries();
  const navigate = useNavigate();
  const { activeSession, updateExercise, clearWarmup } = useWorkoutSession();
  const [historyTarget, setHistoryTarget] = useState<MachineSummary | null>(null);
  const [warmupTarget, setWarmupTarget] = useState<MachineSummary | null>(null);
  const warmupMachineIds = useTodayWarmupMachineIds();

  const settings = useAppSettings();
  const bodyWeights = useBodyWeights();
  const analyse = useTrainingAnalyse();

  const [modeOpen, setModeOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const modeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modeOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!modeRef.current?.contains(event.target as Node)) setModeOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [modeOpen]);

  const latest = useMemo(() => (bodyWeights ? currentBodyWeight(bodyWeights) : null), [bodyWeights]);
  const avg7 = useMemo(() => (bodyWeights ? averageOfLast7Days(bodyWeights) : null), [bodyWeights]);
  const weightDelta = latest && avg7 !== null ? latest.gewicht - avg7 : null;
  const spark = useMemo(() => sparklinePoints(bodyWeights ?? [], 30), [bodyWeights]);

  const handleWarmupConfirm = useCallback(async (maxGewicht: number, dritterSatz: boolean) => {
    if (!warmupTarget) return;
    const sessionExercise = activeSession?.exercises.find(
      (item) => matchesMachineId(item.exercise, warmupTarget.machineId),
    );
    if (sessionExercise) {
      await applyWarmupToSessionExercise(updateExercise, sessionExercise, warmupTarget.machineId, maxGewicht, dritterSatz);
    } else {
      await setWarmupConfig(warmupTarget.machineId, maxGewicht, dritterSatz);
    }
  }, [warmupTarget, activeSession, updateExercise]);

  const handleWarmupReset = useCallback(async () => {
    if (!warmupTarget) return;
    await db.warmupConfigs.delete(`${warmupTarget.machineId}__${todayKey()}`);
    const sessionExercise = activeSession?.exercises.find(
      (item) => matchesMachineId(item.exercise, warmupTarget.machineId),
    );
    if (sessionExercise) clearWarmup(sessionExercise.exercise.id);
  }, [warmupTarget, activeSession, clearWarmup]);

  const currentWarmupConfig = useTodayWarmupConfig(warmupTarget?.machineId ?? '');

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <main className="home page-container">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="home-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><Dumbbell size={17} /></div>
          <div>
            <span className="eyebrow">{WEEKDAYS[new Date().getDay()]}</span>
            <h1 className="brand-title">Gym Log</h1>
          </div>
        </div>
        <div className="home-header-actions">
          <button className="header-icon-button" type="button" onClick={() => navigate('/settings')} aria-label="Einstellungen öffnen"><Settings size={17} /></button>
          <ThemeSwitcher />
        </div>
      </header>

      <section className="home-duo" aria-label="Modus und Körpergewicht">
        <ModeCard
          modus={settings.modus}
          tage={daysInMode(settings.modusSeit)}
          open={modeOpen}
          onToggle={() => setModeOpen((open) => !open)}
          onSelect={(modus) => { void setTrainingMode(modus); setModeOpen(false); }}
          triggerRef={modeRef}
        />
        <WeightCard
          latest={latest?.gewicht ?? null}
          delta={weightDelta}
          spark={spark}
          onAdd={() => setWeightOpen(true)}
        />
      </section>

      <section className="gauge-row" aria-label="Trainings-Bilanzen">
        <RingGauge label="Kraft" value={analyse?.kraft ?? 0} index={0} />
        <RingGauge label="Volumen" value={analyse?.volumen ?? 0} index={1} />
        <RingGauge label="Konsistenz" value={analyse?.konsistenz ?? 0} index={2} />
      </section>

      <GreetingCard
        name="Jan"
        greeting={greeting}
        gains={analyse?.gains ?? []}
        kraft={analyse?.kraft ?? 0}
        volumen={analyse?.volumen ?? 0}
        modus={settings.modus}
        tage={daysInMode(settings.modusSeit)}
      />

      <AnalyseSection analyse={analyse} />

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
              <MachineCard
                key={summary.machineId}
                summary={summary}
                index={index}
                hasWarmupToday={warmupMachineIds?.has(summary.machineId) ?? false}
                onOpenHistory={setHistoryTarget}
                onOpenWarmup={setWarmupTarget}
              />
            ))}
          </div>
        )}
      </section>

      <HistorySheet
        isOpen={historyTarget !== null}
        onClose={() => setHistoryTarget(null)}
        machineId={historyTarget?.machineId ?? ''}
        exerciseName={historyTarget?.name ?? ''}
      />
      <WarmupSheet
        isOpen={warmupTarget !== null}
        onClose={() => setWarmupTarget(null)}
        exerciseName={warmupTarget?.name ?? ''}
        currentConfig={warmupTarget ? currentWarmupConfig : undefined}
        onConfirm={handleWarmupConfirm}
        onReset={handleWarmupReset}
      />
      <WeightSheet
        key={String(latest?.gewicht ?? 'none')}
        isOpen={weightOpen}
        onClose={() => setWeightOpen(false)}
        initial={latest?.gewicht ?? null}
      />
    </main>
  );
}

/* ════════════════════════ Bausteine ════════════════════════ */

interface ModeCardProps {
  modus: TrainingMode;
  tage: number;
  open: boolean;
  onToggle: () => void;
  onSelect: (modus: TrainingMode) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

function ModeCard({ modus, tage, open, onToggle, onSelect, triggerRef }: ModeCardProps) {

  /* Tastaturbedienung per Dokument-Listener — unabhängig davon, wo der Fokus
     liegt (Touch-Nutzer haben keinen Fokus im Menü): Pfeiltasten wählen,
     Escape schließt zurück auf den Trigger. */
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const index = TRAINING_MODES.indexOf(modus);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        onSelect(TRAINING_MODES[(index + delta + TRAINING_MODES.length) % TRAINING_MODES.length]);
      } else if (event.key === 'Escape') {
        event.stopPropagation();
        onToggle();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, modus, onSelect, onToggle]);

  return (
    <div className="mode-card glass-panel" ref={triggerRef}>
      <button type="button" className="mode-trigger" onClick={onToggle} aria-expanded={open} aria-haspopup="listbox">
        <span className="eyebrow">Modus</span>
        <span className="mode-value">{MODE_SHORT[modus]}<ChevronDown size={15} className={open ? 'rotate-icon' : undefined} /></span>
        <span className="mode-since">{tage === 0 ? 'Seit heute' : `Seit ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`}</span>
      </button>
      {open && (
        <div className="mode-menu glass-panel" role="listbox" aria-label="Trainingsmodus wählen" tabIndex={-1}>
          {TRAINING_MODES.map((m) => (
            <button key={m} type="button" role="option" aria-selected={m === modus} onClick={() => onSelect(m)}>
              <span>{TRAINING_MODE_LABEL(m)}</span>
              {m === modus && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TRAINING_MODE_LABEL(modus: TrainingMode): string {
  return MODE_SHORT[modus];
}

interface WeightCardProps {
  latest: number | null;
  delta: number | null;
  spark: number[];
  onAdd: () => void;
}

function WeightCard({ latest, delta, spark, onAdd }: WeightCardProps) {
  return (
    <button type="button" className="weight-card glass-panel" onClick={onAdd}
      aria-label={latest !== null ? `Körpergewicht ${fmtKg.format(latest)} kg, Messung aktualisieren` : 'Körpergewicht eintragen'}>
      <span className="eyebrow">Gewicht</span>
      <span className="weight-value">{latest !== null ? <>{fmtKg.format(latest)}<small> kg</small></> : '––'}</span>
      <span className="weight-delta">{deltaText(delta)}</span>
      <Sparkline points={spark} />
    </button>
  );
}

function deltaText(delta: number | null): string {
  if (delta === null) return 'Noch keine Messung';
  if (delta <= -0.05) return `${fmtSignedKg.format(delta)} kg · 7-Tage-Ø`;
  if (delta >= 0.05) return `+${fmtKg.format(delta)} kg · 7-Tage-Ø`;
  return 'Auf 7-Tage-Ø';
}

/** Letzte n Tage der Messungen auf 0..1 normalisiert (für die Sparkline). */
function sparklinePoints(measurements: Array<{ id: number; gewicht: number }>, days: number): number[] {
  if (measurements.length === 0) return [];
  const cutoff = Date.now() - days * 86_400_000;
  const recent = measurements.filter((m) => m.id >= cutoff).map((m) => m.gewicht);
  if (recent.length < 2) return [];
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const span = max - min || 1;
  return recent.map((value) => (value - min) / span);
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return (
      <svg className="weight-spark" viewBox="0 0 76 22" preserveAspectRatio="none" aria-hidden="true">
        <line x1="2" y1="11" x2="74" y2="11" stroke="var(--border-subtle)" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
      </svg>
    );
  }
  const step = 72 / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(2 + i * step).toFixed(1)},${(19 - p * 15).toFixed(1)}`).join(' ');
  return (
    <svg className="weight-spark" viewBox="0 0 76 22" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

interface GaugeProps {
  label: string;
  value: number;
  index: number;
}

function RingGauge({ label, value, index }: GaugeProps) {
  const reduced = useReducedMotion();
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <motion.div
      className="gauge-tile glass-panel"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${label}: ${fmtPct.format(clamped)}`}>
        <defs>
          <linearGradient id={`gauge-grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="var(--accent-secondary)" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="3.5" />
        <motion.circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={`url(#gauge-grad-${index})`}
          strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ duration: reduced ? 0 : 1.1, delay: 0.2 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="33" textAnchor="middle" dominantBaseline="central" className="gauge-ring-text">
          {Math.round(clamped * 100)}<tspan fontSize="9" fill="var(--text-tertiary)">%</tspan>
        </text>
      </svg>
      <span className="gauge-label">{label}</span>
    </motion.div>
  );
}

interface GreetingProps {
  name: string;
  greeting: string;
  gains: Array<{ name: string; deltaKg: number }>;
  kraft: number;
  volumen: number;
  modus: TrainingMode;
  tage: number;
}

function GreetingCard({ name, greeting, gains, kraft, volumen, modus, tage }: GreetingProps) {
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();
  const top = gains[0];
  const lines: string[] = [];
  if (top) {
    lines.push(`${top.name} ${fmtSignedKg.format(top.deltaKg)} kg in ${ANALYSE_WINDOW_DAYS} Tagen — dein stärkster Zuwachs.`);
  } else {
    lines.push('Logge deine Übungen, um erste Trends zu sehen.');
  }
  if (kraft > 0 || volumen > 0) {
    lines.push(`Kraft steigt bei ${fmtPct.format(kraft)} deiner Übungen, das Volumen bei ${fmtPct.format(volumen)}.`);
  } else {
    lines.push('Zwei Einträge pro Übung reichen, um Kraft und Volumen zu bewerten.');
  }
  lines.push(`${MODE_SHORT[modus]} läuft ${tage === 0 ? 'seit heute' : `seit ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`} — bleib dran.`);

  return (
    <motion.section
      className={`greeting-card glass-panel${expanded ? '' : ' is-collapsed'}`}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Trainingszusammenfassung"
    >
      <button
        type="button"
        className="greeting-expand"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Zusammenfassung einklappen' : 'Zusammenfassung ausklappen'}
      >
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <span className="eyebrow accent-copy">Deine Woche</span>
      <h2 className="greeting-title">{greeting}, {name}</h2>
      <div className="greeting-summary">
        {lines.map((line) => <p key={line}>{line}</p>)}
      </div>
    </motion.section>
  );
}

interface AnalyseData {
  gains: Array<{ machineId: string; name: string; deltaKg: number }>;
  regress: Array<{ machineId: string; name: string; deltaKg: number }>;
  muster: Array<{ machineId: string; name: string; typ: string }>;
}

function AnalyseSection({ analyse }: { analyse: AnalyseData | undefined }) {
  const hasDeltas = (analyse?.gains.length ?? 0) > 0 || (analyse?.regress.length ?? 0) > 0 || (analyse?.muster.length ?? 0) > 0;
  return (
    <section className="analyse-section" aria-labelledby="analyse-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Letzte {ANALYSE_WINDOW_DAYS} Tage</span>
          <h2 id="analyse-heading">Analyse</h2>
        </div>
        {hasDeltas && <span className="analyse-window">Ø pro Übung</span>}
      </div>
      <div className="analyse-rail" role="list">
        <article className="analyse-card glass-panel" role="listitem" aria-label="Größte Kraftgewinne">
          <div className="analyse-card-top">
            <span className="eyebrow">Gewinne</span>
            <span className="analyse-card-icon"><TrendingUp size={15} /></span>
          </div>
          {analyse && analyse.gains.length > 0 ? (
            analyse.gains.map((gain) => (
              <div className="analyse-row" key={gain.machineId}>
                <span className="analyse-row-name">{gain.name}</span>
                <span className="analyse-row-delta"><ArrowUpRight size={13} />{fmtSignedKg.format(gain.deltaKg)} kg</span>
              </div>
            ))
          ) : (
            <p className="analyse-empty">Noch keine Zuwächse im Fenster.</p>
          )}
        </article>

        <article className="analyse-card glass-panel is-muted" role="listitem" aria-label="Rückschritte">
          <div className="analyse-card-top">
            <span className="eyebrow">Rückschritte</span>
            <span className="analyse-card-icon"><TrendingDown size={15} /></span>
          </div>
          {analyse && analyse.regress.length > 0 ? (
            analyse.regress.map((reg) => (
              <div className="analyse-row" key={reg.machineId}>
                <span className="analyse-row-name">{reg.name}</span>
                <span className="analyse-row-delta">{fmtSignedKg.format(reg.deltaKg)} kg</span>
              </div>
            ))
          ) : (
            <p className="analyse-empty">Nichts verloren — stabil gearbeitet.</p>
          )}
        </article>

        <article className="analyse-card glass-panel" role="listitem" aria-label="Muster pro Übung">
          <div className="analyse-card-top">
            <span className="eyebrow">Muster</span>
            <span className="analyse-card-icon"><Scale size={15} /></span>
          </div>
          {analyse && analyse.muster.length > 0 ? (
            analyse.muster.slice(0, 4).map((chip) => (
              <div className="analyse-chip" key={chip.machineId}>
                <span className="analyse-chip-name">{chip.name}</span>
                <span className={`analyse-chip-tag is-${chip.typ}`}>{musterLabel(chip.typ)}</span>
              </div>
            ))
          ) : (
            <p className="analyse-empty">Muster entstehen ab zwei Einträgen pro Übung.</p>
          )}
        </article>
      </div>
    </section>
  );
}

function musterLabel(typ: string): string {
  return (MUSTER_LABELS as Record<string, string>)[typ] ?? typ;
}

function SkeletonList() {
  return <div className="machine-list" aria-label="Laden"><div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" /></div>;
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

interface WeightSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initial: number | null;
}

function WeightSheet({ isOpen, onClose, initial }: WeightSheetProps) {
  const [value, setValue] = useState(initial !== null ? String(initial) : '');

  const parsed = parseKgInput(value);
  const valid = parsed !== null && parsed > 0;

  const save = async () => {
    if (!valid || parsed === null) return;
    await saveBodyWeight(parsed);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} eyebrow="Körpergewicht" title="Wiegt du heute?" avoidKeyboard>
      <div className="weight-sheet-input-wrap">
        <input
          className="weight-sheet-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="73,2"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(',', '.'))}
          aria-label="Gewicht in Kilogramm"
        />
        <span className="weight-sheet-unit">kg</span>
      </div>
      <button className="weight-sheet-save" type="button" disabled={!valid} onClick={() => void save()}>
        {initial === null ? 'Erste Messung speichern' : 'Messung aktualisieren'}
      </button>
    </BottomSheet>
  );
}

void Flame;
void History;
void ChevronUp;
void ChevronDown;

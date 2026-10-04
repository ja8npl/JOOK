import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, CalendarDays, ChevronRight, Download, Dumbbell, FileJson, Flame, History,
  Layers, Palette, Target, Trophy, Upload, Volume2, Vibrate,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DEFAULT_REP_TARGET } from '../db/schema';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { BottomSheet } from '../components/BottomSheet';
import { RepTargetSliderGroup } from '../components/RepTargetSheet';
import { setGlobalRepTarget } from '../hooks/useRepTargets';
import { formatRepRange, type RepTargetRange } from '../lib/progression';
import {
  RIR_DEFAULT_OPTIONS, REST_DURATION_OPTIONS, useBasePrefs,
} from '../hooks/useBasePrefs';
import { computeBaseStats, computePrs, computeVolumeSeries } from '../lib/baseStats';
import { exportWorkoutData, importWorkoutData } from '../hooks/useWorkoutSessions';
import { useAppSettings } from '../hooks/useTrainingStats';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { backupFilename, downloadJson } from '../lib/download';

/* ════════════════════════ Formatierung ════════════════════════ */

const fmtInt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const fmtKg = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

const RIR_LABELS: Record<string, string> = { none: 'Aus', 0: '0', 1: '1', 2: '2', 3: '3', failure: 'Failure' };

/* ════════════════════════ Seite ════════════════════════ */

export function Base() {
  const reduced = useReducedMotion();
  const prefs = useBasePrefs();
  const [moreOpen, setMoreOpen] = useState(false);

  const entries = useLiveQuery(() => db.entries.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const progressHistory = useLiveQuery(() => db.progressHistory.toArray(), []);
  const bodyWeights = useLiveQuery(() => db.bodyweights.toArray(), []);

  // Render-Purity: Datum einmal pro Mount fixieren (wie im ProgressionChart).
  const [jetzt] = useState(() => Date.now());

  const stats = useMemo(() => {
    if (entries === undefined || sessions === undefined || progressHistory === undefined || bodyWeights === undefined) return undefined;
    return computeBaseStats({ entries, sessions, progressHistory, bodyWeights, jetzt });
  }, [entries, sessions, progressHistory, bodyWeights, jetzt]);

  const prs = useMemo(() => (progressHistory ? computePrs(progressHistory) : []), [progressHistory]);
  const volumeSeries = useMemo(
    () => (progressHistory && entries ? computeVolumeSeries(progressHistory, entries) : []),
    [progressHistory, entries],
  );

  return (
    <main className="base page-container">
      <header className="progress-page-header">
        <div>
          <span className="eyebrow accent-copy">Deine Basis</span>
          <h1>Base.</h1>
          <p>Bilanz, Darstellung, Timer-Präferenzen und Backup — alles an einem Ort.</p>
        </div>
        <div className="progress-header-icon"><Layers size={22} /></div>
      </header>

      {/* ── Erweiterte Statistik ─────────────────────────────────────── */}
      <section aria-labelledby="base-stats-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Alles, was zählt</span>
            <h2 id="base-stats-heading">Bilanz</h2>
          </div>
        </div>
        {stats === undefined ? (
          <div className="machine-list" aria-label="Laden"><div className="skeleton-row" /><div className="skeleton-row" /></div>
        ) : (
          <motion.div
            className="progress-overview-grid"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatCard icon={<Flame size={14} />} value={fmtInt.format(stats.currentStreak)} label={`Tage Streak · Best ${fmtInt.format(stats.bestStreak)}`} />
            <StatCard icon={<BarChart3 size={14} />} value={fmtKg.format(stats.totalVolume)} label="Volumen gesamt (kg)" />
            <StatCard icon={<History size={14} />} value={fmtInt.format(stats.trainingDays)} label="Trainingstage" />
            <StatCard icon={<CalendarDays size={14} />} value={fmtInt.format(stats.sessionCount)} label="Sessions" />
            <StatCard icon={<Dumbbell size={14} />} value={fmtInt.format(stats.totalSets)} label="Arbeits-Sätze" />
            <StatCard icon={<Trophy size={14} />} value={fmtInt.format(stats.exerciseCount)} label="Übungen getrackt" />
          </motion.div>
        )}
      </section>

      {/* ── Volumen über die Zeit ────────────────────────────────────── */}
      {stats !== undefined && volumeSeries.length >= 2 && (
        <section aria-labelledby="base-volume-heading" style={{ marginTop: '30px' }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Arbeitsvolumen</span>
              <h2 id="base-volume-heading">Volumen über Zeit</h2>
            </div>
          </div>
          <VolumeChart series={volumeSeries} reduced={reduced} />
        </section>
      )}

      {/* ── PRs über alle Übungen ────────────────────────────────────── */}
      {prs.length > 0 && (
        <section aria-labelledby="base-pr-heading" style={{ marginTop: '30px' }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Bestleistungen</span>
              <h2 id="base-pr-heading">PRs</h2>
            </div>
            <span className="count-pill">{prs.length}</span>
          </div>
          <motion.div
            className="glass-panel"
            style={{ display: 'grid', gap: '2px', padding: '8px', borderRadius: 'var(--radius-card)' }}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            {prs.map((row) => (
              <div
                key={row.exerciseId}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  padding: '11px 10px', borderRadius: '14px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700,
                    color: 'var(--text-main)', letterSpacing: 'var(--tracking-display)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {row.exerciseName}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {new Date(row.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <span style={{
                  flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800,
                  color: 'var(--accent-text)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtKg.format(row.bestGewicht)} <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700 }}>kg</span>
                </span>
              </div>
            ))}
          </motion.div>
        </section>
      )}

      {/* ── Pausen-Timer & Sätze ─────────────────────────────────────── */}
      <section aria-labelledby="base-timer-heading" style={{ marginTop: '34px' }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Pausen-Timer &amp; Sätze</span>
            <h2 id="base-timer-heading">Standardwerte</h2>
          </div>
        </div>
        <div className="glass-panel" style={{ display: 'grid', gap: '18px', padding: '18px 16px', borderRadius: 'var(--radius-card)' }}>
          {/* Standard-Pausenzeit */}
          <div>
            <span style={{ display: 'block', marginBottom: '9px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
              Standard-Pause
            </span>
            <div role="group" aria-label="Standard-Pausenzeit wählen" style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {REST_DURATION_OPTIONS.map((option) => {
                const selected = prefs.restDuration === option;
                return (
                  <motion.button
                    key={option}
                    type="button"
                    onClick={() => prefs.setRestDuration(option)}
                    aria-pressed={selected}
                    whileTap={reduced ? undefined : { scale: 0.95 }}
                    style={{
                      minWidth: '56px', minHeight: '44px', padding: '0 14px',
                      background: selected ? 'var(--accent-dim)' : 'var(--bg-input)',
                      boxShadow: selected ? 'var(--neo-pressed)' : 'var(--neo-pill)',
                      border: `1px solid ${selected ? 'var(--border-accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-pill)',
                      color: selected ? 'var(--accent-text)' : 'var(--text-secondary)',
                      fontSize: '13px', fontWeight: selected ? 700 : 500, fontVariantNumeric: 'tabular-nums',
                      cursor: 'pointer',
                      transition: 'box-shadow 160ms var(--ease-out), background 160ms var(--ease-out), color 160ms var(--ease-out)',
                    }}
                  >
                    {option}s
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Standard-RIR */}
          <div>
            <span style={{ display: 'block', marginBottom: '9px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
              RIR-Vorauswahl
            </span>
            <div role="group" aria-label="Standard-RIR wählen" style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {RIR_DEFAULT_OPTIONS.map((option) => {
                const selected = prefs.rirDefault === option;
                return (
                  <motion.button
                    key={String(option)}
                    type="button"
                    onClick={() => prefs.setRirDefault(option)}
                    aria-pressed={selected}
                    whileTap={reduced ? undefined : { scale: 0.95 }}
                    style={{
                      minWidth: '44px', minHeight: '44px', padding: '0 12px',
                      background: selected ? 'var(--accent-dim)' : 'var(--bg-input)',
                      boxShadow: selected ? 'var(--neo-pressed)' : 'var(--neo-pill)',
                      border: `1px solid ${selected ? 'var(--border-accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-pill)',
                      color: selected ? 'var(--accent-text)' : 'var(--text-secondary)',
                      fontSize: '12px', fontWeight: selected ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'box-shadow 160ms var(--ease-out), background 160ms var(--ease-out), color 160ms var(--ease-out)',
                    }}
                  >
                    {RIR_LABELS[String(option)] ?? String(option)}
                  </motion.button>
                );
              })}
            </div>
            <p style={{ margin: '8px 0 0', color: 'var(--text-tertiary)', fontSize: '11px' }}>
              „Aus“ lässt das RIR-Feld leer — der Wert bleibt pro Satz frei wählbar.
            </p>
          </div>

          {/* Feedback-Schalter */}
          <ToggleRow
            icon={<Volume2 size={16} />}
            title="Timer-Sound"
            description="Kurzer Ton, wenn die Pause endet."
            value={prefs.timerSound}
            onChange={prefs.setTimerSound}
            reduced={reduced}
          />
          <ToggleRow
            icon={<Vibrate size={16} />}
            title="Vibration"
            description="Doppeltes Vibrieren beim Pausenende."
            value={prefs.timerVibration}
            onChange={prefs.setTimerVibration}
            reduced={reduced}
          />
        </div>
      </section>

      {/* ── Weitere Einstellungen ───────────────────────────────────── */}
      <section aria-labelledby="base-more-heading" style={{ marginTop: '34px' }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Darstellung &amp; Daten</span>
            <h2 id="base-more-heading">Weitere Einstellungen</h2>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={() => setMoreOpen(true)}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          className="glass-panel"
          aria-haspopup="dialog"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
            padding: '15px 16px', borderRadius: 'var(--radius-card)', textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span className="backup-icon" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
            <Palette size={21} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700,
              color: 'var(--text-main)', letterSpacing: 'var(--tracking-display)',
            }}>
              Darstellung &amp; Backup
            </span>
            <span style={{ display: 'block', marginTop: '2px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
              Farbwelt, JSON-Export und Restore
            </span>
          </span>
          <ChevronRight size={18} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} aria-hidden="true" />
        </motion.button>
      </section>

      <MoreSettingsSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </main>
  );
}

/* ════════════════════════ Bausteine ════════════════════════ */

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <article className="overview-card glass-panel">
      <span className="overview-icon">{icon}</span>
      <span className="overview-value">{value}</span>
      <span className="overview-label">{label}</span>
    </article>
  );
}

function VolumeChart({ series, reduced }: { series: Array<{ tag: number; volume: number }>; reduced: boolean }) {
  const points = series.slice(-90);
  const width = 320;
  const height = 88;
  const max = Math.max(...points.map((point) => point.volume));
  const min = Math.min(...points.map((point) => point.volume));
  const span = Math.max(1, max - min);
  const step = (width - 4) / (points.length - 1);
  const coords = points.map((point, index) => ({
    x: 2 + index * step,
    y: 6 + (1 - (point.volume - min) / span) * (height - 16),
  }));
  const path = coords.map((coordinate, index) => `${index === 0 ? 'M' : 'L'}${coordinate.x.toFixed(1)},${coordinate.y.toFixed(1)}`).join(' ');
  const area = `${path} L${coords[coords.length - 1].x.toFixed(1)},${height - 2} L${coords[0].x.toFixed(1)},${height - 2} Z`;

  return (
    <motion.div
      className="glass-panel"
      style={{ padding: '16px 14px 10px', borderRadius: 'var(--radius-card)' }}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Volumen pro Trainingstag" style={{ display: 'block', width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="base-volume-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#base-volume-grad)" />
        <path d={path} fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
        <span>{new Date(points[0].tag * 86_400_000).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span>
        <span>Ø {fmtKg.format(points.reduce((sum, point) => sum + point.volume, 0) / points.length)} kg / Tag</span>
        <span>{new Date(points[points.length - 1].tag * 86_400_000).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span>
      </div>
    </motion.div>
  );
}

function ToggleRow({ icon, title, description, value, onChange, reduced }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  reduced: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span className="overview-icon" style={{ flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 700 }}>{title}</span>
        <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '11px' }}>{description}</span>
      </div>
      <motion.button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        onClick={() => onChange(!value)}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        style={{
          flexShrink: 0,
          width: '54px',
          height: '32px',
          padding: '3px',
          background: value ? 'var(--accent-primary)' : 'var(--bg-input)',
          boxShadow: value ? 'var(--neo-convex)' : 'var(--neo-pressed)',
          border: `1px solid ${value ? 'var(--border-accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-pill)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: value ? 'flex-end' : 'flex-start',
          transition: 'background 180ms var(--ease-out), box-shadow 180ms var(--ease-out)',
        }}
      >
        <motion.span
          layout
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: value ? 'var(--text-on-accent)' : 'var(--bg-surface)',
            boxShadow: 'var(--neo-knob)',
          }}
        />
      </motion.button>
    </div>
  );
}

/* ════════════════════════ Sheet: Darstellung & Backup ════════════════════════ */

function MoreSettingsSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const prefs = useBasePrefs();
  const reduced = useReducedMotion();
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} eyebrow="Einstellungen" title="Darstellung & Backup">
      <div style={{ display: 'grid', gap: '22px' }}>
        {/* Weiche Kanten (progressiver Blur) */}
        <button
          type="button"
          role="switch"
          aria-checked={prefs.softEdges}
          onClick={() => prefs.setSoftEdge(!prefs.softEdges)}
          className="warmup-toggle"
        >
          <span className="warmup-toggle-copy">
            <span className="warmup-toggle-title">Weiche Kanten</span>
            <span className="warmup-toggle-sub">Content löst sich an den Kanten des Trainings-Sheets in Blur auf.</span>
          </span>
          <span className={`warmup-switch${prefs.softEdges ? ' is-on' : ''}`} aria-hidden="true">
            <motion.span
              animate={{ x: prefs.softEdges ? 20 : 0 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }}
              className="warmup-switch-knob"
            />
          </span>
        </button>

        {/* Rep-Ziel — globaler Standard */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span className="overview-icon" style={{ flexShrink: 0 }}><Target size={16} /></span>
            <div>
              <span style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 700 }}>Rep-Ziel</span>
              <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '11px' }}>Standard für alle Übungen — pro Übung im Training überschreibbar.</span>
            </div>
          </div>
          <RepTargetSettingsBlock />
        </div>

        {/* Farbwelt */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span className="overview-icon" style={{ flexShrink: 0 }}><Palette size={16} /></span>
            <div>
              <span style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 700 }}>Farbwelt</span>
              <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '11px' }}>Vier Themes, alle dunkel.</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
            <ThemeSwitcher />
          </div>
        </div>

        {/* Backup & Restore */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="overview-icon" style={{ flexShrink: 0 }}><FileJson size={16} /></span>
            <div>
              <span style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 700 }}>Backup &amp; Restore</span>
              <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '11px' }}>Trainingsverlauf als JSON sichern oder zurückspielen.</span>
            </div>
          </div>
          <BackupSection embedded />
        </div>
      </div>
    </BottomSheet>
  );
}

/** Globaler Rep-Ziel-Regler: lokaler Entwurf, gespeichert wird erst auf Knopfdruck. */
function RepTargetSettingsBlock() {
  const settings = useAppSettings();
  const [draft, setDraft] = useState<RepTargetRange | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const value = draft ?? (settings.repZielMin && settings.repZielMax ? { min: settings.repZielMin, max: settings.repZielMax } : DEFAULT_REP_TARGET);

  const save = () => {
    if (!draft) return;
    void setGlobalRepTarget(draft).then(() => {
      setDraft(null);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
    });
  };

  return (
    <div>
      <RepTargetSliderGroup value={value} onChange={setDraft} />
      {draft ? (
        <button className="warmup-confirm" type="button" style={{ marginTop: '10px', width: '100%' }} onClick={save}>
          <Target size={16} /> {formatRepRange(draft)} Reps als Standard speichern
        </button>
      ) : (
        <p role="status" style={{ marginTop: '10px', color: savedFlash ? 'var(--accent-text)' : 'var(--text-tertiary)', fontSize: '11px' }}>
          {savedFlash ? 'Gespeichert.' : 'Regler ziehen und speichern — der Chip im Training nutzt dieses Ziel.'}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════ Bausteine ════════════════════════ */

function BackupSection({ embedded = false }: { embedded?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await exportWorkoutData();
      downloadJson(backupFilename(), data);
      setMessage('Backup exportiert.');
    } catch {
      setMessage('Export konnte nicht erstellt werden.');
    } finally { setBusy(false); }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const confirmed = window.confirm(
      'Beim Import werden alle Daten im Backup ersetzt: Einträge, Sessions, Fortschritt, Warm-ups, Gewicht, Einstellungen, Vorlagen, aktive Einheit und App-Darstellung.\n\n' +
        'Vorher wird automatisch eine Sicherung des aktuellen Stands gespeichert.\n\n„' +
        file.name +
        '“ jetzt wiederherstellen?',
    );
    if (!confirmed) { event.target.value = ''; return; }
    setBusy(true);
    try {
      // Notfall-Kopie des aktuellen Stands, bevor der Import alles ersetzt.
      try { downloadJson(backupFilename('gym-log-sicherung-vor-import'), await exportWorkoutData()); } catch { /* Sicherung ist optional */ }
      const counts = await importWorkoutData(await file.text());
      setMessage(`Backup wiederhergestellt: ${counts.entries} Einträge, ${counts.sessions} Sessions, ${counts.progressHistory} Progress-Punkte.`);
      if (counts.localDataRestored) window.setTimeout(() => window.location.reload(), 1_000);
    } catch {
      setMessage('Backup ist ungültig oder konnte nicht gelesen werden. Es wurde nichts geändert.');
    } finally { setBusy(false); event.target.value = ''; }
  };

  if (embedded) {
    return (
      <div style={{ display: 'grid', gap: '9px' }}>
        <div className="backup-actions" style={{ margin: 0 }}>
          <button className="primary-button" type="button" onClick={handleExport} disabled={busy}><Download size={16} /> JSON exportieren</button>
          <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={16} /> Backup importieren</button>
          <input ref={inputRef} type="file" accept="application/json,.json" onChange={handleImport} hidden />
        </div>
        {message && <p className="backup-message" role="status">{message}</p>}
      </div>
    );
  }

  return (
    <section className="backup-panel glass-panel" aria-labelledby="base-backup-heading" style={{ marginTop: '34px' }}>
      <div className="backup-icon"><FileJson size={23} /></div>
      <div>
        <h2 id="base-backup-heading">Backup &amp; Restore</h2>
        <p>Das JSON-Backup enthält Einträge, Sessions, Fortschritt, Warm-up-Konfigurationen, Körpergewicht, Einstellungen, eigene Trainingsvorlagen, eine aktive Einheit sowie Theme und Timer-Präferenzen.</p>
      </div>
      <div className="backup-actions">
        <button className="primary-button" type="button" onClick={handleExport} disabled={busy}><Download size={16} /> JSON exportieren</button>
        <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={16} /> Backup importieren</button>
        <input ref={inputRef} type="file" accept="application/json,.json" onChange={handleImport} hidden />
      </div>
      {message && <p className="backup-message" role="status">{message}</p>}
    </section>
  );
}

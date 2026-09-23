import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { Check, ChevronDown, Clock3, Dumbbell, Flame, History, Plus, Save, Trash2, X } from 'lucide-react';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useOverlayFocus } from '../hooks/useOverlayFocus';
import { updateSessionSet } from '../hooks/workoutSessionUtils';
import { searchStaticExercises, type StaticExercise } from '../hooks/useExercises';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ProgressBadge } from './ProgressBadge';
import { useProgressHistory } from '../hooks/useWorkoutSessions';
import { HistorySheet } from './HistorySheet';
import { WarmupSheet } from './WarmupSheet';
import { ConfirmSheet } from './ConfirmSheet';
import { applyWarmupToSessionExercise, todayKey, useTodayWarmupConfig, warmupExerciseKey } from '../hooks/warmup';
import { db } from '../db/db';
import { type Exercise, type SessionExercise } from '../db/schema';

export function WorkoutSessionModal() {
  const { activeSession, updateSession, addExercise, removeExercise, updateExercise, clearWarmup, finishSession, discardSession } = useWorkoutSession();
  const reduced = useReducedMotion();
  const progress = useProgressHistory();
  const [seconds, setSeconds] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  /** Abschlusbeat: 'saving' während des Schreibvorgangs, 'success' zeigt den Save-Moment (~900ms) und schließt dann automatisch. */
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success'>('idle');
  const saveStateRef = useRef(saveState);
  const setSaveStateTracked = (value: 'idle' | 'saving' | 'success') => { saveStateRef.current = value; setSaveState(value); };
  const saveAutoCloseTimerRef = useRef<number | null>(null);
  const saveErrorTimerRef = useRef<number | null>(null);
  // Timer bei Unmount räumen — sonst feuert der Beat noch in den Home-Screen hinein.
  useEffect(() => () => {
    if (saveAutoCloseTimerRef.current !== null) window.clearTimeout(saveAutoCloseTimerRef.current);
    if (saveErrorTimerRef.current !== null) window.clearTimeout(saveErrorTimerRef.current);
  }, []);
  // In-Training-Features: Warm-up-Konfiguration und Verlauf pro Session-Übung.
  const [warmupTargetId, setWarmupTargetId] = useState<string | null>(null);
  const [historyTargetKey, setHistoryTargetKey] = useState<string | null>(null);
  const [historyTargetName, setHistoryTargetName] = useState('');
  /* Verwerfen erst nach Bestätigung — Escape/X löscht nicht unabsichtlich ein laufendes Training. */
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const requestDiscard = () => setDiscardConfirmOpen(true);
  const sessionSheetRef = useOverlayFocus(Boolean(activeSession) && !discardConfirmOpen, requestDiscard);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!activeSession) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.classList.add('overlay-open');
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - activeSession.startedAt) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(interval);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.classList.remove('overlay-open');
    };
  }, [activeSession]);

  const suggestions = useMemo(() => searchStaticExercises(query).slice(0, 8), [query]);
  const formatTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

  const handleFinish = async () => {
    if (!activeSession || saving || saveState === 'success') return;
    setSaving(true);
    setSaveStateTracked('saving');
    try {
      await finishSession();
      // Der Save-Moment lebt im BLEIBENDEN Modal-Portal: activeSession ist jetzt null,
      // aber das Sheet rendert weiter, bis der Beat nach 900ms auto-schließt.
      setSaveStateTracked('success');
      saveAutoCloseTimerRef.current = window.setTimeout(() => {
        setSaveStateTracked('idle');
        setSaving(false);
      }, 900);
    } finally {
      // Fehlerfall (throw): Beat abbrechen, Sheet bleibt offen — die Session ist unverändert.
      saveErrorTimerRef.current = window.setTimeout(() => {
        if (saveStateRef.current === 'saving') {
          setSaveStateTracked('idle');
          setSaving(false);
        }
      }, 0);
    }
  };

  const previousFor = (exerciseId: string) => {
    const entries = progress?.filter((point) => point.exerciseId === exerciseId) ?? [];
    return { current: entries[0], previous: entries[1] };
  };

  const warmupTarget = activeSession?.exercises.find((item) => item.exercise.id === warmupTargetId) ?? null;
  const warmupTargetKey = warmupTarget ? warmupExerciseKey(warmupTarget.exercise) : '';
  const warmupTargetConfig = useTodayWarmupConfig(warmupTargetKey);

  const handleSessionWarmupConfirm = async (maxGewicht: number, dritterSatz: boolean) => {
    if (!warmupTarget) return;
    await applyWarmupToSessionExercise(updateExercise, warmupTarget, warmupTargetKey, maxGewicht, dritterSatz);
  };

  const handleSessionWarmupReset = async () => {
    if (!warmupTarget) return;
    await db.warmupConfigs.delete(`${warmupTargetKey}__${todayKey()}`);
    clearWarmup(warmupTarget.exercise.id);
  };

  const session = activeSession;
  const renderSession = (
    <motion.div className="session-shell" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section ref={sessionSheetRef} tabIndex={-1} className="session-sheet" style={{ outline: 'none' }} initial={reduced ? false : { y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34 }} drag={reduced ? false : 'y'} dragListener={false} dragControls={dragControls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.55 }} onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 550) requestDiscard(); }} aria-label="Aktive Trainingseinheit">
        {/* Griffleiste als Ziehl-Fläche — gleiche Physik wie im BottomSheet (110px / 550px/s) */}
        <div className="sheet-handle-zone" onPointerDown={(event) => dragControls.start(event)} aria-hidden="true"><div className="sheet-handle" /></div>
        {session && (<>
          <header className="session-header">
            <div>
              <span className="eyebrow accent-copy">Live session</span>
              <input className="session-name-input" value={session.name} onChange={(event) => updateSession((current) => ({ ...current, name: event.target.value }))} aria-label="Name der Trainingseinheit" />
              <div className="session-time"><Clock3 size={15} /> <span>{formatTime(seconds)}</span><span className="session-live-dot" aria-label="Training läuft" /></div>
            </div>
            <button className="icon-button" type="button" onClick={requestDiscard} aria-label="Training verwerfen"><X size={20} /></button>
          </header>

          <div className="session-content">
            {session.exercises.length === 0 ? (
              <div className="session-empty glass-panel"><Dumbbell size={25} /><h2>Dein Training wartet.</h2><p>Füge deine erste Übung hinzu und logge jeden Satz live.</p></div>
            ) : (
              <div className="session-exercises">
                {session.exercises.map((item) => (
                  <ExerciseCard key={item.exercise.id} exerciseId={item.exercise.id} item={item} progress={previousFor(item.exercise.id)} reduced={reduced} onRemove={() => removeExercise(item.exercise.id)} onChange={(next) => updateExercise(item.exercise.id, () => next)}
                    onOpenWarmup={() => setWarmupTargetId(item.exercise.id)}
                    onOpenHistory={() => { setHistoryTargetKey(warmupExerciseKey(item.exercise)); setHistoryTargetName(item.exercise.name); }}
                  />
                ))}
              </div>
            )}
            <button className="add-exercise-button" type="button" onClick={() => setShowExercisePicker((value) => !value)}><Plus size={17} /> Übung hinzufügen <ChevronDown size={15} className={showExercisePicker ? 'rotate-icon' : ''} /></button>
          <AnimatePresence>{showExercisePicker && <ExercisePicker query={query} setQuery={setQuery} suggestions={suggestions} onSelect={async (exercise) => { await addExercise(exercise); setQuery(''); setShowExercisePicker(false); }} />}</AnimatePresence>
          </div>

          <footer className="session-footer"><button className="primary-button session-finish-button" type="button" onClick={handleFinish} disabled={saving || session.exercises.length === 0}><Save size={17} /> {saving ? 'Speichert…' : 'Training beenden & speichern'}</button></footer>
        </>)}

      </motion.section>
    </motion.div>
  );

  // Portal an document.body: Das app-shell ist position:fixed und spannt damit einen
  // eigenen Stacking Context auf — innere z-Index-Werte würden gegen den Dock (body-Level) verloren.
  return createPortal(
    <>
    <AnimatePresence>
      {activeSession ? renderSession : null}
    </AnimatePresence>

    {/* Save-Moment als eigenes Portal ÜBER der App: Das Session-Sheet exitet parallel
        normal, während der Beat (Häkchen + „Gespeichert.“ + Glow) frei darüber steht.
        Kein Backdrop, pointer-events none — der Moment blockiert nichts. */}
    <AnimatePresence>
      {saveState === 'success' && (
        <motion.div className="session-save-beat" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0, scale: 1.05 }} transition={{ duration: reduced ? 0 : 0.18, ease: 'easeOut' }}>
          <motion.div style={{ display: 'grid', justifyItems: 'center' }} initial={reduced ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 24 }}>
            <div className={`session-save-check${reduced ? '' : ' is-pulsing'}`}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <motion.path d="M10 21.5L17.5 29L30.5 13.5" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={reduced ? { duration: 0 } : { duration: 0.3, ease: 'easeOut', delay: 0.12 }} />
              </svg>
            </div>
            <motion.p className="session-save-label" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={reduced ? { duration: 0 } : { delay: 0.26, duration: 0.18, ease: 'easeOut' }}>Gespeichert.</motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* In-Training: Warm-up pro Übung konfigurieren (Sätze landen live in der Session) */}
    <WarmupSheet
      isOpen={warmupTarget !== null}
      onClose={() => setWarmupTargetId(null)}
      exerciseName={warmupTarget?.exercise.name ?? ''}
      currentConfig={warmupTarget ? warmupTargetConfig : undefined}
      onConfirm={handleSessionWarmupConfirm}
      onReset={handleSessionWarmupReset}
    />

    {/* In-Training: Verlauf einer Übung */}
    <HistorySheet
      isOpen={historyTargetKey !== null}
      onClose={() => setHistoryTargetKey(null)}
      machineId={historyTargetKey ?? ''}
      exerciseName={historyTargetName}
    />

    {/* Verwerfen bestätigen — ein laufendes Training geht sonst unwiderruflich verloren */}
    <ConfirmSheet
      isOpen={discardConfirmOpen}
      onClose={() => setDiscardConfirmOpen(false)}
      onConfirm={() => { setDiscardConfirmOpen(false); discardSession(); }}
      title="Training verwerfen?"
      message="Alle Sätze dieser Einheit gehen verloren. Die Aktion kann nicht rückgängig gemacht werden."
      confirmLabel="Verwerfen"
    />
    </>,
    document.body,
  );
}

function ExercisePicker({ query, setQuery, suggestions, onSelect }: { query: string; setQuery: (value: string) => void; suggestions: StaticExercise[]; onSelect: (exercise: Exercise) => void }) {
  return <motion.div className="exercise-picker glass-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Übung suchen…" autoFocus aria-label="Übung suchen" /><div className="exercise-suggestions">{suggestions.map((exercise) => <button key={exercise.id} type="button" onClick={() => onSelect({ id: exercise.id, name: exercise.name, equipment: exercise.equipment ?? undefined, target: exercise.target ?? undefined })}><span>{exercise.name}</span><small>{exercise.target ?? exercise.equipment ?? 'Übung'}</small></button>)}</div></motion.div>;
}

function ExerciseCard({ exerciseId, item, progress, reduced, onRemove, onChange, onOpenWarmup, onOpenHistory }: { exerciseId: string; item: SessionExercise; progress: { current?: import('../db/schema').ProgressHistory; previous?: import('../db/schema').ProgressHistory }; reduced: boolean; onRemove: () => void; onChange: (item: SessionExercise) => void; onOpenWarmup: () => void; onOpenHistory: () => void }) {
  /** Inkrement-Key für den Häkchen-Pop: zählt jeden Abhak-Vorgang, damit das Keyframe auch bei erneutem Abhaken derselben Zeile neu feuert. */
  const [checkPopKey, setCheckPopKey] = useState(0);
  const cardRef = useRef<HTMLElement | null>(null);
  // Frisch hinzugefügte Übung sanft in den Viewport bringen, damit der Eintritts-Übergang auch sichtbar ist.
  useEffect(() => {
    if (item.sets.length > 0) return;
    cardRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }, [exerciseId, reduced, item.sets.length]);
  const completed = item.sets.filter((set) => set.completed).length;
  const warmupSets = item.sets.filter((set) => set.warmup);
  const workSets = item.sets.filter((set) => !set.warmup);
  const warmupConfig = useTodayWarmupConfig(warmupExerciseKey(item.exercise));
  const renderSet = (set: import('../db/schema').SessionSet, isWarmup: boolean) => <div className={`session-set-row${set.completed ? ' is-complete' : ''}${isWarmup ? ' is-warmup' : ''}`} key={set.id}><span className="set-number">{set.setNumber}</span><input type="number" inputMode="decimal" min="0" step="2.5" value={set.gewicht} onChange={(event) => onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { gewicht: Number(event.target.value) || 0 }) : candidate) })} aria-label={`Satz ${set.setNumber} Gewicht`} /><input type="number" inputMode="numeric" min="0" step="1" value={set.wiederholungen} onChange={(event) => onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { wiederholungen: Number(event.target.value) || 0 }) : candidate) })} aria-label={`Satz ${set.setNumber} Wiederholungen`} /><button className="set-check" type="button" aria-label={`Satz ${set.setNumber} ${set.completed ? 'offen' : 'abhaken'}`} aria-pressed={set.completed} onClick={() => { setCheckPopKey((key) => key + 1); onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { completed: !candidate.completed, timestamp: Date.now() }) : candidate) }); }}><Check size={16} key={set.completed ? `done-${checkPopKey}` : 'open'} /></button></div>;
  return <motion.article ref={cardRef} className="workout-exercise-card glass-panel" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -8 }} transition={reduced ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}>
    <div className="exercise-card-header"><div><span className="eyebrow">{item.exercise.target ?? 'Exercise'}</span><h2>{item.exercise.name}</h2></div>
      <div className="exercise-card-actions">
        <button className={`icon-button subtle exercise-action-warmup${warmupConfig || warmupSets.length > 0 ? ' is-active' : ''}`} type="button" aria-label={`Warm-up für ${item.exercise.name} ${warmupConfig ? 'ändern' : 'einrichten'}`} onClick={onOpenWarmup}><Flame size={16} /></button>
        <button className="icon-button subtle" type="button" aria-label={`Verlauf von ${item.exercise.name} anzeigen`} onClick={onOpenHistory}><History size={16} /></button>
        <button className="icon-button subtle" type="button" aria-label={`${item.exercise.name} entfernen`} onClick={onRemove}><Trash2 size={16} /></button>
      </div></div>
    <ProgressBadge current={progress.current} previous={progress.previous} />
    <div className="set-table">
      {warmupSets.length > 0 && (
        <div className="warmup-block">
          <div className="warmup-block-label"><Flame size={12} /> Warm-up · Ziel-Reps je Satz</div>
          {warmupSets.map((set) => (
            <div key={set.id} className={`warmup-set-row${set.completed ? ' is-complete' : ''}`}>
              <span className="warmup-set-info">
                <span className="warmup-set-name">{set.warmupLabel ?? 'Warm-up'}</span>
                <span className="warmup-set-target">{set.zielRepsMin}–{set.zielRepsMax} Reps</span>
              </span>
              <span className="warmup-set-weight">{set.gewicht.toLocaleString('de-DE')} kg</span>
              <button className="set-check" type="button" aria-label={`${set.warmupLabel ?? 'Warm-up-Satz'} ${set.completed ? 'offen' : 'abhaken'}`} aria-pressed={set.completed} onClick={() => onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { completed: !candidate.completed, timestamp: Date.now() }) : candidate) })}><Check size={15} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="set-table-head"><span>Satz</span><span>Gewicht</span><span>Reps</span><span>Done</span></div>
      {workSets.map((set) => renderSet(set, false))}
    </div>
    <button className="add-set-button" type="button" onClick={() => onChange({ ...item, sets: [...item.sets, { id: crypto.randomUUID(), setNumber: item.sets.length + 1, gewicht: item.previous?.maxGewicht ?? 20, wiederholungen: item.previous?.bestReps ?? 8, completed: false }] })}><Plus size={14} /> Satz ergänzen <span>{completed}/{item.sets.length}</span></button>
  </motion.article>;
}

export function StartWorkoutButton() {
  const { activeSession, startSession } = useWorkoutSession();
  return <button className="primary-button start-workout-button" type="button" onClick={startSession} disabled={Boolean(activeSession)}><Dumbbell size={17} /> {activeSession ? 'Training läuft' : 'Training starten'}</button>;
}

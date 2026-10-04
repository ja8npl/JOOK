import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { Check, ChevronDown, Clock3, Dumbbell, Flame, GripVertical, History, Plus, Save, Target, Trash2, X } from 'lucide-react';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useOverlayFocus } from '../hooks/useOverlayFocus';
import { DISCARD_MOTIVATION_THRESHOLD, sessionSetCounts, updateSessionSet, withoutSessionSet } from '../hooks/workoutSessionUtils';
import { inputToNumber, isValidInputValue, numberToInputValue, stripLeadingZeros } from '../lib/numbers';
import { searchStaticExercises, type StaticExercise } from '../hooks/useExercises';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ProgressBadge } from './ProgressBadge';
import { ProgressionChip } from './ProgressionChip';
import { RirPicker } from './RirPicker';
import { useProgressHistory } from '../hooks/useWorkoutSessions';
import { useLastFirstSetForMachine } from '../hooks/useSets';
import { HistorySheet } from './HistorySheet';
import { WarmupSheet } from './WarmupSheet';
import { ConfirmSheet } from './ConfirmSheet';
import { RepTargetSheet } from './RepTargetSheet';
import { RestTimerBar } from './RestTimerBar';
import { clearExerciseRepTarget, setExerciseRepTarget, useExerciseRepTarget, useGlobalRepTarget, useHasExerciseRepTarget } from '../hooks/useRepTargets';
import { clearExerciseRestTarget, setExerciseRestTarget, useExerciseRestTarget, useHasExerciseRestTarget } from '../hooks/useRestTargets';
import { readRestDuration, readGrainEdges, PREFS_EVENT } from '../hooks/useBasePrefs';
import { formatRepRange, type RepTargetRange } from '../lib/progression';
import { resolveRestSeconds } from '../lib/rest';
import { DEFAULT_REP_TARGET } from '../db/schema';
import { applyWarmupToSessionExercise, todayKey, useTodayWarmupConfig, warmupExerciseKey } from '../hooks/warmup';
import { db } from '../db/db';
import { type Exercise, type SessionExercise } from '../db/schema';

export function WorkoutSessionModal() {
  const { activeSession, updateSession, addExercise, removeExercise, updateExercise, reorderExercise, clearWarmup, finishSession, discardSession } = useWorkoutSession();
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
  /* Verwerfen erst nach Bestätigung — Escape/X löscht nicht unabsichtlich ein laufendes Training.
     Fortschritt und Fakten (Zeit/Übungen/Sätze) werden beim Öffnen eingefroren, damit das
     Sheet nicht „springt“, während es offen ist. */
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [discardProgress, setDiscardProgress] = useState<{ completed: number; planned: number } | null>(null);
  const [discardFacts, setDiscardFacts] = useState<{ seconds: number; exercises: number; completed: number; planned: number } | null>(null);
  /* Rep-Ziel-Editor: Beim Öffnen eingefroren (machineId, Name, aktueller Wert), damit das
     Sheet nicht springt, während Live-Queries nachladen. */
  const [repTargetFor, setRepTargetFor] = useState<{ machineId: string; name: string; initial: RepTargetRange; restSeconds: number; globalRestSeconds: number } | null>(null);
  const globalRepTarget = useGlobalRepTarget();
  const repOverrideActive = useHasExerciseRepTarget(repTargetFor?.machineId ?? '');
  const restOverrideActive = useHasExerciseRestTarget(repTargetFor?.machineId ?? '');
  const repTargetOverrideActive = repOverrideActive || restOverrideActive;
  /* Pausen-Timer: Wall-Clock-Deadline (Date.now-Basis) statt Zähler — läuft damit
     korrekt weiter, wenn iOS die App im Hintergrund einschläft (Backlog #2). */
  const [rest, setRest] = useState<{ machineKey: string; name: string; duration: number; deadline: number } | null>(null);
  /* Körnung an den Auflösungs-Kanten — Schalter in Base; Live-Update über das Prefs-Event. */
  const [grainEdges, setGrainEdges] = useState(readGrainEdges);
  useEffect(() => {
    const sync = () => setGrainEdges(readGrainEdges());
    window.addEventListener(PREFS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PREFS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  /* Kanten-Streifen nur sichtbar, wenn Content durch die jeweilige Kante läuft —
     element-scoped Scroll-Handler mit Threshold-Flip (kein window-Listener, kein Frame-Work). */
  const [edgeVis, setEdgeVis] = useState({ top: false, bottom: true });
  const syncEdges = (el: HTMLElement) => {
    const top = el.scrollTop > 8;
    const bottom = el.scrollTop < el.scrollHeight - el.clientHeight - 8;
    setEdgeVis((current) => (current.top === top && current.bottom === bottom ? current : { top, bottom }));
  };
  useEffect(() => {
    if (!activeSession) return;
    // Messung nach Layout (rAF), nicht synchron im Effekt
    const raf = requestAnimationFrame(() => {
      const content = document.querySelector('.session-content');
      if (content) syncEdges(content as HTMLElement);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeSession]);
  const requestDiscard = () => {
    if (!activeSession) return;
    const counts = sessionSetCounts(activeSession.exercises);
    setDiscardProgress(counts.planned > 0 && counts.completed / counts.planned >= DISCARD_MOTIVATION_THRESHOLD ? counts : null);
    setDiscardFacts({ seconds, exercises: activeSession.exercises.length, ...counts });
    setDiscardConfirmOpen(true);
  };
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

  /* --- Übungen umsortieren per Pointer-Events (gleiche Physik wie im Plan-Import) --- */
  const [draggingExerciseId, setDraggingExerciseId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragExerciseRef = useRef<string | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const exerciseListRef = useRef<HTMLDivElement | null>(null);

  const startExerciseDrag = (exerciseId: string) => (event: React.PointerEvent) => {
    event.preventDefault();
    dragExerciseRef.current = exerciseId;
    dropIndexRef.current = null;
    setDraggingExerciseId(exerciseId);
    setDropIndex(null);
  };

  const handleExerciseListPointerMove = (event: React.PointerEvent) => {
    const dragId = dragExerciseRef.current;
    if (!dragId) return;
    const container = exerciseListRef.current;
    if (!container) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-exercise-key]'));
    const keys = cards.map((card) => card.dataset.exerciseKey);
    const fromIndex = keys.indexOf(dragId);
    if (fromIndex === -1) return;

    let targetIndex = cards.length - 1;
    for (let index = 0; index < cards.length; index += 1) {
      const rect = cards[index].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        targetIndex = index;
        break;
      }
    }
    if (targetIndex === fromIndex) {
      dropIndexRef.current = null;
      setDropIndex(null);
      return;
    }
    // Einfügeindex im Raum "ohne gezogene Karte"
    const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    dropIndexRef.current = insertIndex;
    setDropIndex(insertIndex);
  };

  const endExerciseDrag = () => {
    const dragId = dragExerciseRef.current;
    const insertIndex = dropIndexRef.current;
    dragExerciseRef.current = null;
    dropIndexRef.current = null;
    setDraggingExerciseId(null);
    setDropIndex(null);
    if (!dragId || insertIndex === null) return;
    reorderExercise(dragId, insertIndex);
  };

  const session = activeSession;
  const renderSession = (
    <motion.div className="session-shell" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section ref={sessionSheetRef} tabIndex={-1} className={`session-sheet${grainEdges ? ' grain-edges' : ''}`} style={{ outline: 'none' }} initial={reduced ? false : { y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34 }} drag={reduced ? false : 'y'} dragListener={false} dragControls={dragControls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.55 }} onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 550) requestDiscard(); }} aria-label="Aktive Trainingseinheit">
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

          {/* Auflösungs-Rahmen: Content löst sich an Ober-/Unterkante auf (Mask-Fade + Blur),
              die Kanten-Streifen tragen optional die bewegte Körnung (Schalter in Base). */}
          <div className="session-content-frame">
            <div className="session-content" onScroll={(event) => syncEdges(event.currentTarget)}>
            {session.exercises.length === 0 ? (
              <div className="session-empty glass-panel"><Dumbbell size={25} /><h2>Dein Training wartet.</h2><p>Füge deine erste Übung hinzu und logge jeden Satz live.</p></div>
            ) : (
              <div
                className="session-exercises"
                ref={exerciseListRef}
                onPointerMove={handleExerciseListPointerMove}
                onPointerUp={endExerciseDrag}
                onPointerCancel={endExerciseDrag}
                onPointerLeave={endExerciseDrag}
              >
                {session.exercises.map((item, index) => (
                  <div
                    key={item.exercise.id}
                    data-exercise-key={item.exercise.id}
                    className={`session-exercise-slot${draggingExerciseId === item.exercise.id ? ' is-dragging' : ''}${dropIndex === index ? ' is-drop-target' : ''}`}
                  >
                    <ExerciseCard exerciseId={item.exercise.id} item={item} progress={previousFor(item.exercise.id)} reduced={reduced} onRemove={() => removeExercise(item.exercise.id)} onChange={(next) => updateExercise(item.exercise.id, () => next)}
                      onOpenWarmup={() => setWarmupTargetId(item.exercise.id)}
                      onOpenHistory={() => { setHistoryTargetKey(warmupExerciseKey(item.exercise)); setHistoryTargetName(item.exercise.name); }}
                      onOpenRepTarget={(range, restSeconds) => setRepTargetFor({ machineId: warmupExerciseKey(item.exercise), name: item.exercise.name, initial: range, restSeconds, globalRestSeconds: readRestDuration() })}
                      onRestStart={(seconds) => setRest({ machineKey: warmupExerciseKey(item.exercise), name: item.exercise.name, duration: seconds, deadline: Date.now() + seconds * 1000 })}
                      onDragStart={startExerciseDrag(item.exercise.id)}
                    />
                  </div>
                ))}
              </div>
            )}
            <button className="add-exercise-button" type="button" onClick={() => setShowExercisePicker((value) => !value)}><Plus size={17} /> Übung hinzufügen <ChevronDown size={15} className={showExercisePicker ? 'rotate-icon' : ''} /></button>
          <AnimatePresence>{showExercisePicker && <ExercisePicker query={query} setQuery={setQuery} suggestions={suggestions} onSelect={async (exercise) => { await addExercise(exercise); setQuery(''); setShowExercisePicker(false); }} />}</AnimatePresence>
          </div>
          {/* Auflösungs-Kanten (Blur) immer da; die Körnung schaltet die grain-edges-Klasse. */}
          <div className={`session-edge session-edge-top${edgeVis.top ? ' is-visible' : ''}`} aria-hidden="true" />
          <div className={`session-edge session-edge-bottom${edgeVis.bottom ? ' is-visible' : ''}`} aria-hidden="true" />
          </div>

          {/* Pausen-Leiste: dockt über dem Footer, startet automatisch beim Abhaken. */}
          <AnimatePresence>
            {rest && (
              <RestTimerBar
                deadline={rest.deadline}
                duration={rest.duration}
                label={`${rest.name} · nächster Satz`}
                onSkip={() => setRest(null)}
                onAdjust={(delta) => setRest((current) => current ? { ...current, duration: Math.max(15, current.duration + delta), deadline: current.deadline + delta * 1000 } : current)}
              />
            )}
          </AnimatePresence>

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
            {/* Signature-Moment: Check landet (Spring) → Schallwelle expandiert →
                „Gespeichert.“ blurt ein. Drei Layer nach motion-design: Primary =
                Check, Secondary = Ripple, Tertiär = Wortmarke. Alles transform/
                opacity/filter, binnen 900ms Auto-Close. */}
            <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              {!reduced && (
                <motion.span
                  className="session-save-ripple"
                  aria-hidden="true"
                  initial={{ scale: 0.85, opacity: 0.55 }}
                  animate={{ scale: 1.65, opacity: 0 }}
                  transition={{ duration: 0.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <div className={`session-save-check${reduced ? '' : ' is-pulsing'}`}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  <motion.path d="M10 21.5L17.5 29L30.5 13.5" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={reduced ? { duration: 0 } : { duration: 0.3, ease: 'easeOut', delay: 0.12 }} />
                </svg>
              </div>
            </div>
            <motion.p className="session-save-label" initial={reduced ? false : { opacity: 0, y: 8, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={reduced ? { duration: 0 } : { delay: 0.34, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>Gespeichert.</motion.p>
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

    {/* Rep-Ziel & Pause — eigene Overrides pro Übung, sonst gelten die globalen Werte. */}
    <RepTargetSheet
      isOpen={repTargetFor !== null}
      onClose={() => setRepTargetFor(null)}
      mode="exercise"
      exerciseName={repTargetFor?.name}
      initial={repTargetFor?.initial ?? DEFAULT_REP_TARGET}
      initialRest={repTargetFor?.restSeconds ?? resolveRestSeconds(undefined, readRestDuration())}
      globalTarget={globalRepTarget}
      globalRestSeconds={repTargetFor?.globalRestSeconds}
      hasOverride={repTargetOverrideActive}
      onSave={async (range, restSeconds) => {
        const machineId = repTargetFor?.machineId ?? '';
        await Promise.all([setExerciseRepTarget(machineId, range), setExerciseRestTarget(machineId, restSeconds)]);
      }}
      onReset={async () => {
        const machineId = repTargetFor?.machineId ?? '';
        await Promise.all([clearExerciseRepTarget(machineId), clearExerciseRestTarget(machineId)]);
      }}
    />

    {/* Verwerfen bestätigen — ein laufendes Training geht sonst unwiderruflich verloren.
        ≥ DISCARD_MOTIVATION_THRESHOLD erledigter Arbeitssätze: motivierende Variante mit Ring. */}
    <ConfirmSheet
      isOpen={discardConfirmOpen}
      onClose={() => setDiscardConfirmOpen(false)}
      onConfirm={() => { setDiscardConfirmOpen(false); discardSession(); }}
      title="Training verwerfen?"
      message="Alle Sätze dieser Einheit gehen verloren. Die Aktion kann nicht rückgängig gemacht werden."
      confirmLabel="Verwerfen"
      cancelLabel="Weiter trainieren"
      details={discardFacts ? [
        { label: 'Zeit', value: formatTime(discardFacts.seconds) },
        { label: 'Übungen', value: String(discardFacts.exercises) },
        ...(discardFacts.planned > 0
          ? [{ label: 'Sätze', value: `${discardFacts.completed}/${discardFacts.planned}` }]
          : []),
      ] : undefined}
      progress={discardProgress}
    />
    </>,
    document.body,
  );
}

function ExercisePicker({ query, setQuery, suggestions, onSelect }: { query: string; setQuery: (value: string) => void; suggestions: StaticExercise[]; onSelect: (exercise: Exercise) => void }) {
  return <motion.div className="exercise-picker glass-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Übung suchen…" autoFocus aria-label="Übung suchen" /><div className="exercise-suggestions">{suggestions.map((exercise) => <button key={exercise.id} type="button" onClick={() => onSelect({ id: exercise.id, name: exercise.name, equipment: exercise.equipment ?? undefined, target: exercise.target ?? undefined })}><span>{exercise.name}</span><small>{exercise.target ?? exercise.equipment ?? 'Übung'}</small></button>)}</div></motion.div>;
}

/** Draft-Key der Zahlen-Inputs eines Satzes (Warm-up- und Arbeitssätze gleichermaßen). */
const inputDraftKey = (field: 'gewicht' | 'wiederholungen', setId: string) => `${field}-${setId}`;

function ExerciseCard({ exerciseId, item, progress, reduced, onRemove, onChange, onOpenWarmup, onOpenHistory, onOpenRepTarget, onRestStart, onDragStart }: { exerciseId: string; item: SessionExercise; progress: { current?: import('../db/schema').ProgressHistory; previous?: import('../db/schema').ProgressHistory }; reduced: boolean; onRemove: () => void; onChange: (item: SessionExercise) => void; onOpenWarmup: () => void; onOpenHistory: () => void; onOpenRepTarget: (range: RepTargetRange, restSeconds: number) => void; onRestStart: (seconds: number) => void; onDragStart: (event: React.PointerEvent) => void }) {
  /** Inkrement-Key für den Häkchen-Pop: zählt jeden Abhak-Vorgang, damit das Keyframe auch bei erneutem Abhaken derselben Zeile neu feuert. */
  const [checkPopKey, setCheckPopKey] = useState(0);
  /** Tipp-Zwischenstände der Zahlen-Inputs („0.“, „12,“, „0“) — pro Feld+Satz-ID, damit 0 nur als Placeholder wirkt. */
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
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
  /** Steigerungs-Signal: erster Satz des letzten Eintrags dieser Übung (per Name-Key). */
  const firstSetOfPrevious = useLastFirstSetForMachine(warmupExerciseKey(item.exercise));
  /* Effektives Rep-Ziel: eigener Override → Ziel aus importiertem Plan → globales Ziel.
     undefined nur, wenn gar nichts gesetzt ist (Chip bleibt neutral wie bisher). */
  const ownRepTarget = useExerciseRepTarget(warmupExerciseKey(item.exercise));
  const globalRepTargetForCard = useGlobalRepTarget();
  const planRepTarget = item.exercise.wiederholungen ? { min: item.exercise.wiederholungen, max: item.exercise.wiederholungen } : undefined;
  const repTarget = ownRepTarget ?? planRepTarget ?? globalRepTargetForCard;
  /* Effektive Pausenzeit: eigener Override → globale Standard-Pause (Base) → 90 s.
     Frisch zum Zeitpunkt des Abhakens gelesen — Base-Änderungen gelten sofort. */
  const restOverride = useExerciseRestTarget(warmupExerciseKey(item.exercise));
  const isWarmupOnly = warmupSets.length > 0 && workSets.length === 0;
  const renderSet = (set: import('../db/schema').SessionSet, isWarmup: boolean) => (
    <div className={`session-set-row${set.completed ? ' is-complete' : ''}${isWarmup ? ' is-warmup' : ''}`} key={set.id}>
      <span className="set-number">{set.setNumber}</span>
      {/* Gewicht: Draft-String statt value={number} — 0 nur als Placeholder, erster Tastendruck ersetzt direkt (kein „060“). */}
      <input
        type="text"
        inputMode="decimal"
        value={inputDrafts[inputDraftKey('gewicht', set.id)] ?? numberToInputValue(set.gewicht)}
        placeholder="0"
        onChange={(event) => {
          const raw = stripLeadingZeros(event.target.value);
          if (!isValidInputValue(raw)) {
            // Paste von Text: DOM direkt zurücksetzen — ohne State-Änderung rendert React nicht neu.
            event.target.value = inputDrafts[inputDraftKey('gewicht', set.id)] ?? numberToInputValue(set.gewicht);
            return;
          }
          setInputDrafts((current) => ({ ...current, [inputDraftKey('gewicht', set.id)]: raw }));
          onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { gewicht: inputToNumber(raw) }) : candidate) });
        }}
        onFocus={(event) => event.target.select()}
        onBlur={() => {
          const key = inputDraftKey('gewicht', set.id);
          const raw = inputDrafts[key] ?? numberToInputValue(set.gewicht);
          setInputDrafts((current) => {
            if (!(key in current)) return current;
            const nextDrafts = { ...current };
            delete nextDrafts[key];
            return nextDrafts;
          });
          const next = inputToNumber(raw);
          if (set.gewicht !== next) onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { gewicht: next }) : candidate) });
        }}
        aria-label={`Satz ${set.setNumber} Gewicht`}
      />
      {/* Wiederholungen: Ganzzahl, führende Nullen sofort strippen. */}
      <input
        type="text"
        inputMode="numeric"
        value={inputDrafts[inputDraftKey('wiederholungen', set.id)] ?? numberToInputValue(set.wiederholungen)}
        placeholder={repTarget ? formatRepRange(repTarget) : '0'}
        onChange={(event) => {
          const raw = stripLeadingZeros(event.target.value.replace(/\D/g, ''));
          setInputDrafts((current) => ({ ...current, [inputDraftKey('wiederholungen', set.id)]: raw }));
          onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { wiederholungen: inputToNumber(raw) }) : candidate) });
        }}
        onFocus={(event) => event.target.select()}
        onBlur={() => {
          const key = inputDraftKey('wiederholungen', set.id);
          const raw = inputDrafts[key] ?? numberToInputValue(set.wiederholungen);
          setInputDrafts((current) => {
            if (!(key in current)) return current;
            const nextDrafts = { ...current };
            delete nextDrafts[key];
            return nextDrafts;
          });
          const next = inputToNumber(raw);
          if (set.wiederholungen !== next) onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { wiederholungen: next }) : candidate) });
        }}
        aria-label={`Satz ${set.setNumber} Wiederholungen`}
      />
      <RirPicker value={set.rir} setLabel={`Satz ${set.setNumber}`} onChange={(rir) => onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { rir }) : candidate) })} />
      <button className="session-set-remove" type="button" aria-label={`Satz ${set.setNumber} löschen`} onClick={() => onChange(withoutSessionSet(item, set.id))}><X size={14} /></button>
      <button className="set-check" type="button" aria-label={`Satz ${set.setNumber} ${set.completed ? 'offen' : 'abhaken'}`} aria-pressed={set.completed} onClick={() => { setCheckPopKey((key) => key + 1); if (!set.completed) onRestStart(resolveRestSeconds(restOverride, readRestDuration())); onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { completed: !candidate.completed, timestamp: Date.now() }) : candidate) }); }}><Check size={16} key={set.completed ? `done-${checkPopKey}` : 'open'} /></button>
    </div>
  );
  return <motion.article ref={cardRef} className="workout-exercise-card glass-panel" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -8 }} transition={reduced ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}>
    <div className="exercise-card-header">
      <button className="session-drag-handle" type="button" aria-label={`${item.exercise.name} verschieben`} onPointerDown={onDragStart}><GripVertical size={15} /></button>
      <div><span className="eyebrow">{item.exercise.target ?? 'Exercise'}</span><h2>{item.exercise.name}</h2></div>
      <div className="exercise-card-actions">
        <button className={`icon-button subtle exercise-action-target${ownRepTarget || restOverride !== undefined ? ' is-active' : ''}`} type="button" aria-label={`Rep-Ziel & Pause für ${item.exercise.name} ${ownRepTarget || restOverride !== undefined ? 'ändern (eigene Werte aktiv)' : 'festlegen'}`} onClick={() => onOpenRepTarget(repTarget ?? DEFAULT_REP_TARGET, resolveRestSeconds(restOverride, readRestDuration()))}><Target size={16} /></button>
        <button className={`icon-button subtle exercise-action-warmup${warmupConfig || warmupSets.length > 0 ? ' is-active' : ''}`} type="button" aria-label={`Warm-up für ${item.exercise.name} ${warmupConfig ? 'ändern' : 'einrichten'}`} onClick={onOpenWarmup}><Flame size={16} /></button>
        <button className="icon-button subtle" type="button" aria-label={`Verlauf von ${item.exercise.name} anzeigen`} onClick={onOpenHistory}><History size={16} /></button>
        <button className="icon-button subtle" type="button" aria-label={`${item.exercise.name} entfernen`} onClick={onRemove}><Trash2 size={16} /></button>
      </div></div>
    <ProgressBadge current={progress.current} previous={progress.previous} />
    <div className="set-table">
      {!isWarmupOnly && (
        <ProgressionChip
          last={firstSetOfPrevious}
          zielBereich={repTarget}
          settled={workSets.some((set) => set.completed)}
        />
      )}
      {warmupSets.length > 0 && (
        <div className="warmup-block">          <div className="warmup-block-label"><Flame size={12} /> Warm-up · Ziel-Reps je Satz</div>          {warmupSets.map((set) => (            <div key={set.id} className={`warmup-set-row${set.completed ? ' is-complete' : ''}`}>              <span className="warmup-set-info">                <span className="warmup-set-name">{set.warmupLabel ?? 'Warm-up'}</span>                <span className="warmup-set-target">{set.zielRepsMin}–{set.zielRepsMax} Reps</span>              </span>              <input                type="text"                inputMode="decimal"                value={inputDrafts[inputDraftKey('gewicht', set.id)] ?? numberToInputValue(set.gewicht)}                placeholder="0"                onChange={(event) => {                  const raw = stripLeadingZeros(event.target.value);                  if (!isValidInputValue(raw)) {                    event.target.value = inputDrafts[inputDraftKey('gewicht', set.id)] ?? numberToInputValue(set.gewicht);                    return;                  }                  setInputDrafts((current) => ({ ...current, [inputDraftKey('gewicht', set.id)]: raw }));                  onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { gewicht: inputToNumber(raw) }) : candidate) });                }}                onFocus={(event) => event.target.select()}                onBlur={() => {                  const key = inputDraftKey('gewicht', set.id);                  const raw = inputDrafts[key] ?? numberToInputValue(set.gewicht);                  setInputDrafts((current) => {                    if (!(key in current)) return current;                    const nextDrafts = { ...current };                    delete nextDrafts[key];                    return nextDrafts;                  });                  const next = inputToNumber(raw);                  if (set.gewicht !== next) onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { gewicht: next }) : candidate) });                }}                aria-label={`Warm-up ${set.warmupLabel ?? set.setNumber} Gewicht`}                style={{                  textAlign: 'center',                  fontFamily: 'var(--font-display)',                  fontWeight: 700,                  fontSize: '16px',                  fontVariantNumeric: 'tabular-nums',                  background: 'var(--bg-input)',                  boxShadow: 'var(--neo-pressed)',                  borderRadius: 'var(--radius-input)',                  padding: '8px 12px',                  width: '80px', /* fix: globales input{width:100%} pustet das Feld in der auto-Spalte auf und quetscht das Label */                }}              />              <button className="set-check" type="button" aria-label={`${set.warmupLabel ?? 'Warm-up-Satz'} ${set.completed ? 'offen' : 'abhaken'}`} aria-pressed={set.completed} onClick={() => onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { completed: !candidate.completed, timestamp: Date.now() }) : candidate) })}><Check size={15} /></button>            </div>          ))}        </div>      )}
      <div className="set-table-head"><span>Satz</span><span>Gewicht</span><span>{repTarget ? `Reps · ${formatRepRange(repTarget)}` : 'Reps'}</span><span>RIR</span><span>Done</span><span aria-hidden="true" /></div>
      {workSets.map((set) => renderSet(set, false))}
    </div>
    <button className="add-set-button" type="button" onClick={() => onChange({ ...item, sets: [...item.sets, { id: crypto.randomUUID(), setNumber: item.sets.length + 1, gewicht: item.previous?.maxGewicht ?? 20, wiederholungen: item.previous?.bestReps ?? 8, completed: false }] })}><Plus size={14} /> Satz ergänzen <span>{completed}/{item.sets.length}</span></button>
  </motion.article>;
}

export function StartWorkoutButton() {
  const { activeSession, startSession } = useWorkoutSession();
  return <button className="primary-button start-workout-button" type="button" onClick={startSession} disabled={Boolean(activeSession)}><Dumbbell size={17} /> {activeSession ? 'Training läuft' : 'Training starten'}</button>;
}

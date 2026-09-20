import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Clock3, Dumbbell, Plus, Save, Trash2, X } from 'lucide-react';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { updateSessionSet } from '../hooks/workoutSessionUtils';
import { searchStaticExercises, type StaticExercise } from '../hooks/useExercises';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ProgressBadge } from './ProgressBadge';
import { useProgressHistory } from '../hooks/useWorkoutSessions';
import { type Exercise, type SessionExercise } from '../db/schema';

export function WorkoutSessionModal() {
  const { activeSession, updateSession, addExercise, removeExercise, updateExercise, finishSession, discardSession } = useWorkoutSession();
  const reduced = useReducedMotion();
  const progress = useProgressHistory();
  const [seconds, setSeconds] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (!activeSession || saving) return;
    setSaving(true);
    try { await finishSession(); } finally { setSaving(false); }
  };

  const previousFor = (exerciseId: string) => {
    const entries = progress?.filter((point) => point.exerciseId === exerciseId) ?? [];
    return { current: entries[0], previous: entries[1] };
  };

  return (
    <AnimatePresence>
      {!activeSession ? null : (
        <motion.div className="session-shell" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section className="session-sheet" initial={reduced ? false : { y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34 }} aria-label="Aktive Trainingseinheit">
            <div className="sheet-handle" aria-hidden="true" />
            <header className="session-header">
              <div>
                <span className="eyebrow accent-copy">Live session</span>
                <input className="session-name-input" value={activeSession.name} onChange={(event) => updateSession((session) => ({ ...session, name: event.target.value }))} aria-label="Name der Trainingseinheit" />
                <div className="session-time"><Clock3 size={15} /> <span>{formatTime(seconds)}</span><span className="session-live-dot" aria-label="Training läuft" /></div>
              </div>
              <button className="icon-button" type="button" onClick={discardSession} aria-label="Training verwerfen"><X size={20} /></button>
            </header>

            <div className="session-content">
              {activeSession.exercises.length === 0 ? (
                <div className="session-empty glass-panel"><Dumbbell size={25} /><h2>Dein Training wartet.</h2><p>Füge deine erste Übung hinzu und logge jeden Satz live.</p></div>
              ) : (
                <div className="session-exercises">
                  {activeSession.exercises.map((item) => (
                    <ExerciseCard key={item.exercise.id} item={item} progress={previousFor(item.exercise.id)} reduced={reduced} onRemove={() => removeExercise(item.exercise.id)} onChange={(next) => updateExercise(item.exercise.id, () => next)} />
                  ))}
                </div>
              )}
              <button className="add-exercise-button" type="button" onClick={() => setShowExercisePicker((value) => !value)}><Plus size={17} /> Übung hinzufügen <ChevronDown size={15} className={showExercisePicker ? 'rotate-icon' : ''} /></button>
              <AnimatePresence>{showExercisePicker && <ExercisePicker query={query} setQuery={setQuery} suggestions={suggestions} onSelect={async (exercise) => { await addExercise(exercise); setQuery(''); setShowExercisePicker(false); }} />}</AnimatePresence>
            </div>

            <footer className="session-footer"><button className="primary-button session-finish-button" type="button" onClick={handleFinish} disabled={saving || activeSession.exercises.length === 0}><Save size={17} /> {saving ? 'Speichert…' : 'Training beenden & speichern'}</button></footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ExercisePicker({ query, setQuery, suggestions, onSelect }: { query: string; setQuery: (value: string) => void; suggestions: StaticExercise[]; onSelect: (exercise: Exercise) => void }) {
  return <motion.div className="exercise-picker glass-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Übung suchen…" autoFocus aria-label="Übung suchen" /><div className="exercise-suggestions">{suggestions.map((exercise) => <button key={exercise.id} type="button" onClick={() => onSelect({ id: exercise.id, name: exercise.name, equipment: exercise.equipment ?? undefined, target: exercise.target ?? undefined })}><span>{exercise.name}</span><small>{exercise.target ?? exercise.equipment ?? 'Übung'}</small></button>)}</div></motion.div>;
}

function ExerciseCard({ item, progress, reduced, onRemove, onChange }: { item: SessionExercise; progress: { current?: import('../db/schema').ProgressHistory; previous?: import('../db/schema').ProgressHistory }; reduced: boolean; onRemove: () => void; onChange: (item: SessionExercise) => void }) {
  const completed = item.sets.filter((set) => set.completed).length;
  return <motion.article className="workout-exercise-card glass-panel" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduced ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}>
    <div className="exercise-card-header"><div><span className="eyebrow">{item.exercise.target ?? 'Exercise'}</span><h2>{item.exercise.name}</h2></div><button className="icon-button subtle" type="button" aria-label={`${item.exercise.name} entfernen`} onClick={onRemove}><Trash2 size={16} /></button></div>
    <ProgressBadge current={progress.current} previous={progress.previous} />
    <div className="set-table"><div className="set-table-head"><span>Satz</span><span>Gewicht</span><span>Reps</span><span>Done</span></div>{item.sets.map((set) => <div className={`session-set-row${set.completed ? ' is-complete' : ''}`} key={set.id}><span className="set-number">{set.setNumber}</span><input type="number" inputMode="decimal" min="0" step="2.5" value={set.gewicht} onChange={(event) => onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { gewicht: Number(event.target.value) || 0 }) : candidate) })} aria-label={`Satz ${set.setNumber} Gewicht`} /><input type="number" inputMode="numeric" min="0" step="1" value={set.wiederholungen} onChange={(event) => onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { wiederholungen: Number(event.target.value) || 0 }) : candidate) })} aria-label={`Satz ${set.setNumber} Wiederholungen`} /><button className="set-check" type="button" aria-label={`Satz ${set.setNumber} ${set.completed ? 'offen' : 'abhaken'}`} aria-pressed={set.completed} onClick={() => onChange({ ...item, sets: item.sets.map((candidate) => candidate.id === set.id ? updateSessionSet(candidate, { completed: !candidate.completed, timestamp: Date.now() }) : candidate) })}><Check size={16} /></button></div>)}</div><button className="add-set-button" type="button" onClick={() => onChange({ ...item, sets: [...item.sets, { id: crypto.randomUUID(), setNumber: item.sets.length + 1, gewicht: item.previous?.maxGewicht ?? 20, wiederholungen: item.previous?.bestReps ?? 8, completed: false }] })}><Plus size={14} /> Satz ergänzen <span>{completed}/{item.sets.length}</span></button>
  </motion.article>;
}

export function StartWorkoutButton() {
  const { activeSession, startSession } = useWorkoutSession();
  return <button className="primary-button start-workout-button" type="button" onClick={startSession} disabled={Boolean(activeSession)}><Dumbbell size={17} /> {activeSession ? 'Training läuft' : 'Training starten'}</button>;
}

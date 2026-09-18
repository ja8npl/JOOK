import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ClipboardPlus, Dumbbell, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useWorkoutTemplates, type WorkoutTemplate } from '../hooks/useWorkoutTemplates';
import { searchStaticExercises, type StaticExercise } from '../hooks/useExercises';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { type Exercise } from '../db/schema';

export function WorkoutLauncher() {
  const { startMenuOpen, closeStartMenu, startSession, addExercise } = useWorkoutSession();
  const { templates, saveTemplate, deleteTemplate } = useWorkoutTemplates();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<'menu' | 'create'>('menu');
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Exercise[]>([]);
  const suggestions = query ? searchStaticExercises(query).slice(0, 7) : [];

  useEffect(() => {
    if (!startMenuOpen) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [startMenuOpen]);

  const close = () => {
    closeStartMenu();
    setMode('menu');
    setName('');
    setQuery('');
    setSelected([]);
  };

  const chooseTemplate = async (template: WorkoutTemplate) => {
    startSession();
    for (const exercise of template.exercises) await addExercise(exercise);
    close();
  };

  const addToTemplate = (exercise: StaticExercise) => {
    if (selected.some((item) => item.id === exercise.id)) return;
    setSelected((current) => [...current, { id: exercise.id, name: exercise.name, equipment: exercise.equipment ?? undefined, target: exercise.target ?? undefined }]);
    setQuery('');
  };

  const createTemplate = () => {
    if (!selected.length) return;
    saveTemplate(name, selected);
    close();
  };

  return <AnimatePresence>{startMenuOpen && <motion.div className="launcher-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
    <motion.section className="launcher-sheet" initial={reduced ? false : { y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34 }} onClick={(event) => event.stopPropagation()} aria-label="Workout starten">
      <header className="launcher-header"><div><span className="eyebrow accent-copy">New session</span><h2>{mode === 'create' ? 'Workout erstellen' : 'Wie möchtest du trainieren?'}</h2></div><button className="icon-button" type="button" onClick={close} aria-label="Schließen"><X size={19} /></button></header>
      {mode === 'menu' ? <div className="launcher-content">
        <button className="launcher-option launcher-option-primary" type="button" onClick={() => { startSession(); close(); }}><span className="launcher-option-icon"><Dumbbell size={21} /></span><span><strong>Freies Training</strong><small>Starte leer und füge Übungen live hinzu.</small></span><ArrowRight size={17} /></button>
        <div className="launcher-section-heading"><span className="eyebrow">Deine Vorlagen</span><button type="button" onClick={() => setMode('create')}><Plus size={14} /> Neue Vorlage</button></div>
        {templates.length === 0 ? <div className="launcher-empty"><ClipboardPlus size={19} /><span>Noch keine Vorlage gespeichert.</span></div> : <div className="template-list">{templates.map((template) => <div className="template-row" key={template.id}><button type="button" onClick={() => void chooseTemplate(template)}><strong>{template.name}</strong><small>{template.exercises.length} Übungen · {template.exercises.slice(0, 2).map((exercise) => exercise.name).join(', ')}</small></button><button className="template-delete" type="button" onClick={() => deleteTemplate(template.id)} aria-label={`${template.name} löschen`}><Trash2 size={15} /></button></div>)}</div>}
      </div> : <div className="launcher-content">
        <input className="template-name-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, z. B. Push Day" aria-label="Name der Workout-Vorlage" autoFocus />
        {selected.length > 0 && <div className="selected-exercises">{selected.map((exercise) => <span key={exercise.id}>{exercise.name}<button type="button" onClick={() => setSelected((current) => current.filter((item) => item.id !== exercise.id))} aria-label={`${exercise.name} entfernen`}><X size={12} /></button></span>)}</div>}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Übungen zur Vorlage hinzufügen…" aria-label="Vorlagen-Übung suchen" />
        <div className="launcher-suggestions">{suggestions.map((exercise) => <button type="button" key={exercise.id} onClick={() => addToTemplate(exercise)}><span>{exercise.name}</span><small>{exercise.target ?? exercise.equipment ?? 'Übung'}</small></button>)}</div>
        <div className="launcher-create-actions"><button className="secondary-button" type="button" onClick={() => setMode('menu')}>Zurück</button><button className="primary-button" type="button" onClick={createTemplate} disabled={!selected.length}><ClipboardPlus size={16} /> Vorlage speichern</button></div>
      </div>}
    </motion.section>
  </motion.div>}</AnimatePresence>;
}

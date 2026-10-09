import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { ArrowRight, ClipboardPlus, Dumbbell, Plus, Pencil, ScanLine, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useOverlayFocus } from '../hooks/useOverlayFocus';
import { useWorkoutTemplates, type WorkoutTemplate } from '../hooks/useWorkoutTemplates';
import { BUILTIN_WORKOUT_TEMPLATES } from '../data/builtinTemplates';
import { searchStaticExercises, type StaticExercise } from '../hooks/useExercises';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PlanImportSheet } from './PlanImportSheet';
import { lockOverlay, unlockOverlay } from '../lib/overlayLock';
import { type Exercise } from '../db/schema';

export function WorkoutLauncher() {
  const { startMenuOpen, closeStartMenu, startSession, addExercise } = useWorkoutSession();
  const { templates, saveTemplate, deleteTemplate, updateTemplate } = useWorkoutTemplates();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<'menu' | 'create'>('menu');
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Eingebaute Pläne immer zuerst, dann eigene Vorlagen. */
  const allTemplates: WorkoutTemplate[] = [...BUILTIN_WORKOUT_TEMPLATES, ...templates];
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Exercise[]>([]);
  const suggestions = query ? searchStaticExercises(query).slice(0, 7) : [];

  useEffect(() => {
    if (!startMenuOpen) return undefined;
    lockOverlay();
    return () => unlockOverlay();
  }, [startMenuOpen]);

  const close = () => {
    closeStartMenu();
    setMode('menu');
    setEditingId(null);
    setName('');
    setQuery('');
    setSelected([]);
  };
  /* Fokus-Management nur, wenn der Launcher offen ist und der Plan-Import nicht darüber liegt. */
  const launcherSheetRef = useOverlayFocus(startMenuOpen && !importOpen, close);
  const dragControls = useDragControls();

  const chooseTemplate = async (template: WorkoutTemplate) => {
    startSession();
    for (const exercise of template.exercises) await addExercise(exercise);
    close();
  };

  const editTemplate = (template: WorkoutTemplate) => {
    setEditingId(template.id);
    setMode('create');
    setName(template.name);
    setSelected(template.exercises.map((exercise) => ({ id: exercise.id, name: exercise.name, equipment: exercise.equipment ?? undefined, target: exercise.target ?? undefined, saetze: exercise.saetze ?? 3, wiederholungen: exercise.wiederholungen ?? 8 })));
  };

  const addToTemplate = (exercise: StaticExercise) => {
    if (selected.some((item) => item.id === exercise.id)) return;
    setSelected((current) => [...current, { id: exercise.id, name: exercise.name, equipment: exercise.equipment ?? undefined, target: exercise.target ?? undefined, saetze: 3, wiederholungen: 8 }]);
    setQuery('');
  };

  const createTemplate = () => {
    if (!selected.length) return;
    if (editingId) {
      updateTemplate(editingId, name, selected);
    } else {
      saveTemplate(name, selected);
    }
    close();
  };

  /* --- Chips umsortieren per Pointer-Events (wie im Plan-Import) --- */
  const selectedRef = useRef<HTMLDivElement | null>(null);
  const [draggingChip, setDraggingChip] = useState<string | null>(null);
  const [dropChipIndex, setDropChipIndex] = useState<number | null>(null);
  const dragChipRef = useRef<string | null>(null);
  const dropChipIndexRef = useRef<number | null>(null);

  const startChipDrag = (exerciseId: string) => (event: React.PointerEvent) => {
    // Klick auf den Entfernen-Button soll keinen Drag starten.
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    dragChipRef.current = exerciseId;
    dropChipIndexRef.current = null;
    setDraggingChip(exerciseId);
    setDropChipIndex(null);
  };

  const handleChipsPointerMove = (event: React.PointerEvent) => {
    const dragId = dragChipRef.current;
    if (!dragId) return;
    const container = selectedRef.current;
    if (!container) return;
    const chips = Array.from(container.querySelectorAll<HTMLElement>('[data-exercise-key]'));
    const keys = chips.map((chip) => chip.dataset.exerciseKey);
    const fromIndex = keys.indexOf(dragId);
    if (fromIndex === -1) return;

    let targetIndex = chips.length - 1;
    for (let index = 0; index < chips.length; index += 1) {
      const rect = chips[index].getBoundingClientRect();
      // Gleiche Zeile: Einfügen vor dem Chip, dessen linke Mitte der Pointer überschritten hat.
      if (event.clientY < rect.top + rect.height / 2) {
        targetIndex = index;
        break;
      }
      if (event.clientY <= rect.bottom && event.clientX < rect.left + rect.width / 2) {
        targetIndex = index;
        break;
      }
    }
    if (targetIndex === fromIndex) {
      dropChipIndexRef.current = null;
      setDropChipIndex(null);
      return;
    }
    const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    dropChipIndexRef.current = insertIndex;
    setDropChipIndex(insertIndex);
  };

  const endChipDrag = () => {
    const dragId = dragChipRef.current;
    const insertIndex = dropChipIndexRef.current;
    dragChipRef.current = null;
    dropChipIndexRef.current = null;
    setDraggingChip(null);
    setDropChipIndex(null);
    if (!dragId || insertIndex === null) return;
    setSelected((current) => {
      const fromIndex = current.findIndex((item) => item.id === dragId);
      if (fromIndex === -1) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, moved);
      return next;
    });
  };

  const closeImport = () => {
    setImportOpen(false);
    closeStartMenu();
  };

  // Portal an document.body — gleiche Begründung wie Session-Modal (Stacking Context des app-shell).
  return createPortal(<>
    <AnimatePresence>{startMenuOpen && <motion.div className="launcher-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
      <motion.section ref={launcherSheetRef} tabIndex={-1} className="launcher-sheet" style={{ outline: 'none' }} initial={reduced ? false : { y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }} drag={reduced ? false : 'y'} dragListener={false} dragControls={dragControls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.55 }} onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 550) close(); }} onClick={(event) => event.stopPropagation()} aria-label="Workout starten">
        {/* Griffleiste als Ziehl-Fläche — gleiche Physik wie im BottomSheet (110px / 550px/s) */}
        <div className="sheet-handle-zone" onPointerDown={(event) => dragControls.start(event)} aria-hidden="true"><div className="sheet-handle" /></div>
        <header className="launcher-header"><div><span className="eyebrow accent-copy">New session</span><h2>{mode === 'create' ? (editingId ? 'Vorlage bearbeiten' : 'Workout erstellen') : 'Wie möchtest du trainieren?'}</h2></div><button className="icon-button" type="button" onClick={close} aria-label="Schließen"><X size={19} /></button></header>
        {mode === 'menu' ? (
          <div className="launcher-content">
            <button className="launcher-option launcher-option-primary" type="button" onClick={() => { startSession(); close(); }}><span className="launcher-option-icon"><Dumbbell size={21} /></span><span><strong>Freies Training</strong><small>Starte leer und füge Übungen live hinzu.</small></span><ArrowRight size={17} /></button>
            <div className="launcher-section-heading"><span className="eyebrow">Deine Vorlagen</span><span className="launcher-heading-actions"><button type="button" onClick={() => setImportOpen(true)}><ScanLine size={14} /> Plan importieren</button><button type="button" onClick={() => setMode('create')}><Plus size={14} /> Neue Vorlage</button></span></div>
            {allTemplates.length === 0 ? (
              <div className="launcher-empty"><ClipboardPlus size={19} /><span>Noch keine Vorlage gespeichert.</span></div>
            ) : (
              <div className="template-list">
                {allTemplates.map((template) => (
                  <div className="template-row" key={template.id}>
                    <button type="button" onClick={() => void chooseTemplate(template)}><strong>{template.name}</strong><small>{template.exercises.length} Übungen · {template.exercises.slice(0, 2).map((exercise) => exercise.name).join(', ')}</small></button>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {template.builtin !== true && <button className="template-delete" type="button" onClick={() => deleteTemplate(template.id)} aria-label={`${template.name} löschen`}><Trash2 size={15} /></button>}
                      <button type="button" onClick={() => editTemplate(template)} aria-label={`${template.name} bearbeiten`} style={{ width: '38px', height: '38px', display: 'grid', placeItems: 'center', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', borderRadius: '50%', boxShadow: 'var(--glass-shadow), var(--glass-edge)', color: 'var(--text-secondary)' }}><Pencil size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="launcher-content">
          <input className="template-name-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, z. B. Push Day" aria-label="Name der Workout-Vorlage" autoFocus />
          {/* Ausgewählte Übungen als umsortierbare Chips — gleiche Pointer-Physik wie im Plan-Import. */}
          {selected.length > 0 && (
            <>
              <div
                className="selected-exercises"
                ref={selectedRef}
                onPointerMove={handleChipsPointerMove}
                onPointerUp={endChipDrag}
                onPointerCancel={endChipDrag}
                onPointerLeave={endChipDrag}
              >
                {selected.map((exercise, index) => (
                  <span
                    key={exercise.id}
                    data-exercise-key={exercise.id}
                    style={{
                      opacity: draggingChip === exercise.id ? 0.45 : undefined,
                      boxShadow: dropChipIndex === index ? '0 0 0 2px var(--accent-dim)' : undefined,
                      borderRadius: 'var(--radius-pill)',
                      touchAction: 'none',
                      userSelect: 'none',
                    }}
                    onPointerDown={startChipDrag(exercise.id)}
                  >
                    {exercise.name}
                    <button type="button" onClick={() => setSelected((current) => current.filter((item) => item.id !== exercise.id))} aria-label={`${exercise.name} entfernen`} style={{ marginLeft: '4px' }}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', textAlign: 'center' }}>Zum Umsortieren am Chip ziehen.</p>
            </>
          )}
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Übungen zur Vorlage hinzufügen…" aria-label="Vorlagen-Übung suchen" />
          <div className="launcher-suggestions">{suggestions.map((exercise) => <button type="button" key={exercise.id} onClick={() => addToTemplate(exercise)}><span>{exercise.name}</span><small>{exercise.target ?? exercise.equipment ?? 'Übung'}</small></button>)}</div>
          <div className="launcher-create-actions"><button className="secondary-button" type="button" onClick={() => setMode('menu')}>Zurück</button><button className="primary-button" type="button" onClick={createTemplate} disabled={!selected.length}><ClipboardPlus size={16} /> {editingId ? 'Vorlage aktualisieren' : 'Vorlage speichern'}</button></div>
        </div>)}
      </motion.section>
    </motion.div>}</AnimatePresence>
    <PlanImportSheet open={importOpen} onRequestClose={closeImport} onSave={(templateName, exercises) => saveTemplate(templateName, exercises)} />
  </>, document.body);
}

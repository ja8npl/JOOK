import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, GripVertical, Plus, ScanLine, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { matchStaticExercise } from '../hooks/useExercises';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  compressImage,
  parsePlan,
  PlanImportError,
  planImportErrorMessage,
  type ParsedPlanTemplate,
} from '../services/planImport';
import { type Exercise } from '../db/schema';

type Phase = 'input' | 'loading' | 'error' | 'preview';

/** Eine erkannte Übung in der Vorschau (editierbar, drag-bar). */
interface PreviewExercise {
  key: string;
  /** Anzeigename — editierbar, ohne die Bibliotheks-Verknüpfung zu verlieren. */
  name: string;
  /** Verknüpfte Übung (Bibliotheks-Treffer oder neu angelegte Exercise). */
  exercise: Exercise;
  /** true, wenn der Name über die Übungsbibliothek gematcht wurde. */
  matched: boolean;
}

/** Eine erkannte Vorlage in der Vorschau. */
interface PreviewTemplate {
  key: string;
  name: string;
  exercises: PreviewExercise[];
}

interface PlanImportSheetProps {
  open: boolean;
  /** Schließt das Import-Sheet und zeigt wieder das Launcher-Menü. */
  onRequestClose: () => void;
  /** Schreibt eine Vorlage in den bestehenden Store — erst beim expliziten Speichern. */
  onSave: (name: string, exercises: Exercise[]) => void;
}

/** Muss zum Server-Limit in api/parse-plan.ts passen. */
const MAX_TEXT_LENGTH = 12_000;

const PHASE_TITLES: Record<Phase, string> = {
  input: 'Plan importieren',
  loading: 'Plan wird gelesen…',
  error: 'Import fehlgeschlagen',
  preview: 'Erkannte Vorlagen',
};

function toPreviewTemplates(parsed: ParsedPlanTemplate[]): PreviewTemplate[] {
  return parsed.map((template) => ({
    key: crypto.randomUUID(),
    name: template.name,
    exercises: template.exercises.map((name) => {
      const match = matchStaticExercise(name);
      return { key: crypto.randomUUID(), name, exercise: match.exercise, matched: match.matched };
    }),
  }));
}

/**
 * Portal an document.body — gleiche Begründung wie Launcher-Sheet
 * (Stacking Context des app-shell). Der Inhalt wird nur bei `open`
 * gemountet und startet dadurch bei jedem Öffnen mit frischem Zustand.
 */
export function PlanImportSheet({ open, onRequestClose, onSave }: PlanImportSheetProps) {
  return createPortal(
    <AnimatePresence>
      {open && <motion.div className="launcher-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onRequestClose}>
        <PlanImportForm onRequestClose={onRequestClose} onSave={onSave} />
      </motion.div>}
    </AnimatePresence>,
    document.body,
  );
}

function PlanImportForm({ onRequestClose, onSave }: Omit<PlanImportSheetProps, 'open'>) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('input');
  const [planText, setPlanText] = useState('');
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [templates, setTemplates] = useState<PreviewTemplate[]>([]);
  const [addDrafts, setAddDrafts] = useState<Record<string, string>>({});
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragState = useRef<{ templateKey: string; exerciseKey: string } | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.classList.add('overlay-open');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onRequestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.classList.remove('overlay-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onRequestClose]);

  const canSubmit = Boolean(planText.trim()) || Boolean(image);

  const submit = async () => {
    if (!canSubmit) return;
    setPhase('loading');
    try {
      const parsed = await parsePlan({ text: planText, imageDataUrl: image?.dataUrl });
      setTemplates(toPreviewTemplates(parsed));
      setPhase('preview');
    } catch (error) {
      setErrorMessage(error instanceof PlanImportError ? error.message : planImportErrorMessage('model_unreachable'));
      setPhase('error');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImageError(null);
    try {
      const dataUrl = await compressImage(file);
      setImage({ dataUrl, name: file.name });
    } catch (error) {
      setImageError(error instanceof PlanImportError ? error.message : 'Das Bild konnte nicht verarbeitet werden.');
    }
  };

  /* --- Drag & Drop per Pointer-Events (funktioniert auf iPhone-Touch) --- */

  const startDrag = (templateKey: string, exerciseKey: string) => (event: React.PointerEvent) => {
    event.preventDefault();
    dragState.current = { templateKey, exerciseKey };
    dropIndexRef.current = null;
    setDraggingKey(exerciseKey);
    setDropIndex(null);
  };

  const handleListPointerMove = (templateKey: string) => (event: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag || drag.templateKey !== templateKey) return;
    const container = listRefs.current[templateKey];
    if (!container) return;
    const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-exercise-key]'));
    const keys = rows.map((row) => row.dataset.exerciseKey);
    const fromIndex = keys.indexOf(drag.exerciseKey);
    if (fromIndex === -1) return;

    let targetIndex = rows.length - 1;
    for (let index = 0; index < rows.length; index += 1) {
      const rect = rows[index].getBoundingClientRect();
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
    // Einfügeindex im Raum "ohne gezogene Zeile"
    const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    dropIndexRef.current = insertIndex;
    setDropIndex(insertIndex);
  };

  const endDrag = () => {
    const drag = dragState.current;
    const insertIndex = dropIndexRef.current;
    dragState.current = null;
    dropIndexRef.current = null;
    setDraggingKey(null);
    setDropIndex(null);
    if (!drag || insertIndex === null) return;
    setTemplates((current) => current.map((template) => {
      if (template.key !== drag.templateKey) return template;
      const fromIndex = template.exercises.findIndex((item) => item.key === drag.exerciseKey);
      if (fromIndex === -1) return template;
      const next = [...template.exercises];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, moved);
      return { ...template, exercises: next };
    }));
  };

  /* --- Vorschau-Editing --- */

  const renameTemplate = (templateKey: string, name: string) => {
    setTemplates((current) => current.map((template) => template.key === templateKey ? { ...template, name } : template));
  };

  const removeTemplate = (templateKey: string) => {
    setTemplates((current) => current.filter((template) => template.key !== templateKey));
  };

  const renameExercise = (templateKey: string, exerciseKey: string, name: string) => {
    setTemplates((current) => current.map((template) => {
      if (template.key !== templateKey) return template;
      return {
        ...template,
        exercises: template.exercises.map((item) => item.key === exerciseKey ? { ...item, name, exercise: { ...item.exercise, name } } : item),
      };
    }));
  };

  const removeExercise = (templateKey: string, exerciseKey: string) => {
    setTemplates((current) => current.map((template) => template.key === templateKey
      ? { ...template, exercises: template.exercises.filter((item) => item.key !== exerciseKey) }
      : template));
  };

  const addExercise = (templateKey: string) => {
    const draft = (addDrafts[templateKey] ?? '').trim();
    if (!draft) return;
    const match = matchStaticExercise(draft);
    setTemplates((current) => current.map((template) => template.key === templateKey
      ? { ...template, exercises: [...template.exercises, { key: crypto.randomUUID(), name: draft, exercise: match.exercise, matched: match.matched }] }
      : template));
    setAddDrafts((current) => ({ ...current, [templateKey]: '' }));
  };

  const hasSavableTemplates = templates.some((template) => template.exercises.length > 0);

  const saveAll = () => {
    if (!hasSavableTemplates) return;
    let savedCount = 0;
    for (const template of templates) {
      if (template.exercises.length === 0) continue;
      savedCount += 1;
      onSave(template.name.trim() || `Importierter Plan ${savedCount}`, template.exercises.map((item) => item.exercise));
    }
    onRequestClose();
  };

  return <motion.section
    className="launcher-sheet"
    role="dialog"
    aria-modal="true"
    aria-label="Plan importieren"
    initial={reduced ? false : { y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={reduced ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
    onClick={(event) => event.stopPropagation()}
  >
    <div className="sheet-handle" aria-hidden="true" />
    <header className="launcher-header">
      <div>
        <span className="eyebrow accent-copy">{phase === 'preview' ? 'Vorschau prüfen' : 'KI-Import'}</span>
        <span className="import-title-row"><h2>{PHASE_TITLES[phase]}</h2>{phase === 'preview' && templates.length > 0 && <span className="count-pill">{templates.length}</span>}</span>
      </div>
      <button className="icon-button" type="button" onClick={onRequestClose} aria-label="Schließen"><X size={19} /></button>
    </header>

    <div className="launcher-content import-content">
      {phase === 'input' && <>
        <p className="import-hint">Füge den Trainingsplan als Text ein oder wähle ein Foto/einen Screenshot — beides zusammen geht auch. Übungen werden automatisch mit deiner Bibliothek abgeglichen.</p>
        <textarea
          className="import-plan-text"
          value={planText}
          onChange={(event) => setPlanText(event.target.value.slice(0, MAX_TEXT_LENGTH))}
          placeholder="Trainingsplan hier einfügen … z. B. aus Notizen, Website oder PDF kopiert"
          aria-label="Trainingsplan-Text"
          rows={5}
        />
        <span className={`import-char-count${planText.length >= MAX_TEXT_LENGTH ? ' is-over' : ''}`}>
          {planText.length.toLocaleString('de-DE')} / 12.000 Zeichen
        </span>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={(event) => void handleFileChange(event)} style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
        <button className="secondary-button import-photo-button" type="button" onClick={() => fileInputRef.current?.click()}>
          <Camera size={16} /> {image ? 'Anderes Foto wählen' : 'Foto/Screenshot wählen'}
        </button>
        {imageError && <p className="import-inline-error"><TriangleAlert size={13} /> {imageError}</p>}
        {image && <div className="import-image-preview">
          <img className="import-image-thumb" src={image.dataUrl} alt="Ausgewählter Trainingsplan" />
          <span className="import-image-name">{image.name}</span>
          <button className="import-image-remove" type="button" onClick={() => setImage(null)} aria-label="Foto entfernen"><X size={15} /></button>
        </div>}
        <div className="launcher-create-actions">
          <button className="secondary-button" type="button" onClick={onRequestClose}>Abbrechen</button>
          <button className="primary-button" type="button" onClick={() => void submit()} disabled={!canSubmit}>
            <ScanLine size={16} /> Vorlage erstellen
          </button>
        </div>
      </>}

      {phase === 'loading' && <div className="import-loading" role="status">
        <span className="import-scanner" aria-hidden="true"><ScanLine size={26} /></span>
        <strong>Plan wird gelesen<span className="import-loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></strong>
        <p>Das kann je nach Modell einige Sekunden dauern.</p>
      </div>}

      {phase === 'error' && <div className="import-error" role="alert">
        <span className="import-error-icon"><TriangleAlert size={24} /></span>
        <strong>Import fehlgeschlagen</strong>
        <p>{errorMessage}</p>
        <div className="launcher-create-actions">
          <button className="secondary-button" type="button" onClick={() => setPhase('input')}>Zurück</button>
          <button className="primary-button" type="button" onClick={() => void submit()}>
            <ScanLine size={16} /> Nochmal versuchen
          </button>
        </div>
      </div>}

      {phase === 'preview' && <>
        <p className="import-hint">
          <Check size={12} /> Übungen stammen aus deiner Bibliothek, <Sparkles size={12} /> Übungen werden neu angelegt. Zum Umsortieren am Griff ziehen.
        </p>
        <div className="import-templates">
          {templates.map((template, templateIndex) => <section className="glass-panel import-template-card" key={template.key}>
            <div className="import-template-head">
              <input
                className="import-template-name"
                value={template.name}
                onChange={(event) => renameTemplate(template.key, event.target.value)}
                placeholder="Name der Vorlage"
                aria-label={`Name von Vorlage ${templateIndex + 1}`}
              />
              <button className="template-delete" type="button" onClick={() => removeTemplate(template.key)} aria-label={`Vorlage ${template.name} löschen`}><Trash2 size={15} /></button>
            </div>
            <div
              className="import-exercise-list"
              ref={(element) => { listRefs.current[template.key] = element; }}
              onPointerMove={handleListPointerMove(template.key)}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={endDrag}
            >
              {template.exercises.map((item, index) => <div
                className={`import-exercise-row${draggingKey === item.key ? ' is-dragging' : ''}${dropIndex === index ? ' is-drop-target' : ''}`}
                key={item.key}
                data-exercise-key={item.key}
              >
                <button
                  className="import-drag-handle"
                  type="button"
                  aria-label={`${item.name} verschieben`}
                  onPointerDown={startDrag(template.key, item.key)}
                >
                  <GripVertical size={15} />
                </button>
                <input
                  className="import-exercise-input"
                  value={item.name}
                  onChange={(event) => renameExercise(template.key, item.key, event.target.value)}
                  aria-label={`Übung ${index + 1}`}
                />
                <span
                  className={`import-match-badge ${item.matched ? 'library' : 'new'}`}
                  title={item.matched ? 'Aus deiner Bibliothek' : 'Wird als neue Übung angelegt'}
                  aria-label={item.matched ? 'Aus deiner Bibliothek' : 'Wird als neue Übung angelegt'}
                >
                  {item.matched ? <Check size={14} /> : <Sparkles size={13} />}
                </span>
                <button className="import-exercise-remove" type="button" onClick={() => removeExercise(template.key, item.key)} aria-label={`${item.name} entfernen`}><X size={14} /></button>
              </div>)}
              <div className="import-add-exercise">
                <input
                  value={addDrafts[template.key] ?? ''}
                  onChange={(event) => setAddDrafts((current) => ({ ...current, [template.key]: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addExercise(template.key);
                    }
                  }}
                  placeholder="Übung hinzufügen…"
                  aria-label="Übung hinzufügen"
                />
                <button
                  className="import-add-button"
                  type="button"
                  onClick={() => addExercise(template.key)}
                  disabled={!(addDrafts[template.key] ?? '').trim()}
                  aria-label="Übung zur Vorlage hinzufügen"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </section>)}
        </div>
        <div className="launcher-create-actions">
          <button className="secondary-button" type="button" onClick={() => setPhase('input')}>Zurück</button>
          <button className="primary-button" type="button" onClick={saveAll} disabled={!hasSavableTemplates}>
            <Check size={16} /> Speichern
          </button>
        </div>
      </>}
    </div>
  </motion.section>;
}

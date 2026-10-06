import { useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Check, Dumbbell, GripVertical } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { haptic } from '../lib/haptics';
import { type SessionExercise } from '../db/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Übungen des aktiven Trainings in aktueller Reihenfolge. */
  exercises: SessionExercise[];
  /** Wird mit den Übungs-IDs in der neuen Reihenfolge aufgerufen. */
  onSave: (orderedIds: string[]) => void;
}

/* Equipment-Anzeige auf Deutsch (Fallback: Rohwert, capitalisiert). */
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  kettlebell: 'Kettlebell',
  machine: 'Maschine',
  'leverage machine': 'Maschine',
  cable: 'Kabel',
  bodyweight: 'Körpergewicht',
  bands: 'Bänder',
};

function equipmentLabel(equipment?: string): string | null {
  if (!equipment) return null;
  return EQUIPMENT_LABELS[equipment] ?? equipment.charAt(0).toUpperCase() + equipment.slice(1);
}

/** Eine Zeile im Sortier-Sheet — eigener DragControls-Steuersatz: Der Drag startet nur
 *  am Griff (dragListener={false}), der Rest der Karte scrollt das Sheet normal.
 *  touch-action:none am Griff verhindert, dass iOS die Geste fürs Scrollen beansprucht. */
function ReorderRow({ item, reduced, onGrab }: { item: SessionExercise; reduced: boolean; onGrab: () => void }) {
  const controls = useDragControls();
  const workSets = item.sets.filter((set) => !set.warmup).length;
  const equipment = equipmentLabel(item.exercise.equipment);
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={reduced ? undefined : { scale: 1.025 }}
      className="reorder-item"
    >
      <div className="reorder-card">
        <span className="reorder-icon" aria-hidden="true"><Dumbbell size={16} /></span>
        <div className="reorder-copy">
          <strong>{item.exercise.name}</strong>
          <small>{[equipment, `${workSets} Set${workSets === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</small>
        </div>
        <button
          className="reorder-handle"
          type="button"
          aria-label={`${item.exercise.name} verschieben`}
          onPointerDown={(event) => {
            onGrab();
            controls.start(event);
          }}
        >
          <GripVertical size={18} />
        </button>
      </div>
    </Reorder.Item>
  );
}

/** „Übungen neu sortieren“ — Bevel-artiges Bottom-Sheet mit Touch-Drag (Reorder).
 *  Die Reihenfolge wird lokal gezogen und erst auf „Speichern“ übernommen; die Zeilen
 *  sind dieselben Objekte wie in der Session, Sätze und Werte bleiben dadurch erhalten. */
export function ReorderExercisesSheet({ isOpen, onClose, exercises, onSave }: Props) {
  const reduced = useReducedMotion();
  const [items, setItems] = useState<SessionExercise[]>(exercises);
  const [dragging, setDragging] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ y: 0 });

  /* Neue Prop-Liste → lokale Zieh-Reihenfolge zurücksetzen. Render-Sync mit Prop-Vergleich
     (React-Dokumentation „adjust state on prop change“) statt Effect — die zusätzliche
     Render-Welle spart der Compiler-Lint nachweislich ein. */
  const [syncedExercises, setSyncedExercises] = useState<SessionExercise[]>(exercises);
  if (syncedExercises !== exercises) {
    setSyncedExercises(exercises);
    setItems(exercises);
  }

  /* Pointer-Position + Drag-Ende global verfolgen — Grundlage für den Auto-Scroll. */
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerMove = (event: PointerEvent) => { pointerRef.current = { y: event.clientY }; };
    const onPointerUp = () => setDragging(false);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isOpen]);

  /* Auto-Scroll am Listenrand: Bei 14 Übungen muss man Zeilen auch über den
     sichtbaren Bereich hinaus ans Ziel ziehen können. */
  useEffect(() => {
    if (!dragging) return undefined;
    let raf = 0;
    const step = () => {
      const list = listRef.current;
      if (list) {
        const rect = list.getBoundingClientRect();
        const edge = 64;
        const y = pointerRef.current.y;
        if (y && y < rect.top + edge) list.scrollTop -= Math.ceil((rect.top + edge - y) * 0.2);
        else if (y && y > rect.bottom - edge) list.scrollTop += Math.ceil((y - (rect.bottom - edge)) * 0.2);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dragging]);

  /** Jeder Order-Swap während des Drags gibt einen kurzen haptischen Puls. */
  const handleReorder = (next: SessionExercise[]) => {
    const changed = next.length !== items.length
      || next.some((item, index) => item.exercise.id !== items[index].exercise.id);
    if (changed) haptic(8);
    setItems(next);
  };

  const handleSave = () => {
    onSave(items.map((item) => item.exercise.id));
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Übungen neu sortieren" centeredTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '4px' }}>
        {items.length === 0 ? (
          <p style={{ margin: '4px 0 0', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
            Keine Übungen im Training.
          </p>
        ) : (
          <div ref={listRef} className="reorder-list">
            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="reorder-group">
              {items.map((item) => (
                <ReorderRow key={item.exercise.id} item={item} reduced={reduced} onGrab={() => setDragging(true)} />
              ))}
            </Reorder.Group>
          </div>
        )}
        <p className="reorder-hint">Zum Verschieben am Griff ziehen — Sätze und Werte bleiben erhalten.</p>
        <button className="primary-button" type="button" onClick={handleSave} disabled={items.length === 0} style={{ width: '100%', minHeight: '52px' }}>
          <Check size={17} /> Speichern
        </button>
      </div>
    </BottomSheet>
  );
}

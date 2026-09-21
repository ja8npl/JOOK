import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, RotateCcw, X } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { buildWarmupPlan, parseKgInput, type WarmupConfig } from '../hooks/warmup';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  /** Heutige gespeicherte Konfiguration (zum Vorbelegen/Ändern). */
  currentConfig?: WarmupConfig;
  onConfirm: (maxGewicht: number, dritterSatz: boolean) => Promise<void>;
  /** Entfernt heutige Konfiguration + Warm-up-Sätze aus der Session. */
  onReset?: () => Promise<void>;
}

/**
 * Warm-up-Bottom-Sheet: „Wie viel willst du heute maximal drücken?“ —
 * Hero-Frage, zentrierter Zahlen-Input, Vorschau als Stat-Tiles.
 * Das Formular mountet mit Öffnen frisch, damit die Vorbelegung
 * ohne Effect-SetState auskommt.
 */
export function WarmupSheet({ isOpen, onClose, exerciseName, currentConfig, onConfirm, onReset }: Props) {
  const reduced = useReducedMotion();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} eyebrow="Max-Gewicht" title="Warm-up" avoidKeyboard>
      {isOpen && (
        <WarmupForm
          exerciseName={exerciseName}
          currentConfig={currentConfig}
          onConfirm={onConfirm}
          onReset={onReset}
          onClose={onClose}
          reduced={reduced}
        />
      )}
    </BottomSheet>
  );
}

interface FormProps {
  exerciseName: string;
  currentConfig?: WarmupConfig;
  onConfirm: (maxGewicht: number, dritterSatz: boolean) => Promise<void>;
  onReset?: () => Promise<void>;
  onClose: () => void;
  reduced: boolean;
}

function WarmupForm({ exerciseName, currentConfig, onConfirm, onReset, onClose, reduced }: FormProps) {
  const [maxStr, setMaxStr] = useState(() => (currentConfig ? String(currentConfig.maxGewicht).replace('.', ',') : ''));
  const [withThird, setWithThird] = useState(() => currentConfig?.dritterSatz ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseKgInput(maxStr), [maxStr]);
  const plan = useMemo(() => (parsed ? buildWarmupPlan(parsed, withThird) : []), [parsed, withThird]);

  const handleConfirm = async () => {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      await onConfirm(parsed, withThird);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onReset?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Hero-Frage */}
      <p className="warmup-question">
        Wie viel willst du heute <em>maximal</em> drücken?
      </p>
      <p className="warmup-sub">
        Für {exerciseName} · gilt heute, jederzeit änderbar.
      </p>

      {/* Zahlen-Input — große zentrierte Touchfläche, ≥16px gegen iOS-Zoom */}
      <div className="warmup-input-wrap">
        <input
          type="text"
          inputMode="decimal"
          value={maxStr}
          onChange={(event) => {
            setMaxStr(event.target.value);
            setError(null);
          }}
          placeholder="z. B. 80"
          aria-label="Maximales Gewicht in Kilogramm"
          autoFocus
          className="warmup-input"
        />
        <span className="warmup-input-unit">kg</span>
      </div>
      {error && <p className="warmup-error"><X size={13} /> {error}</p>}

      {/* Live-Vorschau als Stat-Tiles */}
      <AnimatePresence initial={false}>
        {plan.length > 0 && (
          <motion.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="warmup-preview">
              {plan.map((set, index) => (
                <div key={index} className="warmup-tile">
                  <span className="warmup-tile-pct">{Math.round(set.fraction * 100)} %</span>
                  <strong>{set.gewicht.toLocaleString('de-DE')} kg</strong>
                  <span className="warmup-tile-reps">{set.zielReps} Reps</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle — optionaler dritter Warm-up-Satz (75 %) */}
      <button
        type="button"
        role="switch"
        aria-checked={withThird}
        onClick={() => setWithThird((value) => !value)}
        className="warmup-toggle"
      >
        <span className="warmup-toggle-copy">
          <span className="warmup-toggle-title">3. Warm-up-Satz</span>
          <span className="warmup-toggle-sub">75 % vom Max-Gewicht · 2–3 Reps</span>
        </span>
        <span className={`warmup-switch${withThird ? ' is-on' : ''}`} aria-hidden="true">
          <motion.span
            animate={{ x: withThird ? 20 : 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }}
            className="warmup-switch-knob"
          />
        </span>
      </button>

      {/* Aktionen */}
      <div style={{ display: 'flex', gap: '9px' }}>
        {currentConfig && onReset && (
          <motion.button
            type="button"
            onClick={handleReset}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            aria-label="Warm-up für heute zurücksetzen"
            className="warmup-reset"
          >
            <RotateCcw size={17} />
          </motion.button>
        )}
        <motion.button
          type="button"
          onClick={() => {
            if (!parsed) {
              setError('Bitte ein Gewicht über 0 kg eingeben.');
              return;
            }
            void handleConfirm();
          }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          disabled={saving}
          className="warmup-confirm"
        >
          <Plus size={16} /> {currentConfig ? 'Warm-up aktualisieren' : 'Warm-up starten'}
        </motion.button>
      </div>
    </>
  );
}

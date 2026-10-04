import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Target, Timer, X } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { formatRepRange, type RepTargetRange } from '../lib/progression';
import { formatRestTime, resolveRestSeconds } from '../lib/rest';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** 'exercise' = eigene Werte für eine Übung (mit Reset aufs Globale), 'global' = Standard für alle. */
  mode: 'exercise' | 'global';
  exerciseName?: string;
  /** Beim Öffnen eingefrorener aktueller Wert (Sheet springt nicht, während Livesdaten nachladen). */
  initial: RepTargetRange;
  /** Beim Öffnen eingefrorene effektive Pausenzeit in Sekunden. */
  initialRest: number;
  /** Globales Rep-Ziel als Kontext im Exercise-Modus. */
  globalTarget?: RepTargetRange;
  /** Globale Standard-Pausenzeit (localStorage) als Kontext. */
  globalRestSeconds?: number;
  /** Eigenes Override vorhanden? (zeigt Reset-Aktion) */
  hasOverride?: boolean;
  /** Speichert BEIDE Werte (Rep-Ziel + Pausenzeit) als Override der Übung. */
  onSave: (range: RepTargetRange, restSeconds: number) => Promise<void>;
  onReset?: () => Promise<void>;
}

/**
 * Rep-Ziel-Editor: zwei gekoppelte Regler (unterer/oberer Zielwert) im
 * Warm-up-Sheet-Stil — Hero-Frage, große Werte, neo-eingedellte Regler-Reihen.
 * Mountet frisch bei jedem Öffnen (kein Effect-SetState für die Vorbelegung).
 */
export function RepTargetSheet({ isOpen, onClose, mode, exerciseName, initial, initialRest, globalTarget, globalRestSeconds, hasOverride, onSave, onReset }: SheetProps) {
  const reduced = useReducedMotion();
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} eyebrow="Rep-Ziel & Pause" title={mode === 'global' ? 'Globales Rep-Ziel' : exerciseName ?? 'Rep-Ziel'} avoidKeyboard>
      {isOpen && (
        <RepTargetForm
          mode={mode}
          exerciseName={exerciseName}
          initial={initial}
          initialRest={initialRest}
          globalTarget={globalTarget}
          globalRestSeconds={globalRestSeconds}
          hasOverride={hasOverride}
          onSave={onSave}
          onReset={onReset}
          onClose={onClose}
          reduced={reduced}
        />
      )}
    </BottomSheet>
  );
}

interface FormProps {
  mode: 'exercise' | 'global';
  exerciseName?: string;
  initial: RepTargetRange;
  initialRest: number;
  globalTarget?: RepTargetRange;
  globalRestSeconds?: number;
  hasOverride?: boolean;
  onSave: (range: RepTargetRange, restSeconds: number) => Promise<void>;
  onReset?: () => Promise<void>;
  onClose: () => void;
  reduced: boolean;
}

function RepTargetForm({ mode, exerciseName, initial, initialRest, globalTarget, globalRestSeconds, hasOverride, onSave, onReset, onClose, reduced }: FormProps) {
  const [min, setMin] = useState(initial.min);
  const [max, setMax] = useState(initial.max);
  const [restSek, setRestSek] = useState(initialRest);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeMin = (raw: number) => {
    const next = Math.min(29, Math.max(1, raw));
    setMin(next);
    if (next >= max) setMax(next + 1);
  };
  const changeMax = (raw: number) => {
    const next = Math.min(30, Math.max(2, raw));
    setMax(next);
    if (next <= min) setMin(next - 1);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ min, max }, restSek);
      onClose();
    } catch {
      setError('Ziele konnten nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!onReset || saving) return;
    setSaving(true);
    try {
      await onReset();
      onClose();
    } catch {
      setError('Werte konnten nicht zurückgesetzt werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <p className="warmup-question">
        Wie viele Reps sollen es <em>pro Satz</em> sein?
      </p>
      <p className="warmup-sub">
        {mode === 'global'
          ? 'Gilt für alle Übungen ohne eigenen Zielwert.'
          : <>Eigene Werte für {exerciseName}. Ohne eigene Werte gelten: Rep-Ziel {globalTarget ? formatRepRange(globalTarget) : 'Standard'}, Pause {formatRestTime(resolveRestSeconds(undefined, globalRestSeconds))}.</>}
      </p>

      <div className="rep-slider-group">
        <div className="rep-slider-head" style={{ paddingLeft: '2px' }}>
          <span className="rep-slider-label">Rep-Ziel</span>
        </div>
        <div className="rep-slider-row">
          <div className="rep-slider-head">
            <span className="rep-slider-label">Unteres Ziel</span>
            <span className="rep-slider-value">{min}</span>
          </div>
          <input
            type="range"
            className="rep-slider"
            min={1}
            max={29}
            value={min}
            onChange={(event) => changeMin(Number(event.target.value))}
            aria-label="Unteres Rep-Ziel"
            aria-valuetext={`${min} Reps`}
          />
        </div>
        <div className="rep-slider-row">
          <div className="rep-slider-head">
            <span className="rep-slider-label">Oberes Ziel</span>
            <span className="rep-slider-value">{max}</span>
          </div>
          <input
            type="range"
            className="rep-slider"
            min={2}
            max={30}
            value={max}
            onChange={(event) => changeMax(Number(event.target.value))}
            aria-label="Oberes Rep-Ziel"
            aria-valuetext={`${max} Reps`}
          />
        </div>
      </div>

      <div className="rep-slider-group" style={{ marginTop: '14px' }}>
        <div className="rep-slider-head" style={{ paddingLeft: '2px' }}>
          <span className="rep-slider-label">Pausenzeit nach Satz</span>
        </div>
        <div className="rep-slider-row">
          <div className="rep-slider-head">
            <span className="rep-slider-label">Pause</span>
            <span className="rep-slider-value">{formatRestTime(restSek)}</span>
          </div>
          <input
            type="range"
            className="rep-slider"
            min={30}
            max={300}
            step={15}
            value={restSek}
            onChange={(event) => setRestSek(Number(event.target.value))}
            aria-label="Pausenzeit in Sekunden"
            aria-valuetext={`${restSek} Sekunden`}
          />
        </div>
      </div>

      {error && <p className="warmup-error"><X size={13} /> {error}</p>}

      <div style={{ display: 'flex', gap: '9px' }}>
        {mode === 'exercise' && hasOverride && onReset && (
          <motion.button
            type="button"
            onClick={reset}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            aria-label="Eigene Werte zurücksetzen und globale Ziele verwenden"
            className="warmup-reset"
          >
            <RotateCcw size={17} />
          </motion.button>
        )}
        <motion.button
          type="button"
          onClick={() => { void save(); }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          disabled={saving}
          className="warmup-confirm"
        >
          {mode === 'global' ? <Target size={16} /> : <Timer size={16} />} Übernehmen
        </motion.button>
      </div>
    </>
  );
}

interface SliderGroupProps {
  value: RepTargetRange;
  onChange: (range: RepTargetRange) => void;
}

/** Loser Slider-Zwilling für Inline-Flächen (Base-Einstellungen) — gekoppelt wie im Sheet. */
export function RepTargetSliderGroup({ value, onChange }: SliderGroupProps) {
  const changeMin = (raw: number) => {
    const next = Math.min(29, Math.max(1, raw));
    onChange({ min: next, max: next >= value.max ? next + 1 : value.max });
  };
  const changeMax = (raw: number) => {
    const next = Math.min(30, Math.max(2, raw));
    onChange({ min: next <= value.min ? next - 1 : value.min, max: next });
  };
  return (
    <div className="rep-slider-group">
      <div className="rep-slider-row">
        <div className="rep-slider-head">
          <span className="rep-slider-label">Unteres Ziel</span>
          <span className="rep-slider-value">{value.min}</span>
        </div>
        <input
          type="range"
          className="rep-slider"
          min={1}
          max={29}
          value={value.min}
          onChange={(event) => changeMin(Number(event.target.value))}
          aria-label="Unteres Rep-Ziel"
          aria-valuetext={`${value.min} Reps`}
        />
      </div>
      <div className="rep-slider-row">
        <div className="rep-slider-head">
          <span className="rep-slider-label">Oberes Ziel</span>
          <span className="rep-slider-value">{value.max}</span>
        </div>
        <input
          type="range"
          className="rep-slider"
          min={2}
          max={30}
          value={value.max}
          onChange={(event) => changeMax(Number(event.target.value))}
          aria-label="Oberes Rep-Ziel"
          aria-valuetext={`${value.max} Reps`}
        />
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { BottomSheet } from './BottomSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { RIR_DEFAULT_OPTIONS, REST_DURATION_OPTIONS, useBasePrefs } from '../hooks/useBasePrefs';

const RIR_LABELS: Record<string, string> = { none: 'Aus', 0: '0', 1: '1', 2: '2', 3: '3', failure: 'Failure' };

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** „Trainingseinstellungen“ — dieselben Standardwerte wie Base → „Pausen-Timer & Sätze“,
 *  direkt im Training erreichbar. Änderungen persistieren sofort und wirken live
 *  (die Pausen-Leiste liest die Dauer erst beim Abhaken). */
export function SessionSettingsSheet({ isOpen, onClose }: Props) {
  const reduced = useReducedMotion();
  const prefs = useBasePrefs();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Trainingseinstellungen" centeredTitle>
      <div style={{ display: 'grid', gap: '18px', paddingBottom: '4px' }}>
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
        <button
          className="warmup-toggle"
          type="button"
          role="switch"
          aria-checked={prefs.timerSound}
          onClick={() => prefs.setTimerSound(!prefs.timerSound)}
          style={{ marginBottom: 0 }}
        >
          <span>
            <span className="warmup-toggle-title">Timer-Sound</span>
            <span className="warmup-toggle-sub">Kurzer Ton, wenn die Pause endet.</span>
          </span>
          <span className={`warmup-switch${prefs.timerSound ? ' is-on' : ''}`} aria-hidden="true"><span className="warmup-switch-knob" /></span>
        </button>
        <button
          className="warmup-toggle"
          type="button"
          role="switch"
          aria-checked={prefs.timerVibration}
          onClick={() => prefs.setTimerVibration(!prefs.timerVibration)}
          style={{ marginBottom: 0 }}
        >
          <span>
            <span className="warmup-toggle-title">Vibration</span>
            <span className="warmup-toggle-sub">Doppeltes Vibrieren beim Pausenende.</span>
          </span>
          <span className={`warmup-switch${prefs.timerVibration ? ' is-on' : ''}`} aria-hidden="true"><span className="warmup-switch-knob" /></span>
        </button>
      </div>
    </BottomSheet>
  );
}

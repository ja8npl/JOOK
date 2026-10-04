import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { readTimerFeedback } from '../hooks/useBasePrefs';
import { playBeep, vibratePattern } from '../lib/timerFeedback';
import { formatRestTime } from '../lib/rest';

interface Props {
  /** Absoluter Endzeitpunkt (Date.now()-Basis) — liest bei jedem Tick die Wanduhr,
   *  darum läuft die Pause nach iOS-Hintergrund/Sperrbildschirm korrekt weiter. */
  deadline: number;
  /** Totale Dauer in Sekunden (Skalierung der Fortschrittslinie). */
  duration: number;
  /** Kontextzeile: Übung, deren Satz die Pause gestartet hat. */
  label: string;
  onSkip: () => void;
  /** ±15 s — verändert Deadline und Dauer (Parent besitzt den Zustand). */
  onAdjust: (deltaSeconds: number) => void;
}

/**
 * Pausen-Leiste der Session: dockt über dem Footer („Now-Playing"-Platz), startet
 * automatisch beim Abhaken eines Arbeitssatzes. Wall-Clock-basiert — jeder Tick
 * rechnet Restzeit aus Date.now() minus Deadline, nie über Interval-Drift.
 * Ablauf: einmaliger Finish-Beat (Ton/Vibration nach Base-Präferenzen),
 * Auto-Schließen nach 4 s.
 */
export function RestTimerBar({ deadline, duration, label, onSkip, onAdjust }: Props) {
  const reduced = useReducedMotion();
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const [finished, setFinished] = useState(false);
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const diffMs = deadline - Date.now();
      setRemaining(Math.max(0, Math.ceil(diffMs / 1000)));
      if (diffMs <= 0) {
        if (!finishedRef.current) {
          finishedRef.current = true;
          setFinished(true);
          const feedback = readTimerFeedback();
          if (feedback.sound) playBeep();
          if (feedback.vibration) vibratePattern();
        }
        return; // Loop stoppt — Ablaufzustand bleibt bis zum Auto-Schließen stehen
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [deadline]);

  // Sichtbarkeits-Recalc: Nach Rückkehr aus dem Hintergrund sofort den echten Stand zeigen.
  useEffect(() => {
    const recalc = () => {
      if (finishedRef.current) return;
      const diffMs = deadline - Date.now();
      setRemaining(Math.max(0, Math.ceil(diffMs / 1000)));
      if (diffMs <= 0) {
        finishedRef.current = true;
        setFinished(true);
        const feedback = readTimerFeedback();
        if (feedback.sound) playBeep();
        if (feedback.vibration) vibratePattern();
      }
    };
    document.addEventListener('visibilitychange', recalc);
    window.addEventListener('focus', recalc);
    return () => {
      document.removeEventListener('visibilitychange', recalc);
      window.removeEventListener('focus', recalc);
    };
  }, [deadline]);

  // Auto-Schließen 4 s nach Ablauf — der Beat landet, die Leiste räumt sich weg.
  useEffect(() => {
    if (!finished) return;
    const timer = window.setTimeout(() => onSkip(), 4000);
    return () => window.clearTimeout(timer);
  }, [finished, onSkip]);

  const progress = duration > 0 ? Math.min(1, Math.max(0, remaining / duration)) : 0;

  return (
    <motion.div
      className={`rest-bar${finished ? ' is-finished' : ''}`}
      initial={reduced ? false : { y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={reduced ? undefined : { y: 28, opacity: 0 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
      role="timer"
      aria-label={`Pausen-Timer: ${formatRestTime(remaining)} verbleibend${finished ? ', nächster Satz' : ''}`}
    >
      <div className="rest-bar-main">
        <strong className="rest-bar-time">{formatRestTime(remaining)}</strong>
        <div className="rest-bar-copy">
          <span className="eyebrow accent-copy">
            {finished ? <Bell size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} /> : null}
            {finished ? 'Bereit' : 'Pause'}
          </span>
          <span className="rest-bar-label">{label}</span>
        </div>
        <div className="rest-bar-actions">
          {!finished && (
            <>
              <button type="button" className="rest-bar-chip" aria-label="15 Sekunden weniger" onClick={() => onAdjust(-15)}>−15</button>
              <button type="button" className="rest-bar-chip" aria-label="15 Sekunden länger" onClick={() => onAdjust(15)}>+15</button>
            </>
          )}
          <button type="button" className="rest-bar-chip is-skip" aria-label={finished ? 'Schließen' : 'Pause überspringen'} onClick={onSkip}><X size={15} /></button>
        </div>
      </div>
      <div className="rest-bar-line" style={{ transform: `scaleX(${finished ? 0 : progress})` }} aria-hidden="true" />
    </motion.div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, SkipForward } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  /** Startet neu, wenn sich startKey ändert */
  startKey: number;
  onDone?: () => void;
}

const DURATION_OPTIONS = [60, 90, 120, 180];
const STORAGE_KEY = 'gymlog.restDuration';

/** Web-Audio-Beep (kein Asset, läuft offline) */
function playBeep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio nicht verfügbar (z. B. Autoplay-Policy) — visuelles Signal reicht
  }
}

/** Vibration, wo unterstützt (Android/Chrome; iOS Safari vibriert nicht, fällt auf visuell zurück) */
function vibrate() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // nicht unterstützt
  }
}

const RING_RADIUS = 86;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function RestTimer({ startKey, onDone }: Props) {
  const reduced = useReducedMotion();
  const [dauer, setDauer] = useState<number>(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return DURATION_OPTIONS.includes(stored) ? stored : 90;
  });
  const [restSek, setRestSek] = useState(0);
  const [lauft, setLaeuft] = useState(false);
  const [abgelaufen, setAbgelaufen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Neuer Satz abgeschlossen → Timer starten
  useEffect(() => {
    if (startKey > 0) {
      setRestSek(dauer);
      setLaeuft(true);
      setAbgelaufen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey]);

  useEffect(() => {
    if (!lauft) return;
    intervalRef.current = setInterval(() => {
      setRestSek((s) => {
        if (s <= 1) {
          setLaeuft(false);
          setAbgelaufen(true);
          playBeep();
          vibrate();
          onDone?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lauft]);

  const adjust = (delta: number) => {
    setAbgelaufen(false);
    setRestSek((s) => Math.max(0, s + delta));
    setLaeuft(true);
  };

  const skip = () => {
    setLaeuft(false);
    setRestSek(0);
    setAbgelaufen(false);
  };

  const setDauerAndStore = (d: number) => {
    setDauer(d);
    localStorage.setItem(STORAGE_KEY, String(d));
  };

  const aktiv = lauft || restSek > 0;
  const progress = dauer > 0 ? restSek / dauer : 0;
  const min = Math.floor(restSek / 60);
  const sek = restSek % 60;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      {/* Dauer-Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {DURATION_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDauerAndStore(d)}
            aria-pressed={dauer === d}
            style={{
              padding: '6px 14px',
              background: dauer === d ? 'var(--accent-dim)' : 'var(--bg-input)',
              boxShadow: dauer === d ? 'var(--neo-pressed)' : 'var(--neo-raised)',
              border: `1px solid ${dauer === d ? 'var(--border-accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-pill)',
              color: dauer === d ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {d}s
          </button>
        ))}
      </div>

      {/* Ring-Timer */}
      <div style={{ position: 'relative', width: '200px', height: '200px' }}>
        <svg width="200" height="200" viewBox="0 0 200 200" role="timer" aria-label={`Pausen-Timer: ${min}:${String(sek).padStart(2, '0')} verbleibend`}>
          <circle
            cx="100" cy="100" r={RING_RADIUS}
            fill="none" stroke="var(--bg-chip-inset)" strokeWidth="10"
          />
          <motion.circle
            cx="100" cy="100" r={RING_RADIUS}
            fill="none"
            stroke="var(--accent-text)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress) }}
            transition={reduced ? { duration: 0 } : { duration: 0.9, ease: 'linear' }}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <AnimatePresence mode="wait">
            {abgelaufen ? (
              <motion.div
                key="fertig"
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={reduced
                  ? { opacity: 1 }
                  : { scale: [0.6, 1.15, 1], opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
                style={{ textAlign: 'center' }}
              >
                <Bell size={22} color="var(--accent-text)" style={{ margin: '0 auto 4px' }} />
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--accent-text)',
                }}>
                  Fertig!
                </div>
              </motion.div>
            ) : (
              <motion.div key="count" style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: '44px',
                  fontWeight: 700,
                  color: aktiv ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {min}:{String(sek).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {aktiv ? 'Pause läuft' : 'Pause'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Steuerung */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <TimerButton onClick={() => adjust(-15)} disabled={!aktiv}>−15s</TimerButton>
        <TimerButton onClick={() => adjust(15)} disabled={false}>+15s</TimerButton>
        <TimerButton onClick={skip} disabled={!aktiv} primary>
          <SkipForward size={14} />
          Überspringen
        </TimerButton>
      </div>
    </div>
  );
}

function TimerButton({ onClick, disabled, primary, children }: {
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      style={{
        padding: '10px 16px',
        minHeight: '44px',
        background: primary && !disabled ? 'var(--accent)' : 'var(--bg-input)',
        boxShadow: disabled ? 'var(--neo-pressed)' : primary ? 'var(--neo-convex)' : 'var(--neo-raised)',
        border: primary && !disabled ? 'none' : '1px solid var(--border)',
        borderRadius: 'var(--radius-pill)',
        color: primary && !disabled ? 'var(--text-on-accent)' : disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
        fontSize: '14px',
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
    >
      {children}
    </motion.button>
  );
}

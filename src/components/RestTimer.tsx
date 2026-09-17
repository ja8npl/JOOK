import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, SkipForward } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  startKey: number;
  onDone?: () => void;
}

const DURATION_OPTIONS = [60, 90, 120, 180];
const STORAGE_KEY = 'gymlog.restDuration';

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
  } catch { /* Audio nicht verfügbar */ }
}

function vibrate() {
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* nicht unterstützt */ }
}

const RING_RADIUS = 82;
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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

  const aktiv    = lauft || restSek > 0;
  const progress = dauer > 0 ? restSek / dauer : 0;
  const min = Math.floor(restSek / 60);
  const sek = restSek % 60;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {/* Dauer-Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {DURATION_OPTIONS.map((d) => {
          const sel = dauer === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDauerAndStore(d)}
              aria-pressed={sel}
              style={{
                padding: '8px 16px',
                minHeight: '44px',
                background: sel ? 'var(--accent-dim)' : 'var(--bg-input)',
                boxShadow: sel ? 'var(--neo-pressed)' : 'var(--neo-pill)',
                border: `1px solid ${sel ? 'var(--border-accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-pill)',
                color: sel ? 'var(--accent-text)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: sel ? 700 : 500,
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                transition:
                  'box-shadow 160ms var(--ease-out), background 160ms var(--ease-out), color 160ms var(--ease-out)',
              }}
            >
              {d}s
            </button>
          );
        })}
      </div>

      {/* Ring-Timer — in einem Pressed-Well Container */}
      <div style={{
        position: 'relative',
        width: '200px',
        height: '200px',
        /* Ring-Container selbst eingestanzt */
        background: 'var(--bg-input)',
        borderRadius: '50%',
        boxShadow: 'var(--neo-pressed)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          style={{ position: 'absolute', inset: 0 }}
          role="timer"
          aria-label={`Pausen-Timer: ${min}:${String(sek).padStart(2, '0')} verbleibend`}
        >
          {/* Track */}
          <circle
            cx="100" cy="100" r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Progress */}
          <motion.circle
            cx="100" cy="100" r={RING_RADIUS}
            fill="none"
            stroke={abgelaufen ? 'var(--accent-text)' : aktiv ? 'var(--accent-text)' : 'var(--text-tertiary)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress) }}
            transition={reduced ? { duration: 0 } : { duration: 0.9, ease: 'linear' }}
            transform="rotate(-90 100 100)"
            style={{ filter: aktiv ? 'drop-shadow(0 0 6px var(--accent-glow))' : 'none' }}
          />
        </svg>

        {/* Zahl im Ring-Zentrum */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <AnimatePresence mode="wait">
            {abgelaufen ? (
              <motion.div
                key="fertig"
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={reduced ? { opacity: 1 } : { scale: [0.6, 1.18, 1], opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.42, ease: 'easeOut' }}
                style={{ textAlign: 'center' }}
              >
                <Bell size={24} color="var(--accent-text)" style={{ margin: '0 auto 4px', display: 'block' }} />
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--accent-text)',
                }}>
                  Fertig!
                </div>
              </motion.div>
            ) : (
              <motion.div key="count">
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: aktiv ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {min}:{String(sek).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', letterSpacing: '0.04em' }}>
                  {aktiv ? 'PAUSE' : 'BEREIT'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Steuerung */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <TimerButton onClick={() => adjust(-15)} disabled={!aktiv}>−15s</TimerButton>
        <TimerButton onClick={() => adjust(15)} disabled={false}>+15s</TimerButton>
        <TimerButton onClick={skip} disabled={!aktiv} primary>
          <SkipForward size={14} strokeWidth={2} />
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
      whileTap={disabled ? undefined : { scale: 0.96 }}
      style={{
        padding: '10px 18px',
        minHeight: '46px',
        background: primary && !disabled ? 'var(--accent)' : 'var(--bg-input)',
        boxShadow: disabled
          ? 'var(--neo-pressed)'
          : primary
            ? 'var(--neo-convex)'
            : 'var(--neo-pill)',
        border: primary && !disabled ? 'none' : '1px solid var(--border)',
        borderRadius: 'var(--radius-pill)',
        color: primary && !disabled
          ? 'var(--text-on-accent)'
          : disabled
            ? 'var(--text-tertiary)'
            : 'var(--text-primary)',
        fontSize: '13px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition:
          'box-shadow 160ms var(--ease-out), background 160ms var(--ease-out)',
      }}
    >
      {children}
    </motion.button>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Info, Target, Zap } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const WEIGHT_STEP = 2.5;

function roundToStep(value: number): number {
  return Math.round(value / WEIGHT_STEP) * WEIGHT_STEP;
}

export function Warmup() {
  const reduced = useReducedMotion();
  const [workingWeightStr, setWorkingWeightStr] = useState('');
  const [showSet3, setShowSet3] = useState(false);

  const workingWeight = parseFloat(workingWeightStr);
  const isValid = !isNaN(workingWeight) && workingWeight > 0;

  const set1 = isValid ? roundToStep(workingWeight * 0.25) : 0;
  const set2 = isValid ? roundToStep(workingWeight * 0.50) : 0;
  const set3 = isValid ? roundToStep(workingWeight * 0.75) : 0;

  return (
    <div className="page-container">
      {/* Header */}
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: '30px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          marginBottom: '4px',
        }}>
          Warm-Up Rechner
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          Berechne deine Aufwärmsätze basierend auf dem Arbeitsgewicht.
        </p>
      </header>

      {/* Input Section */}
      <div style={{ marginBottom: '32px' }}>
        <label htmlFor="working-weight" style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: '8px',
          letterSpacing: '0.02em',
        }}>
          ARBEITSGEWICHT (KG)
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="working-weight"
            type="text"
            inputMode="decimal"
            value={workingWeightStr}
            onChange={(e) => setWorkingWeightStr(e.target.value)}
            placeholder="z.B. 100"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: '32px',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              padding: '16px 20px',
              paddingRight: '60px',
              background: 'var(--bg-input)',
              boxShadow: 'var(--neo-pressed)',
              border: '1px solid var(--border-accent)',
            }}
          />
          <span style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: "var(--font-display)",
            fontSize: '24px',
            color: 'var(--accent-text)',
            fontWeight: 600,
            pointerEvents: 'none',
          }}>
            kg
          </span>
        </div>
      </div>

      {/* Results Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px' }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Aufwärmsätze
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={14} />
            Gerundet auf {WEIGHT_STEP} kg
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {isValid ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <SetCard 
                setNum={1} 
                percentage="25%" 
                weight={set1} 
                reps="10-20"
                icon={<Target size={16} color="var(--accent-text)" />} 
              />
              <SetCard 
                setNum={2} 
                percentage="50%" 
                weight={set2} 
                reps="3-10"
                icon={<Zap size={16} color="var(--accent-text)" />} 
              />
              
              {/* Optional Set 3 Toggle */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 4px',
                marginTop: '4px',
                borderTop: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Optionaler 3. Satz (75%)
                </span>
                <button
                  role="switch"
                  aria-checked={showSet3}
                  onClick={() => setShowSet3(!showSet3)}
                  style={{
                    width: '52px',
                    height: '44px',
                    borderRadius: '22px',
                    background: showSet3 ? 'var(--accent)' : 'var(--bg-chip-inset)',
                    boxShadow: showSet3 ? 'inset 0 1px 2px rgba(0, 0, 0, 0.2)' : 'var(--neo-pressed)',
                    /* Transparent statt none — verhindert 1px-Layoutshift beim Toggle */
                    border: showSet3 ? '1px solid transparent' : '1px solid var(--border)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <motion.div
                    layout
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: showSet3 ? 'var(--bg-base)' : 'var(--text-tertiary)',
                      position: 'absolute',
                      top: '11px',
                      left: showSet3 ? 'auto' : '12px',
                      right: showSet3 ? '12px' : 'auto',
                      boxShadow: 'var(--neo-knob)',
                    }}
                  />
                </button>
              </div>

              <AnimatePresence>
                {showSet3 && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                    exit={reduced ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <SetCard 
                      setNum={3} 
                      percentage="75%" 
                      weight={set3} 
                      reps="2-3"
                      icon={<Dumbbell size={16} color="var(--accent-text)" />} 
                      isHighlight
                    />
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card)',
                border: '1px dashed var(--border)',
              }}
            >
              <Dumbbell size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '15px' }}>
                Gib dein Arbeitsgewicht oben ein, um die Aufwärmsätze zu berechnen.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SetCard({ setNum, percentage, weight, reps, icon, isHighlight = false }: {
  setNum: number;
  percentage: string;
  weight: number;
  reps: string;
  icon: React.ReactNode;
  isHighlight?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isHighlight ? 'var(--border-accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-card)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      /* Highlight als Inset-Glow: Der Animationswrapper (overflow: hidden) würde
         einen äußeren Halo abschneiden — Inset liegt sicher innerhalb der Box. */
      boxShadow: isHighlight
        ? 'var(--shadow-card), inset 0 0 0 1px var(--border-accent), inset 0 0 24px var(--accent-dim)'
        : 'var(--shadow-card)',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: 'var(--accent-dim)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--neo-pressed)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em' }}>
            SATZ {setNum}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>•</span>
          <span style={{ fontSize: '12px', color: 'var(--accent-text)' }}>{percentage}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: '28px',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}>
            {weight}
          </span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>kg</span>
        </div>
      </div>

      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          Reps
        </span>
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: '20px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}>
          {reps}
        </span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Plus } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  defaultWeight?: number;
  onComplete: (gewicht: number, wiederholungen: number) => void;
}

const GEWICHT_STEP = 2.5;

export function SetCounter({ defaultWeight, onComplete }: Props) {
  const reduced = useReducedMotion();
  const [gewicht, setGewicht] = useState<number>(defaultWeight ?? 20);
  const [wiederholungen, setWiederholungen] = useState(0);

  const [prevDefault, setPrevDefault] = useState(defaultWeight);
  if (defaultWeight !== undefined && defaultWeight !== prevDefault) {
    setPrevDefault(defaultWeight);
    setGewicht(defaultWeight);
  }

  const bumpGewicht = (delta: number) => {
    setGewicht((g) => Math.max(0, Math.round((g + delta) * 10) / 10));
  };

  const complete = () => {
    if (wiederholungen <= 0) return;
    onComplete(gewicht, wiederholungen);
    setWiederholungen(0);
  };

  const canComplete = wiederholungen > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── Gewicht ─────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="gewicht-input" style={{ ...sectionLabelStyle, display: 'block' }}>Gewicht (kg)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StepperButton onClick={() => bumpGewicht(-GEWICHT_STEP)} label="2,5 kg weniger">
            <Minus size={16} strokeWidth={2.5} />
          </StepperButton>

          <input
            id="gewicht-input"
            type="number"
            inputMode="decimal"
            step={GEWICHT_STEP}
            min={0}
            value={gewicht}
            onChange={(e) => {
              const v = Number(e.target.value);
              setGewicht(isFinite(v) && v >= 0 ? v : 0);
            }}
            aria-label="Gewicht in Kilogramm"
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '22px',
              fontVariantNumeric: 'tabular-nums',
              /* Input als tiefes Well — klar von Buttons abgegrenzt */
              background: 'var(--bg-input)',
              boxShadow: 'var(--neo-pressed)',
              borderRadius: 'var(--radius-input)',
              padding: '14px 8px',
            }}
          />

          <StepperButton onClick={() => bumpGewicht(GEWICHT_STEP)} label="2,5 kg mehr">
            <Plus size={16} strokeWidth={2.5} />
          </StepperButton>
        </div>
      </div>

      {/* ── Wiederholungen ──────────────────────────────────────────────── */}
      <div>
        <div id="wiederholungen-label" style={sectionLabelStyle}>Wiederholungen</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StepperButton onClick={() => setWiederholungen((w) => Math.max(0, w - 1))} label="Eine weniger">
            <Minus size={16} strokeWidth={2.5} />
          </StepperButton>

          {/* Großer Tap-Counter — konvex, aktiv wird es pressed */}
          <motion.button
            type="button"
            onClick={() => setWiederholungen((w) => w + 1)}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            aria-labelledby="wiederholungen-label"
            aria-live="polite"
            style={{
              flex: 1,
              minHeight: '80px',
              background: wiederholungen > 0 ? 'var(--accent-dim)' : 'var(--bg-input)',
              border: `1px solid ${wiederholungen > 0 ? 'var(--border-accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              color: wiederholungen > 0 ? 'var(--accent-text)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font-display)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '42px',
              fontWeight: 800,
              cursor: 'pointer',
              lineHeight: 1,
              boxShadow: wiederholungen > 0 ? 'var(--neo-raised)' : 'var(--neo-pressed)',
              transition:
                'box-shadow 160ms var(--ease-out), background 160ms var(--ease-out), color 160ms var(--ease-out), border-color 160ms var(--ease-out)',
            }}
          >
            {wiederholungen}
          </motion.button>

          <StepperButton onClick={() => setWiederholungen((w) => w + 1)} label="Eine mehr">
            <Plus size={16} strokeWidth={2.5} />
          </StepperButton>
        </div>
      </div>

      {/* ── Satz abschließen ────────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={complete}
        disabled={!canComplete}
        whileTap={reduced || !canComplete ? undefined : { scale: 0.96 }}
        style={{
          width: '100%',
          padding: '16px',
          minHeight: '54px',
          background: canComplete ? 'var(--accent)' : 'var(--bg-input)',
          boxShadow: canComplete ? 'var(--neo-convex)' : 'var(--neo-pressed)',
          border: canComplete ? 'none' : '1px solid var(--border)',
          borderRadius: 'var(--radius-input)',
          color: canComplete ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '0.02em',
          cursor: canComplete ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition:
            'background 200ms var(--ease-out), box-shadow 200ms var(--ease-out), color 200ms var(--ease-out)',
        }}
      >
        <Check size={18} strokeWidth={2.5} />
        Satz abschließen
      </motion.button>
    </div>
  );
}

/** Stepper-Button — quadratisch, eingestanzt, haptisches Active-Feedback */
function StepperButton({ onClick, label, children }: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      aria-label={label}
      style={{
        width: '48px',
        height: '48px',
        flexShrink: 0,
        background: 'var(--bg-input)',
        boxShadow: 'var(--neo-pressed)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'box-shadow var(--duration-press) var(--ease-press)',
      }}
    >
      {children}
    </motion.button>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '8px',
};

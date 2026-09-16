import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Plus } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  /** Vorbelegung: letztes genutztes Gewicht dieser Maschine */
  defaultWeight?: number;
  /** Wird nach "Satz abschließen" aufgerufen */
  onComplete: (gewicht: number, wiederholungen: number) => void;
}

const GEWICHT_STEP = 2.5;

export function SetCounter({ defaultWeight, onComplete }: Props) {
  const reduced = useReducedMotion();
  const [gewicht, setGewicht] = useState<number>(defaultWeight ?? 20);
  const [wiederholungen, setWiederholungen] = useState(0);

  // Vorbelegung nachladen, sobald das letzte Gewicht aus der DB da ist
  // (State-Anpassung während des Renderns statt Effekt — React-Empfehlung)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Gewicht */}
      <div>
        <div style={counterLabelStyle}>Gewicht (kg)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StepperButton onClick={() => bumpGewicht(-GEWICHT_STEP)} label="2,5 kg weniger">
            <Minus size={16} />
          </StepperButton>
          <input
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
            style={{ textAlign: 'center', fontWeight: 600, fontSize: '17px' }}
          />
          <StepperButton onClick={() => bumpGewicht(GEWICHT_STEP)} label="2,5 kg mehr">
            <Plus size={16} />
          </StepperButton>
        </div>
      </div>

      {/* Wiederholungen */}
      <div>
        <div style={counterLabelStyle}>Wiederholungen</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StepperButton onClick={() => setWiederholungen((w) => Math.max(0, w - 1))} label="Eine Wiederholung weniger">
            <Minus size={16} />
          </StepperButton>
          <motion.button
            type="button"
            onClick={() => setWiederholungen((w) => w + 1)}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            aria-label="Wiederholung zählen"
            style={{
              flex: 1,
              minHeight: '72px',
              background: 'var(--accent-dim)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-input)',
              color: 'var(--accent-text)',
              fontFamily: "var(--font-display)",
              fontVariantNumeric: 'tabular-nums',
              fontSize: '34px',
              fontWeight: 700,
              cursor: 'pointer',
              lineHeight: 1,
              boxShadow: 'var(--neo-raised)',
            }}
          >
            {wiederholungen}
          </motion.button>
          <StepperButton onClick={() => setWiederholungen((w) => w + 1)} label="Eine Wiederholung mehr">
            <Plus size={16} />
          </StepperButton>
        </div>
      </div>

      {/* Satz abschließen */}
      <motion.button
        type="button"
        onClick={complete}
        disabled={wiederholungen <= 0}
        whileTap={reduced || wiederholungen <= 0 ? undefined : { scale: 0.97 }}
        style={{
          width: '100%',
          padding: '14px',
          background: wiederholungen > 0 ? 'var(--accent)' : 'var(--bg-input)',
          boxShadow: wiederholungen > 0 ? 'var(--neo-convex)' : 'var(--neo-pressed)',
          border: wiederholungen > 0 ? 'none' : '1px solid var(--border)',
          borderRadius: 'var(--radius-input)',
          color: wiederholungen > 0 ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
          fontSize: '16px',
          fontWeight: 600,
          cursor: wiederholungen > 0 ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minHeight: '48px',
        }}
      >
        <Check size={18} strokeWidth={2.5} />
        Satz abschließen
      </motion.button>
    </div>
  );
}

function StepperButton({ onClick, label, children }: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.90 }}
      aria-label={label}
      style={{
        width: '44px',
        height: '44px',
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
      }}
    >
      {children}
    </motion.button>
  );
}

const counterLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.04em',
  marginBottom: '6px',
};

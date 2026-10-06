import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from './BottomSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { createHoldConfirm, type HoldConfirmController } from '../lib/holdConfirm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  /** Sekundäre Aktion — benennt, was nach dem Abbruch passiert (z. B. „Weiter trainieren“). */
  cancelLabel?: string;
  /** Konkrete Verlust-Fakten (Zeit, Übungen, Sätze) — zeigen die Wette, statt abstrakt zu warnen.
   *  Nur in der Warn-Variante sichtbar; die Motivations-Variante zeigt den Ring. */
  details?: { label: string; value: string }[];
  /** Motivierende Variante: Fortschritt (geloggte/geplante Arbeitssätze) statt reiner Warnung.
   *  null/undefined = klassische Warn-Variante. */
  progress?: { completed: number; planned: number } | null;
}

/* ── Konzept „Halte-Moment“ statt Bestätigungsdialog:
   Die Zerstörung will gehalten werden: Die destructive Aktion ist ein Hold-to-Confirm
   (Drücken + 1,5 s halten). Ein Tap reicht nie — versehentliches Wischen/X kann nicht mehr
   ein Training löschen, und der Akt fühlt sich bewusst an wie ein Garmin-„Hold to discard“.

   Timing (asymmetrisch, bewusst):
   - Backdrop 180ms, danger-getönt — die ganze Umgebung kippt in Warnstimmung, sofort.
   - Hold-Sweep: 1500ms linear — die deliberante Phase ist langsam und konstant,
     wie ein Timer, der scharf gestellt wird (Emil-Pattern: hold-to-delete, linear).
   - Loslassen vorzeitig: 200ms var(--ease-out) — die Systemreaktion ist schnell.
   - Stagger 50ms pro Element wie in allen Content-Sheets.
   Reduced Motion: kein Sweep und kein Scale — Fill/Label wechseln instant, die
   Halte-Geste selbst bleibt (sie ist Interaktion, keine Bewegung). ── */
const BACKDROP_MS = 0.18;
const HOLD_MS = 1500;
const STAGGER_S = 0.05;

/** Ein Stagger-Element: fade + kleiner y-offset, individuell verzögert. */
function StaggerItem({ children, index, reduced }: { children: React.ReactNode; index: number; reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: 8 }}
      transition={reduced
        ? { duration: 0 }
        : { duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: index * STAGGER_S }}
    >
      {children}
    </motion.div>
  );
}

const satzWort = (n: number) => (n === 1 ? 'Satz' : 'Sätze');

/** Fortschritts-Ring — gleiche Optik wie die Kraft/Volumen/Konsistenz-Ringe auf Home
 *  (r=26, Gradient accent-primary→secondary, animiertes strokeDashoffset). */
function ProgressRing({ completed, planned, reduced }: { completed: number; planned: number; reduced: boolean }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, completed / planned));
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`Fortschritt: ${Math.round(clamped * 100)} %`}>
      <defs>
        <linearGradient id="confirm-progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-primary)" />
          <stop offset="100%" stopColor="var(--accent-secondary)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--ring-track)" strokeWidth="3.5" />
      <motion.circle
        cx="32" cy="32" r={radius} fill="none"
        stroke="url(#confirm-progress-grad)"
        strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={reduced ? false : { strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - clamped) }}
        transition={{ duration: reduced ? 0 : 0.9, delay: 0.1 + STAGGER_S, ease: [0.22, 1, 0.36, 1] }}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="33" textAnchor="middle" dominantBaseline="central" className="gauge-ring-text">
        {Math.round(clamped * 100)}<tspan fontSize="9" fill="var(--text-tertiary)">%</tspan>
      </text>
    </svg>
  );
}

/** React-Verdrahtung um die framework-freie Hold-Logik (src/lib/holdConfirm.ts). */
function useHoldConfirm(onComplete: () => void, holdMs: number) {
  const [holding, setHolding] = useState(false);
  /** Nach komplettiertem Hold friert der Fill ein: Während der Sheet-Exit-Animation
   *  läuft er nicht mehr zurück, das Sheet verlässt den Screen „scharf gestellt“. */
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const controllerRef = useRef<HoldConfirmController | null>(null);

  /* Refs werden ausschließlich in Effekten geschrieben (React-Compiler-Regel) —
     die Callbacks lesen zum Zeitpunkt des Feuerns den aktuellen Stand. */
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    controllerRef.current = createHoldConfirm(holdMs, () => {
      completedRef.current = true;
      onCompleteRef.current();
    });
    return () => {
      controllerRef.current?.cancel();
      controllerRef.current = null;
    };
  }, [holdMs]);

  const start = () => {
    completedRef.current = false;
    setHolding(true);
    controllerRef.current?.start();
  };
  const cancel = () => {
    if (completedRef.current) return;
    controllerRef.current?.cancel();
    setHolding(false);
  };
  /* Tastatur (Enter/Space) bestätigt direkt: Die Halte-Hürde existiert gegen
     versehentliche Touch-Activation, nicht gegen bewusste Eingabe —
     für Screen-Reader-/Tastaturnutzer bleibt das ein normaler Button. */
  const confirmNow = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    controllerRef.current?.cancel();
    onCompleteRef.current();
  };

  return {
    holding,
    pointerHandlers: {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!e.isPrimary) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
    keyHandlers: {
      onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          confirmNow();
        }
      },
    },
  };
}

/** Hold-to-Confirm-Button: inset-Track (Plush-Layering „scharf gestellt“), über dem
 *  ein Danger-Fill per clip-path nachläuft. Zwei gestapelte Labels mit identischem
 *  Clip — das weiße Label wird exakt mit dem Fill enthüllt (sauberer Farbwechsel
 *  ohne flackernde Textfarbe, wie Tabs-Clip-Technik). */
function HoldConfirmButton({ label, reduced, onConfirm }: { label: string; reduced: boolean; onConfirm: () => void }) {
  const hold = useHoldConfirm(onConfirm, HOLD_MS);
  const clip = hold.holding ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)';
  const fillTransition = reduced
    ? 'none'
    : hold.holding
      ? `clip-path ${HOLD_MS}ms linear`
      : 'clip-path 200ms var(--ease-out)';

  return (
    <button
      type="button"
      className="hold-danger"
      {...hold.pointerHandlers}
      {...hold.keyHandlers}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '17px',
        /* Liquid-Glass-Fill: die Danger-Wirkung kommt vom nachlaufenden Fill + Border,
           die Fläche bleibt Glas statt opakem Inset-Well. */
        background: 'var(--bg-glass)',
        boxShadow: 'var(--glass-shadow), var(--glass-edge)',
        border: '1px solid var(--danger-border)',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        overflow: 'hidden',
        /* Langdruck-Schutz: iOS würde sonst Text-Selektion/Callout über der Geste öffnen. */
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'none',
        transform: hold.holding && !reduced ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform var(--duration-press) var(--ease-press)',
      }}
    >
      <span style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700 }}>{label}</span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: 'var(--danger)',
          clipPath: clip,
          transition: fillTransition,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '17px',
          color: 'var(--text-main)',
          fontSize: '16px',
          fontWeight: 700,
          clipPath: clip,
          transition: fillTransition,
        }}
      >
        {label}
      </span>
    </button>
  );
}

/** Tap-Button im Liquid-Glass-Idiom (quiet = Glas-Pill) bzw. solide Accent-Fläche:
 *  Scale via Motion, Schatten-Wechsel konvex → pressed nur beim Accent-Button
 *  (die Glas-Pill feedbackt über Scale + Sheen aus der CSS-Klasse). */
function TapButton({ variant, onClick, reduced, children }: {
  variant: 'accent' | 'quiet';
  onClick: () => void;
  reduced: boolean;
  children: React.ReactNode;
}) {
  const accent = variant === 'accent';
  return (
    <motion.button
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className={accent ? undefined : 'glass-pill'}
      style={{
        width: '100%',
        padding: '17px',
        background: accent ? 'var(--accent-primary)' : undefined,
        boxShadow: accent ? 'var(--neo-convex)' : undefined,
        border: accent ? 'none' : undefined,
        borderRadius: accent ? 'var(--radius-input)' : undefined,
        color: accent ? 'var(--text-on-accent)' : 'var(--text-primary)',
        fontSize: '16px',
        fontWeight: accent ? 700 : 500,
        cursor: 'pointer',
        transition: 'box-shadow var(--duration-press) var(--ease-press)',
      }}
      onPointerDown={accent ? (e) => { e.currentTarget.style.boxShadow = 'var(--neo-pressed)'; } : undefined}
      onPointerUp={accent ? (e) => { e.currentTarget.style.boxShadow = 'var(--neo-convex)'; } : undefined}
      onPointerLeave={accent ? (e) => { e.currentTarget.style.boxShadow = 'var(--neo-convex)'; } : undefined}
    >
      {children}
    </motion.button>
  );
}

export function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title = 'Bist du sicher?',
  message = 'Diese Aktion kann nicht rückgängig gemacht werden.',
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  details,
  progress = null,
}: Props) {
  const reduced = useReducedMotion();
  const motivate = progress !== null && progress.planned > 0;
  const { completed, planned } = motivate ? progress : { completed: 0, planned: 0 };
  const remaining = planned - completed;

  /* Positiv-faktisch, kein Schuldgefühl: nennt konkret, was geschafft ist und was fehlt. */
  const motivateTitle = remaining === 0 ? 'Training komplett.' : 'Fast am Ziel.';
  const motivateMessage = remaining === 0
    ? `Du hast alle ${planned} ${satzWort(planned)} geschafft.`
    : `Du hast ${completed} von ${planned} ${satzWort(planned)} geschafft. Nur noch ${remaining} ${satzWort(remaining)} bis zum Ziel.`;

  const facts = !motivate && details && details.length > 0 ? details : null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      backdropDuration={BACKDROP_MS}
      /* Danger-getönte Abdunkelung: die ganze Umgebung kippt warm-rot statt neutral —
         Stimmung über den Token-Mix, funktioniert in allen vier Themes. */
      backdropBackground="color-mix(in srgb, var(--danger) 18%, var(--overlay))"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '8px' }}>
        {/* Slot 0: Fortschritts-Ring (nur Motivations-Variante) */}
        {motivate && (
          <StaggerItem index={0} reduced={reduced}>
            <ProgressRing completed={completed} planned={planned} reduced={reduced} />
          </StaggerItem>
        )}

        {/* Titel + Message — bewusst ohne Icon: Typo und Danger-Farbe tragen die Warnung
            (iOS-Alert-Prinzip), kein Icon-in-Box-Muster. */}
        <StaggerItem index={motivate ? 1 : 0} reduced={reduced}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 1.1,
              marginBottom: '8px',
            }}>
              {motivate ? motivateTitle : title}
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {motivate ? motivateMessage : message}
            </p>
            {motivate && (
              <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Beim Verwerfen wird diese Einheit nicht gespeichert.
              </p>
            )}
          </div>
        </StaggerItem>

        {/* Verlust-Fakten: nackte Zahlenreihe mit Hairlines — tabellarisch wie die
            Satz-Tabelle der App. Kein Karten-Container. */}
        {facts && (
          <StaggerItem index={1} reduced={reduced}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {facts.map((fact, i) => (
                <div key={fact.label} style={{
                  flex: 1,
                  marginLeft: i === 0 ? 0 : '18px',
                  paddingLeft: i === 0 ? 0 : '18px',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                }}>
                  <div style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    marginBottom: '4px',
                  }}>
                    {fact.label}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: 'var(--tracking-display)',
                  }}>
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>
          </StaggerItem>
        )}

        {/* Buttons — die Regel ist konsequent: Zerstörung will gehalten werden, beide
            Varianten halten. Reihenfolge dreht sich: Warnung → Hold primär; Motivation →
            „Weitermachen“ primär (Accent), Hold sekundär. */}
        <StaggerItem index={2} reduced={reduced}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {motivate ? (
              <>
                <TapButton variant="accent" onClick={onClose} reduced={reduced}>
                  Weitermachen
                </TapButton>
                <HoldConfirmButton label="Halten zum Verwerfen" reduced={reduced} onConfirm={onConfirm} />
              </>
            ) : (
              <>
                <HoldConfirmButton label={`Halten zum ${confirmLabel}`} reduced={reduced} onConfirm={onConfirm} />
                <TapButton variant="quiet" onClick={onClose} reduced={reduced}>
                  {cancelLabel}
                </TapButton>
              </>
            )}
          </div>
        </StaggerItem>
      </div>
    </BottomSheet>
  );
}

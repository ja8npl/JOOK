import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  /** Motivierende Variante: Fortschritt (geloggte/geplante Arbeitssätze) statt reiner Warnung.
   *  null/undefined = klassische Warn-Variante (unverändert). */
  progress?: { completed: number; planned: number } | null;
}

/* ── Timing — bewusst langsam-seriös statt verspielt:
   Backdrop 180ms (schneller als Content-Sheets: die Warnung soll sofort "da" sein,
   ohne den Tag-Blur von 220ms).
   Stagger 50ms pro Element (tastbarer Rhythmus, ohne als Sequenz zu nerven).
   Icon-Puls: einmalig, 320ms Scale 1→1.06→1 — signalisiert Gefahr, ohne zu blinken.
   Exit = Entrance gespiegelt, gleiche Dauern, kein Bounce (damping > stiffness/2).
   Reduced Motion: duration 0, reines Crossfade der Folie. ── */
const BACKDROP_MS = 0.18;
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
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="3.5" />
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

export function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title = 'Bist du sicher?',
  message = 'Diese Aktion kann nicht rückgängig gemacht werden.',
  confirmLabel = 'Löschen',
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
    : `Du hast ${completed} von ${planned} ${satzWort(planned)} geschafft – nur noch ${remaining} ${satzWort(remaining)} bis zum Ziel.`;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} backdropDuration={BACKDROP_MS}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '8px' }}>
        {/* Slot 1: Warn-Icon (Confirm) oder Fortschritts-Ring (Motivation) */}
        {motivate ? (
          <StaggerItem index={0} reduced={reduced}>
            <ProgressRing completed={completed} planned={planned} reduced={reduced} />
          </StaggerItem>
        ) : (
          <StaggerItem index={0} reduced={reduced}>
            <motion.div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-dim)',
                boxShadow: 'var(--neo-pressed)',
                border: '1px solid var(--danger-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              initial={reduced ? false : { scale: 1 }}
              animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
              transition={reduced
                ? { duration: 0 }
                : { duration: 0.32, delay: 0.05 + STAGGER_S, ease: 'easeInOut' }}
            >
              <AlertTriangle size={24} color="var(--danger)" strokeWidth={1.5} />
            </motion.div>
          </StaggerItem>
        )}

        <StaggerItem index={1} reduced={reduced}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: 'var(--tracking-display)',
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

        {/* Buttons — gleiche Geometrie in beiden Varianten, nur Reihenfolge/Farbe drehen sich:
            Motivation: „Weitermachen" primär (Accent), „Trotzdem verwerfen" sekundär —
            exakt so groß und erreichbar wie der bisherige Abbrechen-Button. */}
        <StaggerItem index={2} reduced={reduced}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {motivate ? (
              <>
                <motion.button
                  onClick={onClose}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                  style={{
                    width: '100%',
                    padding: '17px',
                    background: 'var(--accent-primary)',
                    boxShadow: 'var(--neo-convex)',
                    border: 'none',
                    borderRadius: 'var(--radius-input)',
                    color: 'var(--text-on-accent)',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'box-shadow var(--duration-press) var(--ease-press)',
                  }}
                  onPointerDown={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-pressed)'; }}
                  onPointerUp={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-convex)'; }}
                  onPointerLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-convex)'; }}
                >
                  Weitermachen
                </motion.button>
                <motion.button
                  onClick={onConfirm}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                  style={{
                    width: '100%',
                    padding: '17px',
                    background: 'var(--bg-input)',
                    boxShadow: 'var(--neo-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-input)',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'box-shadow var(--duration-press) var(--ease-press)',
                  }}
                  onPointerDown={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-pressed)'; }}
                  onPointerUp={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-raised)'; }}
                  onPointerLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-raised)'; }}
                >
                  Trotzdem verwerfen
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  onClick={onConfirm}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                  style={{
                    width: '100%',
                    padding: '17px',
                    background: 'var(--danger)',
                    boxShadow: 'var(--neo-convex)',
                    border: 'none',
                    borderRadius: 'var(--radius-input)',
                    color: 'var(--text-main)',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    /* Press-Feedback doppelt: Scale (motion) + Schatten-Wechsel (pointer events)
                       — konvex → pressed fühlt sich wie physisches Eindrücken an. */
                    transition: 'box-shadow var(--duration-press) var(--ease-press)',
                  }}
                  onPointerDown={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-pressed)'; }}
                  onPointerUp={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-convex)'; }}
                  onPointerLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-convex)'; }}
                >
                  {confirmLabel}
                </motion.button>
                <motion.button
                  onClick={onClose}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                  style={{
                    width: '100%',
                    padding: '17px',
                    background: 'var(--bg-input)',
                    boxShadow: 'var(--neo-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-input)',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'box-shadow var(--duration-press) var(--ease-press)',
                  }}
                  onPointerDown={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-pressed)'; }}
                  onPointerUp={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-raised)'; }}
                  onPointerLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--neo-raised)'; }}
                >
                  Abbrechen
                </motion.button>
              </>
            )}
          </div>
        </StaggerItem>
      </div>
    </BottomSheet>
  );
}

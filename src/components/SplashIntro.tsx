/*
 * Launch-Sequenz: iOS-Splash → Intro → App.
 *
 * Das Overlay repliziert das statische apple-touch-startup-image (PNGs aus
 * scripts/generate-splash.cjs) pixelgenau: gleicher Hintergrund (#1F2024),
 * gleiche Kachel (#09090B, Radius 22 % der Kantenlänge, exakt zentriert wie
 * im PNG), gleiches Dumbbell-Glyph (Lucide, Lime #CAFE00, Stroke 2/24).
 * iOS übergibt beim Kaltstart nahtlos an dieses Overlay, das die kurze
 * Choreographie spielt und in die App auflöst — kein harter Schnitt mehr.
 *
 * Choreographie:
 *   1. Glyph wird mit Feder aus dem Stillstand hochgezogen — wie eine Rep,
 *      die App „wärmt sich auf" (leichter Bounce + Mikro-Rotation).
 *   2. Beim Peak: einmaliger Ring-Glanz auf der Kachel (Materialmoment,
 *      kein permanenter Glow).
 *   3. Wordmark „Gym Log" steigt buchstabenweise mit Federn ein (40 ms
 *      Stagger), während die Kachel weiter auf die Marke im App-Header
 *      zusteuert und weich ausblendet — gleiche Achse wie der Eintritt
 *      (spatial consistency).
 *   4. Overlay löst sich, die darunter bereits stehende App wird sichtbar.
 *
 * Die Exit-Choreographie startet erst, wenn `ready` true meldet UND die
 * Mindestdauer um ist — die Animation läuft nie ins Leere, der Nutzer
 * wartet nie doppelt. Reduced Motion: keine Transformationen, nur ein
 * weicher Cross-Fade.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

/** Mindestdauer der Sequenz (ms) — auch auf schnellen Geräten ein Moment. */
const MIN_DURATION = 900;

/** Debug: ?splashSlow friert die Sequenz für Design-Review/Slow-Motion-Screenshots ein. */
const DEBUG_SLOW = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('splashSlow');
const MIN_DURATION_EFFECTIVE = DEBUG_SLOW ? 600_000 : MIN_DURATION;

/** Kurze Haltezeit nach `ready`, bevor der Abflug startet (ms). */
const HOLD_AFTER_READY = 240;

/** Kachel-Seitenlänge relativ zur Viewport-Breite — wie im PNG. */
const TILE_RATIO = 0.293;

/** Eckenradius relativ zur Kachelseitenlänge — wie im PNG und App-Icon. */
const TILE_RADIUS_RATIO = 0.22;

/** Glyph-Box relativ zur Kachelseitenlänge (Icon-Verhältnis 24:44). */
const GLYPH_RATIO = 0.545;

/** Header-Brand-Mark-Größe (px) — Zielgröße des Kachel-Abflugs. */
const BRAND_MARK_SIZE = 38;

/** Feder für den „Rep"-Glyph-Zug: Schwung spürbar, Settle kontrolliert. */
const PULL_SPRING = { type: 'spring' as const, bounce: 0.35, duration: 0.75 };

/** Kritisch gedämpfte Feder für den Abflug — kein Overshoot beim Verlassen. */
const EXIT_SPRING = { type: 'spring' as const, bounce: 0, duration: 0.55 };

interface SplashIntroProps {
  /** Wird gefeuert, sobald das Overlay komplett weg ist (zum Unmounten). */
  onDone: () => void;
}

export function SplashIntro({ onDone }: SplashIntroProps) {
  const reduced = useReducedMotion();
  const [minElapsed, setMinElapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  // Mindestdauer messen — unabhängig von der App-Bereitschaft.
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_DURATION_EFFECTIVE);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abflug: erst wenn die Mindestdauer um ist (die App rendert synchron
  // darunter, ist also spätestens dann bereit).
  useEffect(() => {
    if (!minElapsed || gone) return;
    const t = setTimeout(() => setLeaving(true), HOLD_AFTER_READY);
    return () => clearTimeout(t);
  }, [minElapsed, gone]);

  useEffect(() => {
    if (!leaving) return;
    const ms = reduced ? 380 : 560;
    const t = setTimeout(() => {
      setGone(true);
      onDone();
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  if (gone) return null;

  const tileSize = Math.round(Math.min(window.innerWidth, 430) * TILE_RATIO);
  const radius = Math.round(tileSize * TILE_RADIUS_RATIO);
  const glyphSize = Math.round(tileSize * GLYPH_RATIO);

  // Abflugbahn: Kachel schrumpft in Richtung Header-Brand-Mark und driftet
  // nach oben aus dem Zentrum.
  const exitY = -Math.round(window.innerHeight * 0.22);
  const exitScale = BRAND_MARK_SIZE / tileSize;

  // Portal auf document.body: Die BottomNav wird ebenfalls nach body portaliert
  // (z-Index 20) und würde sonst ÜBER dem Overlay liegen, da der app-shell als
  // position:fixed einen eigenen Stacking Context bildet.
  return createPortal(
    <motion.div
      className="splash-intro"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduced ? 0.38 : 0.5, ease: 'easeOut' }}
      aria-hidden="true"
    >
      <div className="splash-stage">
        <motion.div
          className="splash-intro-tile"
          style={{
            width: tileSize,
            height: tileSize,
            borderRadius: radius,
            // Zentrierung via negative Margins (transform gehört der Animation)
            marginLeft: -tileSize / 2,
            marginTop: -tileSize / 2,
          }}
          initial={false}
          animate={
            reduced
              ? { opacity: leaving ? 0 : 1 }
              : leaving
                ? { scale: exitScale, y: exitY, opacity: 0 }
                : { scale: 1, y: 0, opacity: 1 }
          }
          transition={reduced ? { duration: 0.38 } : leaving ? EXIT_SPRING : undefined}
        >
          <motion.div
            className="splash-intro-glyph"
            initial={reduced ? false : { scale: 0.94, y: 4, opacity: 0.55 }}
            animate={
              reduced
                ? { opacity: 1 }
                : leaving
                  ? { opacity: 0 }
                  : { scale: 1, y: 0, opacity: 1 }
            }
            transition={reduced ? { duration: 0.3 } : leaving ? { duration: 0.3 } : PULL_SPRING}
          >
            <motion.span
              className="splash-intro-glyph-inner"
              initial={reduced ? false : { rotate: 0 }}
              animate={reduced || leaving ? { rotate: 0 } : { rotate: [0, -5, 0] }}
              transition={{ duration: 0.7, delay: 0.08, ease: 'easeInOut' }}
            >
              <Dumbbell size={glyphSize} strokeWidth={2} />
            </motion.span>
          </motion.div>

          {/* Ring-Glanz beim Rep-Peak — einmalig, dann weg */}
          {!reduced && (
            <motion.span
              className="splash-intro-ring"
              style={{ borderRadius: radius }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0.92, 1.1, 1.2] }}
              transition={{ duration: 0.85, delay: 0.18, ease: 'easeOut' }}
            />
          )}
        </motion.div>
      </div>

      <motion.div
        className="splash-intro-wordmark"
        style={{ top: `calc(50% + ${tileSize / 2 + 30}px)` }}
        initial={reduced ? false : 'hidden'}
        animate={reduced ? 'visible' : leaving ? 'exit' : 'visible'}
        variants={{
          hidden: {},
          // Letzter Buchstabe settled bei ~1,01 s — vor dem Abflug bei 1,14 s.
          visible: { transition: { staggerChildren: 0.035, delayChildren: 0.35 } },
          exit: { transition: { staggerChildren: 0.015 } },
        }}
      >
        {'Gym Log'.split('').map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            className={ch === ' ' ? 'splash-intro-letter splash-intro-space' : 'splash-intro-letter'}
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { type: 'spring', bounce: 0.25, duration: 0.45 },
              },
              exit: { opacity: 0, y: -10, transition: { duration: 0.28, ease: 'easeOut' } },
            }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

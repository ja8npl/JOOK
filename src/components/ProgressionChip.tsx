import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { firstSetSummary, suggestNextSet } from '../lib/progression';
import { type RirValue } from '../db/schema';

interface Props {
  /** Letzte Leistung (erster Satz des letzten Eintrags) — undefined = kein Chip. */
  last: { gewicht: number; reps: number; rir?: RirValue } | undefined;
  /** Ziel-Reps der Übung (importierte Pläne), falls vorhanden. */
  zielReps?: number;
  /** true, sobald der erste Arbeitssatz abgehakt ist — Chip wird still und blass. */
  settled: boolean;
}

/**
 * Steigerungs-Signal über der Satz-Tabelle: „Letztes Mal X kg × Y @ RIR Z → Heute …“.
 * Fehlende Werte (z. B. kein RIR erfasst) werden weggelassen statt „unbekannt“
 * anzuzeigen; ohne vorherigen Eintrag erscheint gar kein Chip. Der Glow pulsiert
 * sanft im Theme-Akzent, bis der erste Satz abgehakt ist (dann still + blass).
 */
export function ProgressionChip({ last, zielReps, settled }: Props) {
  const reduced = useReducedMotion();
  // suggestNextSet ist eine reine Funktion — kein Hook, kein State nötig.
  const suggestion = last ? suggestNextSet({ gewicht: last.gewicht, reps: last.reps, rir: last.rir, zielReps }) : null;

  return (
    <AnimatePresence initial={false}>
      {suggestion && (
        <motion.div
          key={`${suggestion.kind}-${suggestion.gewicht}`}
          className={`progression-chip${settled ? ' is-settled' : ' is-pulsing'}`}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }}
          role="status"
        >
          <span className="progression-chip-eyebrow"><TrendingUp size={12} /> Steigerung</span>
          <span>Letztes Mal {firstSetSummary(last!.gewicht, last!.reps, last!.rir)} → Heute {suggestion.aktion}</span>
          <span className="progression-chip-hint">{suggestion.deltaLabel}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

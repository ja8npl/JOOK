import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { firstSetSummary, suggestNextSet, type RepTargetRange } from '../lib/progression';
import { type RirValue } from '../db/schema';

interface Props {
  /** Letzte Leistung (erster Satz des letzten Eintrags) — undefined = kein Chip. */
  last: { gewicht: number; reps: number; rir?: RirValue } | undefined;
  /** Rep-Ziel als Bereich (eigener Override, Plan-Ziel oder globales Ziel). */
  zielBereich?: RepTargetRange;
  /** true, sobald der erste Arbeitssatz abgehakt ist — Chip wird still und blass. */
  settled: boolean;
}

/**
 * Steigerungs-Signal über der Satz-Tabelle: „Letztes Mal X kg × Y @ RIR Z → Heute …“.
 * Fehlende Werte (z. B. kein RIR erfasst) werden weggelassen statt „unbekannt“
 * anzuzeigen; ohne vorherigen Eintrag erscheint gar kein Chip. Der Glow pulsiert
 * sanft im Theme-Akzent, bis der erste Satz abgehakt ist (dann still + blass).
 */
export function ProgressionChip({ last, zielBereich, settled }: Props) {
  const reduced = useReducedMotion();
  // suggestNextSet ist eine reine Funktion — kein Hook, kein State nötig.
  const suggestion = last ? suggestNextSet({ gewicht: last.gewicht, reps: last.reps, rir: last.rir, zielBereich }) : null;

  return (
    <AnimatePresence initial={false}>
      {suggestion && (
        <motion.div
          key={`${suggestion.kind}-${suggestion.gewicht}`}
          className={`progression-chip${settled ? ' is-settled' : ' is-pulsing'}`}
          initial={reduced ? false : { opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 22 }}
          role="status"
        >
          <span className="progression-chip-eyebrow"><TrendingUp size={12} /> Steigerung</span>
          <span className="progression-chip-delta">{suggestion.deltaLabel}</span>
          <span className="progression-chip-last">Letztes Mal {firstSetSummary(last!.gewicht, last!.reps, last!.rir)}</span>
          <span className="progression-chip-action">{suggestion.aktion}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

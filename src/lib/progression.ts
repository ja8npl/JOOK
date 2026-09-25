/**
 * Reine Steigerungs-Logik (kein React, kein DB-Zugriff) — gut testbar.
 * Regelwerk siehe suggestNextSet; RIR = Reps in Reserve.
 */
import { type RirValue } from '../db/schema';

/** Empfohlener Gewichtsschritt in kg (passt zur 2,5-kg-Rasterung der App). */
export const PROGRESSION_STEP_KG = 2.5;

/** Wie viel „deutlich übertroffen“ ist: mehr als diese Reps-Differenz über Ziel. */
const TARGET_BEAT_MARGIN = 1;

/** Die drei möglichen Steigerungs-Signale. */
export type ProgressionKind = 'increase' | 'push-reps' | 'hold';

export interface ProgressionInput {
  /** Letzte Leistung: Gewicht des ersten Satzes in kg. */
  gewicht: number;
  /** Letzte Leistung: Reps des ersten Satzes. */
  reps: number;
  /** RIR des ersten Satzes, falls erfasst. */
  rir?: RirValue;
  /** Ziel-Reps der Übung (aus importiertem Plan), falls vorhanden. */
  zielReps?: number;
}

export interface ProgressionSuggestion {
  kind: ProgressionKind;
  /** Vorgeschlagenes Gewicht für heute in kg. */
  gewicht: number;
  /** Kurzer Effekt-Text, z. B. „+2,5 kg“ oder „Gewicht halten“. */
  deltaLabel: string;
  /** Handlungstext, z. B. „1–2 Reps mehr versuchen“. */
  aktion: string;
}

/**
 * Steigerungsregel für den ersten Satz einer Übung:
 *
 * - RIR >= 3 oder Ziel-Reps deutlich übertroffen (> Ziel + 1) → +2,5 kg
 * - RIR 1–2 und Ziel (näherungsweise) erreicht → gleiches Gewicht, „1–2 Reps mehr versuchen“
 * - RIR 0 / Failure oder Ziel verfehlt → Gewicht halten, keine Steigerung
 * - Ohne vorherigen Eintrag → null (kein Chip)
 *
 * `rir` ist das primäre Signal; ohne RIR entscheidet allein der Ziel-Reps-Vergleich.
 */
export function suggestNextSet(input: ProgressionInput): ProgressionSuggestion | null {
  const { gewicht, reps, rir, zielReps } = input;

  if (!isFinite(gewicht) || gewicht <= 0 || !isFinite(reps) || reps <= 0) return null;

  const zielDiff = zielReps !== undefined ? reps - zielReps : undefined;

  // Fall 1: Viel in der Reserve (RIR >= 3) oder Ziel deutlich übertroffen.
  if (rir !== undefined && rir !== 'failure' && rir >= 3) {
    return build('increase', gewicht);
  }
  if (zielDiff !== undefined && zielDiff > TARGET_BEAT_MARGIN) {
    return build('increase', gewicht);
  }

  // Fall 3: Am Limit (RIR 0/Failure) oder Ziel verfehlt → halten.
  if (rir === 0 || rir === 'failure') {
    return build('hold', gewicht);
  }
  if (zielDiff !== undefined && zielDiff < 0) {
    return build('hold', gewicht);
  }

  // Fall 2: RIR 1–2 und Ziel erreicht → gleiches Gewicht, Reps pushen.
  // (Ohne RIR nur „Ziel knapp übertroffen“ zählt auch hierzu.)
  return build('push-reps', gewicht);
}

function build(kind: ProgressionKind, gewicht: number): ProgressionSuggestion {
  if (kind === 'increase') {
    const next = Math.round((gewicht + PROGRESSION_STEP_KG) * 10) / 10;
    return {
      kind,
      gewicht: next,
      deltaLabel: `+${formatKg(PROGRESSION_STEP_KG)} kg`,
      aktion: `${formatKg(next)} kg versuchen`,
    };
  }
  if (kind === 'push-reps') {
    return {
      kind,
      gewicht,
      deltaLabel: 'Gleiches Gewicht',
      aktion: '1–2 Reps mehr versuchen',
    };
  }
  return {
    kind: 'hold',
    gewicht,
    deltaLabel: 'Gewicht halten',
    aktion: 'Saubere Wdh. im selben Gewicht',
  };
}

/** 2.5 → „2,5“ (de-DE, ohne überflüssige Nullen). */
function formatKg(kg: number): string {
  return kg.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

/** RIR als Kurzlabel: 0–3 → Ziffer, 4 → „4+“, 'failure' → „Failure“, undefined → „RIR“. */
export function rirLabel(rir: RirValue | undefined): string {
  if (rir === undefined) return 'RIR';
  if (rir === 'failure') return 'Failure';
  if (rir >= 4) return '4+';
  return String(rir);
}

/**
 * Ein Satz-Zeilen-Text für den Chip: „80 kg × 8 @ RIR 2“.
 * Fehlt RIR, entfällt der Anhang komplett (Satz weglassen, nicht „RIR unbekannt“).
 */
export function firstSetSummary(gewicht: number, reps: number, rir: RirValue | undefined): string {
  const base = `${formatKg(gewicht)} kg × ${reps}`;
  return rir === undefined ? base : `${base} @ RIR ${rirLabel(rir)}`;
}

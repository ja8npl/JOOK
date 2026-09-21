import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { type BodyWeight, type GymEntry, type TrainingMode } from '../db/schema';
import { todayKey } from './warmup';

/* ════════════════════════ Pure Logik (getestet) ════════════════════════ */

/** Zeitfenster der Analyse-Sektion in Tagen. */
export const ANALYSE_WINDOW_DAYS = 30;

const DAY_MS = 86_400_000;

/** Maximaler Gewichtssprung, der noch als Fortschritt zählt (Verletzungs-/Eingabefilter). */
export const MAX_PLAUSIBLE_DELTA_KG = 30;

/** Muster-Klassifikation: Gewicht und Reps gegenläufig oder gemeinsam bewegt. */
export type MusterTyp = 'intensitaet' | 'volumen' | 'fortschritt' | 'stabil';

export const MUSTER_LABELS: Record<MusterTyp, string> = {
  intensitaet: 'Intensität',
  volumen: 'Volumen',
  fortschritt: 'Fortschritt',
  stabil: 'Stabil',
};

/** Gewichtsdelta einer Übung: erster vs. letzter Satz im Fenster. */
export interface ExerciseDelta {
  machineId: string;
  name: string;
  /** +kg / −kg zwischen ältestem und neuestem Training im Fenster. */
  deltaKg: number;
  /** −Reps zwischen ältestem und neuestem Training (negativ = weniger). */
  deltaReps: number;
}

export interface AnalyseResult {
  gains: ExerciseDelta[];
  regress: ExerciseDelta[];
  muster: Array<{ machineId: string; name: string; typ: MusterTyp }>;
  kraft: number;
  volumen: number;
  konsistenz: number;
}

/** Schnitt einer Übung: Durchschnitts-Gewicht/Reps über alle Arbeits-Sätze. */
function exerciseAverages(entry: GymEntry): { gewicht: number; reps: number } | null {
  const sets = Array.isArray(entry.sets) ? entry.sets.filter((s) => s && !s.warmup && isFinite(s.gewicht)) : [];
  if (sets.length === 0) return null;
  return {
    gewicht: sets.reduce((sum, s) => sum + s.gewicht, 0) / sets.length,
    reps: sets.reduce((sum, s) => sum + s.wiederholungen, 0) / sets.length,
  };
}

/**
 * Analyse über die Einträge (nicht Sessions): Deltas ältester vs. neuester
 * Eintrag je Übung innerhalb des Fensters. Plausibilitätsfilter (±30 kg)
 * verwirft Eingabe-Fehler.
 */
export function computeAnalyse(entries: GymEntry[], jetzt: number = Date.now()): AnalyseResult {
  const cutoff = jetzt - ANALYSE_WINDOW_DAYS * DAY_MS;
  const byMachine = new Map<string, GymEntry[]>();
  for (const entry of entries) {
    if (entry.datum < cutoff) continue;
    const list = byMachine.get(entry.machineId) ?? [];
    list.push(entry);
    byMachine.set(entry.machineId, list);
  }

  const deltas: ExerciseDelta[] = [];
  for (const [machineId, list] of byMachine) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.datum - b.datum);
    const first = exerciseAverages(sorted[0]);
    const last = exerciseAverages(sorted[sorted.length - 1]);
    if (!first || !last) continue;
    const deltaKg = last.gewicht - first.gewicht;
    if (Math.abs(deltaKg) > MAX_PLAUSIBLE_DELTA_KG) continue;
    deltas.push({ machineId, name: sorted[sorted.length - 1].name, deltaKg, deltaReps: last.reps - first.reps });
  }

  const gains = deltas.filter((d) => d.deltaKg >= 0.5).sort((a, b) => b.deltaKg - a.deltaKg).slice(0, 3);
  const regress = deltas.filter((d) => d.deltaKg <= -0.5).sort((a, b) => a.deltaKg - b.deltaKg).slice(0, 3);

  const muster = deltas.map((d) => ({
    machineId: d.machineId,
    name: d.name,
    typ: classifyMuster(d.deltaKg, d.deltaReps),
  }));

  // Kraft: Anteil Übungen mit Gewichtszuwachs; Volumen: Anteil Übungen, die in mindestens
  // einer Dimension fortgeschritten sind (Gewicht ↑ oder Reps ↑); Konsistenz: aktive Tage ÷ Fenster.
  const kraft = deltas.length > 0 ? deltas.filter((d) => d.deltaKg >= 0.5).length / deltas.length : 0;
  const volumen = deltas.length > 0 ? deltas.filter((d) => d.deltaKg >= 0.5 || d.deltaReps >= 0.5).length / deltas.length : 0;
  const aktiveTage = new Set(entries.filter((e) => e.datum >= cutoff).map((e) => todayKey(new Date(e.datum)))).size;
  const konsistenz = Math.min(1, aktiveTage / ANALYSE_WINDOW_DAYS);

  return { gains, regress, muster, kraft, volumen, konsistenz };
}

/** Intensität = Gewicht ↑ & Reps ↓, Volumen = Gewicht ↓ & Reps ↑, Fortschritt = beides ↑, sonst Stabil. */
export function classifyMuster(deltaKg: number, deltaReps: number): MusterTyp {
  const kgUp = deltaKg >= 0.5;
  const kgDown = deltaKg <= -0.5;
  const repsUp = deltaReps >= 0.5;
  const repsDown = deltaReps <= -0.5;
  if (kgUp && repsDown) return 'intensitaet';
  if (kgDown && repsUp) return 'volumen';
  if (kgUp && repsUp) return 'fortschritt';
  if (kgDown && repsDown) return 'stabil';
  return 'stabil';
}

/** 7-Tage-Durchschnitt (gewichtet, Tagesmittel). */
export function averageOfLast7Days(measurements: BodyWeight[], jetzt: number = Date.now()): number | null {
  const cutoff = jetzt - 7 * DAY_MS;
  const byDay = new Map<string, number[]>();
  for (const m of measurements) {
    if (m.id < cutoff || !isFinite(m.gewicht) || m.gewicht <= 0) continue;
    const key = m.tag;
    byDay.set(key, [...(byDay.get(key) ?? []), m.gewicht]);
  }
  if (byDay.size === 0) return null;
  const dayAvgs = [...byDay.values()].map((vals) => vals.reduce((s, v) => s + v, 0) / vals.length);
  return dayAvgs.reduce((s, v) => s + v, 0) / dayAvgs.length;
}

/** Aktuelles Gewicht = letzte Messung. */
export function currentBodyWeight(measurements: BodyWeight[]): BodyWeight | null {
  if (measurements.length === 0) return null;
  return measurements.reduce((latest, m) => (m.id > latest.id ? m : latest));
}

/* ════════════════════════ Hooks ════════════════════════ */

/** Live: alle Messungen (aufsteigend) — Sparkline und Delta. */
export function useBodyWeights(): BodyWeight[] | undefined {
  return useLiveQuery(() => db.bodyweights.orderBy('id').toArray(), []);
}

/** Speichert/aktualisiert die Messung des heutigen Tages (Upsert nach tag). */
export async function saveBodyWeight(gewicht: number, jetzt: number = Date.now()): Promise<void> {
  const tag = todayKey(new Date(jetzt));
  const existing = await db.bodyweights.where('tag').equals(tag).first();
  if (existing) {
    await db.bodyweights.update(existing.id, { gewicht, id: jetzt });
  } else {
    await db.bodyweights.add({ id: jetzt, gewicht, tag });
  }
}

/** Live: App-Settings (key = 'app'); rein lesend — angelegt beim ersten Modus-Wechsel. */
export function useAppSettings(): AppSettingsView {
  const settings = useLiveQuery(async () => {
    return db.settings.get('app');
  }, []);
  return settings ?? { key: 'app', modus: 'bulk', modusSeit: 0, einheit: 'kg', updatedAt: 0 };
}

export interface AppSettingsView {
  key: 'app';
  modus: TrainingMode;
  modusSeit: number;
  einheit: 'kg' | 'lb';
  updatedAt: number;
}

/** Modus wechseln: setzt „Seit n Tagen" zurück. */
export async function setTrainingMode(modus: TrainingMode): Promise<void> {
  const row = await db.settings.get('app');
  await db.settings.put({ key: 'app', modus, modusSeit: Date.now(), einheit: row?.einheit ?? 'kg', updatedAt: Date.now() });
}

/** „Seit n Tagen" aus modusSeit; 0 = noch nicht geladen. */
export function daysInMode(modusSeit: number, jetzt: number = Date.now()): number {
  if (modusSeit <= 0) return 0;
  return Math.max(0, Math.floor((jetzt - modusSeit) / DAY_MS));
}

/** Live: Analyse der letzten 30 Tage (Gewinne, Rückschritte, Muster, Gauges). */
export function useTrainingAnalyse(): AnalyseResult | undefined {
  return useLiveQuery(async () => {
    const entries = await db.entries.toArray();
    return computeAnalyse(entries);
  }, []);
}

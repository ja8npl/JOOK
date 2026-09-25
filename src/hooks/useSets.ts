import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { toMachineId, type GymEntry, type RirValue, type WorkoutSet, type WorkoutSession } from '../db/schema';

/** Sichere Sets eines Eintrags (defensiv gegen fehlende/kaputte Felder) */
export function setsOf(entry: GymEntry | undefined): WorkoutSet[] {
  if (!entry || !Array.isArray(entry.sets)) return [];
  return entry.sets.filter((s) =>
    s && typeof s === 'object'
    && typeof s.gewicht === 'number' && isFinite(s.gewicht)
    && typeof s.wiederholungen === 'number' && isFinite(s.wiederholungen)
    && typeof s.timestamp === 'number' && isFinite(s.timestamp),
  );
}

/** Letztes genutztes Gewicht dieser Maschine (für die Vorbelegung) */
export function useLastWeightForMachine(machineId: string): number | undefined {
  return useLiveQuery(async () => {
    if (!machineId) return undefined;
    const entries = await db.entries
      .where('machineId')
      .equals(machineId)
      .reverse()
      .sortBy('datum');
    for (const entry of entries) {
      const sets = setsOf(entry);
      const last = sets[sets.length - 1];
      if (last) return last.gewicht;
    }
    return undefined;
  }, [machineId]);
}

/** Erster Satz des letzten Eintrags einer Maschine — Grundlage für das Steigerungs-Signal. */
export interface FirstSetSnapshot {
  gewicht: number;
  reps: number;
  /** RIR des ersten Satzes, falls beim Loggen erfasst. */
  rir?: RirValue;
}

/**
 * Erster abgeschlossener Arbeitssatz der letzten abgeschlossenen Session für
 * eine Übung (per warmupExerciseKey/Namen) — ergänzt die entries-Suche, damit
 * der Chip auch bei reinem Session-Flow gefüllt ist. undefined = nichts gefunden.
 */
async function lastFirstSetFromSessions(machineId: string): Promise<FirstSetSnapshot | undefined> {
  const sessions: WorkoutSession[] = await db.sessions
    .where('status')
    .equals('completed')
    .reverse()
    .sortBy('startedAt');
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const key = exercise.exercise.id === machineId || toMachineId(exercise.exercise.name) === machineId;
      if (!key) continue;
      const first = exercise.sets.find((set) => set.completed && !set.warmup && set.gewicht > 0 && set.wiederholungen > 0);
      if (first) return { gewicht: first.gewicht, reps: first.wiederholungen, rir: first.rir };
    }
  }
  return undefined;
}

/**
 * Live-Query: erster Satz des letzten Eintrags dieser Maschine — zuerst aus
 * klassischen Einträgen, ergänzend aus abgeschlossenen Sessions. Grundlage
 * für das Steigerungs-Signal über der Satz-Tabelle.
 */
export function useLastFirstSetForMachine(machineId: string): FirstSetSnapshot | undefined {
  return useLiveQuery(async () => {
    if (!machineId) return undefined;
    const entries = await db.entries
      .where('machineId')
      .equals(machineId)
      .reverse()
      .sortBy('datum');
    for (const entry of entries) {
      const sets = setsOf(entry);
      const first = sets[0];
      if (first) return { gewicht: first.gewicht, reps: first.wiederholungen, rir: first.rir };
    }
    return lastFirstSetFromSessions(machineId);
  }, [machineId]);
}

/** Bester Satz eines Eintrags (höchstes Gewicht; bei Gleichstand mehr Reps) */
export function bestSetOf(entry: GymEntry): WorkoutSet | undefined {
  const sets = setsOf(entry);
  if (sets.length === 0) return undefined;
  return sets.reduce((best, s) =>
    s.gewicht > best.gewicht || (s.gewicht === best.gewicht && s.wiederholungen > best.wiederholungen)
      ? s
      : best,
  );
}

/** Pro Eintrag: max. Arbeitsgewicht und Durchschnittsgewicht (für die Progression) */
export interface EntryLoadPoint {
  datum: number;
  maxGewicht: number;
  avgGewicht: number;
  satzCount: number;
}

export function entryLoadPoint(entry: GymEntry): EntryLoadPoint | null {
  const sets = setsOf(entry);
  if (sets.length === 0) return null;
  const maxGewicht = Math.max(...sets.map((s) => s.gewicht));
  const avgGewicht = sets.reduce((sum, s) => sum + s.gewicht, 0) / sets.length;
  return { datum: entry.datum, maxGewicht, avgGewicht, satzCount: sets.length };
}

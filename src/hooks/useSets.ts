import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { type GymEntry, type WorkoutSet } from '../db/schema';

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

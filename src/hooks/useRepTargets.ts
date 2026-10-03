import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { type RepTargetRange } from '../lib/progression';
import { resolveRepTarget } from '../lib/progression';

/** Globales Rep-Ziel aus den Settings — undefined, solange nie gesetzt wurde
 *  (das UI fällt dann auf DEFAULT_REP_TARGET zurück, siehe resolveRepTarget). */
export function useGlobalRepTarget(): RepTargetRange | undefined {
  const settings = useLiveQuery(async () => db.settings.get('app'), []);
  if (!settings?.repZielMin || !settings?.repZielMax) return undefined;
  return { min: settings.repZielMin, max: settings.repZielMax };
}

/** Rep-Ziel-Override einer Übung — undefined, wenn die Übung dem globalen Ziel folgt. */
export function useExerciseRepTarget(machineId: string): RepTargetRange | undefined {
  const target = useLiveQuery(async () => db.repTargets.get(machineId), [machineId]);
  if (!target) return undefined;
  return { min: target.min, max: target.max };
}

/** Effektives Ziel (Override → Global → Standard) — kombinierter Live-Hook für Cards. */
export function useEffectiveRepTarget(machineId: string): RepTargetRange {
  const globalTarget = useGlobalRepTarget();
  const override = useExerciseRepTarget(machineId);
  return resolveRepTarget(override, globalTarget);
}

/** Hat die Übung einen eigenen Zielwert (Button zeigt aktiven Zustand)? */
export function useHasExerciseRepTarget(machineId: string): boolean {
  return useExerciseRepTarget(machineId) !== undefined;
}

/** Globales Rep-Ziel schreiben (bestehende Settings-Felder bleiben erhalten). */
export async function setGlobalRepTarget(range: RepTargetRange): Promise<void> {
  const row = await db.settings.get('app');
  await db.settings.put({
    key: 'app',
    modus: row?.modus ?? 'bulk',
    modusSeit: row?.modusSeit ?? 0,
    einheit: row?.einheit ?? 'kg',
    repZielMin: range.min,
    repZielMax: range.max,
    updatedAt: Date.now(),
  });
}

/** Override für eine Übung schreiben. */
export async function setExerciseRepTarget(machineId: string, range: RepTargetRange): Promise<void> {
  await db.repTargets.put({ machineId, min: range.min, max: range.max, updatedAt: Date.now() });
}

/** Override löschen — die Übung folgt wieder dem globalen Ziel. */
export async function clearExerciseRepTarget(machineId: string): Promise<void> {
  await db.repTargets.delete(machineId);
}

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

/** Pausenzeit-Override einer Übung in Sekunden — undefined, wenn die Übung der
 *  globalen Standard-Pause (localStorage, Base) folgt. */
export function useExerciseRestTarget(machineId: string): number | undefined {
  const target = useLiveQuery(async () => db.restTargets.get(machineId), [machineId]);
  return target?.seconds;
}

/** Hat die Übung eine eigene Pausenzeit? */
export function useHasExerciseRestTarget(machineId: string): boolean {
  return useExerciseRestTarget(machineId) !== undefined;
}

/** Override für eine Übung schreiben. */
export async function setExerciseRestTarget(machineId: string, seconds: number): Promise<void> {
  await db.restTargets.put({ machineId, seconds, updatedAt: Date.now() });
}

/** Override löschen — die Übung folgt wieder der globalen Standard-Pause. */
export async function clearExerciseRestTarget(machineId: string): Promise<void> {
  await db.restTargets.delete(machineId);
}

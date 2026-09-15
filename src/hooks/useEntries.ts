import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { type GymEntry, type MachineSummary, toMachineId } from '../db/schema';

/** Alle Einträge zu einer bestimmten Maschine (neueste zuerst) */
export function useEntriesForMachine(machineId: string): GymEntry[] | undefined {
  return useLiveQuery(
    () => db.entries
      .where('machineId')
      .equals(machineId)
      .reverse()
      .sortBy('datum'),
    [machineId]
  );
}

/** Zusammenfassung aller Maschinen für die Home-Ansicht */
export function useMachineSummaries(): MachineSummary[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.entries.toArray();
    const map = new Map<string, MachineSummary>();

    for (const entry of all) {
      const existing = map.get(entry.machineId);
      if (!existing || entry.datum > existing.lastDatum) {
        map.set(entry.machineId, {
          machineId: entry.machineId,
          name: entry.name,
          count: (existing?.count ?? 0) + 1,
          lastDatum: entry.datum,
          lastEinstellung: entry.einstellung,
        });
      } else {
        existing.count += 1;
        map.set(entry.machineId, existing);
      }
    }

    // Sortieren: neueste zuerst
    return Array.from(map.values()).sort((a, b) => b.lastDatum - a.lastDatum);
  });
}

/** Alle eindeutigen Maschinennamen für Autocomplete */
export function useMachineNames(): string[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.entries
      .orderBy('datum')
      .reverse()
      .toArray();
    const seen = new Set<string>();
    const names: string[] = [];
    for (const e of all) {
      const name = typeof e.name === 'string' ? e.name.trim() : '';
      const machineId = typeof e.machineId === 'string' ? e.machineId : '';
      if (machineId && name && !seen.has(machineId)) {
        seen.add(machineId);
        names.push(name);
      }
    }
    return names;
  });
}

/** Einen Eintrag per ID laden */
export function useEntry(id: number): GymEntry | undefined {
  return useLiveQuery(() => db.entries.get(id), [id]);
}

/** Eintrag speichern (neu oder update) */
export async function saveEntry(entry: Omit<GymEntry, 'id' | 'machineId' | 'updatedAt'>  & { id?: number }): Promise<number> {
  const now = Date.now();
  const full: GymEntry = {
    ...entry,
    machineId: toMachineId(entry.name),
    updatedAt: now,
    datum: entry.datum ?? now,
  };
  if (full.id) {
    // put statt update: ersetzt den kompletten Datensatz inkl. sets-Array
    await db.entries.put(full);
    return full.id;
  } else {
    return db.entries.add(full);
  }
}

/** Eintrag löschen */
export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id);
}

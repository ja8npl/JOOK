import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { type GymEntry } from '../db/schema';

/**
 * Volltext-Suche über name, einstellung, problem, ziel.
 * Gibt alle Treffer zurück (neueste zuerst).
 */
export function useSearch(query: string): GymEntry[] | undefined {
  return useLiveQuery(async () => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const all = await db.entries.orderBy('datum').reverse().toArray();
    return all.filter((e) =>
      (e.name ?? '').toLowerCase().includes(q) ||
      (e.einstellung ?? '').toLowerCase().includes(q) ||
      (e.problem ?? '').toLowerCase().includes(q) ||
      (e.ziel ?? '').toLowerCase().includes(q)
    );
  }, [query]);
}

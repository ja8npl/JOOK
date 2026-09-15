import Dexie, { type Table } from 'dexie';
import { type GymEntry } from './schema';

export class GymLogDB extends Dexie {
  entries!: Table<GymEntry, number>;

  constructor() {
    super('GymLogDB');
    this.version(1).stores({
      // Indizes: id (auto), machineId, datum
      entries: '++id, machineId, datum',
    });
    // v2: Set-Tracking — `sets` als nicht indiziertes Feld, Schema unverändert
    this.version(2).stores({
      entries: '++id, machineId, datum',
    });
  }
}

export const db = new GymLogDB();

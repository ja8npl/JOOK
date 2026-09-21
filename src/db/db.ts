import Dexie, { type Table } from 'dexie';
import { type AppSettings, type BodyWeight, type GymEntry, type ProgressHistory, type WarmupConfig, type WorkoutSession } from './schema';

export class GymLogDB extends Dexie {
  entries!: Table<GymEntry, number>;
  sessions!: Table<WorkoutSession, number>;
  progressHistory!: Table<ProgressHistory, number>;
  warmupConfigs!: Table<WarmupConfig, string>;
  bodyweights!: Table<BodyWeight, number>;
  settings!: Table<AppSettings, string>;

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
    this.version(3).stores({
      entries: '++id, machineId, datum',
      sessions: '++id, startedAt, endedAt, status',
      progressHistory: '++id, sessionId, exerciseId, datum',
    });
    // v4: Warm-up-Konfiguration pro Übung und Tag (key = machineId__YYYY-MM-DD)
    this.version(4).stores({
      entries: '++id, machineId, datum',
      sessions: '++id, startedAt, endedAt, status',
      progressHistory: '++id, sessionId, exerciseId, datum',
      warmupConfigs: 'key, machineId, tag',
    });
    // v5: Körpergewicht (id = Messzeitpunkt, Index tag für Tages-Upsert) + App-Settings
    this.version(5).stores({
      entries: '++id, machineId, datum',
      sessions: '++id, startedAt, endedAt, status',
      progressHistory: '++id, sessionId, exerciseId, datum',
      warmupConfigs: 'key, machineId, tag',
      bodyweights: '++id, tag',
      settings: 'key',
    });
  }
}

export const db = new GymLogDB();

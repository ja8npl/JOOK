/**
 * Backup-Format v2: Vollständiger Export aller Dexie-Tabellen.
 *
 * v1-Backups (nur entries/sessions/progressHistory) bleiben lesbar und
 * werden beim Import auf das v2-Format migriert (fehlende Tabellen = leer).
 * Der Import ist eine reine Funktion (testbar); die DB-Zugriffe liegen in
 * src/hooks/useWorkoutSessions.ts.
 */

import { TRAINING_MODES, type AppSettings, type BodyWeight, type GymEntry, type ProgressHistory, type RirValue, type SessionSet, type TrainingMode, type WarmupConfig, type WorkoutSession } from '../db/schema';

/** Versionsnummer des aktuellen Backup-Formats. */
export const BACKUP_FORMAT_VERSION = 2;

export interface BackupData {
  version: 2;
  exportedAt: string;
  entries: GymEntry[];
  sessions: WorkoutSession[];
  progressHistory: ProgressHistory[];
  warmupConfigs: WarmupConfig[];
  bodyweights: BodyWeight[];
  settings: AppSettings[];
}

const VALID_RIR = new Set<number | string>([0, 1, 2, 3, 4, 'failure']);

/** Prüft/normalisiert einen WorkoutSet-artigen Datensatz (mit oder ohne rir/warmup). */
function normalizeSet(set: unknown): { gewicht: number; wiederholungen: number; timestamp: number; warmup?: boolean; rir?: RirValue } | null {
  if (!set || typeof set !== 'object') return null;
  const record = set as Record<string, unknown>;
  const gewicht = typeof record.gewicht === 'number' && Number.isFinite(record.gewicht) ? record.gewicht : NaN;
  const wiederholungen = typeof record.wiederholungen === 'number' && Number.isFinite(record.wiederholungen) ? Math.round(record.wiederholungen) : NaN;
  if (Number.isNaN(gewicht) || Number.isNaN(wiederholungen)) return null;
  const normalized: { gewicht: number; wiederholungen: number; timestamp: number; warmup?: boolean; rir?: RirValue } = {
    gewicht,
    wiederholungen,
    timestamp: typeof record.timestamp === 'number' && Number.isFinite(record.timestamp) ? record.timestamp : 0,
  };
  if (record.warmup === true) normalized.warmup = true;
  if ((VALID_RIR.has(record.rir as number | string) && typeof record.rir !== 'undefined') || typeof record.rir === 'number') {
    const rir = record.rir as number | string;
    if (VALID_RIR.has(rir)) normalized.rir = rir as RirValue;
  }
  return normalized;
}

function normalizeSessionSet(set: unknown): SessionSet | null {
  const base = normalizeSet(set);
  if (!base) return null;
  const record = (set ?? {}) as Record<string, unknown>;
  return {
    ...base,
    id: typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID(),
    setNumber: typeof record.setNumber === 'number' && Number.isFinite(record.setNumber) ? record.setNumber : 0,
    completed: record.completed === true,
    ...(typeof record.warmupLabel === 'string' ? { warmupLabel: record.warmupLabel } : {}),
    ...(typeof record.zielRepsMin === 'number' ? { zielRepsMin: record.zielRepsMin } : {}),
    ...(typeof record.zielRepsMax === 'number' ? { zielRepsMax: record.zielRepsMax } : {}),
  };
}

/** Fragile importierte Daten in gültige Typen überführen — nichts fliegt beim bulkAdd. */
export function normalizeBackup(raw: unknown): BackupData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Ungültiges Backup.');
  }
  const data = raw as Record<string, unknown>;

  const entries = requireArray(data.entries, 'entries').map((item) => {
    const record = item as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name : '';
    if (!name) throw new Error('Ungültiges Backup: Einträge ohne Namen.');
    const datum = typeof record.datum === 'number' && Number.isFinite(record.datum) ? record.datum : 0;
    const entry: GymEntry = {
      machineId: typeof record.machineId === 'string' && record.machineId ? record.machineId : name.trim().toLowerCase().replace(/\s+/g, '-'),
      name,
      einstellung: typeof record.einstellung === 'string' ? record.einstellung : '',
      datum,
      updatedAt: typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt) ? record.updatedAt : datum,
      ...(record.problem === undefined ? {} : { problem: String(record.problem) }),
      ...(record.ziel === undefined ? {} : { ziel: String(record.ziel) }),
      ...(record.sets === undefined ? {} : { sets: (Array.isArray(record.sets) ? record.sets : []).map(normalizeSet).filter((s): s is NonNullable<ReturnType<typeof normalizeSet>> => s !== null) }),
    };
    if (typeof record.id === 'number') entry.id = record.id;
    return entry;
  });

  const sessions = requireArray(data.sessions, 'sessions').map((item) => {
    const record = item as Record<string, unknown>;
    const exercises = Array.isArray(record.exercises) ? record.exercises : [];
    const session: WorkoutSession = {
      name: typeof record.name === 'string' && record.name.trim() ? record.name : 'Training',
      startedAt: typeof record.startedAt === 'number' && Number.isFinite(record.startedAt) ? record.startedAt : 0,
      status: record.status === 'completed' ? 'completed' : 'discarded',
      exercises: exercises.map((exercise) => {
        const exRecord = (exercise ?? {}) as Record<string, unknown>;
        const exData = (exRecord.exercise ?? {}) as Record<string, unknown>;
        const exName = typeof exData.name === 'string' ? exData.name : 'Übung';
        return {
          exercise: {
            id: typeof exData.id === 'string' && exData.id ? exData.id : exName.trim().toLowerCase().replace(/\s+/g, '-'),
            name: exName,
            ...(typeof exData.equipment === 'string' ? { equipment: exData.equipment } : {}),
            ...(typeof exData.target === 'string' ? { target: exData.target } : {}),
            ...(typeof exData.saetze === 'number' ? { saetze: exData.saetze } : {}),
            ...(typeof exData.wiederholungen === 'number' ? { wiederholungen: exData.wiederholungen } : {}),
          },
          sets: (Array.isArray(exRecord.sets) ? exRecord.sets : []).map(normalizeSessionSet).filter((s): s is SessionSet => s !== null),
          ...(exRecord.previous && typeof exRecord.previous === 'object'
            ? {
                previous: {
                  maxGewicht: Number((exRecord.previous as Record<string, unknown>).maxGewicht) || 0,
                  bestReps: Number((exRecord.previous as Record<string, unknown>).bestReps) || 0,
                  estimatedOneRepMax: Number((exRecord.previous as Record<string, unknown>).estimatedOneRepMax) || 0,
                  datum: Number((exRecord.previous as Record<string, unknown>).datum) || 0,
                },
              }
            : {}),
        };
      }),
      createdAt: typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : 0,
      updatedAt: typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt) ? record.updatedAt : 0,
      ...(typeof record.id === 'number' ? { id: record.id } : {}),
      ...(typeof record.endedAt === 'number' && Number.isFinite(record.endedAt) ? { endedAt: record.endedAt } : {}),
      ...(typeof record.durationSeconds === 'number' && Number.isFinite(record.durationSeconds) ? { durationSeconds: record.durationSeconds } : {}),
    };
    return session;
  });

  const progressHistory = requireArray(data.progressHistory, 'progressHistory').map((item) => {
    const record = item as Record<string, unknown>;
    const num = (key: string): number => (typeof record[key] === 'number' && Number.isFinite(record[key]) ? record[key] : 0);
    const progress: ProgressHistory = {
      sessionId: num('sessionId'),
      exerciseId: typeof record.exerciseId === 'string' ? record.exerciseId : '',
      exerciseName: typeof record.exerciseName === 'string' ? record.exerciseName : '',
      datum: num('datum'),
      maxGewicht: num('maxGewicht'),
      bestReps: num('bestReps'),
      totalVolume: num('totalVolume'),
      estimatedOneRepMax: num('estimatedOneRepMax'),
      setCount: num('setCount'),
      overloadKg: num('overloadKg'),
      overloadReps: num('overloadReps'),
    };
    if (typeof record.id === 'number') progress.id = record.id;
    return progress;
  });

  const warmupConfigs = requireArray(data.warmupConfigs ?? [], 'warmupConfigs').map((item) => {
    const record = item as Record<string, unknown>;
    const machineId = typeof record.machineId === 'string' ? record.machineId : '';
    const tag = typeof record.tag === 'string' ? record.tag : '';
    const config: WarmupConfig = {
      key: typeof record.key === 'string' && record.key ? record.key : `${machineId}__${tag}`,
      machineId,
      tag,
      maxGewicht: typeof record.maxGewicht === 'number' && Number.isFinite(record.maxGewicht) ? record.maxGewicht : 0,
      dritterSatz: record.dritterSatz === true,
      createdAt: typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : 0,
      updatedAt: typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt) ? record.updatedAt : 0,
    };
    return config;
  });

  const bodyweights = requireArray(data.bodyweights ?? [], 'bodyweights').map((item) => {
    const record = item as Record<string, unknown>;
    const gewicht = typeof record.gewicht === 'number' && Number.isFinite(record.gewicht) ? record.gewicht : NaN;
    if (Number.isNaN(gewicht)) throw new Error('Ungültiges Backup: Körpergewicht ohne Wert.');
    const bodyweight: BodyWeight = {
      id: typeof record.id === 'number' && Number.isFinite(record.id) ? record.id : Date.now(),
      gewicht,
      tag: typeof record.tag === 'string' && record.tag ? record.tag : new Date().toISOString().slice(0, 10),
    };
    return bodyweight;
  });

  const settings = requireArray(data.settings ?? [], 'settings').map((item) => {
    const record = item as Record<string, unknown>;
    const modus = TRAINING_MODES.includes(record.modus as TrainingMode) ? (record.modus as TrainingMode) : 'recomp';
    const setting: AppSettings = {
      key: 'app',
      modus,
      modusSeit: typeof record.modusSeit === 'number' && Number.isFinite(record.modusSeit) ? record.modusSeit : Date.now(),
      einheit: record.einheit === 'lb' ? 'lb' : 'kg',
      updatedAt: typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt) ? record.updatedAt : Date.now(),
    };
    return setting;
  });

  return {
    version: 2,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    entries,
    sessions,
    progressHistory,
    warmupConfigs,
    bodyweights,
    settings,
  };
}

function requireArray(value: unknown, field: string): unknown[] {
  if (value === undefined) {
    // v1-Backups haben nur entries/sessions/progressHistory — fehlende v2-Tabellen sind leer.
    return [];
  }
  if (!Array.isArray(value)) throw new Error(`Ungültiges Backup: "${field}" ist keine Liste.`);
  return value;
}

/** JSON-String parsen + normalisieren (v1 und v2). */
export function parseBackup(json: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Das Backup enthält kein gültiges JSON.');
  }
  return normalizeBackup(parsed);
}

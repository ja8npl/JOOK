import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { type Exercise, type PerformanceSnapshot, type ProgressHistory, type SessionExercise, type SessionSet, type WorkoutSession } from '../db/schema';
import { BACKUP_FORMAT_VERSION, type BackupData, parseBackup } from '../lib/backup';

export interface ExerciseAnalytics {
  exercise: Exercise;
  history: ProgressHistory[];
  personalRecord: number;
  bestOneRepMax: number;
  latest?: ProgressHistory;
  previous?: ProgressHistory;
}

export function estimateOneRepMax(gewicht: number, reps: number): number {
  if (gewicht <= 0 || reps <= 0) return 0;
  return gewicht * (1 + reps / 30);
}

export function snapshotForExercise(exercise: SessionExercise): PerformanceSnapshot | undefined {
  // Warm-up-Sätze fließen nicht in Performance-/Progressions-Analytics ein.
  const completed = exercise.sets.filter((set) => set.completed && !set.warmup && set.gewicht > 0 && set.wiederholungen > 0);
  if (completed.length === 0) return undefined;
  const maxGewicht = Math.max(...completed.map((set) => set.gewicht));
  const bestReps = Math.max(...completed.map((set) => set.wiederholungen));
  const estimatedOneRepMax = Math.max(...completed.map((set) => estimateOneRepMax(set.gewicht, set.wiederholungen)));
  return {
    maxGewicht,
    bestReps,
    estimatedOneRepMax,
    datum: Date.now(),
  };
}

export function createSessionSet(setNumber: number, previous?: PerformanceSnapshot, targetReps?: number): SessionSet {
  return {
    id: crypto.randomUUID(),
    setNumber,
    gewicht: previous?.maxGewicht ?? 20,
    wiederholungen: targetReps ?? previous?.bestReps ?? 8,
    completed: false,
  };
}

/**
 * Baut eine Session-Übung: Ohne Vorgabe 3 Sätze (Smart Defaults), mit
 * saetze/wiederholungen-Vorgabe (importierte Pläne) genau die Vorgabe.
 */
export function sessionExerciseWithDefaults(exercise: Exercise, previous?: PerformanceSnapshot): SessionExercise {
  const targetReps = exercise.wiederholungen ?? previous?.bestReps ?? 8;
  const setCount = exercise.saetze ?? 3;
  return {
    exercise,
    previous,
    sets: Array.from({ length: setCount }, (_, index) => createSessionSet(index + 1, previous, targetReps)),
  };
}

export async function getPreviousPerformance(exerciseId: string): Promise<PerformanceSnapshot | undefined> {
  const previous = await db.progressHistory
    .where('exerciseId')
    .equals(exerciseId)
    .reverse()
    .sortBy('datum');
  const latest = previous[0];
  if (!latest) return undefined;
  return {
    maxGewicht: latest.maxGewicht,
    bestReps: latest.bestReps,
    estimatedOneRepMax: latest.estimatedOneRepMax,
    datum: latest.datum,
  };
}

export async function saveWorkoutSession(input: Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = Date.now();
  const session: WorkoutSession = { ...input, createdAt: now, updatedAt: now };
  const sessionId = await db.sessions.add(session);
  const progress = session.exercises
    .map((exercise) => {
      const snapshot = snapshotForExercise(exercise);
      if (!snapshot) return null;
      const previous = exercise.previous;
      return {
        sessionId,
        exerciseId: exercise.exercise.id,
        exerciseName: exercise.exercise.name,
        datum: session.endedAt ?? now,
        maxGewicht: snapshot.maxGewicht,
        bestReps: snapshot.bestReps,
        totalVolume: exercise.sets
          .filter((set) => set.completed && !set.warmup)
          .reduce((total, set) => total + set.gewicht * set.wiederholungen, 0),
        estimatedOneRepMax: snapshot.estimatedOneRepMax,
        setCount: exercise.sets.filter((set) => set.completed && !set.warmup).length,
        overloadKg: previous ? snapshot.maxGewicht - previous.maxGewicht : 0,
        overloadReps: previous ? snapshot.bestReps - previous.bestReps : 0,
      } satisfies ProgressHistory;
    })
    .filter((item): item is ProgressHistory => item !== null);
  if (progress.length > 0) await db.progressHistory.bulkAdd(progress);
  return sessionId;
}

export function useCompletedSessions(): WorkoutSession[] | undefined {
  return useLiveQuery(
    () => db.sessions.where('status').equals('completed').reverse().sortBy('startedAt'),
  );
}

export function useProgressHistory(): ProgressHistory[] | undefined {
  return useLiveQuery(() => db.progressHistory.orderBy('datum').reverse().toArray());
}

export function useExerciseAnalytics(): ExerciseAnalytics[] | undefined {
  const history = useProgressHistory();
  if (history === undefined) return undefined;
  const map = new Map<string, ExerciseAnalytics>();
  for (const point of [...history].reverse()) {
    const current = map.get(point.exerciseId) ?? {
      exercise: { id: point.exerciseId, name: point.exerciseName },
      history: [],
      personalRecord: 0,
      bestOneRepMax: 0,
    };
    current.history.unshift(point);
    current.personalRecord = Math.max(current.personalRecord, point.maxGewicht);
    current.bestOneRepMax = Math.max(current.bestOneRepMax, point.estimatedOneRepMax);
    map.set(point.exerciseId, current);
  }
  return Array.from(map.values()).map((item) => ({
    ...item,
    latest: item.history[0],
    previous: item.history[1],
  }));
}

export async function exportWorkoutData(): Promise<string> {
  const [entries, sessions, progressHistory, warmupConfigs, bodyweights, settings] = await Promise.all([
    db.entries.toArray(),
    db.sessions.toArray(),
    db.progressHistory.toArray(),
    db.warmupConfigs.toArray(),
    db.bodyweights.toArray(),
    db.settings.toArray(),
  ]);
  return JSON.stringify(
    { version: BACKUP_FORMAT_VERSION, exportedAt: new Date().toISOString(), entries, sessions, progressHistory, warmupConfigs, bodyweights, settings } satisfies BackupData,
    null,
    2,
  );
}

/**
 * Backup importieren: validiert + normalisiert (v1 und v2), ersetzt dann in
 * einer Transaktion ALLE lokalen Daten. Vorhandene Daten gehen dabei verloren —
 * der Aufrufer sollte vorher bestätigen lassen (Settings-UI fragt nach).
 */
export async function importWorkoutData(json: string): Promise<{ entries: number; sessions: number; progressHistory: number }> {
  const data = parseBackup(json);
  await db.transaction('rw', [db.entries, db.sessions, db.progressHistory, db.warmupConfigs, db.bodyweights, db.settings], async () => {
    await Promise.all([
      db.entries.clear(),
      db.sessions.clear(),
      db.progressHistory.clear(),
      db.warmupConfigs.clear(),
      db.bodyweights.clear(),
      db.settings.clear(),
    ]);
    await Promise.all([
      db.entries.bulkAdd(data.entries),
      db.sessions.bulkAdd(data.sessions),
      db.progressHistory.bulkAdd(data.progressHistory),
      db.warmupConfigs.bulkAdd(data.warmupConfigs),
      db.bodyweights.bulkAdd(data.bodyweights, { allKeys: true }),
      db.settings.bulkAdd(data.settings),
    ]);
  });
  return { entries: data.entries.length, sessions: data.sessions.length, progressHistory: data.progressHistory.length };
}

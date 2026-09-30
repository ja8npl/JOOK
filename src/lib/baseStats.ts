import { type BodyWeight, type GymEntry, type ProgressHistory, type WorkoutSession } from '../db/schema';

/* ════════════ Pure Logik (getestet) — erweiterte Base-Statistik ════════════ */

const DAY_MS = 86_400_000;

export interface BaseStats {
  /** Gesamt-Volumen über alle Arbeits-Sätze (kg × reps), warm-up ausgeschlossen. */
  totalVolume: number;
  /** Summe aller geloggten Arbeits-Sätze. */
  totalSets: number;
  /** Anzahl abgeschlossener Trainingseinheiten (Sessions). */
  sessionCount: number;
  /** Anzahl händisch geloggter Einträge (ohne Session-Tracking). */
  entryCount: number;
  /** Anzahl Übungen mit mindestens einem Progress-Punkt. */
  exerciseCount: number;
  /** Tatsächliche Trainingstage (auch mehrere Sessions am Tag zählen einmal). */
  trainingDays: number;
  /** Aktuelle Streak aufeinanderfolgender Trainingstage inkl. heute/gestern. */
  currentStreak: number;
  /** Beste Streak über alle Daten. */
  bestStreak: number;
  /** Summe der Körpergewichts-Messungen (0 ohne Daten). */
  weightLogs: number;
}

/** Lokales Tages-Datum als UTC-Tagesnummer (stabil, ohne Zeitzonen-Drift im Aggregat). */
export function dayNumber(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

/** Gruppiert Zeitstempel auf eindeutige Tage und sortiert sie aufsteigend. */
export function uniqueDaysSorted(timestamps: number[]): number[] {
  const days = new Set<number>();
  for (const timestamp of timestamps) days.add(dayNumber(timestamp));
  return [...days].sort((a, b) => a - b);
}

/**
 * Streak über aufeinanderfolgende Tage: Längste Kette im Datenbestand (bestStreak)
 * und die laufende Kette, die heute oder gestern endet (currentStreak).
 */
export function computeStreaks(days: number[], todayDay: number): { currentStreak: number; bestStreak: number } {
  if (days.length === 0) return { currentStreak: 0, bestStreak: 0 };
  let best = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index] - days[index - 1] === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }
  const last = days[days.length - 1];
  const current = last === todayDay || last === todayDay - 1
    ? (() => {
      let streak = 1;
      for (let index = days.length - 1; index > 0; index -= 1) {
        if (days[index] - days[index - 1] === 1) streak += 1;
        else break;
      }
      return streak;
    })()
    : 0;
  return { currentStreak: current, bestStreak: best };
}

/** Personal Records über alle Übungen: bestes Max-Gewicht je exerciseId, sortiert absteigend. */
export interface PrRow {
  exerciseId: string;
  exerciseName: string;
  /** Bestes geloggtes Max-Arbeitsgewicht in kg. */
  bestGewicht: number;
  /** Zeitstempel des PR. */
  datum: number;
}

export function computePrs(history: ProgressHistory[], limit = 6): PrRow[] {
  const best = new Map<string, PrRow>();
  for (const point of history) {
    const existing = best.get(point.exerciseId);
    if (!existing || point.maxGewicht > existing.bestGewicht) {
      best.set(point.exerciseId, {
        exerciseId: point.exerciseId,
        exerciseName: point.exerciseName,
        bestGewicht: point.maxGewicht,
        datum: point.datum,
      });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.bestGewicht - a.bestGewicht)
    .slice(0, limit);
}

/** Volumen-Summe aus Progress-Historie (serverseitig beim Session-Save berechnet). */
export function computeVolumeFromHistory(history: ProgressHistory[]): number {
  return history.reduce((sum, point) => sum + (isFinite(point.totalVolume) ? point.totalVolume : 0), 0);
}

/** Volumen-Summe aus klassischen Einträgen (händisch geloggte Arbeits-Sätze). */
export function computeVolumeFromEntries(entries: GymEntry[]): number {
  let volume = 0;
  for (const entry of entries) {
    const sets = Array.isArray(entry.sets) ? entry.sets.filter((set) => set && !set.warmup && isFinite(set.gewicht) && isFinite(set.wiederholungen)) : [];
    for (const set of sets) volume += set.gewicht * set.wiederholungen;
  }
  return volume;
}

/** Anzahl der geloggten Arbeits-Sätze aus manuellen Einträgen. */
export function computeSetCountFromEntries(entries: GymEntry[]): number {
  return entries.reduce((total, entry) => {
    const sets = Array.isArray(entry.sets) ? entry.sets.filter((set) => set && !set.warmup) : [];
    return total + sets.length;
  }, 0);
}

/** Aggregiert alle Quellen zu einem Statistik-Objekt. */
export function computeBaseStats(input: {
  entries: GymEntry[];
  sessions: WorkoutSession[];
  progressHistory: ProgressHistory[];
  bodyWeights: BodyWeight[];
  jetzt: number;
}): BaseStats {
  const { entries, sessions, progressHistory, bodyWeights, jetzt } = input;
  const completed = sessions.filter((session) => session.status === 'completed');

  const sessionDays: number[] = [];
  for (const session of completed) sessionDays.push(session.startedAt);
  for (const entry of entries) {
    // Einträge zählen als Trainingstage, wenn sie nicht schon als Session geloggt wurden
    sessionDays.push(entry.datum);
  }
  const days = uniqueDaysSorted(sessionDays);
  const streaks = computeStreaks(days, dayNumber(jetzt));

  return {
    totalVolume: computeVolumeFromHistory(progressHistory) + computeVolumeFromEntries(entries),
    totalSets: progressHistory.reduce((sum, point) => sum + point.setCount, 0) + computeSetCountFromEntries(entries),
    sessionCount: completed.length,
    entryCount: entries.length,
    exerciseCount: new Set(progressHistory.map((point) => point.exerciseId)).size,
    trainingDays: days.length,
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
    weightLogs: bodyWeights.length,
  };
}

/** Volumen-Serie über die Zeit (für die Chart-Fläche): Summe pro Tag. */
export interface VolumePoint {
  tag: number;
  volume: number;
}

export function computeVolumeSeries(progressHistory: ProgressHistory[], entries: GymEntry[]): VolumePoint[] {
  const perDay = new Map<number, number>();
  const add = (timestamp: number, volume: number) => {
    if (!isFinite(volume) || volume <= 0) return;
    const day = dayNumber(timestamp);
    perDay.set(day, (perDay.get(day) ?? 0) + volume);
  };
  for (const point of progressHistory) add(point.datum, point.totalVolume);
  for (const entry of entries) {
    const sets = Array.isArray(entry.sets) ? entry.sets.filter((set) => set && !set.warmup) : [];
    add(entry.datum, sets.reduce((sum, set) => sum + set.gewicht * set.wiederholungen, 0));
  }
  return [...perDay.entries()]
    .map(([tag, volume]) => ({ tag, volume }))
    .sort((a, b) => a.tag - b.tag);
}

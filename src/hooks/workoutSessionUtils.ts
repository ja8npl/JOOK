import { type SessionExercise, type SessionSet } from '../db/schema';
import { createSessionSet } from './useWorkoutSessions';

export function updateSessionSet(set: SessionSet, patch: Partial<SessionSet>): SessionSet {
  return { ...set, ...patch };
}

/** Ab diesem Anteil erledigter Arbeitssätze zeigt das Verwerfen-Sheet die motivierende Variante. */
export const DISCARD_MOTIVATION_THRESHOLD = 0.5;

/** Geloggte vs. geplante Arbeitssätze einer Session (Warm-ups ausgeschlossen). */
export function sessionSetCounts(exercises: SessionExercise[]): { completed: number; planned: number } {
  let completed = 0;
  let planned = 0;
  for (const item of exercises) {
    for (const set of item.sets) {
      if (set.warmup) continue;
      planned += 1;
      if (set.completed) completed += 1;
    }
  }
  return { completed, planned };
}

/** Fortschritt einer Session als Anteil abgehakter Arbeitssätze (0–1), auf 2 Stellen gerundet.
 *  Nur Arbeitssätze zählen — Warm-up-Sätze (warmup: true) fließen nicht ein.
 *  Ohne geplante Sätze: null (kein Fortschritt berechenbar → Sheet-Verhalten wie bisher). */
export function computeSessionSetProgress(exercises: SessionExercise[]): number | null {
  const { completed, planned } = sessionSetCounts(exercises);
  if (planned === 0) return null;
  return Math.round((completed / planned) * 100) / 100;
}

export function appendSessionSet(exercise: SessionExercise): SessionExercise {
  return {
    ...exercise,
    // Neue Sätze übernehmen die Whd-Vorgabe der Übung (importierte Pläne), sonst die letzte Leistung.
    sets: [...exercise.sets, createSessionSet(exercise.sets.length + 1, exercise.previous, exercise.exercise.wiederholungen)],
  };
}

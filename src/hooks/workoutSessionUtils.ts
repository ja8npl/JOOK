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

/** Entfernt einen Satz (per ID) und nummeriert neu: Warm-ups zuerst, Arbeitssätze dahinter. */
export function withoutSessionSet(exercise: SessionExercise, setId: string): SessionExercise {
  const remaining = exercise.sets.filter((candidate) => candidate.id !== setId);
  const warmups = remaining.filter((candidate) => candidate.warmup);
  const work = remaining.filter((candidate) => !candidate.warmup);
  return {
    ...exercise,
    sets: [
      ...warmups,
      ...work.map((candidate, index) => ({ ...candidate, setNumber: warmups.length + index + 1 })),
    ],
  };
}

/** Verschiebt eine Übung an einen Einfügeindex im Raum "ohne gezogene Übung". */
export function reorderSessionExercises(exercises: SessionExercise[], fromId: string, insertIndex: number): SessionExercise[] {
  const fromIndex = exercises.findIndex((candidate) => candidate.exercise.id === fromId);
  if (fromIndex === -1) return exercises;
  const next = [...exercises];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, moved);
  return next;
}

import { type SessionExercise, type SessionSet } from '../db/schema';
import { createSessionSet } from './useWorkoutSessions';

export function updateSessionSet(set: SessionSet, patch: Partial<SessionSet>): SessionSet {
  return { ...set, ...patch };
}

export function appendSessionSet(exercise: SessionExercise): SessionExercise {
  return {
    ...exercise,
    // Neue Sätze übernehmen die Whd-Vorgabe der Übung (importierte Pläne), sonst die letzte Leistung.
    sets: [...exercise.sets, createSessionSet(exercise.sets.length + 1, exercise.previous, exercise.exercise.wiederholungen)],
  };
}

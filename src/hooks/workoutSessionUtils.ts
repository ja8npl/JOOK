import { type SessionExercise, type SessionSet } from '../db/schema';
import { createSessionSet } from './useWorkoutSessions';

export function updateSessionSet(set: SessionSet, patch: Partial<SessionSet>): SessionSet {
  return { ...set, ...patch };
}

export function appendSessionSet(exercise: SessionExercise): SessionExercise {
  return {
    ...exercise,
    sets: [...exercise.sets, createSessionSet(exercise.sets.length + 1, exercise.previous)],
  };
}

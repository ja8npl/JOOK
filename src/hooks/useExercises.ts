import exercisesData from '../data/exercises.json';

export interface StaticExercise {
  id: string;
  name: string;
  equipment?: string | null;
  target?: string | null;
}

const text = (value: unknown): string => typeof value === 'string' ? value : '';

const rawData: unknown[] = Array.isArray(exercisesData) ? exercisesData : [];

const db: StaticExercise[] = rawData
  .filter((exercise): exercise is Record<string, unknown> =>
    Boolean(exercise && typeof exercise === 'object'),
  )
  .map((exercise) => ({
    id: text(exercise.id),
    name: text(exercise.name),
    equipment: typeof exercise.equipment === 'string' ? exercise.equipment : null,
    target: typeof exercise.target === 'string' ? exercise.target : null,
  }))
  .filter((exercise) => exercise.id && exercise.name);

/** Live-Suche über die vollständige eingebundene free-exercise-db. */
export function searchStaticExercises(query: string): StaticExercise[] {
  const q = text(query).trim().toLowerCase();
  if (!q) return [];

  return db
    .filter((ex) =>
      ex.name.toLowerCase().includes(q) ||
      (ex.equipment ?? '').toLowerCase().includes(q) ||
      (ex.target ?? '').toLowerCase().includes(q),
    )
    .slice(0, 10);
}

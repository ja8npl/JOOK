import exercisesData from '../data/exercises.json';
import { type Exercise } from '../db/schema';

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

/**
 * Namen fürs Matching normalisieren: Kleinbuchstaben, Umlaute aufgelöst,
 * Diakritika entfernt, Satzzeichen/& raus, Whitespace normalisiert.
 * z. B. "Latzug, vorderer Schrägbankdruck" → "latzug vorderer schraegbankdruck"
 */
export function normalizeExerciseName(name: string): string {
  return text(name)
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const normalizedNames = new Map<string, StaticExercise>(
  db.map((exercise) => [normalizeExerciseName(exercise.name), exercise]),
);

/**
 * Deutsch→Bibliothek-Brücke: die free-exercise-db führt englische Namen.
 * Keys sind normalisierte Namen, Values verifizierte Bibliotheksnamen —
 * nur gesicherte Treffer, damit nichts Falsches verknüpft wird.
 */
const LIBRARY_ALIASES: Record<string, string> = {
  // Deutsch → Bibliothek (Keys in normalisierter Form, Umlaute als ae/oe/ue)
  bankdruecken: 'Barbell Bench Press - Medium Grip',
  schraegbankdruecken: 'Barbell Incline Bench Press - Medium Grip',
  'kurzhantel bankdruecken': 'Dumbbell Bench Press',
  latzug: 'Wide-Grip Lat Pulldown',
  kreuzheben: 'Barbell Deadlift',
  'rumaenisches kreuzheben': 'Romanian Deadlift',
  beinpresse: 'Leg Press',
  beinstrecker: 'Leg Extensions',
  beinbeuger: 'Seated Leg Curl',
  wadenheben: 'Seated Calf Raise',
  'bizeps curls': 'Barbell Curl',
  trizepsdruecken: 'Triceps Pushdown',
  schulterdruecken: 'Barbell Shoulder Press',
  rudern: 'Bent Over Barbell Row',
  kniebeugen: 'Barbell Squat',
  frontkniebeugen: 'Front Squat (Clean Grip)',
  ausfallschritte: 'Barbell Lunge',
  'hip thrusts': 'Barbell Hip Thrust',
  'glute bridge': 'Barbell Hip Thrust',
  'face pulls': 'Face Pull',
  dips: 'Dips - Chest Version',
  liegestuetze: 'Pushups',
  schulterheben: 'Barbell Shrug',
  ruckenstrecker: 'Hyperextensions (Back Extensions)',
  crunches: 'Cable Crunch',
  situps: 'Sit-Up',
  beinheben: 'Hanging Leg Raise',
  'russian twists': 'Russian Twist',
  planke: 'Plank',
  klimmzuege: 'Chin-Up',
  seitenheben: 'Side Lateral Raise',
  butterfly: 'Cable Crossover',
  'arnold press': 'Arnold Dumbbell Press',
  'lat pulldown': 'Wide-Grip Lat Pulldown',
  // Englische Schreibvarianten → nächstliegender Bibliotheksname
  squats: 'Barbell Squat',
  pushups: 'Pushups',
  'push ups': 'Pushups',
  pullups: 'Chin-Up',
  'pull ups': 'Chin-Up',
  'sit ups': 'Sit-Up',
  'calf raises': 'Seated Calf Raise',
  'lateral raises': 'Side Lateral Raise',
  'lat pulldowns': 'Wide-Grip Lat Pulldown',
  'lateral pulldown': 'Wide-Grip Lat Pulldown',
  'leg curls': 'Seated Leg Curl',
  'leg extensions': 'Leg Extensions',
  'bench presses': 'Barbell Bench Press - Medium Grip',
  'shoulder presses': 'Barbell Shoulder Press',
  'chest presses': 'Cable Chest Press',
  'skull crushers': 'EZ-Bar Skullcrusher',
  'triceps pushdowns': 'Triceps Pushdown',
};

export interface ExerciseMatch {
  /** Passende Bibliotheksübung oder ein neues Exercise-Objekt mit custom-id. */
  exercise: Exercise;
  /** true, wenn der Name über die Übungsbibliothek gematcht wurde. */
  matched: boolean;
}

function libraryMatch(exercise: StaticExercise): ExerciseMatch {
  return {
    exercise: {
      id: exercise.id,
      name: exercise.name,
      equipment: exercise.equipment ?? undefined,
      target: exercise.target ?? undefined,
    },
    matched: true,
  };
}

function customMatch(name: string, normalized: string): ExerciseMatch {
  const id = normalized ? `custom-${normalized.replace(/\s+/g, '-')}` : `custom-${crypto.randomUUID()}`;
  return { exercise: { id, name: name.trim() || 'Übung' }, matched: false };
}

/**
 * Übungsname gegen die eingebundene Bibliothek matchen — Groß-/Kleinschreibung
 * und Umlaute werden ignoriert, deutsche und englische Schreibvarianten aufgelöst.
 */
export function matchStaticExercise(name: string): ExerciseMatch {
  const trimmed = name.trim();
  const normalized = normalizeExerciseName(trimmed);
  if (!normalized) return customMatch(trimmed, '');

  // Satz-/Wiederholungs-Suffixe ("3x10", "12") aus dem Match-Key entfernen —
  // der Anzeigename bleibt unverändert.
  const cleaned = normalized
    .split(' ')
    .filter((token) => !/^\d+(x\d+)?$/.test(token))
    .join(' ') || normalized;

  const exact = normalizedNames.get(cleaned);
  if (exact) return libraryMatch(exact);

  const aliasTarget = LIBRARY_ALIASES[cleaned];
  if (aliasTarget) {
    const aliasHit = normalizedNames.get(normalizeExerciseName(aliasTarget));
    if (aliasHit) return libraryMatch(aliasHit);
  }

  // Fuzzy-Fallback: Bibliotheksnamen, die den Begriff enthalten (kürzester gewinnt).
  if (cleaned.length >= 4) {
    let best: StaticExercise | undefined;
    for (const exercise of db) {
      const candidate = normalizeExerciseName(exercise.name);
      if (candidate.includes(cleaned) && (!best || exercise.name.length < best.name.length)) best = exercise;
    }
    if (best) return libraryMatch(best);

    // Token-Fallback: alle Begriffe müssen vorkommen (z. B. "Bankdrücken Kurzhantel").
    const tokens = cleaned.split(' ');
    if (tokens.length > 1) {
      for (const exercise of db) {
        const candidate = normalizeExerciseName(exercise.name);
        if (tokens.every((token) => candidate.includes(token)) && (!best || exercise.name.length < best.name.length)) best = exercise;
      }
      if (best) return libraryMatch(best);
    }
  }

  return customMatch(trimmed, normalized);
}

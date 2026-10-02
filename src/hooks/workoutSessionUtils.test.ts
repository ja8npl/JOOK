import { describe, expect, it } from 'vitest';
import { computeSessionSetProgress, DISCARD_MOTIVATION_THRESHOLD, withoutSessionSet, reorderSessionExercises } from './workoutSessionUtils';
import { type SessionExercise, type SessionSet } from '../db/schema';

function set(overrides: Partial<SessionSet> = {}): SessionSet {
  return {
    id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    setNumber: 1,
    gewicht: 60,
    wiederholungen: 10,
    completed: false,
    ...overrides,
  };
}

function exercise(sets: SessionSet[]): SessionExercise {
  return { exercise: { id: 'lat-zug', name: 'Lat Zug' }, sets };
}

describe('computeSessionSetProgress', () => {
  it('0 geplante Sätze → null (kein Fortschritt berechenbar)', () => {
    expect(computeSessionSetProgress([])).toBeNull();
    expect(computeSessionSetProgress([exercise([])])).toBeNull();
  });

  it('nur Warm-up-Sätze zählen nicht als geplante Arbeitssätze → null', () => {
    expect(computeSessionSetProgress([exercise([set({ warmup: true, completed: true })])])).toBeNull();
  });

  it('Warm-up-Sätze fließen weder in Zähler noch Nenner ein', () => {
    const exercises = [exercise([
      set({ warmup: true, completed: true }),
      set({ completed: true }),
      set({ setNumber: 2 }),
    ])];
    expect(computeSessionSetProgress(exercises)).toBe(0.5);
  });

  it('exakt 50% → 0.5 (Schwelle trifft zu, motivierende Variante greift)', () => {
    const exercises = [exercise([set({ completed: true }), set({ setNumber: 2 })])];
    expect(computeSessionSetProgress(exercises)).toBe(0.5);
    expect(computeSessionSetProgress(exercises)! >= DISCARD_MOTIVATION_THRESHOLD).toBe(true);
  });

  it('0 von 4 → 0 (Warn-Variante)', () => {
    expect(computeSessionSetProgress([exercise([set(), set({ setNumber: 2 }), set({ setNumber: 3 }), set({ setNumber: 4 })])])).toBe(0);
  });

  it('alle erledigt → 1', () => {
    expect(computeSessionSetProgress([exercise([set({ completed: true }), set({ setNumber: 2, completed: true })])])).toBe(1);
  });

  it('mehrere Übungen werden summiert', () => {
    const exercises = [
      exercise([set({ completed: true }), set({ setNumber: 2, completed: true })]),
      exercise([set({ completed: true }), set({ setNumber: 2 })]),
    ];
    expect(computeSessionSetProgress(exercises)).toBe(0.75);
  });

  it('Rundung: 1 von 3 → 0.33 (nicht 0.3333)', () => {
    expect(computeSessionSetProgress([exercise([set({ completed: true }), set({ setNumber: 2 }), set({ setNumber: 3 })])])).toBe(0.33);
  });
});

describe('withoutSessionSet', () => {
  it('entfernt einen Arbeitssatz und nummeriert die restlichen Arbeitssätze neu', () => {
    const ex = exercise([
      set({ id: 's1', setNumber: 1, completed: true }),
      set({ id: 's2', setNumber: 2, completed: false }),
      set({ id: 's3', setNumber: 3, completed: false }),
    ]);
    const next = withoutSessionSet(ex, 's2');
    expect(next.sets.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(next.sets.map((s) => s.setNumber)).toEqual([1, 2]);
  });

  it('behält Warm-up-Sätze unverändert vorne', () => {
    const ex = exercise([
      set({ id: 'w1', setNumber: 1, warmup: true }),
      set({ id: 'w2', setNumber: 2, warmup: true }),
      set({ id: 's1', setNumber: 3, completed: true }),
      set({ id: 's2', setNumber: 4 }),
    ]);
    const next = withoutSessionSet(ex, 's1');
    expect(next.sets.map((s) => s.id)).toEqual(['w1', 'w2', 's2']);
    // Warm-ups behalten 1, 2; Arbeitssatz wird neu auf 3 nummeriert
    expect(next.sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
  });

  it('gibt leere Liste zurück, wenn der einzige Satz gelöscht wird', () => {
    const ex = exercise([set({ id: 'only', setNumber: 1 })]);
    const next = withoutSessionSet(ex, 'only');
    expect(next.sets.length).toBe(0);
  });
});

describe('reorderSessionExercises', () => {
  const base = (ids: string[]) =>
    ids.map((id) => ({
      exercise: { id, name: id },
      sets: [set({ id: `${id}-s1`, setNumber: 1 })],
    }));

  it('bewegt ein Element nach oben', () => {
    const reordered = reorderSessionExercises(base(['a', 'b', 'c']), 'c', 0);
    expect(reordered.map((e) => e.exercise.id)).toEqual(['c', 'a', 'b']);
  });

  it('bewegt ein Element nach unten', () => {
    const reordered = reorderSessionExercises(base(['a', 'b', 'c']), 'a', 2);
    expect(reordered.map((e) => e.exercise.id)).toEqual(['b', 'c', 'a']);
  });

  it('insertIndex > Länge → am Ende einfügen', () => {
    const reordered = reorderSessionExercises(base(['a', 'b']), 'a', 5);
    expect(reordered.map((e) => e.exercise.id)).toEqual(['b', 'a']);
  });

  it('insertIndex < 0 → an den Anfang', () => {
    const reordered = reorderSessionExercises(base(['a', 'b']), 'b', -1);
    expect(reordered.map((e) => e.exercise.id)).toEqual(['b', 'a']);
  });

  it('unbekannte ID → unverändert', () => {
    const reordered = reorderSessionExercises(base(['a', 'b']), 'unknown', 0);
    expect(reordered.map((e) => e.exercise.id)).toEqual(['a', 'b']);
  });
});

import { describe, expect, it } from 'vitest';
import { computeSessionSetProgress, DISCARD_MOTIVATION_THRESHOLD } from './workoutSessionUtils';
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

describe('DISCARD_MOTIVATION_THRESHOLD', () => {
  it('liegt bei 50%', () => {
    expect(DISCARD_MOTIVATION_THRESHOLD).toBe(0.5);
  });
});

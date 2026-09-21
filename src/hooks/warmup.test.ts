import { describe, expect, it } from 'vitest';
import {
  WARMUP_WEIGHT_STEP_KG,
  buildWarmupPlan,
  buildWarmupSets,
  historyPoints,
  matchesMachineId,
  parseKgInput,
  roundWarmupWeight,
  todayKey,
  warmupExerciseKey,
  withWarmupSets,
  withoutWarmupSets,
} from './warmup';
import { bestSetOf, entryLoadPoint, setsOf } from './useSets';
import { type GymEntry, type SessionExercise, type SessionSet, type WorkoutSet } from '../db/schema';

const entry = (datum: number, sets: Array<[number, number]>): GymEntry => ({
  machineId: 'test',
  name: 'Test',
  einstellung: '',
  datum,
  updatedAt: datum,
  sets: sets.map(([gewicht, wiederholungen]): WorkoutSet => ({ gewicht, wiederholungen, timestamp: datum })),
});

const sessionExercise = (sets: SessionSet[]): SessionExercise => ({
  exercise: { id: 'ex-1', name: 'Bankdrücken' },
  sets,
});

const workSet = (setNumber: number, gewicht: number): SessionSet => ({
  id: `w${setNumber}`,
  setNumber,
  gewicht,
  wiederholungen: 8,
  completed: false,
});

describe('parseKgInput', () => {
  it.each([
    ['60', 60],
    ['60,5', 60.5],
    ['60.5', 60.5],
    [' 80 ', 80],
  ])('akzeptiert "%s" → %d', (raw, expected) => {
    expect(parseKgInput(raw)).toBe(expected);
  });

  it.each([
    ['0'],
    ['-5'],
    [''],
    ['abc'],
    ['12x'],
    ['1,2,3'],
  ])('lehnt "%s" ab (null)', (raw) => {
    expect(parseKgInput(raw)).toBeNull();
  });
});

describe('roundWarmupWeight', () => {
  it.each([
    [10, 10],
    [11, 10],
    [13.75, 15],
    [14, 15],
    [16, 15],
    [20, 20],
  ] as const)('rundet %d kg auf den 2,5er-Schritt → %d', (kg, expected) => {
    expect(roundWarmupWeight(kg)).toBe(expected);
  });

  it.each([
    [0, 0],
    [-10, 0],
    [Number.NaN, 0],
  ] as const)('ungültig: %d → 0', (kg, expected) => {
    expect(roundWarmupWeight(kg)).toBe(expected);
  });

  it('gibt mindestens einen Schritt über 0 zurück', () => {
    expect(roundWarmupWeight(0.1)).toBe(WARMUP_WEIGHT_STEP_KG);
  });
});

describe('buildWarmupPlan', () => {
  it('60 kg ohne dritten Satz: 25 % (10–20) und 50 % (3–10)', () => {
    const plan = buildWarmupPlan(60, false);
    expect(plan.map((s) => [s.gewicht, s.repsMin, s.repsMax])).toEqual([
      [15, 10, 20],
      [30, 3, 10],
    ]);
    expect(plan[0].label).toBe('Warm-up 25%');
  });

  it('60 kg mit drittem Satz: 75 % mit 2–3 Reps', () => {
    const plan = buildWarmupPlan(60, true);
    expect(plan).toHaveLength(3);
    expect(plan[2]).toMatchObject({ fraction: 0.75, gewicht: 45, repsMin: 2, repsMax: 3 });
  });

  it('Rundungs-Dubletten werden zusammengefasst (4 kg: alle Stufen → 2,5)', () => {
    const plan = buildWarmupPlan(4, true);
    expect(plan).toHaveLength(1);
    expect(plan[0].gewicht).toBe(2.5);
  });
});

describe('warmupExerciseKey / todayKey', () => {
  it('normalisiert Namen zu machineId-Keys', () => {
    expect(warmupExerciseKey({ id: 'x', name: '  Bankdrücken ' })).toBe('bankdrücken');
    expect(warmupExerciseKey({ id: 'x', name: 'Lat Zug vorderer Griff' })).toBe('lat-zug-vorderer-griff');
  });

  it('baut lokale Tages-Keys mit Zero-Padding', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayKey(new Date(2026, 10, 21))).toBe('2026-11-21');
  });
});

describe('Warm-up-Sätze in der Session', () => {
  const plan = buildWarmupPlan(60, false); // 15 / 30 kg

  it('buildWarmupSets erzeugt abhakbare Warm-up-Sätze', () => {
    const sets = buildWarmupSets(plan);
    expect(sets.map((s) => [s.setNumber, s.gewicht, s.warmup, s.completed])).toEqual([
      [1, 15, true, false],
      [2, 30, true, false],
    ]);
    expect(sets[0]).toMatchObject({ warmupLabel: 'Warm-up 25%', zielRepsMin: 10, zielRepsMax: 20 });
  });

  it('withWarmupSets stellt Warm-ups voran und nummeriert Arbeitssätze neu', () => {
    const result = withWarmupSets(sessionExercise([workSet(1, 60), workSet(2, 62.5)]), buildWarmupSets(plan));
    expect(result.sets.map((s) => [s.warmup ?? false, s.setNumber, s.gewicht])).toEqual([
      [true, 1, 15],
      [true, 2, 30],
      [false, 3, 60],
      [false, 4, 62.5],
    ]);
  });

  it('withWarmupSets ersetzt bestehende Warm-ups statt zu duplizieren', () => {
    const configured = withWarmupSets(sessionExercise([workSet(1, 60)]), buildWarmupSets(buildWarmupPlan(80, false)));
    const changed = withWarmupSets(configured, buildWarmupSets(plan));
    expect(changed.sets.filter((s) => s.warmup)).toHaveLength(2);
    expect(changed.sets.map((s) => s.gewicht)).toEqual([15, 30, 60]);
  });

  it('withoutWarmupSets entfernt Warm-ups und nummeriert Arbeitssätze neu', () => {
    const clean = withoutWarmupSets(withWarmupSets(sessionExercise([workSet(1, 60), workSet(2, 62.5)]), buildWarmupSets(plan)));
    expect(clean.sets.map((s) => [s.setNumber, s.gewicht, s.warmup ?? false])).toEqual([
      [1, 60, false],
      [2, 62.5, false],
    ]);
  });
});

describe('matchesMachineId (Bibliotheks-Brücke)', () => {
  it.each([
    [{ id: 'a', name: 'Bankdrücken' }, 'bankdrücken', true],
    [{ id: 'b', name: 'Barbell Bench Press - Medium Grip' }, 'bankdrücken', true],
    [{ id: 'c', name: 'Meine Eigenkreation' }, 'bankdrücken', false],
  ] as const)('"%s" ↔ "%s" → %s', (exercise, machineId, expected) => {
    expect(matchesMachineId(exercise, machineId)).toBe(expected);
  });
});

describe('historyPoints', () => {
  it('sortiert chronologisch, max Gewicht pro Eintrag, Einträge ohne Sätze gefiltert', () => {
    const points = historyPoints([
      entry(300, [[60, 8], [70, 6]]),
      entry(100, [[50, 10]]),
      entry(200, []),
      entry(400, [[80, 5], [Number.NaN, 3]]),
    ]);
    expect(points).toEqual([
      { datum: 100, maxGewicht: 50 },
      { datum: 300, maxGewicht: 70 },
      { datum: 400, maxGewicht: 80 },
    ]);
  });
});

describe('useSets-Helper', () => {
  it('setsOf filtert kaputte Sätze defensiv', () => {
    const e = entry(100, [[60, 8], [70, 6]]);
    e.sets = [...(e.sets ?? []), { gewicht: Number.NaN, wiederholungen: 5, timestamp: 100 }];
    expect(setsOf(e)).toHaveLength(2);
    expect(setsOf(undefined)).toEqual([]);
  });

  it('bestSetOf gewinnt bei Gleichstand über Reps', () => {
    const e = entry(100, [[80, 5], [80, 8], [70, 12]]);
    expect(bestSetOf(e)).toMatchObject({ gewicht: 80, wiederholungen: 8 });
  });

  it('entryLoadPoint: null ohne Sätze, sonst max/avg/Anzahl', () => {
    expect(entryLoadPoint(entry(100, []))).toBeNull();
    expect(entryLoadPoint(entry(100, [[60, 8], [80, 6]]))).toEqual({
      datum: 100,
      maxGewicht: 80,
      avgGewicht: 70,
      satzCount: 2,
    });
  });
});

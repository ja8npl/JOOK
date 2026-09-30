import { describe, expect, it } from 'vitest';
import {
  computeBaseStats, computePrs, computeStreaks, computeVolumeFromEntries,
  computeSetCountFromEntries, computeVolumeFromHistory, computeVolumeSeries, dayNumber, uniqueDaysSorted,
} from './baseStats';
import { type BodyWeight, type GymEntry, type ProgressHistory, type WorkoutSession } from '../db/schema';

const DAY = 86_400_000;
/** Fixes "heute": 2026-09-29 12:00 lokale Zeit. */
const JETZT = new Date(2026, 8, 29, 12, 0, 0).getTime();

function entry(overrides: Partial<GymEntry> = {}): GymEntry {
  return {
    id: 1,
    machineId: 'lat-zug',
    name: 'Lat Zug',
    einstellung: '',
    datum: JETZT - DAY,
    updatedAt: JETZT - DAY,
    sets: [{ gewicht: 60, wiederholungen: 10, timestamp: JETZT - DAY }],
    ...overrides,
  };
}

function progressPoint(overrides: Partial<ProgressHistory> = {}): ProgressHistory {
  return {
    id: 1,
    sessionId: 1,
    exerciseId: 'lat-zug',
    exerciseName: 'Lat Zug',
    datum: JETZT - DAY,
    maxGewicht: 80,
    bestReps: 8,
    totalVolume: 2400,
    estimatedOneRepMax: 101,
    setCount: 3,
    overloadKg: 2.5,
    overloadReps: 0,
    ...overrides,
  };
}

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 1,
    name: 'Push',
    startedAt: JETZT - DAY,
    endedAt: JETZT - DAY + 3_600_000,
    status: 'completed',
    exercises: [],
    createdAt: JETZT - DAY,
    updatedAt: JETZT - DAY,
    ...overrides,
  };
}

describe('dayNumber / uniqueDaysSorted', () => {
  it('mapt Zeitstempel auf Tagesnummern und entdupliert', () => {
    const morning = new Date(2026, 8, 28, 7, 30).getTime();
    const evening = new Date(2026, 8, 28, 22, 10).getTime();
    expect(dayNumber(morning)).toBe(dayNumber(evening));
    const days = uniqueDaysSorted([evening, morning, JETZT]);
    expect(days).toHaveLength(2);
    expect(days[0]).toBeLessThan(days[1]);
  });
});

describe('computeStreaks', () => {
  it('zählt aufeinanderfolgende Tage als bestStreak', () => {
    const today = dayNumber(JETZT);
    const { bestStreak } = computeStreaks([today - 4, today - 3, today - 2], today);
    expect(bestStreak).toBe(3);
  });

  it('hält currentStreak am Leben, wenn gestern trainiert wurde', () => {
    const today = dayNumber(JETZT);
    const { currentStreak } = computeStreaks([today - 3, today - 2, today - 1], today);
    expect(currentStreak).toBe(3);
  });

  it('bricht currentStreak, wenn der letzte Tag vor gestern liegt', () => {
    const today = dayNumber(JETZT);
    const { currentStreak, bestStreak } = computeStreaks([today - 10, today - 9], today);
    expect(currentStreak).toBe(0);
    expect(bestStreak).toBe(2);
  });

  it('liefert 0/0 ohne Tage', () => {
    expect(computeStreaks([], dayNumber(JETZT))).toEqual({ currentStreak: 0, bestStreak: 0 });
  });
});

describe('computePrs', () => {
  it('liefert pro Übung das beste Max-Gewicht, sortiert absteigend', () => {
    const rows = computePrs([
      progressPoint({ exerciseId: 'a', exerciseName: 'A', maxGewicht: 60, datum: 1 }),
      progressPoint({ exerciseId: 'a', exerciseName: 'A', maxGewicht: 75, datum: 2 }),
      progressPoint({ exerciseId: 'b', exerciseName: 'B', maxGewicht: 100, datum: 3 }),
      progressPoint({ exerciseId: 'b', exerciseName: 'B', maxGewicht: 90, datum: 4 }),
    ]);
    expect(rows.map((row) => [row.exerciseId, row.bestGewicht])).toEqual([['b', 100], ['a', 75]]);
  });

  it('respektiert das Limit', () => {
    const rows = computePrs(
      [1, 2, 3].map((n) => progressPoint({ exerciseId: `x${n}`, maxGewicht: n * 10 })),
      2,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].bestGewicht).toBe(30);
  });
});

describe('Volumen-Aggregation', () => {
  it('summiert totalVolume aus der Progress-Historie', () => {
    expect(computeVolumeFromHistory([progressPoint({ totalVolume: 1000 }), progressPoint({ totalVolume: 500 })])).toBe(1500);
  });

  it('summiert Arbeits-Sätze aus Einträgen (warm-up ausgeschlossen)', () => {
    const entryWithWarmup = entry({
      sets: [
        { gewicht: 20, wiederholungen: 10, timestamp: 1, warmup: true },
        { gewicht: 60, wiederholungen: 10, timestamp: 2 },
      ],
    });
    expect(computeVolumeFromEntries([entryWithWarmup])).toBe(600);
    expect(computeSetCountFromEntries([entryWithWarmup])).toBe(1);
  });

  it('baut eine sortierte Volumen-Serie pro Tag', () => {
    const yesterdaysEntry = entry({ datum: JETZT - DAY });
    const series = computeVolumeSeries([progressPoint({ datum: JETZT - 2 * DAY, totalVolume: 900 })], [yesterdaysEntry, yesterdaysEntry]);
    expect(series).toHaveLength(2);
    expect(series[0].tag).toBeLessThan(series[1].tag);
    expect(series[0].volume).toBe(900);
    // Beide Einträge am selben Tag addieren sich
    expect(series[1].volume).toBe(1200);
  });
});

describe('computeBaseStats', () => {
  it('aggregiert alle Quellen zu einem Statistik-Objekt', () => {
    const stats = computeBaseStats({
      entries: [entry()],
      sessions: [session(), session({ id: 2, status: 'discarded' })],
      progressHistory: [progressPoint(), progressPoint({ exerciseId: 'b', exerciseName: 'B', setCount: 2, totalVolume: 1200 })],
      bodyWeights: [{ id: 1, gewicht: 80, tag: '2026-09-28' } as BodyWeight],
      jetzt: JETZT,
    });
    expect(stats.sessionCount).toBe(1);
    expect(stats.entryCount).toBe(1);
    expect(stats.exerciseCount).toBe(2);
    expect(stats.totalSets).toBe(6);
    expect(stats.totalVolume).toBe(2400 + 1200 + 600);
    expect(stats.trainingDays).toBe(1);
    expect(stats.weightLogs).toBe(1);
    // Gestern trainiert → Streak 1
    expect(stats.currentStreak).toBe(1);
  });

  it('zählt mehrere Einheiten am selben Tag als einen Trainingstag', () => {
    const stats = computeBaseStats({
      entries: [entry({ datum: JETZT - DAY })],
      sessions: [session(), session({ id: 2, startedAt: JETZT - DAY + 7_200_000, createdAt: JETZT - DAY, updatedAt: JETZT - DAY })],
      progressHistory: [],
      bodyWeights: [],
      jetzt: JETZT,
    });
    expect(stats.trainingDays).toBe(1);
    expect(stats.sessionCount).toBe(2);
  });
});

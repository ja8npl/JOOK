import { describe, expect, it } from 'vitest';
import {
  ANALYSE_WINDOW_DAYS,
  averageOfLast7Days,
  classifyMuster,
  computeAnalyse,
  currentBodyWeight,
  daysInMode,
} from './useTrainingStats';
import { type BodyWeight, type GymEntry, type WorkoutSet } from '../db/schema';

const DAY = 86_400_000;
const JETZT = new Date(2026, 8, 21, 12).getTime(); // 2026-09-21 12:00 lokal

const entry = (machineId: string, name: string, tag: number, sets: Array<[number, number]>): GymEntry => ({
  machineId,
  name,
  einstellung: '',
  datum: JETZT - tag * DAY,
  updatedAt: JETZT - tag * DAY,
  sets: sets.map(([gewicht, wiederholungen]): WorkoutSet => ({ gewicht, wiederholungen, timestamp: JETZT - tag * DAY })),
});

const measure = (id: number, gewicht: number, tag: string): BodyWeight => ({ id, gewicht, tag });

describe('computeAnalyse — Deltas', () => {
  it('berechnet +kg/-Reps aus ältestem vs. neuestem Eintrag', () => {
    const r = computeAnalyse([
      entry('bd', 'Bankdrücken', 28, [[70, 10]]),
      entry('bd', 'Bankdrücken', 1, [[80, 8]]),
    ], JETZT);
    expect(r.gains).toHaveLength(1);
    expect(r.gains[0]).toMatchObject({ name: 'Bankdrücken', deltaKg: 10, deltaReps: -2 });
    expect(r.gains[0].deltaKg).toBeGreaterThan(0);
  });

  it('ignoriert Übungen mit nur einem Eintrag und Einträge außerhalb des 30-Tage-Fensters', () => {
    const r = computeAnalyse([
      entry('bd', 'Bankdrücken', 40, [[60, 10]]), // außerhalb
      entry('bd', 'Bankdrücken', 10, [[65, 10]]),
      entry('bd', 'Bankdrücken', 2, [[80, 8]]),
      entry('lh', 'Latzug', 5, [[50, 12]]), // nur 1 Eintrag im Fenster
    ], JETZT);
    expect(r.gains).toHaveLength(1);
    expect(r.gains[0].deltaKg).toBe(15); // 65 → 80, der 40-Tage-Eintrag zählt nicht
  });

  it('scheidet unplausible Sprünge aus (> 30 kg)', () => {
    const r = computeAnalyse([
      entry('bd', 'Bankdrücken', 20, [[60, 10]]),
      entry('bd', 'Bankdrücken', 1, [[95, 8]]), // +35 kg → Eingabefehler
    ], JETZT);
    expect(r.gains).toHaveLength(0);
    expect(r.regress).toHaveLength(0);
    expect(r.muster).toHaveLength(0);
  });

  it('sortiert Gewinne absteigend, Rückschritte aufsteigend', () => {
    const r = computeAnalyse([
      entry('a', 'A', 10, [[60, 10]]), entry('a', 'A', 1, [[65, 10]]), // +5
      entry('b', 'B', 10, [[60, 10]]), entry('b', 'B', 1, [[67.5, 10]]), // +7,5
      entry('c', 'C', 10, [[60, 10]]), entry('c', 'C', 1, [[57.5, 10]]), // −2,5
    ], JETZT);
    expect(r.gains.map((g) => g.deltaKg)).toEqual([7.5, 5]);
    expect(r.regress.map((g) => g.deltaKg)).toEqual([-2.5]);
  });
});

describe('classifyMuster', () => {
  it.each([
    [5, -2, 'intensitaet'], // Gewicht ↑, Reps ↓
    [-5, 3, 'volumen'], // Gewicht ↓, Reps ↑
    [2.5, 2, 'fortschritt'],
    [-2.5, -2, 'stabil'],
    [0.2, 0.2, 'stabil'], // unterhalb der 0,5-Schwelle
  ] as const)('deltaKg=%d, deltaReps=%d → %s', (kg, reps, expected) => {
    expect(classifyMuster(kg, reps)).toBe(expected);
  });
});

describe('Gauges', () => {
  it('Kraft = Anteil gestiegener Übungen, Volumen = Anteil bewegter, Konsistenz = aktive Tage/30', () => {
    const r = computeAnalyse([
      entry('a', 'A', 10, [[60, 10]]), entry('a', 'A', 1, [[70, 10]]), // ↑
      entry('b', 'B', 10, [[60, 10]]), entry('b', 'B', 1, [[60, 12]]), // stabil kg, reps ↑ → bewegt
      entry('c', 'C', 10, [[60, 10]]), entry('c', 'C', 1, [[55, 10]]), // ↓
      entry('d', 'D', 10, [[60, 10]]), entry('d', 'D', 1, [[60, 10]]), // gleich
    ], JETZT);
    expect(r.kraft).toBeCloseTo(1 / 4);
    expect(r.volumen).toBeCloseTo(2 / 4);
    expect(r.konsistenz).toBeCloseTo(2 / ANALYSE_WINDOW_DAYS); // 2 aktive Tage (−10 d, −1 d)
  });

  it('ohne Daten: alle Gauges 0', () => {
    const r = computeAnalyse([], JETZT);
    expect(r.kraft).toBe(0);
    expect(r.volumen).toBe(0);
    expect(r.konsistenz).toBe(0);
  });
});

describe('averageOfLast7Days / currentBodyWeight', () => {
  it('mittelt Tagesmittel der letzten 7 Tage, ignoriert Älteres', () => {
    const ms = [
      measure(JETZT - 1 * DAY, 73.0, '2026-09-20'),
      measure(JETZT - 1 * DAY, 73.4, '2026-09-20'), // gleicher Tag → Tagesmittel 73,2
      measure(JETZT - 8 * DAY, 80.0, '2026-09-13'), // zu alt
    ];
    expect(averageOfLast7Days(ms, JETZT)).toBeCloseTo(73.2);
  });

  it('null ohne Messungen; aktuell = höchste id', () => {
    expect(averageOfLast7Days([], JETZT)).toBeNull();
    expect(currentBodyWeight([measure(100, 73.2, '2026-09-21'), measure(50, 74, '2026-09-19')]))
      .toMatchObject({ gewicht: 73.2 });
  });
});

describe('daysInMode', () => {
  it('rechnet volle Tage, unter 24h → 0', () => {
    expect(daysInMode(JETZT - 12 * DAY, JETZT)).toBe(12);
    expect(daysInMode(JETZT - 5 * 60 * 60 * 1000, JETZT)).toBe(0);
  });
});

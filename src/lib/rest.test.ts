import { describe, expect, it } from 'vitest';
import { formatRestTime, resolveRestSeconds } from './rest';

describe('resolveRestSeconds', () => {
  it('Override schlägt globale Pause', () => {
    expect(resolveRestSeconds(120, 90)).toBe(120);
  });

  it('ohne Override gilt die globale Pause', () => {
    expect(resolveRestSeconds(undefined, 60)).toBe(60);
    expect(resolveRestSeconds(null, 60)).toBe(60);
  });

  it('ohne alles fällt es auf 90 s zurück', () => {
    expect(resolveRestSeconds(undefined, undefined)).toBe(90);
  });

  it('kaputte Werte (0, negativ, NaN) werden übersprungen', () => {
    expect(resolveRestSeconds(0, 90)).toBe(90);
    expect(resolveRestSeconds(-5, 90)).toBe(90);
    expect(resolveRestSeconds(NaN, 90)).toBe(90);
    expect(resolveRestSeconds(0, undefined)).toBe(90);
    expect(resolveRestSeconds(undefined, 0)).toBe(90);
  });
});

describe('formatRestTime', () => {
  it('formatiert Minuten:Sekunden', () => {
    expect(formatRestTime(90)).toBe('1:30');
    expect(formatRestTime(45)).toBe('0:45');
    expect(formatRestTime(300)).toBe('5:00');
    expect(formatRestTime(0)).toBe('0:00');
  });

  it('rundet Nachkommastellen', () => {
    expect(formatRestTime(90.4)).toBe('1:30');
  });
});

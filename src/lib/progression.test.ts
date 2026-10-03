import { describe, expect, it } from 'vitest';
import { firstSetSummary, formatRepRange, PROGRESSION_STEP_KG, resolveRepTarget, rirLabel, suggestNextSet } from './progression';

describe('suggestNextSet', () => {
  it('gibt null ohne vorherigen Eintrag zurück', () => {
    // Ohne Vorgänger gibt es nichts zu steigern — der Chip entfällt komplett.
    expect(suggestNextSet({ gewicht: 0, reps: 0 })).toBeNull();
    expect(suggestNextSet({ gewicht: NaN, reps: 8 })).toBeNull();
    expect(suggestNextSet({ gewicht: 80, reps: 0 })).toBeNull();
  });

  it('empfiehlt +2,5 kg bei RIR >= 3', () => {
    const suggestion = suggestNextSet({ gewicht: 80, reps: 8, rir: 3 });
    expect(suggestion).toEqual({
      kind: 'increase',
      gewicht: 80 + PROGRESSION_STEP_KG,
      deltaLabel: '+2,5 kg',
      aktion: '82,5 kg versuchen',
    });
  });

  it('empfiehlt +2,5 kg bei RIR 4+', () => {
    expect(suggestNextSet({ gewicht: 60, reps: 10, rir: 4 })?.kind).toBe('increase');
  });

  it('empfiehlt +2,5 kg, wenn Ziel-Reps deutlich übertroffen (ohne RIR)', () => {
    const suggestion = suggestNextSet({ gewicht: 50, reps: 14, zielReps: 10 });
    expect(suggestion?.kind).toBe('increase');
    expect(suggestion?.gewicht).toBe(52.5);
  });

  it('empfiehlt gleiches Gewicht + Reps-Push bei RIR 1–2 und Ziel erreicht', () => {
    const suggestion = suggestNextSet({ gewicht: 80, reps: 10, rir: 2, zielReps: 10 });
    expect(suggestion).toEqual({
      kind: 'push-reps',
      gewicht: 80,
      deltaLabel: 'Gleiches Gewicht',
      aktion: '1–2 Reps mehr versuchen',
    });
    expect(suggestNextSet({ gewicht: 80, reps: 10, rir: 1, zielReps: 10 })?.kind).toBe('push-reps');
  });

  it('hält Gewicht bei RIR 0', () => {
    const suggestion = suggestNextSet({ gewicht: 80, reps: 8, rir: 0 });
    expect(suggestion?.kind).toBe('hold');
    expect(suggestion?.gewicht).toBe(80);
  });

  it('hält Gewicht bei Failure', () => {
    expect(suggestNextSet({ gewicht: 80, reps: 6, rir: 'failure' })?.kind).toBe('hold');
  });

  it('hält Gewicht, wenn Ziel-Reps verfehlt', () => {
    const suggestion = suggestNextSet({ gewicht: 80, reps: 7, zielReps: 10, rir: 1 });
    expect(suggestion?.kind).toBe('hold');
  });

  it('push-reps ohne RIR, wenn Ziel genau erreicht', () => {
    expect(suggestNextSet({ gewicht: 80, reps: 10, zielReps: 10 })?.kind).toBe('push-reps');
  });

  it('push-reps ohne Ziel und ohne RIR (neutraler Fall)', () => {
    expect(suggestNextSet({ gewicht: 80, reps: 8 })?.kind).toBe('push-reps');
  });

  it('zieht RIR >= 3 dem Ziel-Reps-Vergleich vor (Steigerung trotz Ziel verfehlt)', () => {
    // 8 Reps bei Ziel 10 ist verfehlt, aber 3 RIR zeigen Reserve → Steigerung.
    expect(suggestNextSet({ gewicht: 80, reps: 8, rir: 3, zielReps: 10 })?.kind).toBe('increase');
  });
});

describe('rirLabel', () => {
  it('mappt alle Werte korrekt', () => {
    expect(rirLabel(undefined)).toBe('RIR');
    expect(rirLabel(0)).toBe('0');
    expect(rirLabel(2)).toBe('2');
    expect(rirLabel(4)).toBe('4+');
    expect(rirLabel('failure')).toBe('Failure');
  });
});

describe('firstSetSummary', () => {
  it('lässt RIR weg, wenn nicht erfasst (kein „RIR unbekannt“)', () => {
    expect(firstSetSummary(80, 8, undefined)).toBe('80 kg × 8');
  });

  it('hängt RIR an, wenn erfasst', () => {
    expect(firstSetSummary(80, 8, 2)).toBe('80 kg × 8 @ RIR 2');
    expect(firstSetSummary(82.5, 10, 'failure')).toBe('82,5 kg × 10 @ RIR Failure');
  });
});

describe('suggestNextSet mit Rep-Ziel-Bereich', () => {
  it('push-reps nennt die Ziel-Range konkret', () => {
    const suggestion = suggestNextSet({ gewicht: 80, reps: 7, zielBereich: { min: 6, max: 8 }, rir: 1 });
    expect(suggestion?.kind).toBe('push-reps');
    expect(suggestion?.aktion).toBe('6–8 Reps versuchen');
  });

  it('hält Gewicht, wenn Reps unter der Range liegen', () => {
    const suggestion = suggestNextSet({ gewicht: 80, reps: 4, zielBereich: { min: 6, max: 8 }, rir: 1 });
    expect(suggestion?.kind).toBe('hold');
    expect(suggestion?.aktion).toBe('Ziel: 6–8 Reps');
  });

  it('steigert, wenn die Range deutlich übertroffen wird (> max + 1)', () => {
    expect(suggestNextSet({ gewicht: 80, reps: 10, zielBereich: { min: 6, max: 8 } })?.kind).toBe('increase');
  });

  it('innerhalb der Range oben bleibt push-reps (max + 1 ist noch kein Steigerungsgrund)', () => {
    expect(suggestNextSet({ gewicht: 80, reps: 9, zielBereich: { min: 6, max: 8 } })?.kind).toBe('push-reps');
  });

  it('RIR >= 3 steigert auch bei verfehlter Range (RIR bleibt Primärsignal)', () => {
    expect(suggestNextSet({ gewicht: 80, reps: 4, rir: 3, zielBereich: { min: 6, max: 8 } })?.kind).toBe('increase');
  });

  it('ohne Bereich bleibt die bisherige Einzelziel-Logik unverändert', () => {
    expect(suggestNextSet({ gewicht: 80, reps: 10, zielReps: 10 })?.aktion).toBe('1–2 Reps mehr versuchen');
  });
});

describe('resolveRepTarget', () => {
  it('Override schlägt globales Ziel', () => {
    expect(resolveRepTarget({ min: 8, max: 12 }, { min: 6, max: 8 })).toEqual({ min: 8, max: 12 });
  });

  it('ohne Override gilt das globale Ziel', () => {
    expect(resolveRepTarget(undefined, { min: 10, max: 12 })).toEqual({ min: 10, max: 12 });
  });

  it('ohne alles fällt es auf den Standard zurück (6–8)', () => {
    expect(resolveRepTarget(undefined, undefined)).toEqual({ min: 6, max: 8 });
  });

  it('kaputte Werte (min > max, 0) werden ignoriert und fallen weiter durch', () => {
    expect(resolveRepTarget({ min: 12, max: 8 }, { min: 6, max: 8 })).toEqual({ min: 6, max: 8 });
    expect(resolveRepTarget({ min: 0, max: 8 }, undefined)).toEqual({ min: 6, max: 8 });
  });
});

describe('formatRepRange', () => {
  it('formatiert mit En-Dash', () => {
    expect(formatRepRange({ min: 6, max: 8 })).toBe('6–8');
    expect(formatRepRange({ min: 12, max: 15 })).toBe('12–15');
  });
});

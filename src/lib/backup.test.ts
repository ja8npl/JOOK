import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT_VERSION, normalizeBackup, parseBackup } from './backup';

const validV2Backup = {
  version: 2,
  exportedAt: '2026-09-29T10:00:00.000Z',
  entries: [
    {
      id: 1,
      machineId: 'chest-press',
      name: 'Chest Press',
      einstellung: 'Sitzhöhe 3, Pin 4',
      problem: 'Griff liegt eng an',
      ziel: '3×10 bei 50 kg',
      datum: 1759130400000,
      updatedAt: 1759130400000,
      sets: [{ gewicht: 50, wiederholungen: 10, timestamp: 1759130400000, rir: 2 }],
    },
  ],
  sessions: [
    {
      id: 1,
      name: 'Push Day',
      startedAt: 1759130400000,
      endedAt: 1759134000000,
      durationSeconds: 3600,
      status: 'completed',
      createdAt: 1759130400000,
      updatedAt: 1759134000000,
      exercises: [
        {
          exercise: { id: 'chest-press', name: 'Chest Press', target: 'chest' },
          previous: { maxGewicht: 50, bestReps: 8, estimatedOneRepMax: 63.3, datum: 1759044000000 },
          sets: [
            { id: 'set-1', setNumber: 1, gewicht: 50, wiederholungen: 8, completed: true, rir: 1 },
            { id: 'set-2', setNumber: 2, gewicht: 50, wiederholungen: 9, completed: true, warmup: false },
            { id: 'w-1', setNumber: 1, gewicht: 25, wiederholungen: 10, completed: true, warmup: true, warmupLabel: 'Warm-up 50 %' },
          ],
        },
      ],
    },
  ],
  progressHistory: [
    {
      id: 1,
      sessionId: 1,
      exerciseId: 'chest-press',
      exerciseName: 'Chest Press',
      datum: 1759134000000,
      maxGewicht: 50,
      bestReps: 9,
      totalVolume: 850,
      estimatedOneRepMax: 65,
      setCount: 2,
      overloadKg: 0,
      overloadReps: 1,
    },
  ],
  warmupConfigs: [
    { key: 'chest-press__2026-09-29', machineId: 'chest-press', tag: '2026-09-29', maxGewicht: 60, dritterSatz: true, createdAt: 1, updatedAt: 2 },
  ],
  bodyweights: [{ id: 1759130400000, gewicht: 82.5, tag: '2026-09-29' }],
  settings: [{ key: 'app', modus: 'bulk', modusSeit: 1759130400000, einheit: 'kg', updatedAt: 1759130400000 }],
};

describe('normalizeBackup', () => {
  it('akzeptiert ein vollständiges v2-Backup unverändert in der Struktur', () => {
    const result = normalizeBackup(validV2Backup);
    expect(result.version).toBe(3);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({ machineId: 'chest-press', name: 'Chest Press', einstellung: 'Sitzhöhe 3, Pin 4' });
    expect(result.sessions[0].exercises[0].sets).toHaveLength(3);
    expect(result.sessions[0].exercises[0].sets?.[0]).toMatchObject({ gewicht: 50, wiederholungen: 8, rir: 1 });
    expect(result.sessions[0].exercises[0].sets?.[2]).toMatchObject({ warmup: true, warmupLabel: 'Warm-up 50 %' });
    expect(result.progressHistory[0]).toMatchObject({ sessionId: 1, totalVolume: 850 });
    expect(result.warmupConfigs[0]).toMatchObject({ key: 'chest-press__2026-09-29', dritterSatz: true });
    expect(result.bodyweights[0]).toMatchObject({ gewicht: 82.5, tag: '2026-09-29' });
    expect(result.settings[0]).toMatchObject({ key: 'app', modus: 'bulk', einheit: 'kg' });
  });

  it('migriert ein v1-Backup (nur entries/sessions/progressHistory) auf v3', () => {
    const v1 = {
      version: 1,
      exportedAt: '2026-01-01T10:00:00.000Z',
      entries: [{ id: 5, machineId: 'lat-zug', name: 'Lat Zug', einstellung: 'Pin 5', datum: 100, updatedAt: 100 }],
      sessions: [],
      progressHistory: [],
    };
    const result = normalizeBackup(v1);
    expect(result.version).toBe(3);
    expect(result.entries[0]).toMatchObject({ machineId: 'lat-zug' });
    expect(result.warmupConfigs).toEqual([]);
    expect(result.bodyweights).toEqual([]);
    expect(result.settings).toEqual([]);
  });

  it('validiert lokale App-Daten und übernimmt Timer-Präferenzen aus v3', () => {
    const result = normalizeBackup({
      ...validV2Backup,
      version: 3,
      localData: {
        'gymlog.workout-templates': '[]',
        'gymlog.active-session': JSON.stringify({ name: 'Push', startedAt: 1759130400000, exercises: [] }),
        'gymlog.theme': 'ember',
        'gymlog.restDuration': '180',
        'gymlog.rirDefault': 'failure',
        'gymlog.timerSound': '0',
        'gymlog.timerVibration': '1',
      },
    });
    expect(result.version).toBe(3);
    expect(result.localData).toMatchObject({
      'gymlog.theme': 'ember',
      'gymlog.restDuration': '180',
      'gymlog.rirDefault': 'failure',
      'gymlog.timerSound': '0',
      'gymlog.timerVibration': '1',
    });
  });

  it('weist ungültige lokale Präferenzen und beschädigte Vorlagen zurück', () => {
    expect(() => normalizeBackup({ ...validV2Backup, localData: { 'gymlog.theme': 'light' } })).toThrow('unbekanntes Theme');
    expect(() => normalizeBackup({ ...validV2Backup, localData: { 'gymlog.workout-templates': '{' } })).toThrow('Trainingsvorlagen sind beschädigt');
  });

  it('wirft bei gar keinem Objekt und bei keiner Liste', () => {
    expect(() => normalizeBackup(null)).toThrow('Ungültiges Backup.');
    expect(() => normalizeBackup('x')).toThrow('Ungültiges Backup.');
    expect(() => normalizeBackup([1, 2])).toThrow('Ungültiges Backup.');
    expect(() => normalizeBackup({ entries: 'keine Liste', sessions: [], progressHistory: [] })).toThrow('keine Liste');
  });

  it('wirft bei Einträgen ohne Namen', () => {
    expect(() => normalizeBackup({ entries: [{ machineId: 'x', einstellung: '', datum: 1 }], sessions: [], progressHistory: [] })).toThrow(
      'Einträge ohne Namen',
    );
  });

  it('wirft bei Körpergewicht ohne gültigem Wert', () => {
    expect(() =>
      normalizeBackup({ entries: [], sessions: [], progressHistory: [], bodyweights: [{ gewicht: 'schwer' }] }),
    ).toThrow('Körpergewicht ohne Wert');
  });

  it('ergänzt fehlende optionale Felder mit sinnvollen Defaults statt zu crashen', () => {
    const result = normalizeBackup({
      entries: [{ name: 'Rudern', datum: 5 }],
      sessions: [{ name: '', startedAt: 'x', status: 'irgendwas', exercises: [{ exercise: {}, sets: [null, { gewicht: 40, wiederholungen: 8 }] }] }],
      progressHistory: [{ exerciseId: 'ruden' }],
    });
    expect(result.entries[0]).toMatchObject({ machineId: 'rudern', einstellung: '', datum: 5, updatedAt: 5 });
    expect(result.entries[0].sets).toBeUndefined();
    const session = result.sessions[0];
    expect(session.name).toBe('Training');
    expect(session.status).toBe('discarded');
    expect(session.startedAt).toBe(0);
    expect(session.exercises[0].exercise.id).toBe('übung'); // Fallback aus leerem Namen
    expect(session.exercises[0].sets?.[0]).toMatchObject({ gewicht: 40, wiederholungen: 8, completed: false });
    expect(session.exercises[0].sets?.[0].id).toBeTruthy();
    expect(result.progressHistory[0].maxGewicht).toBe(0);
  });

  it('setzt machineId aus dem Namen, wenn sie fehlt', () => {
    const result = normalizeBackup({ entries: [{ name: 'Bein Press  ', datum: 1 }], sessions: [], progressHistory: [] });
    expect(result.entries[0].machineId).toBe('bein-press');
  });

  it('filtert ungültige Sätze aus sets heraus', () => {
    const result = normalizeBackup({
      entries: [{ name: 'X', datum: 1, sets: [{ gewicht: 'a', wiederholungen: 3 }, { gewicht: 40, wiederholungen: 6, timestamp: 9 }] }],
      sessions: [],
      progressHistory: [],
    });
    expect(result.entries[0].sets).toEqual([{ gewicht: 40, wiederholungen: 6, timestamp: 9 }]);
  });
});

describe('parseBackup', () => {
  it('parst einen JSON-String', () => {
    const result = parseBackup(JSON.stringify(validV2Backup));
    expect(result.version).toBe(BACKUP_FORMAT_VERSION);
    expect(result.bodyweights).toHaveLength(1);
  });

  it('wirft bei kaputtem JSON mit deutscher Meldung', () => {
    expect(() => parseBackup('{ kaputt')).toThrow('kein gültiges JSON');
  });
});

describe('Rep-Ziel im Backup', () => {
  it('übernimmt repTargets (kaputte Zeilen werden übersprungen) und das globale repZiel', () => {
    const result = normalizeBackup({
      ...validV2Backup,
      repTargets: [
        { machineId: 'seitheben-kabel', min: 8, max: 12, updatedAt: 5 },
        { machineId: '', min: 8, max: 12, updatedAt: 5 },
        { machineId: 'kaputt', min: 12, max: 8, updatedAt: 5 },
        { machineId: 'auch-kaputt', min: 0, max: 8, updatedAt: 5 },
      ],
      settings: [{ key: 'app', modus: 'bulk', modusSeit: 1, einheit: 'kg', repZielMin: 10, repZielMax: 12, updatedAt: 1 }],
    });
    expect(result.repTargets).toEqual([{ machineId: 'seitheben-kabel', min: 8, max: 12, updatedAt: 5 }]);
    expect(result.settings[0]).toMatchObject({ repZielMin: 10, repZielMax: 12 });
  });

  it('alte Backups ohne Rep-Ziel-Felder → leere Liste, Settings ohne repZiel', () => {
    const result = normalizeBackup(validV2Backup);
    expect(result.repTargets).toEqual([]);
    expect(result.settings[0].repZielMin).toBeUndefined();
  });
});

describe('Pausenzeit-Overrides im Backup', () => {
  it('übernimmt restTargets, kaputte Zeilen werden übersprungen', () => {
    const result = normalizeBackup({
      ...validV2Backup,
      restTargets: [
        { machineId: 'seitheben-kabel', seconds: 120, updatedAt: 5 },
        { machineId: '', seconds: 90, updatedAt: 5 },
        { machineId: 'kaputt', seconds: 2, updatedAt: 5 },
      ],
    });
    expect(result.restTargets).toEqual([{ machineId: 'seitheben-kabel', seconds: 120, updatedAt: 5 }]);
  });

  it('alte Backups ohne restTargets → leere Liste', () => {
    const result = normalizeBackup(validV2Backup);
    expect(result.restTargets).toEqual([]);
  });
});

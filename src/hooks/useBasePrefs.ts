import { useCallback, useEffect, useState } from 'react';
import { type RirValue } from '../db/schema';

/* ════════════ Persistierte App-Präferenzen (localStorage) ════════════ */

/** Standard-Pausenzeit des RestTimers in Sekunden. */
export const REST_DURATION_OPTIONS = [60, 90, 120, 180] as const;
export type RestDuration = (typeof REST_DURATION_OPTIONS)[number];

const DEFAULT_REST_DURATION: RestDuration = 90;

/** RIR-Vorauswahl für neue Sätze ('none' = kein RIR vorbelegt). */
export const RIR_DEFAULT_OPTIONS = ['none', 0, 1, 2, 3, 'failure'] as const;
export type RirDefaultPref = (typeof RIR_DEFAULT_OPTIONS)[number];

const REST_KEY = 'gymlog.restDuration';
const RIR_KEY = 'gymlog.rirDefault';
const SOUND_KEY = 'gymlog.timerSound';
const VIBRATION_KEY = 'gymlog.timerVibration';
const SOFT_EDGES_KEY = 'gymlog.softEdges';

/** Event-Name: wird gefeuert, wenn ein Darstellungs-Präferenz sich ändert —
 *  laufende Overlays (z. B. das Trainings-Sheet) können live reagieren. */
export const PREFS_EVENT = 'jook:prefs';

/** Liest die Timer-Feedback-Schalter zum Ablaufzeitpunkt (RestTimer fragt zur Laufzeit ab). */
export function readTimerFeedback(): { sound: boolean; vibration: boolean } {
  return { sound: readBool(SOUND_KEY, true), vibration: readBool(VIBRATION_KEY, true) };
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch { /* localStorage nicht verfügbar */ }
  return fallback;
}

function writeValue(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* nicht persistierbar */ }
}

/** Liest die gespeicherte Standard-Pausenzeit (validiert), sonst 90 s. */
export function readRestDuration(): RestDuration {
  try {
    const stored = Number(localStorage.getItem(REST_KEY));
    const match = (REST_DURATION_OPTIONS as readonly number[]).find((option) => option === stored);
    if (match !== undefined) return match as RestDuration;
  } catch { /* localStorage nicht verfügbar */ }
  return DEFAULT_REST_DURATION;
}

/** Liest die gespeicherte RIR-Vorauswahl, sonst 'none'. */
export function readRirDefault(): RirDefaultPref {
  try {
    const stored = localStorage.getItem(RIR_KEY);
    const match = (RIR_DEFAULT_OPTIONS as readonly unknown[]).find((option) => option === stored);
    if (match !== undefined) return match as RirDefaultPref;
  } catch { /* localStorage nicht verfügbar */ }
  return 'none';
}

/** Liest die Präferenz für weiche Kanten (progressiver Blur, Default: an). */
export function readSoftEdges(): boolean {
  return readBool(SOFT_EDGES_KEY, true);
}

export interface BasePrefs {
  restDuration: RestDuration;
  setRestDuration: (value: RestDuration) => void;
  rirDefault: RirDefaultPref;
  setRirDefault: (value: RirDefaultPref) => void;
  timerSound: boolean;
  setTimerSound: (value: boolean) => void;
  timerVibration: boolean;
  setTimerVibration: (value: boolean) => void;
  softEdges: boolean;
  setSoftEdge: (value: boolean) => void;
}

/** App-Präferenzen des Base-Tabs. Änderungen persistieren sofort. */
export function useBasePrefs(): BasePrefs {
  const [restDuration, setRestDurationState] = useState<RestDuration>(readRestDuration);
  const [rirDefault, setRirDefaultState] = useState<RirDefaultPref>(readRirDefault);
  const [timerSound, setTimerSoundState] = useState<boolean>(() => readBool(SOUND_KEY, true));
  const [timerVibration, setTimerVibrationState] = useState<boolean>(() => readBool(VIBRATION_KEY, true));
  const [softEdges, setSoftEdgeState] = useState<boolean>(() => readBool(SOFT_EDGES_KEY, true));

  useEffect(() => { writeValue(REST_KEY, String(restDuration)); }, [restDuration]);
  useEffect(() => { writeValue(RIR_KEY, rirDefault === 'none' ? 'none' : String(rirDefault)); }, [rirDefault]);
  useEffect(() => { writeValue(SOUND_KEY, timerSound ? '1' : '0'); }, [timerSound]);
  useEffect(() => { writeValue(VIBRATION_KEY, timerVibration ? '1' : '0'); }, [timerVibration]);
  useEffect(() => { writeValue(SOFT_EDGES_KEY, softEdges ? '1' : '0'); }, [softEdges]);

  const setRestDuration = useCallback((value: RestDuration) => setRestDurationState(value), []);
  const setRirDefault = useCallback((value: RirDefaultPref) => setRirDefaultState(value), []);
  const setTimerSound = useCallback((value: boolean) => setTimerSoundState(value), []);
  const setTimerVibration = useCallback((value: boolean) => setTimerVibrationState(value), []);
  const setSoftEdge = useCallback((value: boolean) => {
    setSoftEdgeState(value);
    try { window.dispatchEvent(new Event(PREFS_EVENT)); } catch { /* egal */ }
  }, []);

  return { restDuration, setRestDuration, rirDefault, setRirDefault, timerSound, setTimerSound, timerVibration, setTimerVibration, softEdges, setSoftEdge };
}

/** Konvertiert die Präferenz in den RirValue eines neuen Satzes ('none' → undefined). */
export function rirPrefToValue(pref: RirDefaultPref): RirValue | undefined {
  return pref === 'none' ? undefined : pref;
}

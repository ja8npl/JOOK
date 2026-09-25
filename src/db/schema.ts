// TypeScript-Typen für die Gym Log Datenbank

export interface GymEntry {
  id?: number;
  /** Normalisierter Key für Gruppierung (lowercase, trimmed) */
  machineId: string;
  /** Maschinen-/Übungsname (Freitext) */
  name: string;
  /** Einstellungen: Sitzhöhe, Pin-Position, Rückenlehne etc. */
  einstellung: string;
  /** Freitext, optional */
  problem?: string;
  /** Ziel pro Übung, optional */
  ziel?: string;
  /** Unix-Timestamp (Date.now()) */
  datum: number;
  /** Letztes Update */
  updatedAt: number;
  /** Geloggte Sätze (Set-Tracking), optional */
  sets?: WorkoutSet[];
}

/**
 * Reps in Reserve (RIR) eines Satzes: 0–4 (4 = „4+“) oder 'failure'.
 * Optionale Zusatzinfo — fließt bewusst NICHT in die 1RM-Schätzung ein.
 */
export type RirValue = 0 | 1 | 2 | 3 | 4 | 'failure';

/** Ein abgeschlossener Satz während einer Trainingseinheit */
export interface WorkoutSet {
  /** Arbeitsgewicht in kg */
  gewicht: number;
  /** Wiederholungen */
  wiederholungen: number;
  /** Zeitpunkt des Satz-Abschlusses (Date.now()) */
  timestamp: number;
  /** Warm-up-Satz (nur SessionSets; bei persistierten Einträgen immer absent) */
  warmup?: boolean;
  /** Reps in Reserve beim Satz-Ende (optional, Zusatzinfo) */
  rir?: RirValue;
}

/** Hilfsfunktion: Name → machineId normalisieren */
export function toMachineId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Eine Übung, die in einer Session ausgewählt werden kann. */
export interface Exercise {
  id: string;
  name: string;
  equipment?: string;
  target?: string;
  /** Vorgabe: Satz-Anzahl (z. B. aus importierten Plänen). */
  saetze?: number;
  /** Vorgabe: Wiederholungen (z. B. aus importierten Plänen). */
  wiederholungen?: number;
}

/** Ein editierbarer Satz innerhalb einer aktiven oder gespeicherten Session. */
export interface SessionSet {
  id: string;
  setNumber: number;
  gewicht: number;
  wiederholungen: number;
  completed: boolean;
  timestamp?: number;
  /** Warm-up-Satz: visuell getrennt, ohne Prozent-Volumen in der Progression */
  warmup?: boolean;
  /** Label wie „Warm-up 25 %" */
  warmupLabel?: string;
  /** Ziel-Reps-Bereich [min, max] des Warm-up-Satzes */
  zielRepsMin?: number;
  zielRepsMax?: number;
  /** Reps in Reserve beim Satz-Ende (optional, Zusatzinfo) */
  rir?: RirValue;
}

/** Warm-up-Konfiguration pro Übung und Tag (Dexie v4). */
export interface WarmupConfig {
  /** Primärschlüssel: `${machineId}__${YYYY-MM-DD}` */
  key: string;
  machineId: string;
  /** Lokales Datum YYYY-MM-DD */
  tag: string;
  /** Ziel-Max-Gewicht der heutigen Einheit in kg */
  maxGewicht: number;
  /** Optionaler dritter Warm-up-Satz (75 %) */
  dritterSatz: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Modus für die Trainingsphase (Settings + Home-Header). */
export type TrainingMode = 'bulk' | 'cut' | 'recomp';

export const TRAINING_MODES: readonly TrainingMode[] = ['bulk', 'cut', 'recomp'];

export const TRAINING_MODE_LABELS: Record<TrainingMode, string> = {
  bulk: 'Bulk',
  cut: 'Cut',
  recomp: 'Bodyrecomposition',
};

/** App-Einstellungen als einzelner Datensatz (Dexie v5). */
export interface AppSettings {
  key: 'app';
  modus: TrainingMode;
  modusSeit: number;
  /** Einheiten: 'kg' | 'lb' (derzeit nur kg im UI). */
  einheit: 'kg' | 'lb';
  updatedAt: number;
}

/** Körpergewicht-Messung (Dexie v5). */
export interface BodyWeight {
  /** Unix-Timestamp der Messung (Date.now()). */
  id: number;
  /** Gewicht in kg. */
  gewicht: number;
  /** Lokales Tages-Datum YYYY-MM-DD (eine Messung pro Tag, upsert). */
  tag: string;
}

/** Letzte bekannte Leistung als Grundlage für Smart Defaults und Overload. */
export interface PerformanceSnapshot {
  maxGewicht: number;
  bestReps: number;
  estimatedOneRepMax: number;
  datum: number;
}

/** Eine Übung mit ihren Sätzen innerhalb einer Trainingseinheit. */
export interface SessionExercise {
  exercise: Exercise;
  sets: SessionSet[];
  previous?: PerformanceSnapshot;
}

/** Persistierte Trainingseinheit mit mehreren Übungen. */
export interface WorkoutSession {
  id?: number;
  name: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  status: 'completed' | 'discarded';
  exercises: SessionExercise[];
  createdAt: number;
  updatedAt: number;
}

/** Einzelner Progress-Punkt für eine Übung und eine abgeschlossene Session. */
export interface ProgressHistory {
  id?: number;
  sessionId: number;
  exerciseId: string;
  exerciseName: string;
  datum: number;
  maxGewicht: number;
  bestReps: number;
  totalVolume: number;
  estimatedOneRepMax: number;
  setCount: number;
  overloadKg: number;
  overloadReps: number;
}

/** Gruppiertes Format für die Home-Ansicht */
export interface MachineSummary {
  machineId: string;
  name: string;
  /** Anzahl aller Einträge */
  count: number;
  /** Datum des neuesten Eintrags */
  lastDatum: number;
  /** Einstellung des neuesten Eintrags */
  lastEinstellung: string;
}

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

/** Ein abgeschlossener Satz während einer Trainingseinheit */
export interface WorkoutSet {
  /** Arbeitsgewicht in kg */
  gewicht: number;
  /** Wiederholungen */
  wiederholungen: number;
  /** Zeitpunkt des Satz-Abschlusses (Date.now()) */
  timestamp: number;
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

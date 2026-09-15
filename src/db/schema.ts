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

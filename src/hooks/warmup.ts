import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { toMachineId, type Exercise, type GymEntry, type SessionExercise, type SessionSet } from '../db/schema';
import { matchStaticExercise, normalizeExerciseName } from './useExercises';

/** Rundungs-Schritt für Warm-up-Gewichte in kg (leicht änderbar, Anforderung: 2,5 kg). */
export const WARMUP_WEIGHT_STEP_KG = 2.5;

/**
 * Normalisierter Übungs-Key: `machineId` aus `toMachineId(name)`. Deckt Einträge
 * (entries.machineId) und Session-Übungen (custom-IDs der Übungsauswahl) über
 * denselben normalisierten Namen ab.
 */
export function warmupExerciseKey(exercise: Exercise): string {
  return toMachineId(exercise.name);
}

/** Lokales Tages-Datum als YYYY-MM-DD (kein UTC-Versatz). */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Rundet auf den Warm-up-Gewichtsschritt (2,5 kg) auf — mind. ein Schritt über 0. */
export function roundWarmupWeight(kg: number): number {
  if (!isFinite(kg) || kg <= 0) return 0;
  const rounded = Math.round(kg / WARMUP_WEIGHT_STEP_KG) * WARMUP_WEIGHT_STEP_KG;
  return Math.max(WARMUP_WEIGHT_STEP_KG, rounded);
}

export interface WarmupSetSpec {
  /** Anteil vom Max-Gewicht (0.25 / 0.5 / 0.75). */
  fraction: number;
  /** Zielbereich in Reps [min, max]. */
  repsMin: number;
  repsMax: number;
}

/** Vorgaben: Satz 1 = 25 % (10–20 Reps), Satz 2 = 50 % (3–10), optional Satz 3 = 75 % (2–3). */
export const WARMUP_SET_SPECS: readonly WarmupSetSpec[] = [
  { fraction: 0.25, repsMin: 10, repsMax: 20 },
  { fraction: 0.5, repsMin: 3, repsMax: 10 },
  { fraction: 0.75, repsMin: 2, repsMax: 3 },
];

export interface WarmupSetPlan {
  fraction: number;
  label: string;
  /** Gerundetes Warm-up-Gewicht in kg. */
  gewicht: number;
  /** Zielbereich als Text, z. B. „10–20“. */
  zielReps: string;
  repsMin: number;
  repsMax: number;
}

export function buildWarmupPlan(maxGewicht: number, withThirdSet: boolean): WarmupSetPlan[] {
  const specs = withThirdSet ? WARMUP_SET_SPECS : WARMUP_SET_SPECS.slice(0, 2);
  return specs
    .map((spec) => ({
      fraction: spec.fraction,
      label: `Warm-up ${Math.round(spec.fraction * 100)}%`,
      gewicht: roundWarmupWeight(maxGewicht * spec.fraction),
      zielReps: `${spec.repsMin}–${spec.repsMax}`,
      repsMin: spec.repsMin,
      repsMax: spec.repsMax,
    }))
    // Runden kann Sätze gleich machen — dann nur bis zur ersten Wiederholung behalten.
    .filter((set, index, all) => all.findIndex((other) => other.gewicht === set.gewicht) === index);
}

/** Persistierte Warm-up-Konfiguration pro Übung und Tag (Dexie v4). */
export interface WarmupConfig {
  /** Primärschlüssel: `${machineId}__${YYYY-MM-DD}` */
  key: string;
  machineId: string;
  tag: string;
  maxGewicht: number;
  dritterSatz: boolean;
  createdAt: number;
  updatedAt: number;
}

function configKey(machineId: string, tag: string): string {
  return `${machineId}__${tag}`;
}

/** Heutige Warm-up-Konfiguration einer Übung (oder undefined). */
export async function getWarmupConfig(machineId: string, tag: string = todayKey()): Promise<WarmupConfig | undefined> {
  if (!machineId) return undefined;
  return db.warmupConfigs.get(configKey(machineId, tag));
}

/** Speichert/aktualisiert die heutige Konfiguration (Max-Gewicht ändern → Neuberechnung). */
export async function setWarmupConfig(machineId: string, maxGewicht: number, dritterSatz: boolean, tag: string = todayKey()): Promise<WarmupConfig> {
  const now = Date.now();
  const config: WarmupConfig = {
    key: configKey(machineId, tag),
    machineId,
    tag,
    maxGewicht,
    dritterSatz,
    createdAt: now,
    updatedAt: now,
  };
  await db.warmupConfigs.put(config);
  return config;
}

/** Live-Query: heutige Warm-up-Konfiguration für eine Übung. */
export function useTodayWarmupConfig(machineId: string): WarmupConfig | undefined {
  return useLiveQuery(
    async () => {
      if (!machineId) return undefined;
      const tag = todayKey();
      return db.warmupConfigs.get(configKey(machineId, tag));
    },
    [machineId],
  );
}

/** Live-Query: Set aller machineIds mit heutiger Warm-up-Konfiguration (für den aktiven Button-State). */
export function useTodayWarmupMachineIds(): Set<string> | undefined {
  return useLiveQuery(async () => {
    const tag = todayKey();
    const configs = await db.warmupConfigs.where('tag').equals(tag).toArray();
    return new Set(configs.map((config) => config.machineId));
  }, []);
}

/** Baut die Warm-up-SessionSets für eine Übung aus einer Konfiguration. */
export function buildWarmupSets(plan: WarmupSetPlan[]): SessionSet[] {
  const now = Date.now();
  return plan.map((entry, index) => ({
    id: crypto.randomUUID(),
    setNumber: index + 1,
    gewicht: entry.gewicht,
    wiederholungen: entry.repsMin,
    completed: false,
    warmup: true,
    warmupLabel: entry.label,
    zielRepsMin: entry.repsMin,
    zielRepsMax: entry.repsMax,
    timestamp: now,
  }));
}

/**
 * Fügt Warm-up-Sätze am Anfang der Übungssätze einer aktiven Session ein
 * (setNumber 1..n) und nummeriert die Arbeitssätze dahinter neu.
 */
export function withWarmupSets(exercise: SessionExercise, sets: SessionSet[]): SessionExercise {
  const arbeitsSets = exercise.sets.filter((set) => !set.warmup);
  const nextSetNumber = sets.length + 1;
  const renumbered = arbeitsSets.map((set, index) => ({ ...set, setNumber: nextSetNumber + index }));
  return { ...exercise, sets: [...sets, ...renumbered] };
}

/** Entfernt nur die Warm-up-Sätze (beim Zurücksetzen/Ändern). */
export function withoutWarmupSets(exercise: SessionExercise): SessionExercise {
  const arbeitsSets = exercise.sets
    .filter((set) => !set.warmup)
    .map((set, index) => ({ ...set, setNumber: index + 1 }));
  return { ...exercise, sets: arbeitsSets };
}

/**
 * Wendet die Warm-up-Regeln auf eine Übung einer aktiven Session an:
 * Bestehende Warm-up-Sätze werden ersetzt, die Konfiguration unter dem
 * angegebenen machineId (dem konfigurierten Übungsschlüssel) gespeichert.
 */
export async function applyWarmupToSessionExercise(
  updateExercise: (exerciseId: string, updater: (exercise: SessionExercise) => SessionExercise) => void,
  exercise: SessionExercise,
  machineId: string,
  maxGewicht: number,
  dritterSatz: boolean,
): Promise<void> {
  await setWarmupConfig(machineId, maxGewicht, dritterSatz);
  const sets = buildWarmupSets(buildWarmupPlan(maxGewicht, dritterSatz));
  updateExercise(exercise.exercise.id, (current) => withWarmupSets(current, sets));
}

/**
 * Gehört eine Session-Übung zur konfigurierten machineId? Direkter Key
 * oder Bibliotheks-Brücke („bankdrücken" ↔ „Barbell Bench Press…").
 */
export function matchesMachineId(exercise: Exercise, machineId: string): boolean {
  if (warmupExerciseKey(exercise) === machineId) return true;
  const exerciseName = libraryNameOf(exercise.name);
  if (!exerciseName) return false;
  const configName = libraryNameOf(machineId.replace(/-/g, ' '));
  return Boolean(configName) && configName === exerciseName;
}

/**
 * Heutige Warm-up-Konfiguration für eine Session-Übung finden.
 * 1. Direkter Key (machineId = toMachineId(name)).
 * 2. Bibliotheks-Brücke: Konfiguration „bankdrücken" und Session-Übung
 *    „Barbell Bench Press – Medium Grip" matchen über matchStaticExercise
 *    auf denselben Bibliotheksnamen.
 */
export async function findTodayWarmupConfig(exercise: Exercise): Promise<WarmupConfig | undefined> {
  const direct = await getWarmupConfig(warmupExerciseKey(exercise));
  if (direct) return direct;

  const tag = todayKey();
  const configs = await db.warmupConfigs.where('tag').equals(tag).toArray();
  if (configs.length === 0) return undefined;

  const exerciseMatch = libraryNameOf(exercise.name);
  if (!exerciseMatch) return undefined;
  for (const config of configs) {
    const configName = config.machineId.replace(/-/g, ' ');
    if (libraryNameOf(configName) === exerciseMatch) return config;
  }
  return undefined;
}

/** Normalisierter Bibliotheksname einer Übung (null bei Custom-Übungen). */
function libraryNameOf(name: string): string | null {
  try {
    const match = matchStaticExercise(name);
    return match.matched ? normalizeExerciseName(match.exercise.name) : null;
  } catch {
    return null;
  }
}

/**
 * Fügt beim Hinzufügen einer Übung zur Session automatisch Warm-up-Sätze ein,
 * wenn für heute eine Konfiguration existiert (und die Übung noch keine hat).
 */
export async function autoWarmupForNewExercise(
  exercise: Exercise,
): Promise<SessionSet[] | undefined> {
  const config = await findTodayWarmupConfig(exercise);
  if (!config || !config.maxGewicht) return undefined;
  return buildWarmupSets(buildWarmupPlan(config.maxGewicht, config.dritterSatz));
}

/** Akzeptiert „60“, „60,5“ und „60.5“ — nur Werte > 0 sind gültig. */
export function parseKgInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number.parseFloat(normalized);
  if (!isFinite(value) || value <= 0) return null;
  return value;
}

/** Verlaufspunkte für die History-Sparkline (max. Gewicht pro Eintrag, chronologisch). */
export interface HistoryPoint {
  datum: number;
  maxGewicht: number;
}

export function historyPoints(entries: GymEntry[]): HistoryPoint[] {
  return [...entries]
    .sort((a, b) => a.datum - b.datum)
    .map((entry) => {
      const sets = Array.isArray(entry.sets) ? entry.sets.filter((set) => set && isFinite(set.gewicht)) : [];
      const max = sets.length > 0 ? Math.max(...sets.map((set) => set.gewicht)) : 0;
      return { datum: entry.datum, maxGewicht: max };
    })
    .filter((point) => point.maxGewicht > 0);
}

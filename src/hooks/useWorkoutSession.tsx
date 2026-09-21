/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type Exercise, type SessionExercise } from '../db/schema';
import {
  getPreviousPerformance,
  saveWorkoutSession,
  sessionExerciseWithDefaults,
} from './useWorkoutSessions';
import { autoWarmupForNewExercise, withoutWarmupSets } from './warmup';

export interface ActiveWorkoutSession {
  name: string;
  startedAt: number;
  exercises: SessionExercise[];
}

interface WorkoutSessionContextValue {
  activeSession: ActiveWorkoutSession | null;
  startMenuOpen: boolean;
  openStartMenu: () => void;
  closeStartMenu: () => void;
  startSession: () => void;
  updateSession: (updater: (session: ActiveWorkoutSession) => ActiveWorkoutSession) => void;
  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (exerciseId: string) => void;
  updateExercise: (exerciseId: string, updater: (exercise: SessionExercise) => SessionExercise) => void;
  /** Entfernt alle Warm-up-Sätze der Übung. */
  clearWarmup: (exerciseId: string) => void;
  finishSession: () => Promise<number | null>;
  discardSession: () => void;
}

const STORAGE_KEY = 'gymlog.active-session';
const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

function readActiveSession(): ActiveWorkoutSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<ActiveWorkoutSession>;
    if (typeof parsed.name !== 'string' || typeof parsed.startedAt !== 'number' || !Array.isArray(parsed.exercises)) {
      return null;
    }
    return parsed as ActiveWorkoutSession;
  } catch {
    return null;
  }
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(() => readActiveSession());
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  useEffect(() => {
    try {
      if (activeSession) localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSession));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Die Session bleibt in-memory verfügbar, falls Storage blockiert wird.
    }
  }, [activeSession]);

  const openStartMenu = useCallback(() => setStartMenuOpen(true), []);
  const closeStartMenu = useCallback(() => setStartMenuOpen(false), []);

  const startSession = useCallback(() => {
    setStartMenuOpen(false);
    setActiveSession((current) => current ?? {
      name: `Training · ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}`,
      startedAt: Date.now(),
      exercises: [],
    });
  }, []);

  const updateSession = useCallback((updater: (session: ActiveWorkoutSession) => ActiveWorkoutSession) => {
    setActiveSession((current) => current ? updater(current) : current);
  }, []);

  const addExercise = useCallback(async (exercise: Exercise) => {
    const previous = await getPreviousPerformance(exercise.id);
    // Warm-up-Sätze aus der heutigen Konfiguration (pro Übung + Tag) automatisch voranstellen.
    const warmupSets = await autoWarmupForNewExercise(exercise);
    setActiveSession((current) => {
      if (!current || current.exercises.some((item) => item.exercise.id === exercise.id)) return current;
      const base = sessionExerciseWithDefaults(exercise, previous);
      const mergedSets = (!warmupSets || warmupSets.length === 0)
        ? base.sets
        : [
            ...warmupSets.map((set, index) => ({ ...set, setNumber: index + 1 })),
            ...base.sets.map((set, index) => ({ ...set, setNumber: warmupSets.length + index + 1 })),
          ];
      return {
        ...current,
        exercises: [...current.exercises, { ...base, sets: mergedSets }],
      };
    });
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setActiveSession((current) => current ? {
      ...current,
      exercises: current.exercises.filter((item) => item.exercise.id !== exerciseId),
    } : current);
  }, []);

  const updateExercise = useCallback((exerciseId: string, updater: (exercise: SessionExercise) => SessionExercise) => {
    setActiveSession((current) => current ? {
      ...current,
      exercises: current.exercises.map((item) => item.exercise.id === exerciseId ? updater(item) : item),
    } : current);
  }, []);

  /** Entfernt alle Warm-up-Sätze der Übung (z. B. beim manuellen Zurücksetzen). */
  const clearWarmup = useCallback((exerciseId: string) => {
    updateExercise(exerciseId, withoutWarmupSets);
  }, [updateExercise]);

  const finishSession = useCallback(async () => {
    if (!activeSession) return null;
    const endedAt = Date.now();
    const sessionId = await saveWorkoutSession({
      name: activeSession.name.trim() || 'Training',
      startedAt: activeSession.startedAt,
      endedAt,
      durationSeconds: Math.max(0, Math.round((endedAt - activeSession.startedAt) / 1000)),
      status: 'completed',
      exercises: activeSession.exercises,
    });
    setActiveSession(null);
    setStartMenuOpen(false);
    return sessionId;
  }, [activeSession]);

  const discardSession = useCallback(() => setActiveSession(null), []);

  const value = useMemo(() => ({
    activeSession,
    startMenuOpen,
    openStartMenu,
    closeStartMenu,
    startSession,
    updateSession,
    addExercise,
    removeExercise,
    updateExercise,
    clearWarmup,
    finishSession,
    discardSession,
  }), [activeSession, startMenuOpen, openStartMenu, closeStartMenu, startSession, updateSession, addExercise, removeExercise, updateExercise, clearWarmup, finishSession, discardSession]);

  return <WorkoutSessionContext.Provider value={value}>{children}</WorkoutSessionContext.Provider>;
}

export function useWorkoutSession(): WorkoutSessionContextValue {
  const context = useContext(WorkoutSessionContext);
  if (!context) throw new Error('useWorkoutSession muss innerhalb von WorkoutSessionProvider verwendet werden.');
  return context;
}


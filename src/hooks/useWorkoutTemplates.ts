import { useCallback, useState } from 'react';
import { type Exercise } from '../db/schema';

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: number;
  /** Fest eingebaute Vorlage — nicht löschbar und nicht im localStorage gespeichert. */
  builtin?: boolean;
}

const STORAGE_KEY = 'gymlog.workout-templates';

function readTemplates(): WorkoutTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useWorkoutTemplates() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(readTemplates);

  const saveTemplate = useCallback((name: string, exercises: Exercise[]) => {
    const template: WorkoutTemplate = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Mein Workout',
      exercises,
      createdAt: Date.now(),
    };
    setTemplates((current) => {
      const next = [...current, template];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return template;
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((current) => {
      const next = current.filter((template) => template.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Eigene Vorlagen (localStorage) — eingebaute Pläne werden separat angehängt. */
  return { templates, saveTemplate, deleteTemplate };
}

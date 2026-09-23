import { type Exercise } from '../db/schema';
import { type WorkoutTemplate } from '../hooks/useWorkoutTemplates';

/**
 * Fest eingebaute Vorlagen — immer vorhanden, nicht löschbar und nicht
 * im localStorage gespeichert. Die drei UPPER-Pläne enthalten dieselben
 * Übungen, nur die Reihenfolge der Muskelgruppen unterscheidet sich.
 */

export type BuiltinWorkoutTemplate = WorkoutTemplate & { builtin: true };

/* --- Übungspool (Reihenfolge innerhalb der Gruppe wie im Plan) --- */

const SCHULTER: Exercise[] = [
  { id: 'Smith_Machine_Overhead_Shoulder_Press', name: 'Schulterpresse Smith', equipment: 'machine', target: 'shoulders', saetze: 2, wiederholungen: 8 },
  { id: 'Cable_Seated_Lateral_Raise', name: 'Seitenheben Kabel', equipment: 'cable', target: 'shoulders', saetze: 2, wiederholungen: 8 },
  { id: 'Sled_Reverse_Flye', name: 'Reversfly Maschine', equipment: 'machine', target: 'shoulders', saetze: 1, wiederholungen: 8 },
];

const ARME: Exercise[] = [
  { id: 'Machine_Preacher_Curls', name: 'Preacher Curls Maschine', equipment: 'machine', target: 'biceps', saetze: 2, wiederholungen: 8 },
  { id: 'Cable_Hammer_Curls_-_Rope_Attachment', name: 'Hammer Curl Kabel', equipment: 'cable', target: 'biceps', saetze: 1, wiederholungen: 8 },
  { id: 'Cable_One_Arm_Tricep_Extension', name: 'Trizepsdrücken unilateral Kabel', equipment: 'cable', target: 'triceps', saetze: 2, wiederholungen: 8 },
  { id: 'Cable_Wrist_Curl', name: 'Forearm-Übung Kabel', equipment: 'cable', target: 'forearms', saetze: 2, wiederholungen: 8 },
  { id: 'Standing_Dumbbell_Reverse_Curl', name: 'Reverse Curls', equipment: 'dumbbell', target: 'biceps', saetze: 1, wiederholungen: 8 },
];

const BRUST: Exercise[] = [
  { id: 'Smith_Machine_Incline_Bench_Press', name: 'Schrägbank drücken Smith', equipment: 'machine', target: 'chest', saetze: 1, wiederholungen: 8 },
  { id: 'Butterfly', name: 'Brustfliege', equipment: 'machine', target: 'chest', saetze: 2, wiederholungen: 8 },
];

const RUECKEN: Exercise[] = [
  { id: 'Wide-Grip_Lat_Pulldown', name: 'Breiter Latzug', equipment: 'cable', target: 'lats', saetze: 2, wiederholungen: 8 },
  { id: 'Straight-Arm_Pulldown', name: 'Straight Arm Pullover Kabel', equipment: 'cable', target: 'lats', saetze: 2, wiederholungen: 8 },
  { id: 'Seated_Cable_Rows', name: 'Breites Rudern Maschine', equipment: 'cable', target: 'middle back', saetze: 2, wiederholungen: 8 },
  { id: 'Cable_Shrugs', name: 'Shoulder Shrug Low Row', equipment: 'cable', target: 'traps', saetze: 1, wiederholungen: 8 },
];

/* --- Die drei Pläne: gleiche Übungen, andere Gruppen-Reihenfolge --- */

export const BUILTIN_WORKOUT_TEMPLATES: BuiltinWorkoutTemplate[] = [
  {
    id: 'builtin-upper-01',
    name: 'UPPER 01',
    builtin: true,
    createdAt: 0,
    // Schulter → Arme → Brust → Rücken
    exercises: [...SCHULTER, ...ARME, ...BRUST, ...RUECKEN],
  },
  {
    id: 'builtin-upper-02',
    name: 'UPPER 02',
    builtin: true,
    createdAt: 0,
    // Brust → Arme → Rücken → Schulter
    exercises: [...BRUST, ...ARME, ...RUECKEN, ...SCHULTER],
  },
  {
    id: 'builtin-upper-03',
    name: 'UPPER 03',
    builtin: true,
    createdAt: 0,
    // Rücken → Arme → Schulter → Brust
    exercises: [...RUECKEN, ...ARME, ...SCHULTER, ...BRUST],
  },
];

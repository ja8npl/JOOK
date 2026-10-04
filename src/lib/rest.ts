/**
 * Reine Pausenzeit-Logik (kein React, kein DB-Zugriff) — gut testbar.
 * Auflösung wie beim Rep-Ziel: Override pro Übung schlägt globale Standard schlägt Fallback.
 */

/** Fallback-Pausenzeit in Sekunden, wenn nichts konfiguriert ist. */
export const DEFAULT_REST_SECONDS = 90;

/**
 * Effektive Pausenzeit in Sekunden: eigener Override (Dexie, pro Übung) schlägt
 * globale Standard-Pause (localStorage, Base) schlägt 90 s. Kaputte Werte
 * (<= 0, nicht endlich) werden ignoriert und fallen weiter durch.
 */
export function resolveRestSeconds(override?: number | null, global?: number | null): number {
  if (override !== undefined && override !== null && isFinite(override) && override > 0) return override;
  if (global !== undefined && global !== null && isFinite(global) && global > 0) return global;
  return DEFAULT_REST_SECONDS;
}

/** 90 → „1:30“, 45 → „0:45“ — Minuten:Sekunden, tabular-freundlich. */
export function formatRestTime(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const min = Math.floor(clamped / 60);
  const sek = clamped % 60;
  return `${min}:${String(sek).padStart(2, '0')}`;
}

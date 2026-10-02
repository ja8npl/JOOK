/**
 * Kleiner Helfer für Datei-Downloads (Backup-Export und Notfall-Sicherung).
 * Bewusst ohne weitere Abhängigkeiten — nur Blob + temporärer Anker.
 */

/** JSON-Text als Datei-Download auslösen. */
export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Backup-Dateiname mit lokalem Tagesdatum (kein UTC-Versatz). */
export function backupFilename(prefix = 'gym-log-backup'): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${prefix}-${y}-${m}-${d}.json`;
}

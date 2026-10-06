/** Leichtes haptisches Feedback für Interaktionen (Drag-Start, Reorder-Swap).
 *  iOS Safari kennt navigator.vibrate nicht — dort ist es ein stiller No-op;
 *  Android-PWAs und Desktop-Browser mit Vibration-API spüren den Puls. */
export function haptic(durationMs = 8): void {
  try {
    navigator.vibrate?.(durationMs);
  } catch {
    /* Vibration nicht verfügbar */
  }
}

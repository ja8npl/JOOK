/**
 * Kern-Logik hinter Hold-to-Confirm (destruktive Bestätigung per Gedrückthalten).
 * Framework-frei gehalten, damit das Timing (Start, Abort, Multi-Touch-Guard)
 * ohne DOM in Vitest mit Fake-Timern testbar ist — die React-Verdrahtung liegt
 * im ConfirmSheet.
 */
export interface HoldConfirmController {
  /** Zeiger/Taste ging runter — startet den Hold-Timer. Idempotent: ein laufender
   *  Hold wird nicht neu gestartet (zweiter Finger ignoriert). */
  start(): void;
  /** Vorzeitig losgelassen — Timer fliegt, kein Callback. Nach dem Feuern ein No-op. */
  cancel(): void;
  isHolding(): boolean;
}

export function createHoldConfirm(holdMs: number, onComplete: () => void): HoldConfirmController {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    start() {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        onComplete();
      }, holdMs);
    },
    cancel() {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
    },
    isHolding: () => timer !== null,
  };
}

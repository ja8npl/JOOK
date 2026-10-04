/**
 * Timer-Feedback (Ton + Vibration) beim Pausenende — bewusst als kleine
 * Framework-freie Helfer, damit EntryForm-RestTimer und die Session-Pausenleiste
 * dasselbe Feedback nutzen (Causality/Harmony: Feedback feuert im selben Frame
 * wie der Zustandswechsel).
 */

/** Kurzer 880-Hz-Piep per WebAudio (kein Asset nötig, funktioniert offline). */
export function playBeep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => void ctx.close();
  } catch { /* Audio nicht verfügbar */ }
}

/** Doppelter Vibrations-Puls (nur Android; iOS Safari unterstützt vibrate nicht). */
export function vibratePattern(): void {
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* nicht unterstützt */ }
}

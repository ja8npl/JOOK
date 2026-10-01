/**
 * Helfer für Zahlen-Inputs (Gewicht/Reps/Sätze): entkoppeln Tastatur-Zwischenstände
 * ("", "0.", "12,") vom gespeicherten number-Wert.
 *
 * Grundproblem: `type="number"` + `value={number}` zwingt jede leere Eingabe zu "0" —
 * der erste Tastendruck hängt dann an ("060" statt "60", Doppeltipp nötig). Deshalb:
 * Anzeige als String im State (leer = nur Placeholder zeigt "0"), number erst beim Commit.
 */

/** Entfernt führende Nullen, außer es folgt ein Dezimalpunkt oder der Wert ist eine einzelne "0". */
export function stripLeadingZeros(raw: string): string {
  return raw.replace(/^0+(?=\d)/, '');
}

/** number → Anzeige-String; 0 bleibt leer (der Placeholder zeigt die "0"). */
export function numberToInputValue(value: number | undefined | null): string {
  return value ? String(value) : '';
}

/** Anzeige-String → number. Akzeptiert Komma und Punkt als Trennzeichen; leer/ungültig → 0. */
export function inputToNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Gültige Zwischenstände beim Tippen: "", "12", "12.", "12,5" — alles andere wird verworfen. */
export function isValidInputValue(raw: string): boolean {
  return raw === '' || /^\d*([.,]\d*)?$/.test(raw);
}

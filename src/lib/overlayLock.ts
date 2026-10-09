/**
 * Referenzzähler für offene Vollbild-Overlays (Session-Sheet und darüberliegende
 * Sheets wie Warm-up, Verlauf, Rep-Ziel, Sortieren).
 *
 * Vorher hat jedes Overlay `body.overflow` beim Schließen hart auf den vorher
 * gemerkten Wert zurückgesetzt. Bei gestapelten Overlays hob das geschlossene
 * Kind-Sheet damit den Scroll-Lock des noch offenen Sessions-Sheets auf — und
 * ohne Lock kann iOS das ganze Fenster verschieben (Symptom: „alles rutscht
 * nach oben"). Der Zähler hält den Lock, solange irgendein Overlay offen ist.
 */
let openOverlays = 0;

export function lockOverlay(): void {
  openOverlays += 1;
  if (openOverlays !== 1) return;
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.classList.add('overlay-open');
}

export function unlockOverlay(): void {
  openOverlays = Math.max(0, openOverlays - 1);
  if (openOverlays !== 0) return;
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  document.documentElement.classList.remove('overlay-open');
}

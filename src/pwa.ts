/* Registriert den PWA-Service-Worker und bittet iOS um persistenten Storage,
   damit Trainingsdaten (IndexedDB) nicht unter Speicherdruck verloren gehen. */
import { registerSW } from 'virtual:pwa-register';

// iOS stellt beim Standalone-Kaltstart die letzte Fenster-Scrollposition wieder
// her; zusammen mit dem Viewport-Settling bleibt sonst ein Offset hängen
// (abgeschnittener Header, Lücke unter der Tab-Bar).
window.scrollTo(0, 0);

registerSW({ immediate: true });

try {
  if (navigator.storage?.persist) await navigator.storage.persist();
} catch {
  /* Storage-Persistenz ist optional, App funktioniert auch ohne. */
}

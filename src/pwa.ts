/* Registriert den PWA-Service-Worker und bittet iOS um persistenten Storage,
   damit Trainingsdaten (IndexedDB) nicht unter Speicherdruck verloren gehen. */
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

try {
  if (navigator.storage?.persist) await navigator.storage.persist();
} catch {
  /* Storage-Persistenz ist optional, App funktioniert auch ohne. */
}

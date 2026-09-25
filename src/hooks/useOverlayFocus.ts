import { useEffect, useRef } from 'react';

/**
 * Gemeinsames Overlay-Fokus-Management für alle Custom-Portals
 * (Session-Modal, Workout-Launcher, Plan-Import) — konsistent mit BottomSheet:
 *
 * 1. Fokus-Versatz: Beim Öffnen landet der Fokus im Overlay (Container, tabIndex -1),
 *    nicht im dahinterliegenden Seiten-DOM.
 * 2. Fokus-Falle: Tab kreist innerhalb des Overlays (WCAG 2.4.3). Schließen-Buttons
 *    an den Ecken werden korrekt eingeschlossen; der Container selbst ist überspringbar.
 * 3. Escape schließt — gleiches Verhalten wie BottomSheet/PlanImportSheet.
 *
 * Der Hook überlebt unmount während der Schließ-Animation (AnimatePresence),
 * weil die Listener an `open` gebunden und im Cleanup entfernt werden.
 */
export function useOverlayFocus(open: boolean, onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  /* onClose im Ref halten: Der Effekt hängt nur von `open` ab. Eine neue Callback-
     Identität pro Render (z. B. der Sekunden-Tick im Session-Modal) würde sonst den
     Effekt ständig neu starten — und den Fokus per Focus-Timer zurück aufs Sheet
     reißen, während der Nutzer in ein Input tippt („Eingabe wird sofort abgebrochen“). */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    // 1. Fokus-Versatz — nach dem Mount, bevor der Nutzer tabbt.
    const focusTimer = window.setTimeout(() => sheetRef.current?.focus(), 0);

    // 2. Fokus-Falle + 3. Escape.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const container = sheetRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return sheetRef;
}

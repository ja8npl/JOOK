import { useEffect, useRef, useState } from 'react';
import { type RirValue } from '../db/schema';
import { rirLabel } from '../lib/progression';

const OPTIONS: readonly RirValue[] = [0, 1, 2, 3, 4, 'failure'];

interface Props {
  value: RirValue | undefined;
  onChange: (rir: RirValue | undefined) => void;
  /** Kontext für Screenreader, z. B. „Satz 2“ oder „Satz 2 · Schulterpresse“. */
  setLabel: string;
}

/**
 * RIR-Chip einer Satz-Zeile: zeigt den aktuellen Wert (oder „RIR“) und öffnet
 * beim Tippen eine kompakte Button-Reihe 0–4+ / Failure. Erneutes Tippen desselben
 * Werts leert das Feld — RIR bleibt komplett optional.
 */
export function RirPicker({ value, onChange, setLabel }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Klick außerhalb schließt die Auswahl (Pointerdown, damit es vor dem Focus-Wechsel feuert).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="rir-wrap">
      <button
        type="button"
        className={`rir-chip${value !== undefined ? ' is-set' : ''}`}
        aria-label={`RIR für ${setLabel}${value !== undefined ? `: ${rirLabel(value)}` : ' wählen'}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        {rirLabel(value)}
      </button>
      {open && (
        <div className="rir-popover" role="menu" aria-label={`RIR wählen für ${setLabel}`}>
          {OPTIONS.map((option) => (
            <button
              key={String(option)}
              type="button"
              role="menuitemradio"
              aria-checked={value === option}
              aria-label={`RIR ${rirLabel(option)}`}
              onClick={() => {
                // Gleicher Wert nochmal → Feld leeren (RIR ist optional).
                onChange(value === option ? undefined : option);
                setOpen(false);
              }}
            >
              {rirLabel(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

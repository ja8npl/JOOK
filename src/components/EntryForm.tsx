import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Dumbbell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type GymEntry, type WorkoutSet, toMachineId } from '../db/schema';
import { saveEntry } from '../hooks/useEntries';
import { useMachineNames } from '../hooks/useEntries';
import { useLastWeightForMachine } from '../hooks/useSets';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { searchStaticExercises } from '../hooks/useExercises';
import { SetCounter } from './SetCounter';
import { RestTimer } from './RestTimer';
import { rirLabel } from '../lib/progression';

interface Props {
  initialEntry?: Partial<GymEntry>;
  defaultName?: string;
  onSaved?: (id: number) => void;
}

export function EntryForm({ initialEntry, defaultName, onSaved }: Props) {
  const navigate     = useNavigate();
  const reduced      = useReducedMotion();
  const machineNames = useMachineNames() ?? [];

  const [name, setName]             = useState(initialEntry?.name ?? defaultName ?? '');
  const [einstellung, setEinstellung] = useState(initialEntry?.einstellung ?? '');
  const [problem, setProblem]       = useState(initialEntry?.problem ?? '');
  const [ziel, setZiel]             = useState(initialEntry?.ziel ?? '');
  const [datum, setDatum]           = useState(
    initialEntry?.datum
      ? new Date(initialEntry.datum).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [sets, setSets]             = useState<WorkoutSet[]>(
    Array.isArray(initialEntry?.sets) ? initialEntry!.sets! : [],
  );
  const [timerStartKey, setTimerStartKey] = useState(0);

  const machineId  = toMachineId(name);
  const lastWeight = useLastWeightForMachine(machineId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const customSuggestions = name.length > 0
    ? machineNames.filter((n): n is string =>
        typeof n === 'string' && n.toLowerCase().includes(name.toLowerCase()) && n !== name,
      )
    : [];

  const staticSuggestions = searchStaticExercises(name)
    .filter(ex => ex.name !== name && !customSuggestions.includes(ex.name));

  const hasSuggestions = customSuggestions.length > 0 || staticSuggestions.length > 0;

  /* Tastaturbedienung der Vorschlagsliste (Combobox-Muster):
     Pfeiltasten wählen, Enter übernimmt, Escape schließt die Liste.
     aria-activedescendant markiert die aktive Option für Screenreader. */
  const suggestionNames = [...customSuggestions, ...staticSuggestions.map((ex) => ex.name)];
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const onNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasSuggestions || !showAutocomplete) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion((current) => {
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const next = current + delta;
        if (next < 0) return suggestionNames.length - 1;
        if (next >= suggestionNames.length) return 0;
        return next;
      });
    } else if (event.key === 'Enter' && activeSuggestion >= 0 && activeSuggestion < suggestionNames.length) {
      event.preventDefault();
      setName(suggestionNames[activeSuggestion]);
      setShowAutocomplete(false);
      setActiveSuggestion(-1);
    } else if (event.key === 'Escape') {
      setShowAutocomplete(false);
      setActiveSuggestion(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Bitte gib einen Maschinennamen ein.');
      nameInputRef.current?.focus();
      return;
    }
    if (!einstellung.trim()) {
      setError('Bitte trag die Einstellungen ein.');
      return;
    }
    try {
      const id = await saveEntry({
        id: initialEntry?.id,
        name: name.trim(),
        einstellung: einstellung.trim(),
        problem: problem.trim() || undefined,
        ziel: ziel.trim() || undefined,
        datum: new Date(datum).getTime(),
        sets: sets.length > 0 ? sets : undefined,
      });
      setSaved(true);
      setTimeout(() => {
        if (onSaved) onSaved(id);
        else navigate(-1);
      }, 900);
    } catch {
      setError('Fehler beim Speichern. Bitte versuche es erneut.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Maschinen-Name */}
      <div style={{ position: 'relative' }}>
        <label htmlFor="machine-name" style={labelStyle}>Maschine / Übung</label>
        <input
          ref={nameInputRef}
          id="machine-name"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setShowAutocomplete(true); setActiveSuggestion(-1); }}
          onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
          onFocus={() => setShowAutocomplete(true)}
          onKeyDown={onNameKeyDown}
          role="combobox"
          aria-expanded={showAutocomplete && hasSuggestions}
          aria-controls="machine-name-suggestions"
          aria-activedescendant={activeSuggestion >= 0 ? `machine-name-option-${activeSuggestion}` : undefined}
          placeholder="z.B. Beinpresse, Lat-Zug, Bankdrücken…"
          autoComplete="off"
          required
        />
        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {showAutocomplete && hasSuggestions && (
            <motion.ul
              initial={reduced ? false : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              role="listbox"
              aria-label="Vorschläge"
              id="machine-name-suggestions"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                zIndex: 50,
                listStyle: 'none',
                padding: '6px',
                boxShadow: 'var(--neo-float)',
                maxHeight: '280px',
                overflowY: 'auto',
              }}
            >
              {customSuggestions.map((suggestion, index) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    role="option"
                    id={`machine-name-option-${index}`}
                    aria-selected={index === activeSuggestion}
                    onClick={() => { setName(suggestion); setShowAutocomplete(false); }}
                    style={suggestionButtonStyle}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-input)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
                  >
                    <span style={{ flex: 1, textAlign: 'left' }}>{suggestion}</span>
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--accent-text)',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      background: 'var(--accent-dim)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-accent)',
                    }}>
                      EIGENE
                    </span>
                  </button>
                </li>
              ))}
              {customSuggestions.length > 0 && staticSuggestions.length > 0 && (
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 8px' }} />
              )}
              {staticSuggestions.map((ex, staticIndex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    role="option"
                    id={`machine-name-option-${customSuggestions.length + staticIndex}`}
                    aria-selected={customSuggestions.length + staticIndex === activeSuggestion}
                    onClick={() => { setName(ex.name); setShowAutocomplete(false); }}
                    style={suggestionButtonStyle}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-input)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', flex: 1 }}>
                      <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{ex.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{ex.target ?? 'Übung'}</span>
                    </div>
                    {ex.equipment && (
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--text-tertiary)',
                        background: 'var(--bg-input)',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        letterSpacing: '0.04em',
                      }}>
                        {ex.equipment.toUpperCase()}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Sätze */}
      <div>
        <label style={labelStyle}>
          Sätze
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '6px' }}>optional</span>
        </label>

        {/* Geloggte Sätze */}
        {sets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            {sets.map((s, i) => (
              <div
                key={s.timestamp + '-' + i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'var(--bg-input)',
                  boxShadow: 'var(--neo-pressed)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--accent-text)',
                  minWidth: '20px',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {i + 1}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: '15px',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {s.gewicht} kg × {s.wiederholungen}
                  {s.rir !== undefined && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 800, color: 'var(--accent-text)' }}>
                      @ RIR {rirLabel(s.rir)}
                    </span>
                  )}
                </span>
                <motion.button
                  type="button"
                  onClick={() => setSets((prev) => prev.filter((_, j) => j !== i))}
                  whileTap={reduced ? undefined : { scale: 0.96 }}
                  aria-label={`Satz ${i + 1} entfernen`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: '6px',
                    borderRadius: '8px',
                  }}
                >
                  <X size={15} strokeWidth={2.5} />
                </motion.button>
              </div>
            ))}
          </div>
        )}

        {/* Leer-State */}
        {sets.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 16px',
            background: 'var(--bg-input)',
            boxShadow: 'var(--neo-pressed)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-tertiary)',
            fontSize: '14px',
            marginBottom: '14px',
          }}>
            <Dumbbell size={16} color="var(--accent-text)" />
            Keine Sätze geloggt – nur Einstellungen dokumentieren
          </div>
        )}

        <SetCounter
          defaultWeight={lastWeight ?? (sets.length > 0 ? sets[sets.length - 1].gewicht : undefined)}
          onComplete={(gewicht, wiederholungen, rir) => {
            setSets((prev) => [...prev, { gewicht, wiederholungen, timestamp: Date.now(), rir }]);
            setTimerStartKey((k) => k + 1);
          }}
        />

        {/* Pausen-Timer */}
        {timerStartKey > 0 && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              marginTop: '18px',
              padding: '20px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--neo-raised)',
            }}
          >
            <RestTimer startKey={timerStartKey} />
          </motion.div>
        )}
      </div>

      {/* Einstellungen */}
      <div>
        <label htmlFor="einstellung" style={labelStyle}>
          Einstellungen <span style={{ color: 'var(--accent-text)' }}>*</span>
        </label>
        <textarea
          id="einstellung"
          value={einstellung}
          onChange={(e) => setEinstellung(e.target.value)}
          placeholder="Sitzhöhe 3, Gewicht Pin 8 (40 kg), Rückenlehne Position 2…"
          required
        />
      </div>

      {/* Problem */}
      <div>
        <label htmlFor="problem" style={labelStyle}>
          Probleme / Notizen
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '6px' }}>optional</span>
        </label>
        <textarea
          id="problem"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Schmerzen in der Schulter bei zu hohem Gewicht…"
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* Ziel */}
      <div>
        <label htmlFor="ziel" style={labelStyle}>
          Ziel
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '6px' }}>optional</span>
        </label>
        <textarea
          id="ziel"
          value={ziel}
          onChange={(e) => setZiel(e.target.value)}
          placeholder="Sauberere Ausführung, mehr Gewicht nächste Woche…"
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* Datum */}
      <div>
        <label htmlFor="datum" style={labelStyle}>Datum</label>
        <input
          id="datum"
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          style={{ colorScheme: 'dark' }}
        />
      </div>

      {/* Fehler */}
      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            aria-live="assertive"
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: '14px',
              color: 'var(--danger)',
              padding: '13px 16px',
              background: 'var(--danger-dim)',
              boxShadow: 'var(--neo-pressed)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--danger-border)',
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Submit */}
      <motion.button
        type="submit"
        whileTap={reduced ? undefined : { scale: 0.96 }}
        animate={saved ? { scale: [1, 1.04, 1] } : {}}
        transition={saved ? { duration: 0.35, ease: 'easeOut' } : {}}
        style={{
          width: '100%',
          padding: '18px',
          minHeight: '56px',
          background: saved ? 'var(--accent-dim)' : 'var(--accent)',
          boxShadow: saved ? 'var(--neo-pressed)' : 'var(--neo-convex)',
          border: saved ? '1px solid var(--border-accent)' : 'none',
          borderRadius: 'var(--radius-input)',
          color: saved ? 'var(--accent-text)' : 'var(--text-on-accent)',
          fontSize: '17px',
          fontWeight: 700,
          letterSpacing: '0.02em',
          cursor: saved ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition:
            'background 300ms var(--ease-out), box-shadow 300ms var(--ease-out), color 300ms var(--ease-out)',
        }}
        disabled={saved}
      >
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.span
              key="saved"
              initial={reduced ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Check size={20} strokeWidth={2.5} />
              Gespeichert
            </motion.span>
          ) : (
            <motion.span key="save" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {initialEntry?.id ? 'Änderungen speichern' : 'Eintrag speichern'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-tertiary)',
  marginBottom: '8px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const suggestionButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'none',
  border: 'none',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '15px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  cursor: 'pointer',
  transition: 'background 120ms ease',
};

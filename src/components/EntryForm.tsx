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

interface Props {
  /** Bestehender Eintrag zum Bearbeiten (undefined = neuer Eintrag) */
  initialEntry?: Partial<GymEntry>;
  /** Vorausgefüllter Maschinenname (z.B. aus Detail-View) */
  defaultName?: string;
  onSaved?: (id: number) => void;
}

export function EntryForm({ initialEntry, defaultName, onSaved }: Props) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const machineNames = useMachineNames() ?? [];

  const [name, setName] = useState(initialEntry?.name ?? defaultName ?? '');
  const [einstellung, setEinstellung] = useState(initialEntry?.einstellung ?? '');
  const [problem, setProblem] = useState(initialEntry?.problem ?? '');
  const [ziel, setZiel] = useState(initialEntry?.ziel ?? '');
  const [datum, setDatum] = useState(
    initialEntry?.datum
      ? new Date(initialEntry.datum).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Set-Tracking
  const [sets, setSets] = useState<WorkoutSet[]>(
    Array.isArray(initialEntry?.sets) ? initialEntry!.sets! : [],
  );
  const [timerStartKey, setTimerStartKey] = useState(0);
  const machineId = toMachineId(name);
  const lastWeight = useLastWeightForMachine(machineId);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Eigene, bereits genutzte Maschinen
  const customSuggestions = name.length > 0
    ? machineNames.filter((n): n is string =>
      typeof n === 'string' && n.toLowerCase().includes(name.toLowerCase()) && n !== name,
    )
    : [];

  // Vorschläge aus der statischen Datenbank
  const staticSuggestions = searchStaticExercises(name)
    .filter(ex => ex.name !== name && !customSuggestions.includes(ex.name));

  const hasSuggestions = customSuggestions.length > 0 || staticSuggestions.length > 0;

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Maschinen-Name mit Autocomplete */}
      <div style={{ position: 'relative' }}>
        <label htmlFor="machine-name" style={labelStyle}>
          Maschine / Übung
        </label>
        <input
          ref={nameInputRef}
          id="machine-name"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setShowAutocomplete(true); }}
          onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
          onFocus={() => setShowAutocomplete(true)}
          placeholder="z.B. Beinpresse, Lat-Zug, Bankdrücken…"
          autoComplete="off"
          required
        />
        {/* Autocomplete-Dropdown */}
        <AnimatePresence>
          {showAutocomplete && hasSuggestions && (
            <motion.ul
              initial={reduced ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              role="listbox"
              aria-label="Vorschläge"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-input)',
                overflow: 'hidden',
                zIndex: 50,
                listStyle: 'none',
                padding: '4px',
                boxShadow: 'var(--shadow-float)',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              {customSuggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => { setName(suggestion); setShowAutocomplete(false); }}
                    style={suggestionButtonStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ flex: 1, textAlign: 'left' }}>{suggestion}</span>
                    <span style={{ fontSize: '11px', color: 'var(--accent-text)', fontWeight: 600 }}>EIGENE</span>
                  </button>
                </li>
              ))}
              
              {customSuggestions.length > 0 && staticSuggestions.length > 0 && (
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 8px' }} />
              )}
              
              {staticSuggestions.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => { setName(ex.name); setShowAutocomplete(false); }}
                    style={suggestionButtonStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', flex: 1 }}>
                      <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{ex.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{ex.target ?? 'Übung'}</span>
                    </div>
                    {ex.equipment && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-input)',
                        padding: '2px 6px',
                        borderRadius: '4px'
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

      {/* Set-Tracking */}
      <div>
        <label style={labelStyle}>
          Sätze
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '6px' }}>optional</span>
        </label>

        {/* Geloggte Sätze */}
        {sets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {sets.map((s, i) => (
              <div
                key={s.timestamp + '-' + i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-text)',
                  minWidth: '20px',
                }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {s.gewicht} kg × {s.wiederholungen}
                </span>
                <motion.button
                  type="button"
                  onClick={() => setSets((prev) => prev.filter((_, j) => j !== i))}
                  whileTap={reduced ? undefined : { scale: 0.88 }}
                  aria-label={`Satz ${i + 1} entfernen`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: '4px',
                  }}
                >
                  <X size={16} />
                </motion.button>
              </div>
            ))}
          </div>
        )}

        {sets.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px',
            background: 'var(--bg-input)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-tertiary)',
            fontSize: '14px',
            marginBottom: '12px',
          }}>
            <Dumbbell size={16} color="var(--accent-text)" />
            Keine Sätze geloggt, nur Einstellungen dokumentieren
          </div>
        ) : null}

        <SetCounter
          defaultWeight={lastWeight ?? (sets.length > 0 ? sets[sets.length - 1].gewicht : undefined)}
          onComplete={(gewicht, wiederholungen) => {
            setSets((prev) => [...prev, { gewicht, wiederholungen, timestamp: Date.now() }]);
            setTimerStartKey((k) => k + 1);
          }}
        />

        {/* Pausen-Timer nach Satz-Abschluss */}
        {timerStartKey > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
          }}>
            <RestTimer startKey={timerStartKey} />
          </div>
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

      {/* Problem/Notizen */}
      <div>
        <label htmlFor="problem" style={labelStyle}>
          Probleme / Notizen
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '6px' }}>optional</span>
        </label>
        <textarea
          id="problem"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Schmerzen in der Schulter bei zu hohem Gewicht, Knie-Alignment checken…"
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
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: '14px',
              color: 'var(--danger)',
              padding: '12px 14px',
              background: 'var(--danger-dim)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--danger-border)',
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <motion.button
        type="submit"
        whileTap={reduced ? undefined : { scale: 0.97 }}
        animate={saved ? { scale: [1, 1.04, 1] } : {}}
        transition={saved ? { duration: 0.35, ease: 'easeOut' } : {}}
        style={{
          width: '100%',
          padding: '18px',
          background: saved ? 'var(--accent-dim)' : 'var(--accent)',
          boxShadow: saved ? 'var(--neo-pressed)' : 'var(--neo-convex)',
          border: saved ? '1px solid var(--accent)' : 'none',
          borderRadius: 'var(--radius-input)',
          color: saved ? 'var(--accent)' : 'var(--text-on-accent)',
          fontSize: '17px',
          fontWeight: 600,
          cursor: saved ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'background 300ms ease, color 300ms ease, border 300ms ease',
        }}
        disabled={saved}
      >
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.span
              key="saved"
              initial={reduced ? false : { opacity: 0, scale: 0.5 }}
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
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '8px',
  letterSpacing: '0.02em',
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
  transition: 'background var(--transition-fast)',
};

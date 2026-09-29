import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { useSearch } from '../hooks/useSearch';
import { searchStaticExercises } from '../hooks/useExercises';
import { useReducedMotion } from '../hooks/useReducedMotion';/**
 * Inline-Volltextsuche der Übungs-Bibliothek (ehem. Suche-Tab):
 * Durchsucht Name/Einstellung/Problem/Ziel eigener Einträge plus die
 * Übungs-Datenbank (NewEntry-Vorschläge). Ergebnisliste rendert inline
 * unterhalb des Suchfelds.
 */
interface LibrarySearchProps {
  /** Benachrichtigt Home, wenn Ergebnisliste statt Kartenliste sichtbar ist. */
  onActiveChange?: (active: boolean) => void;
}

export function LibrarySearch({ onActiveChange }: LibrarySearchProps) {
  const [query, setQuery] = useState('');
  const results = useSearch(query);
  const staticResults = searchStaticExercises(query);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    onActiveChange?.(hasQuery);
  }, [hasQuery, onActiveChange]);
  const loading = hasQuery && results === undefined && staticResults.length === 0;
  const noResults = hasQuery && results !== undefined && results.length === 0 && staticResults.length === 0;

  const panel = useMemo(() => {
    if (!hasQuery) return null;
    return (
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '26px 0 10px', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            Suche…
          </motion.div>
        ) : noResults ? (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '26px 0 10px', color: 'var(--text-secondary)', fontSize: '15px', margin: 0 }}>
            Keine Treffer für <span style={{ color: 'var(--text-primary)' }}>„{query}“</span>
          </motion.p>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={reduced ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            style={{ display: 'grid', gap: '10px', marginTop: '14px' }}
          >
            {staticResults.map((exercise, index) => (
              <motion.button
                key={exercise.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { delay: Math.min(index * 0.03, 0.2) }}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                onClick={() => navigate(`/new?name=${encodeURIComponent(exercise.name)}`)}
                style={{
                  ...resultStyle,
                  gap: '12px',
                }}
              >
                <span style={{ flex: 1 }}>{highlight(exercise.name, query)}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {exercise.equipment ?? exercise.target ?? 'Übung'}
                </span>
              </motion.button>
            ))}
            {results !== undefined && results.length > 0 && (
              <>
                <p style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
                  color: 'var(--text-tertiary)', margin: '14px 0 2px',
                }}>
                  Deine Einträge · {results.length}
                </p>
                {results.map((entry, index) => (
                  <motion.button
                    key={entry.id}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 300, damping: 26, delay: Math.min((staticResults.length + index) * 0.03, 0.25) }
                    }
                    whileTap={reduced ? undefined : { scale: 0.96 }}
                    onClick={() => navigate(`/machine/${encodeURIComponent(entry.machineId)}`)}
                    style={resultStyle}
                  >
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent-dim)',
                      boxShadow: 'var(--neo-pressed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Dumbbell size={18} color="var(--accent-text)" strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {highlight(entry.name, query)}
                      </div>
                      <div style={{
                        fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {highlight(entry.einstellung, query)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        {new Date(entry.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }, [hasQuery, loading, noResults, query, reduced, results, staticResults, navigate]);

  return (
    <div>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Bibliothek durchsuchen…"
      />
      {panel}
    </div>
  );
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)', borderRadius: '3px', padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const resultStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  minHeight: '52px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)',
  padding: '14px 16px',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  font: 'inherit',
  textAlign: 'left',
  boxShadow: 'var(--shadow-card)',
};

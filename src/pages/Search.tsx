import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Dumbbell } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { useSearch } from '../hooks/useSearch';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { type GymEntry } from '../db/schema';
import { searchStaticExercises } from '../hooks/useExercises';

export function Search() {
  const [query, setQuery] = useState('');
  const results = useSearch(query);
  const staticResults = searchStaticExercises(query);
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  return (
    <div className="page-container">
      {/* Header */}
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          marginBottom: '16px',
        }}>
          Suche
        </h1>
        <SearchBar value={query} onChange={setQuery} autoFocus />
      </header>

      {/* Ergebnisse */}
      <AnimatePresence mode="wait">
        {!query ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', paddingTop: '60px', color: 'var(--text-tertiary)' }}
          >
            <SearchIcon size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
            <p style={{ fontSize: '15px' }}>Suche nach Maschine, Einstellung oder Notiz</p>
          </motion.div>
        ) : results === undefined && staticResults.length === 0 ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: '40px' }}>
              Suche…
            </div>
          </motion.div>
        ) : results !== undefined && results.length === 0 && staticResults.length === 0 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', paddingTop: '60px' }}
          >
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              Keine Treffer für <span style={{ color: 'var(--text-primary)' }}>„{query}"</span>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {staticResults.length > 0 && (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '0' }}>
                  Übungen aus der Datenbank
                </p>
                {staticResults.map((exercise, index) => (
                  <motion.button
                    key={exercise.id}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced ? { duration: 0 } : { delay: index * 0.04 }}
                    whileTap={reduced ? undefined : { scale: 0.96 }}
                    onClick={() => navigate(`/new?name=${encodeURIComponent(exercise.name)}`)}
                    style={staticResultStyle}
                  >
                    <span style={{ flex: 1 }}>
                      {highlight(exercise.name, query)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {exercise.equipment ?? exercise.target ?? 'Übung'}
                    </span>
                  </motion.button>
                ))}
              </>
            )}
            {results !== undefined && results.length > 0 && (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '0', marginTop: '8px' }}>
                  Deine Einträge · {results.length}
                </p>
                {results.map((entry, index) => (
                  <SearchResult
                    key={entry.id}
                    entry={entry}
                    query={query}
                    index={index}
                    reduced={reduced}
                    onClick={() => navigate(`/machine/${encodeURIComponent(entry.machineId)}`)}
                  />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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

const staticResultStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
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

function SearchResult({ entry, query, index, reduced, onClick }: {
  entry: GymEntry;
  query: string;
  index: number;
  reduced: boolean;
  onClick: () => void;
}) {
  const dateStr = new Date(entry.datum).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <motion.button
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 300, damping: 26, delay: index * 0.04 }
      }
      whileTap={reduced ? undefined : { scale: 0.96 }}
      onClick={onClick}
      style={{
        display: 'flex',
        gap: '12px',
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        background: 'var(--accent-dim)',
        boxShadow: 'var(--neo-pressed)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Dumbbell size={18} color="var(--accent-text)" strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: '17px',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          {highlight(entry.name, query)}
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {highlight(entry.einstellung, query)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          {dateStr}
        </div>
      </div>
    </motion.button>
  );
}

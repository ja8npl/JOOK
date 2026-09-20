import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Maschine, Einstellung, Notiz…',
  autoFocus,
}: Props) {
  const reduced = useReducedMotion();

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Search
        size={17}
        color="var(--text-tertiary)"
        style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="Suchen nach Maschinen oder Notizen"
        style={{
          paddingLeft: '46px',
          paddingRight: value ? '52px' : '16px',
          /* Suchfeld liegt tiefer als die Umgebung — Pressed-Well */
          background: 'var(--bg-input)',
          boxShadow: 'var(--neo-pressed)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-pill)',
          height: '50px',
          fontSize: '16px',
        }}
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={reduced ? undefined : { opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.75 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onClick={() => onChange('')}
            aria-label="Suche löschen"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--bg-chip-inset)',
              boxShadow: 'var(--neo-pressed)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              zIndex: 2,
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

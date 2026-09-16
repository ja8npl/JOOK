import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, placeholder = 'Maschine, Einstellung, Notiz…', autoFocus }: Props) {
  const reduced = useReducedMotion();

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Search
        size={18}
        color="var(--text-tertiary)"
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
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
        style={{
          paddingLeft: '44px',
          paddingRight: value ? '44px' : '16px',
        }}
      />
      <AnimatePresence>
        {value && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}>
            <motion.button
              initial={reduced ? undefined : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => onChange('')}
              aria-label="Suche löschen"
              style={{
                background: 'var(--bg-input)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={15} />
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

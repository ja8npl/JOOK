import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { EntryForm } from '../components/EntryForm';
import { useReducedMotion } from '../hooks/useReducedMotion';


export function NewEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduced = useReducedMotion();

  // Optionaler vorausgefüllter Name (aus Detail-View)
  const defaultName = searchParams.get('name') ?? undefined;

  return (
    <div className="page-container">
      {/* Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <motion.button
          onClick={() => navigate(-1)}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          aria-label="Zurück"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: 'var(--accent-text)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 0',
            minHeight: '44px',
          }}
        >
          <ChevronLeft size={20} />
          Zurück
        </motion.button>
      </div>

      {/* Header */}
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '32px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: 'var(--tracking-display)',
        }}>
          Neuer Eintrag
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          Maschineneinstellungen dokumentieren
        </p>
      </header>

      <EntryForm
        defaultName={defaultName}
        onSaved={() => {
          // Nach dem Speichern zurücknavigieren
          navigate(-1);
        }}
      />
    </div>
  );
}

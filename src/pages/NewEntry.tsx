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
          whileTap={reduced ? undefined : { scale: 0.95 }}
          aria-label="Zurück"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '16px',
            fontWeight: 500,
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
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '30px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
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

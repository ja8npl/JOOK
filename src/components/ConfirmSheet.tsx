import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

export function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title = 'Bist du sicher?',
  message = 'Diese Aktion kann nicht rückgängig gemacht werden.',
  confirmLabel = 'Löschen',
}: Props) {
  const reduced = useReducedMotion();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '8px' }}>
        {/* Icon */}
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          background: 'var(--danger-dim)',
          boxShadow: 'var(--neo-pressed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertTriangle size={24} color="var(--danger)" strokeWidth={1.5} />
        </div>

        <div>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '6px',
          }}>
            {title}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <motion.button
            onClick={onConfirm}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            style={{
              width: '100%',
              padding: '16px',
              background: 'var(--danger)',
              boxShadow: 'var(--neo-convex)',
              border: 'none',
              borderRadius: 'var(--radius-input)',
              color: 'var(--on-danger)',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
          >
            {confirmLabel}
          </motion.button>
          <motion.button
            onClick={onClose}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            style={{
              width: '100%',
              padding: '16px',
              background: 'var(--bg-input)',
              boxShadow: 'var(--neo-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-input)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
          >
            Abbrechen
          </motion.button>
        </div>
      </div>
    </BottomSheet>
  );
}

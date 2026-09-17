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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '8px' }}>
        {/* Icon-Well — Danger-Pressed */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--danger-dim)',
          boxShadow: 'var(--neo-pressed)',
          border: '1px solid var(--danger-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertTriangle size={24} color="var(--danger)" strokeWidth={1.5} />
        </div>

        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: 'var(--tracking-display)',
            marginBottom: '8px',
          }}>
            {title}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <motion.button
            onClick={onConfirm}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            style={{
              width: '100%',
              padding: '17px',
              background: 'var(--danger)',
              boxShadow: 'var(--neo-convex)',
              border: 'none',
              borderRadius: 'var(--radius-input)',
              color: 'var(--on-danger)',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'box-shadow var(--duration-press) var(--ease-press)',
            }}
          >
            {confirmLabel}
          </motion.button>
          <motion.button
            onClick={onClose}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            style={{
              width: '100%',
              padding: '17px',
              background: 'var(--bg-input)',
              boxShadow: 'var(--neo-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-input)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition:
                'box-shadow var(--duration-press) var(--ease-press), background var(--duration-fast) var(--ease-out)',
            }}
          >
            Abbrechen
          </motion.button>
        </div>
      </div>
    </BottomSheet>
  );
}

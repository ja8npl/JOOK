import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: Props) {
  const reduced  = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      sheetRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--overlay)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 200,
            }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduced
              ? { duration: 0 }
              : { type: 'spring', stiffness: 340, damping: 34 }
            }
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              /* Float-Level — höchste Neo-Ebene */
              background: 'var(--bg-elevated)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              boxShadow: 'var(--neo-float), inset 0 1px 1px rgba(255,255,255,0.08)',
              borderTop: '1px solid var(--border-highlight)',
              borderRadius: '26px 26px 0 0',
              paddingBottom: 'calc(var(--safe-bottom) + 20px)',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '18px',
              zIndex: 201,
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            {/* Drag Handle — Neo-Pressed-Pill */}
            <div style={{
              width: '40px',
              height: '4px',
              background: 'var(--bg-chip-inset)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.04)',
              borderRadius: '2px',
              margin: '0 auto 22px',
            }} />

            {/* Header */}
            {title && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '22px',
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: 'var(--tracking-display)',
                }}>
                  {title}
                </h2>
                <motion.button
                  onClick={onClose}
                  whileTap={reduced ? undefined : { scale: 0.96 }}
                  aria-label="Schließen"
                  style={{
                    background: 'var(--bg-input)',
                    boxShadow: 'var(--neo-pressed)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <X size={16} strokeWidth={2.5} />
                </motion.button>
              </div>
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

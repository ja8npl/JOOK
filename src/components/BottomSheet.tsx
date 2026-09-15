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
  const reduced = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Schließen bei Klick auf Backdrop
  // Focus-Trap beim Öffnen
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      sheetRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ESC-Taste
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
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--overlay)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
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
              : { type: 'spring', stiffness: 320, damping: 32 }
            }
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--bg-elevated)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderTop: '1px solid var(--border)',
              borderRadius: '24px 24px 0 0',
              paddingBottom: 'calc(var(--safe-bottom) + 16px)',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '16px',
              zIndex: 201,
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            {/* Drag Handle */}
            <div style={{
              width: '36px',
              height: '4px',
              background: 'var(--border-hover)',
              borderRadius: '2px',
              margin: '0 auto 20px',
            }} />

            {/* Header */}
            {title && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}>
                <h2 style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  {title}
                </h2>
                <motion.button
                  onClick={onClose}
                  whileTap={reduced ? undefined : { scale: 0.90 }}
                  aria-label="Schließen"
                  style={{
                    background: 'var(--bg-input)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <X size={16} />
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

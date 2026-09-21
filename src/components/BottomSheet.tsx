import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Kleine Overline über dem Titel (z. B. „Dein Verlauf"). */
  eyebrow?: string;
  children: React.ReactNode;
  /** Hebt das Sheet über die iOS-Tastatur (Visual-Viewport-Offset). */
  avoidKeyboard?: boolean;
}

/** Abstand, den die geöffnete Tastatur vom Viewport nimmt (0 ohne Tastatur). */
function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const update = () => {
      const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setInset(Math.round(overlap));
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [active]);
  return inset;
}

export function BottomSheet({ isOpen, onClose, title, eyebrow, children, avoidKeyboard = false }: Props) {
  const reduced  = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const keyboardInset = useKeyboardInset(isOpen && avoidKeyboard);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('overlay-open');
      sheetRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('overlay-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('overlay-open');
    };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Portal an document.body — verhindert, dass Stacking Contexts im Seitenbaum
  // (z. B. motion-Wrapper in App.tsx) den z-Index des Sheets abschneiden.
  return createPortal(
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
            drag={reduced ? false : 'y'}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 550) onClose();
            }}
            style={{
              position: 'fixed',
              bottom: keyboardInset,
              left: 0,
              right: 0,
              width: 'min(100%, 560px)',
              margin: '0 auto',
              /* Container-Fokus ohne Outline — Fokus bleibt für Bedienelemente sichtbar */
              outline: 'none',
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
            {/* Drag-Grifffläche — große Touch-Zone, visueller Pill sauber mittig */}
            <div
              onPointerDown={(event) => dragControls.start(event)}
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                padding: '10px 0 12px',
                margin: '-6px 0 10px',
                cursor: 'grab',
                touchAction: 'none',
              }}
              aria-hidden="true"
            >
              <div style={{
                width: '40px',
                height: '4px',
                borderRadius: '2px',
                background: 'var(--border-highlight)',
                opacity: 0.8,
              }} />
            </div>

            {/* Header */}
            {title && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '18px',
              }}>
                <div style={{ minWidth: 0 }}>
                  {eyebrow && (
                    <span className="eyebrow accent-copy" style={{ display: 'block', marginBottom: '5px' }}>
                      {eyebrow}
                    </span>
                  )}
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: 'var(--tracking-display)',
                    lineHeight: 1.15,
                  }}>
                    {title}
                  </h2>
                </div>
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
                    flexShrink: 0,
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
    </AnimatePresence>,
    document.body,
  );
}

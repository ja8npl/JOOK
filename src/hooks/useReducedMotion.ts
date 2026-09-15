import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * Gibt `true` zurück wenn der User `prefers-reduced-motion: reduce` gesetzt hat.
 * Verwendung: alle Framer Motion Animations-Props auf ihre Endwerte setzen.
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}

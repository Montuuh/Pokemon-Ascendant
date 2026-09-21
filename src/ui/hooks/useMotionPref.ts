import { useReducedMotion } from 'motion/react';
import { useSettingsStore } from '@/app/settingsStore';

/**
 * §9.6 — may the UI animate? The Settings override wins over the OS preference, exactly as `motion.css` does
 * for the CSS side: "reduced" is off, "full" is on, "system" defers to `prefers-reduced-motion`. Components
 * built on `motion` read this so a player who turned motion off gets a still page, not a slower one.
 */
export function useMotionPref(): boolean {
  const setting = useSettingsStore((s) => s.motion);
  const prefersReduced = useReducedMotion();
  if (setting === 'reduced') return false;
  if (setting === 'full') return true;
  return !prefersReduced;
}

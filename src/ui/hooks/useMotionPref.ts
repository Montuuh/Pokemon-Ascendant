import { useSyncExternalStore } from 'react';
import { useSettingsStore } from '@/app/settingsStore';

const query = '(prefers-reduced-motion: reduce)';
const systemReduced = () => window.matchMedia(query).matches;
const serverReduced = () => true;
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

/**
 * §9.6 — may the UI animate? The Settings override wins over the OS preference, exactly as `motion.css` does
 * for the CSS side: "reduced" is off, "full" is on, "system" defers to `prefers-reduced-motion`. Components
 * built on `motion` read this so a player who turned motion off gets a still page, not a slower one.
 */
export function useMotionPref(): boolean {
  const setting = useSettingsStore((s) => s.motion);
  // Subscribe directly: motion's hook snapshots the OS preference only on mount.
  const prefersReduced = useSyncExternalStore(subscribe, systemReduced, serverReduced);
  if (setting === 'reduced') return false;
  if (setting === 'full') return true;
  return !prefersReduced;
}

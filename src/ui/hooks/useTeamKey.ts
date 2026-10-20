import { useEffect } from 'react';

/**
 * §2.3 / §9.12 — the T key opens the Team screen (and Escape, inside it, closes it). Off while another sheet is up, and
 * never from a field being typed in.
 */
export function useTeamKey(open: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 't' && e.key !== 'T') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      e.preventDefault();
      open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, enabled]);
}

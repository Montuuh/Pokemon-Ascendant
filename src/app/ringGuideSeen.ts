import { RING_GUIDE_SEEN_KEY } from './storageKeys';

// §2.9.4.1 — the Ring's How to play opens by itself the first time this browser walks into a Ring. A per-browser
// convenience, so plain localStorage, and blocked storage reads as "seen" rather than opening it every visit.

export function ringGuideSeen(): boolean {
  try {
    return window.localStorage.getItem(RING_GUIDE_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export function markRingGuideSeen(): void {
  try {
    window.localStorage.setItem(RING_GUIDE_SEEN_KEY, '1');
  } catch {
    // Blocked storage: nothing to remember it in.
  }
}

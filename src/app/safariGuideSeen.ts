import { SAFARI_GUIDE_SEEN_KEY } from './storageKeys';

// §2.11.6 — the Safari's How to play opens by itself the first time this browser walks into the park. A per-browser
// convenience, so plain localStorage, and blocked storage reads as "seen" rather than opening it every visit.

export function safariGuideSeen(): boolean {
  try {
    return window.localStorage.getItem(SAFARI_GUIDE_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export function markSafariGuideSeen(): void {
  try {
    window.localStorage.setItem(SAFARI_GUIDE_SEEN_KEY, '1');
  } catch {
    // Blocked storage: nothing to remember it in.
  }
}

import { APP_VERSION } from '@/content/roadmap';
import { CHANGELOG_SEEN_KEY } from './storageKeys';

// The main menu's unread dot on What's new (docs/release-doctrine.md). "Read" means this browser opened the page
// while the build was this version: every change ships as a version, so a new version is what lights the dot.
//
// A per-browser convenience, so plain localStorage, and every access degrades to "read" rather than nagging a
// player whose storage is blocked.

export const CHANGELOG_STAMP = APP_VERSION;

export function changelogUnread(): boolean {
  try {
    return window.localStorage.getItem(CHANGELOG_SEEN_KEY) !== CHANGELOG_STAMP;
  } catch {
    return false;
  }
}

export function markChangelogRead(): void {
  try {
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, CHANGELOG_STAMP);
  } catch {
    // Blocked storage: the dot comes back next visit, which is the honest outcome.
  }
}

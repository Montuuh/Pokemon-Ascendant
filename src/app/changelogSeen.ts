import { CHANGELOG } from '@/content/changelog';
import { APP_VERSION } from '@/content/roadmap';
import { CHANGELOG_SEEN_KEY } from './storageKeys';

// The main menu's unread dot on What's new (docs/release-doctrine.md). "Read" means this browser opened the page
// while the build was this version *and* the changelog's Next block said the same thing — so a new version lights
// the dot, and so does a Next bullet that reached the live build between versions, even one that replaced another.
//
// A per-browser convenience, so plain localStorage, and every access degrades to "read" rather than nagging a
// player whose storage is blocked.

/** FNV-1a over the Next headlines: short, stable, and different whenever a bullet is added, dropped or swapped. */
function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export const CHANGELOG_STAMP = `${APP_VERSION}+${fingerprint((CHANGELOG.next ?? []).map((i) => i.title).join('|'))}`;

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

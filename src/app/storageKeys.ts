// Where the browser-side state lives, and the one-way move that happened when the project was renamed.
//
// The keys were prefixed `evoline.` until 2026-09-20. Renaming them outright would have orphaned every save
// and every medal on every machine that had ever run the game — silently, because localStorage does not
// complain about a key nobody asks for. So each key carries its predecessor and is claimed on first read.
//
// **The old prefix below is load-bearing data, not a stale name.** A project-wide rename pass flattened this
// table once already, mapping every key to itself and quietly turning the migration into a no-op; nothing
// failed, because a migration that does nothing looks exactly like a migration with nothing to do.
// `storageKeys.test.ts` exists to make that failure loud.

const LEGACY_PREFIX = 'evoline.';
const PREFIX = 'ascendant.';

export const RUN_SAVE_KEY = `${PREFIX}run.v2`;
export const ACHIEVEMENTS_KEY = `${PREFIX}achievements.v1`;
export const SETTINGS_KEY = `${PREFIX}settings.v1`;

/** Every key this app owns, so the test can walk them rather than trusting a hand-kept list. */
export const ALL_KEYS = [RUN_SAVE_KEY, ACHIEVEMENTS_KEY, SETTINGS_KEY] as const;

/**
 * The pre-rename name of a key.
 *
 * Derived rather than tabulated: only the prefix changed, so writing each pair out by hand would be two
 * chances to disagree instead of one rule. Returns null for a key that never had a predecessor.
 */
export function legacyKeyFor(key: string): string | null {
  return key.startsWith(PREFIX) ? LEGACY_PREFIX + key.slice(PREFIX.length) : null;
}

/**
 * Move a pre-rename value onto its new key, once.
 *
 * Idempotent and safe to call on every load: it does nothing if the new key already holds something, so a
 * value written since the rename is never overwritten by a stale one. The old key is removed on success, so
 * the second call has nothing to find.
 *
 * Every access is wrapped because private browsing and blocked storage must degrade to "no save", never
 * throw — the same rule the save provider follows.
 */
export function claimLegacyKey(key: string): void {
  const legacy = legacyKeyFor(key);
  if (!legacy) return;
  try {
    if (typeof window === 'undefined') return;
    const store = window.localStorage;
    if (store.getItem(key) !== null) return;
    const carried = store.getItem(legacy);
    if (carried === null) return;
    store.setItem(key, carried);
    store.removeItem(legacy);
  } catch {
    // Blocked or full storage: the old value stays where it is and nothing is lost that was not already.
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_KEYS, ACHIEVEMENTS_KEY, claimLegacyKey, legacyKeyFor, RUN_SAVE_KEY } from './storageKeys';

// The rename migration, and the reason it has a test at all.
//
// A project-wide find-and-replace flattened the old key names onto the new ones during the 2026-09-20
// rename. Nothing failed: a migration that maps a key to itself behaves exactly like a migration with
// nothing left to migrate. It would have shipped, and every player's saves and medals would have vanished
// on update with no error anywhere. These assertions are the noise that was missing.

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

let store: Storage;

beforeEach(() => {
  store = fakeStorage();
  vi.stubGlobal('window', { localStorage: store });
});

describe('Storage keys and the rename migration', () => {
  it('EveryKeyHasAPredecessor_AndItIsNotItself', () => {
    // The assertion that would have caught the flattening.
    for (const key of ALL_KEYS) {
      const legacy = legacyKeyFor(key);
      expect(legacy, key).not.toBeNull();
      expect(legacy, `${key} is its own predecessor — the migration is a no-op`).not.toBe(key);
      expect(legacy!.startsWith('evoline.'), `${key} predecessor "${legacy}"`).toBe(true);
    }
    // And the new names really are the new names.
    for (const key of ALL_KEYS) expect(key.startsWith('ascendant.'), key).toBe(true);
  });

  it('APreRenameValue_IsCarriedOntoTheNewKey_AndTheOldOneIsCleared', () => {
    store.setItem('evoline.run.v2', '{"run":"mine"}');
    claimLegacyKey(RUN_SAVE_KEY);
    expect(store.getItem(RUN_SAVE_KEY)).toBe('{"run":"mine"}');
    expect(store.getItem('evoline.run.v2')).toBeNull();
  });

  it('AValueWrittenSinceTheRename_IsNeverOverwrittenByAStaleOne', () => {
    store.setItem('evoline.achievements.v1', 'old');
    store.setItem(ACHIEVEMENTS_KEY, 'current');
    claimLegacyKey(ACHIEVEMENTS_KEY);
    expect(store.getItem(ACHIEVEMENTS_KEY)).toBe('current');
  });

  it('ItIsIdempotent_AndDoesNothingWhenThereIsNothingToCarry', () => {
    claimLegacyKey(RUN_SAVE_KEY);
    expect(store.getItem(RUN_SAVE_KEY)).toBeNull();

    store.setItem('evoline.run.v2', 'once');
    claimLegacyKey(RUN_SAVE_KEY);
    claimLegacyKey(RUN_SAVE_KEY);
    expect(store.getItem(RUN_SAVE_KEY)).toBe('once');
  });

  it('BlockedStorage_DegradesToNothing_RatherThanThrowing', () => {
    // Private browsing throws on access rather than returning null. A rename must not be the thing that
    // takes the game down on a locked-down browser.
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(() => claimLegacyKey(RUN_SAVE_KEY)).not.toThrow();
  });
});

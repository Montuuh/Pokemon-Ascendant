import type { SaveProvider } from '@/sim';
import { claimLegacyKey, RUN_SAVE_KEY } from './storageKeys';

// §10.8.2 — where a save lives is the app's business, not the simulation's. The sim hands us a string; this
// file decides it goes in localStorage. A server-backed profile later swaps this one implementation.

export const SAVE_KEY = RUN_SAVE_KEY;

/** localStorage, defensively. Private browsing and disabled storage must degrade to "no save", never throw. */
export function localSaveProvider(key = SAVE_KEY): SaveProvider {
  const store = (): Storage | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  };
  // The project was renamed after this key was already on players' machines; a save written under the old
  // name is carried over on the first read rather than lost (see storageKeys.ts).
  claimLegacyKey(key);
  return {
    read: () => {
      try {
        return store()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    write: (data) => {
      try {
        store()?.setItem(key, data);
      } catch {
        /* quota or blocked storage: the run simply is not resumable */
      }
    },
    clear: () => {
      try {
        store()?.removeItem(key);
      } catch {
        /* nothing to do */
      }
    },
  };
}

/** An in-memory provider for tests and for the headless harness. */
export function memorySaveProvider(): SaveProvider {
  let data: string | null = null;
  return {
    read: () => data,
    write: (next) => {
      data = next;
    },
    clear: () => {
      data = null;
    },
  };
}

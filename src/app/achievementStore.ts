import { create } from 'zustand';
import {
  applyMetaEvents,
  emptyProgress,
  metaEventsFor,
  type AchievementDef,
  type AchievementProgress,
  type CombatOutcomeReport,
  type MetaEvent,
  type RunState,
} from '@/sim';
import { getContent } from '@/content/registry';
import { ACHIEVEMENTS_KEY, claimLegacyKey } from './storageKeys';

// §8.7 — the account's achievement record, and the only place it is persisted.
//
// It lives beside the run save rather than inside it, and the difference matters: a run save is one run and
// is deleted when that run ends (§10.8), while this survives every run and is the point of playing more than
// one. Abandoning a run must never cost you a medal.

const KEY = ACHIEVEMENTS_KEY;

function load(): AchievementProgress {
  claimLegacyKey(KEY);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<AchievementProgress>;
    // Defensive rather than schema-validated on purpose: a corrupt medal list should cost you the medals,
    // not the ability to start the game. Every field falls back to its empty value on its own.
    return {
      counts: typeof parsed.counts === 'object' && parsed.counts ? parsed.counts : {},
      species: Array.isArray(parsed.species) ? parsed.species : [],
      winStreak: typeof parsed.winStreak === 'number' ? parsed.winStreak : 0,
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
    };
  } catch {
    return emptyProgress();
  }
}

function persist(progress: AchievementProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // A full or blocked storage quota is not worth interrupting a run for.
  }
}

interface AchievementStore {
  progress: AchievementProgress;
  /** Rows completed since the player last looked, so the UI can announce them once. */
  fresh: AchievementDef[];
  /** Fold whatever the run just did into the record. Safe to call on every dispatch. */
  observe: (before: RunState | null, after: RunState | null, report?: CombatOutcomeReport) => void;
  /** Fold events directly — used by the dev hook and the tests. */
  record: (events: readonly MetaEvent[]) => void;
  acknowledge: () => void;
  reset: () => void;
}

export const useAchievementStore = create<AchievementStore>((set, get) => ({
  progress: load(),
  fresh: [],

  observe: (before, after, report) => {
    if (!before || !after) return;
    const events = metaEventsFor(before, after, getContent(), report);
    if (events.length === 0) return;
    get().record(events);
  },

  record: (events) => {
    const { progress, unlocked } = applyMetaEvents(get().progress, events);
    persist(progress);
    set({ progress, fresh: unlocked.length ? [...get().fresh, ...unlocked] : get().fresh });
  },

  acknowledge: () => set({ fresh: [] }),

  reset: () => {
    const progress = emptyProgress();
    persist(progress);
    set({ progress, fresh: [] });
  },
}));

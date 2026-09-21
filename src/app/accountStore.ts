import { create } from 'zustand';
import {
  accountContextFor,
  accountFromProgress,
  applyAccountEvents,
  buy as buyItem,
  emptyAccount,
  emptyDelta,
  levelFor,
  metaEventsFor,
  modifierXpMultiplier,
  normalizeDexEntry,
  upgradeAccount,
  wear as wearItem,
  type AccountDelta,
  type AccountState,
  type AchievementDef,
  type AchievementProgress,
  type CombatOutcomeReport,
  type CosmeticKind,
  type DexEntry,
  type LegacyAccountFields,
  type MartError,
  type MartItem,
  type MetaEvent,
  type RunState,
} from '@/sim';
import { getContent } from '@/content/registry';
import { ACCOUNT_KEY, ACHIEVEMENTS_KEY, claimLegacyKey } from './storageKeys';

// §8.10 — the account, and the only place it is persisted.
//
// It lives beside the run save rather than inside it, and the difference matters: a run save is one run and
// is deleted when that run ends (§10.8), while this survives every run and is the point of playing more than
// one. Abandoning a run must never cost you a level.
//
// Canon says the account is written at run end and on every Poké Mart purchase. A browser tab is not a
// console: it is closed mid-run without ceremony, so this writes after every fold instead. The fold is
// idempotent through `claimedLevels`, the medal list and the discovery list, so an extra write costs nothing.

/** What one run has earned so far, kept beside the account so a reload mid-run does not forget the summary. */
interface Ledger extends AccountDelta {
  /** The level the run started at, so the summary can say "Level 3 → 5" rather than list every step. */
  levelAtStart: number;
  xpAtStart: number;
}

interface Persisted {
  account: AccountState;
  ledger: Ledger;
}

const emptyLedger = (account: AccountState): Ledger => ({ ...emptyDelta(), levelAtStart: levelFor(account.xp), xpAtStart: account.xp });

function isProgress(v: unknown): v is AchievementProgress {
  return !!v && typeof v === 'object' && Array.isArray((v as AchievementProgress).unlocked);
}

function load(): Persisted {
  claimLegacyKey(ACHIEVEMENTS_KEY);
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>;
      // Defensive rather than schema-validated on purpose: a corrupt field should cost you that field, not
      // the ability to start the game. Every top-level field falls back to its empty value on its own.
      const base = emptyAccount();
      const a = (parsed.account ?? {}) as Partial<AccountState> & LegacyAccountFields;
      const loaded: AccountState & LegacyAccountFields = {
        ...base,
        ...a,
        version: typeof a.version === 'number' ? a.version : 1,
        achievements: isProgress(a.achievements) ? a.achievements : base.achievements,
        stats: { ...base.stats, ...(a.stats ?? {}) },
        // §8.9 — an entry saved before a record field existed is made whole, so the sheet never reads undefined.
        dex: a.dex && typeof a.dex === 'object' ? Object.fromEntries(Object.entries(a.dex).map(([id, e]) => [id, normalizeDexEntry(e as Partial<DexEntry>)])) : {},
        bond: a.bond && typeof a.bond === 'object' ? a.bond : bondFromMastery((a as { mastery?: Record<string, number> }).mastery),
        cosmetics: Array.isArray(a.cosmetics) ? a.cosmetics : [],
        wearing: a.wearing && typeof a.wearing === 'object' ? a.wearing : {},
        counters: a.counters && typeof a.counters === 'object' ? a.counters : {},
      };
      // v1 → v2: the track pays every level now and the Mart sells; `upgradeAccount` back-pays and re-keys the titles.
      const account = upgradeAccount(loaded);
      // v0.6.0 Pokédex tiers went to Master (3); §5.13 has only Familiar since 2026-09-21. Clamp, keep the count.
      for (const e of Object.values(account.dex)) if (e.tier > 1) e.tier = 1;
      const ledger = parsed.ledger && typeof parsed.ledger === 'object' ? { ...emptyLedger(account), ...parsed.ledger } : emptyLedger(account);
      return { account, ledger };
    }
    // v0.5 kept only the medal case. It becomes the first account, paid what those medals were worth.
    const legacy = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (legacy) {
      const progress = JSON.parse(legacy) as unknown;
      const account = isProgress(progress) ? accountFromProgress(progress, accountContextFor(getContent())) : emptyAccount();
      const out = { account, ledger: emptyLedger(account) };
      persist(out);
      localStorage.removeItem(ACHIEVEMENTS_KEY);
      return out;
    }
  } catch {
    /* fall through to a fresh account */
  }
  const account = emptyAccount();
  return { account, ledger: emptyLedger(account) };
}

function persist(p: Persisted): void {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(p));
  } catch {
    // A full or blocked storage quota is not worth interrupting a run for.
  }
}

/**
 * v0.6.0 kept a Mastery tier per line, earned by §6.8.1's triggers. Bond (§6.8, 2026-09-21) replaces it; a
 * tier already earned lands at the first rank that grants the same thing, so nobody loses a fifth card.
 */
function bondFromMastery(mastery: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [line, tier] of Object.entries(mastery ?? {})) out[line] = tier >= 3 ? 100 : tier === 2 ? 60 : tier === 1 ? 5 : 0;
  return out;
}

function addTo(ledger: Ledger, d: AccountDelta): Ledger {
  return {
    ...ledger,
    xp: ledger.xp + d.xp,
    tokens: ledger.tokens + d.tokens,
    levelsGained: [...ledger.levelsGained, ...d.levelsGained],
    rewards: [...ledger.rewards, ...d.rewards],
    unlockedAchievements: [...ledger.unlockedAchievements, ...d.unlockedAchievements],
    dexPromotions: [...ledger.dexPromotions, ...d.dexPromotions],
    bondGains: [...ledger.bondGains, ...d.bondGains],
    bondRankUps: [...ledger.bondRankUps, ...d.bondRankUps],
    discoveredRelics: [...ledger.discoveredRelics, ...d.discoveredRelics],
  };
}

interface AccountStore {
  account: AccountState;
  /** Everything the current (or just-finished) run has earned. Reset when a new run starts. */
  ledger: Ledger;
  /** Rows completed since the player last looked, so the UI can announce them once. */
  fresh: AchievementDef[];
  /** Fold whatever the run just did into the account. Safe to call on every dispatch. */
  observe: (before: RunState | null, after: RunState | null, report?: CombatOutcomeReport) => void;
  /** Fold events directly — used by the dev hook and the tests. `xpMultiplier` defaults to 1. */
  record: (events: readonly MetaEvent[], xpMultiplier?: number) => AccountDelta;
  /** §8.3.4 — the Poké Mart. Returns the reason it did not happen, or null on success. */
  buy: (item: MartItem) => MartError | null;
  /** §8.4.4 — wear an owned cosmetic, or none of that kind. */
  wear: (kind: CosmeticKind, id: string | null) => void;
  /** A new run opens a new ledger. */
  beginRun: () => void;
  acknowledge: () => void;
  reset: () => void;
}

const initial = load();

export const useAccountStore = create<AccountStore>((set, get) => ({
  account: initial.account,
  ledger: initial.ledger,
  fresh: [],

  observe: (before, after, report) => {
    if (!before || !after) return;
    const events = metaEventsFor(before, after, getContent(), report);
    if (events.length === 0) return;
    // §8.8.3 — the run's difficulty multiplier rides on every XP the run earns.
    get().record(events, modifierXpMultiplier(after.modifiers));
  },

  record: (events, xpMultiplier = 1) => {
    const { state, delta } = applyAccountEvents(get().account, events, accountContextFor(getContent(), xpMultiplier));
    const ledger = addTo(get().ledger, delta);
    persist({ account: state, ledger });
    set({ account: state, ledger, fresh: delta.unlockedAchievements.length ? [...get().fresh, ...delta.unlockedAchievements] : get().fresh });
    return delta;
  },

  buy: (item) => {
    const result = buyItem(get().account, item, getContent());
    if ('error' in result) return result.error;
    persist({ account: result.state, ledger: get().ledger });
    set({ account: result.state });
    return null;
  },

  wear: (kind, id) => {
    const account = wearItem(get().account, kind, id);
    if (account === get().account) return;
    persist({ account, ledger: get().ledger });
    set({ account });
  },

  beginRun: () => {
    const ledger = emptyLedger(get().account);
    persist({ account: get().account, ledger });
    set({ ledger });
  },

  acknowledge: () => set({ fresh: [] }),

  reset: () => {
    const account = emptyAccount();
    const ledger = emptyLedger(account);
    persist({ account, ledger });
    set({ account, ledger, fresh: [] });
  },
}));

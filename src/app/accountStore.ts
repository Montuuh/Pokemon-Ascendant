import { create } from 'zustand';
import {
  ACCOUNT_VERSION,
  accountContextFor,
  applyAccountEvents,
  buy as buyItem,
  emptyAccount,
  emptyDelta,
  levelFor,
  mergeDelta,
  packKit,
  pinEntry,
  takeParcel,
  metaEventsFor,
  modifierXpMultiplier,
  normalizeDexEntry,
  progressNotes,
  type ProgressNote,
  wear as wearItem,
  type AccountDelta,
  type AccountState,
  type AchievementDef,
  type AchievementProgress,
  type CombatOutcomeReport,
  type CosmeticKind,
  type DexEntry,
  type HubUpgrade,
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
// one. Abandoning a run must never cost you a rank.
//
// Canon says the account is written at run end and on every Poké Mart purchase. A browser tab is not a
// console: it is closed mid-run without ceremony, so this writes after every fold instead. The fold is
// idempotent through `claimedLevels`, the medal list and the notes, so an extra write costs nothing.

/** What one run has earned so far, kept beside the account so a reload mid-run does not forget the Field Report. */
export interface Ledger extends AccountDelta {
  /** The rank the run started at, so the report can say "Rank 3 → 4" rather than list every step. */
  levelAtStart: number;
  xpAtStart: number;
  /** §8.3.6 — where the Research bar and each line's Bond stood when the run began: the bars fill *from* here. */
  researchAtStart: number;
  parcelsEarnedAtStart: number;
  bondAtStart: Record<string, number>;
}

interface Persisted {
  account: AccountState;
  ledger: Ledger;
}

const emptyLedger = (account: AccountState): Ledger => ({
  ...emptyDelta(),
  levelAtStart: levelFor(account.xp),
  xpAtStart: account.xp,
  researchAtStart: account.research,
  parcelsEarnedAtStart: account.parcelsEarned,
  bondAtStart: { ...account.bond },
});

/** §8.6.2 — what makes an account's parcels its own. The app's to roll: the sim reads no dice of its own. */
const newSalt = (): number => Math.floor(Math.random() * 0x7fffffff) + 1;

function isProgress(v: unknown): v is AchievementProgress {
  return !!v && typeof v === 'object' && Array.isArray((v as AchievementProgress).unlocked);
}

const list = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
const record = <T,>(v: unknown, fallback: Record<string, T>): Record<string, T> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : fallback);

function load(): Persisted {
  claimLegacyKey(ACHIEVEMENTS_KEY);
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>;
      const a = (parsed.account ?? {}) as Partial<AccountState>;
      // §8.10 — v0.9.110 is a reset (the user's call): an account from before the rework starts again.
      if (typeof a.version === 'number' && a.version >= ACCOUNT_VERSION) {
        // Defensive rather than schema-validated on purpose: a corrupt field should cost you that field, not
        // the ability to start the game. Every top-level field falls back to its empty value on its own.
        const base = emptyAccount(typeof a.salt === 'number' && a.salt > 0 ? a.salt : newSalt());
        const account: AccountState = {
          ...base,
          ...a,
          salt: base.salt,
          achievements: isProgress(a.achievements) ? a.achievements : base.achievements,
          stats: { ...base.stats, ...(a.stats ?? {}) },
          // §8.9 — an entry saved before a record field existed is made whole, so the sheet never reads undefined.
          dex: Object.fromEntries(Object.entries(record<Partial<DexEntry>>(a.dex, {})).map(([id, e]) => [id, normalizeDexEntry(e)])),
          bond: record(a.bond, {}),
          ribbons: record(a.ribbons, {}),
          counters: record(a.counters, {}),
          wearing: record(a.wearing, {}) as AccountState['wearing'],
          unlocks: list(a.unlocks, []),
          claimedLevels: list(a.claimedLevels, []),
          starters: list(a.starters, []),
          hub: list(a.hub, []),
          kit: list(a.kit, []),
          cosmetics: list(a.cosmetics, []),
          badges: list(a.badges, []),
          hall: list(a.hall, []),
          notes: list(a.notes, []),
          pins: list(a.pins, []),
          aides: list(a.aides, []),
        };
        const ledger = parsed.ledger && typeof parsed.ledger === 'object' ? { ...emptyLedger(account), ...parsed.ledger } : emptyLedger(account);
        return { account, ledger };
      }
    }
    // v0.5's medal case predates the account; it goes with the reset.
    localStorage.removeItem(ACHIEVEMENTS_KEY);
  } catch {
    /* fall through to a fresh account */
  }
  const account = emptyAccount(newSalt());
  const out = { account, ledger: emptyLedger(account) };
  persist(out);
  return out;
}

function persist(p: Persisted): void {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(p));
  } catch {
    // A full or blocked storage quota is not worth interrupting a run for.
  }
}

const addTo = (ledger: Ledger, d: AccountDelta): Ledger => ({ ...ledger, ...mergeDelta(ledger, d) });

interface AccountStore {
  account: AccountState;
  /** Everything the current (or just-finished) run has earned. Reset when a new run starts. */
  ledger: Ledger;
  /** Rows completed since the player last looked, so the UI can announce them once. */
  fresh: AchievementDef[];
  /** §6.8.1 — what the last fight paid each line, for its result's progress door (§9.4.5). Not persisted: it is the moment's. */
  lastBond: { line: string; points: number; rankUps: number[] }[];
  /** §8.7 — what the last fight moved in the Journal, for its result's progress door. */
  lastProgress: ProgressNote[];
  /** The same notes from every fold, waiting for the progress panel (v0.9.6). Not persisted: they are the moment's. */
  toasts: (ProgressNote & { key: number })[];
  dismissToast: (key: number) => void;
  /** Fold whatever the run just did into the account. Safe to call on every dispatch. */
  observe: (before: RunState | null, after: RunState | null, report?: CombatOutcomeReport) => void;
  /** Fold events directly — used by the dev hook and the tests. `xpMultiplier` defaults to 1. */
  record: (events: readonly MetaEvent[], xpMultiplier?: number) => AccountDelta;
  /** §8.3.4 — the Poké Mart. Returns the reason it did not happen, or null on success. */
  buy: (item: MartItem) => MartError | null;
  /** §8.4.4 — wear an owned cosmetic, or none of that kind. */
  wear: (kind: CosmeticKind, id: string | null) => void;
  /** §8.6.2 — open one Oak's Parcel by taking a card from its offer. */
  openParcel: (entryId: string) => void;
  /** §8.4.5 — pack or unpack a Kit perk. */
  pack: (perk: HubUpgrade, on: boolean) => void;
  /** §8.7.2 — pin or unpin a Journal entry. */
  pin: (id: string, on: boolean) => void;
  /** Replace the account outright — the dev hook and the tests set a rank or a wallet this way. */
  replace: (account: AccountState) => void;
  /** A new run opens a new ledger. */
  beginRun: () => void;
  acknowledge: () => void;
  reset: () => void;
}

const initial = load();
let toastSerial = 0;

export const useAccountStore = create<AccountStore>((set, get) => {
  /** Swap in an account a pure function returned, if it changed anything. */
  const commit = (account: AccountState): void => {
    if (account === get().account) return;
    persist({ account, ledger: get().ledger });
    set({ account });
  };

  return {
    account: initial.account,
    ledger: initial.ledger,
    fresh: [],
    lastBond: [],
    lastProgress: [],
    toasts: [],

    observe: (before, after, report) => {
      if (!before || !after) return;
      const events = metaEventsFor(before, after, getContent(), report);
      if (events.length === 0) return;
      // §8.8.3 — the run's difficulty multiplier rides on every XP the run earns.
      get().record(events, modifierXpMultiplier(after.modifiers));
    },

    record: (events, xpMultiplier = 1) => {
      const before = get().account;
      const { state, delta } = applyAccountEvents(before, events, accountContextFor(getContent(), xpMultiplier));
      const notes = progressNotes(before, state, getContent());
      const ledger = addTo(get().ledger, delta);
      persist({ account: state, ledger });
      // §6.8.1 — a fight's Bond is its result's to show; any other fold that paid none leaves it standing.
      const byLine = new Map<string, { line: string; points: number; rankUps: number[] }>();
      for (const g of delta.bondGains) byLine.set(g.line, { line: g.line, points: (byLine.get(g.line)?.points ?? 0) + g.points, rankUps: byLine.get(g.line)?.rankUps ?? [] });
      for (const r of delta.bondRankUps) byLine.get(r.line)?.rankUps.push(r.rank);
      const fight = events.some((e) => e.t === 'combat-end');
      set({
        account: state,
        ledger,
        fresh: delta.unlockedAchievements.length ? [...get().fresh, ...delta.unlockedAchievements] : get().fresh,
        ...(fight ? { lastBond: [...byLine.values()], lastProgress: notes } : {}),
        // A fight's notes are listed behind its result's door; the panel carries what moved anywhere else.
        toasts: notes.length && !fight ? [...get().toasts, ...notes.map((n) => ({ ...n, key: ++toastSerial }))] : get().toasts,
      });
      return delta;
    },

    buy: (item) => {
      const result = buyItem(get().account, item, getContent());
      if ('error' in result) return result.error;
      commit(result.state);
      return null;
    },

    wear: (kind, id) => commit(wearItem(get().account, kind, id)),
    openParcel: (entryId) => commit(takeParcel(get().account, entryId)),
    pack: (perk, on) => commit(packKit(get().account, perk, on)),
    pin: (id, on) => commit(pinEntry(get().account, id, on)),
    replace: (account) => commit(account),

    beginRun: () => {
      const ledger = emptyLedger(get().account);
      persist({ account: get().account, ledger });
      set({ ledger });
    },

    acknowledge: () => set({ fresh: [] }),

    dismissToast: (key) => set({ toasts: get().toasts.filter((t) => t.key !== key) }),

    reset: () => {
      const account = emptyAccount(newSalt());
      const ledger = emptyLedger(account);
      persist({ account, ledger });
      set({ account, ledger, fresh: [] });
    },
  };
});

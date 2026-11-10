import type { ContentRegistry } from '../content/defs';
import { ACHIEVEMENTS, applyMetaEvent, emptyProgress, MEDAL_XP, type AchievementDef, type AchievementProgress, type HallTeamMember, type MetaEvent } from './achievements';
import { dexTierFor, DEX_TIER_XP, emptyDexEntry, type DexEntry, type DexTier, isMet } from './pokedex';
import { BOND, bondRank, type RibbonId } from './bond';
import { cosmeticById, type CosmeticKind } from './cosmetics';
import { MAX_RANK, rankFor, rankProgress, rankRow, xpForRank, kitSlotsFor } from './rank';
import { PARCEL, parcelCost, parcelPool, vaultEntry, vaultEntryFor, VAULT } from './vault';
import { journalReward, type JournalReward } from './journal';
import { LADDER_PRIZE, LADDER_TOP } from './ladder';

// §8.3–§8.10, §8.14, §8.15 — the account: everything that outlives a run.
//
// Trainer XP and the Rank it drives, the Research that fills Oak's Parcels, the Tokens the Mart takes, what the
// vault has opened, the Kit, the Pokédex, the Bond and its Ribbons, the Journal, the Badge Case, the League Ladder
// and the Hall of Fame. §8.10 says it is one save; this is that save's shape.
//
// The same discipline as the run: a pure state and a pure fold over events. `RunState` is diffed into
// `MetaEvent`s by the run layer (see achievements.ts — nothing account-side ever lives inside a save that has
// to replay identically), and `applyAccountEvent` folds each one in. The app layer persists the result. The
// spending side — the shelves, the prices, `buy` — is mart.ts; opening a parcel is `takeParcel`, below.

/**
 * 4 since v0.9.110, the meta-progression rework: **an older account is reset** (the user's call, 2026-11-10 — "yo
 * haría reset"). The game is a Beta, the vault changes what a first run holds, and a save that kept everything open
 * would never see the new road.
 */
export const ACCOUNT_VERSION = 4;

export interface LifetimeStats {
  runs: number;
  wins: number;
  losses: number;
  combatsWon: number;
  recruits: number;
  evolutions: number;
  catches: number;
  /** Turns each species has spent as Lead, for the Trainer Card's "favourite Lead" (§8.4.3). */
  leadTurns: Record<string, number>;
  /** The highest count of difficulty modifiers a won run carried (§8.4.3 "highest difficulty cleared"). */
  hardestWin: number;
}

/** §8.15 — one won run, as the Hall of Fame keeps it. */
export interface HallEntry {
  /** The account's run count when it was won: the Hall's date, since the sim reads no clock. */
  run: number;
  seed: number;
  starter: string;
  team: HallTeamMember[];
  badges: string[];
  relics: string[];
  /** §8.8.5 — the League Ladder rung it was won on; 0 for a baseline or custom run. */
  rung: number;
}

export interface AccountState {
  version: number;
  /** §8.3.1 — lifetime Trainer XP. Never spent; it drives the Rank. */
  xp: number;
  /** §8.3.4 — the XP the run in progress has earned, which its end turns into Tokens. Reset by `run-end`. */
  runXp: number;
  /** §8.6.2 — Research toward the next Oak's Parcel. Every XP is also a point of Research. */
  research: number;
  /** §8.6.2 — parcels earned and not yet opened. */
  parcels: number;
  parcelsEarned: number;
  parcelsOpened: number;
  /** §8.6.2 — what makes this account's parcels its own. Set once, by the app, when the account is made. */
  salt: number;
  /** §8.6.1 — the vault entries this account has opened (`meta/vault.ts` ids). */
  unlocks: string[];
  /** §8.3.4 — unspent Trainer Tokens. */
  tokens: number;
  /** Lifetime Tokens earned, so the card can say so even after they are spent. */
  tokensEarned: number;
  /** §8.3.5 — ranks whose purse has been paid. The fold is idempotent through this. */
  claimedLevels: number[];
  /** §8.5.2 — meta-starters bought at the Mart, by species id. The three defaults are never listed. */
  starters: string[];
  /** §8.4.2, §8.4.5 — services and Kit perks the account owns, bought at the Mart or handed over by Oak's aide. */
  hub: string[];
  /** §8.4.5 — the perks packed for the next run, at most as many as the rank has slots. */
  kit: string[];
  /** §8.4.4 — cosmetics owned, by id. */
  cosmetics: string[];
  /** §8.4.4 — the one cosmetic of each kind the card wears. Buying one wears it; the Corner can swap. */
  wearing: Partial<Record<CosmeticKind, string>>;
  /** §5.13 / §8.9 — the Pokédex, per species. */
  dex: Record<string, DexEntry>;
  /** §6.8 — Bond points per *line* (keyed by base species). `bondRank` turns them into ranks 0–6. */
  bond: Record<string, number>;
  /** §6.8.5 — the Ribbons each line wears. */
  ribbons: Record<string, RibbonId[]>;
  /** §8.14 — the Badge Case: every Badge ever won, in the order it was first won. */
  badges: string[];
  /** §8.8.5 — the highest League Ladder rung won. */
  ladder: number;
  /** §8.15 — the Hall of Fame, newest last. */
  hall: HallEntry[];
  achievements: AchievementProgress;
  /** §8.7.1 — Field Notes completed, by the relic that carries the deed. */
  notes: string[];
  /** §8.7.2 — up to three Journal entries the player is chasing. */
  pins: string[];
  /** §8.9.3 — the Pokédex milestones Oak's aide has paid, by their species count. */
  aides: number[];
  stats: LifetimeStats;
  /** Running tallies the Field Notes read (§8.7.1). Keyed by the criterion id, flat so adding one is a data row. */
  counters: Record<string, number>;
}

export const emptyAccount = (salt = 1): AccountState => ({
  version: ACCOUNT_VERSION,
  xp: 0,
  runXp: 0,
  research: 0,
  parcels: 0,
  parcelsEarned: 0,
  parcelsOpened: 0,
  salt,
  unlocks: [],
  tokens: 0,
  tokensEarned: 0,
  claimedLevels: [],
  starters: [],
  hub: [],
  kit: [],
  cosmetics: [],
  wearing: {},
  dex: {},
  bond: {},
  ribbons: {},
  badges: [],
  ladder: 0,
  hall: [],
  achievements: emptyProgress(),
  notes: [],
  pins: [],
  aides: [],
  stats: { runs: 0, wins: 0, losses: 0, combatsWon: 0, recruits: 0, evolutions: 0, catches: 0, leadTurns: {}, hardestWin: 0 },
  counters: {},
});

// ── The Rank (§8.3.3) — the names the screens grew up with ───────────────────────────────────────────────

/** The Trainer Rank an XP total has reached (`meta/rank.ts`). Kept under its old name: every screen asks it. */
export const levelFor = rankFor;
export const levelProgress = rankProgress;
export const xpForLevel = xpForRank;
export const MAX_LEVEL = MAX_RANK;

// ── The shelves and the rank road (§8.3.5, §8.4.1) ───────────────────────────────────────────────────────

/** §8.4.1 — the Poké Mart's four shelves. The clerk arrives at Trainer (rank 3); the Kit shelf opens with the first slot. */
export type ShelfId = 'corner' | 'starters' | 'hub' | 'kit';

export const SHELF_ORDER: readonly ShelfId[] = ['starters', 'hub', 'kit', 'corner'];

/** §8.4.1 — what each shelf sells and the rank that opens it. */
export const SHELVES: Record<ShelfId, { name: string; level: number; sells: string }> = {
  starters: { name: 'Starters', level: 3, sells: 'Three more Pokémon to start a run with — each one a secret until you meet it.' },
  hub: { name: 'Services', level: 3, sells: 'A bigger Box, a second modifier slot, a second starter. Yours for every run, no slot needed.' },
  kit: { name: 'Trainer Kit', level: 4, sells: 'Perks you pack before a run: one slot at Challenger, two at Ace, three at Expert.' },
  corner: { name: "Trainer's Corner", level: 3, sells: 'Titles, avatars and frames for the card.' },
};

/** §8.3.5 — what a rank pays and opens. */
export interface TrackReward {
  tokens: number;
  /** The shelf this rank opens at the Poké Mart, when it opens one. */
  opens?: ShelfId;
  /** What the rank brings to the lobby, in the player's words. */
  arrives: string;
  why: string;
}

/** §8.3.5 — the rank road, one row per rank from 2 to 9. Derived from the rank table: it *is* that table, as rewards. */
export const REWARD_TRACK: Record<number, TrackReward> = Object.fromEntries(
  Array.from({ length: MAX_RANK - 1 }, (_, i) => i + 2).map((rank) => {
    const row = rankRow(rank);
    const opens = rank === 3 ? ('starters' as const) : rank === 4 ? ('kit' as const) : undefined;
    return [rank, { tokens: row.tokens, arrives: row.arrives, why: row.why, ...(opens ? { opens } : {}) }];
  }),
);

/** §8.3.5 — the Tokens the road pays from the rank after `from` up to and including `to`. */
export const trackTokensBetween = (from: number, to: number): number => {
  let sum = 0;
  for (let l = from + 1; l <= to; l++) sum += REWARD_TRACK[l]?.tokens ?? 0;
  return sum;
};

// ── Services and the Trainer Kit (§8.4.2, §8.4.5) ────────────────────────────────────────────────────────

/**
 * Everything the account can own that changes a run: three **services**, in force for every run once bought, and
 * ten **Kit perks**, in force only while packed in one of the rank's slots. The four oldest perks were Hub upgrades
 * until v0.9.110; the union kept its name because a save holds these ids.
 */
export type HubUpgrade =
  | 'expanded-box'
  | 'modifier-slot-plus-one'
  | 'twin-run'
  | 'starting-relic-plus-one'
  | 'pokedex-insight'
  | 'trauma-salve-cache'
  | 'apex-reveal'
  | 'moms-allowance'
  | 'first-aid-pouch'
  | 'tm-case'
  | 'ball-case'
  | 'exp-share'
  | 'head-start';

export interface HubUpgradeRow {
  name: string;
  effect: string;
  /** A service is always on; a perk needs a Kit slot. */
  kind: 'service' | 'perk';
  /** Sold at the Mart, or handed over by Oak's aide at a Pokédex milestone (§8.9.3). */
  from: 'mart' | 'aide';
  pending?: string;
}

/** §8.4.5 — the numbers a Kit perk hands a run. A tuning pass edits this table and nothing else. */
export const KIT = { allowance: 150, potions: 2, balls: 3, headStartLevels: 2, benchXpShare: 1 } as const;

export const HUB_UPGRADE_LABEL: Record<HubUpgrade, HubUpgradeRow> = {
  'expanded-box': { kind: 'service', from: 'mart', name: 'Expanded Box', effect: 'Box capacity 6 → 8 for every future run.' },
  'modifier-slot-plus-one': { kind: 'service', from: 'mart', name: 'Difficulty Modifier Slot +1', effect: 'Stack two difficulty modifiers on a custom run instead of one.' },
  'twin-run': { kind: 'service', from: 'mart', name: 'Second Starter Slot (Twin Run)', effect: 'Choose two starters; the Box starts one larger.' },
  'starting-relic-plus-one': { kind: 'perk', from: 'mart', name: 'Curated Starting Relic', effect: 'A run start offers four Starting Relics instead of three.' },
  'pokedex-insight': { kind: 'perk', from: 'mart', name: 'Pokédex Insight', effect: 'The first fight against a species you do not know yet reveals one intent free.' },
  'trauma-salve-cache': { kind: 'perk', from: 'mart', name: 'Trauma Salve Cache', effect: 'The first City shop always stocks a Trauma Salve.' },
  'apex-reveal': { kind: 'perk', from: 'mart', name: 'Apex Pokémon Reveal', effect: 'The Legendary waiting on Victory Road is named on entering Region 3.' },
  'moms-allowance': { kind: 'perk', from: 'mart', name: "Mom's Allowance", effect: `Start the run with ${KIT.allowance} ₽ more.` },
  'first-aid-pouch': { kind: 'perk', from: 'mart', name: 'First-Aid Pouch', effect: `Start the run with ${KIT.potions} more Potions.` },
  'tm-case': { kind: 'perk', from: 'mart', name: 'TM Case', effect: 'Start the run with one TM your starter can learn.' },
  'ball-case': { kind: 'perk', from: 'aide', name: 'Ball Case', effect: `Start the run with ${KIT.balls} more Poké Balls.` },
  'exp-share': { kind: 'perk', from: 'aide', name: 'Exp. Share', effect: 'The Box earns the whole of a fight\'s XP instead of three quarters.' },
  'head-start': { kind: 'perk', from: 'aide', name: 'Head Start', effect: `Your starter begins ${KIT.headStartLevels} levels higher.` },
};

export const isKitPerk = (u: HubUpgrade): boolean => HUB_UPGRADE_LABEL[u].kind === 'perk';

/** §8.4.5 — how many perks this account may pack. */
export const kitSlots = (state: AccountState): number => kitSlotsFor(rankFor(state.xp));

/**
 * Is this upgrade in force? A service once owned; a perk only while it is packed — and only in a slot the rank
 * really has, so a Kit saved at a higher rank cannot outgrow the account that loads it.
 */
export const hasHubUpgrade = (state: AccountState, upgrade: HubUpgrade): boolean => {
  const row = HUB_UPGRADE_LABEL[upgrade];
  if (!state.hub.includes(upgrade) || row.pending) return false;
  return row.kind === 'service' || state.kit.slice(0, kitSlots(state)).includes(upgrade);
};

/** §8.4.5 — pack or unpack a perk. Pure; an unowned perk, a service or a full Kit leaves the account as it was. */
export function packKit(state: AccountState, perk: HubUpgrade, on: boolean): AccountState {
  if (!state.hub.includes(perk) || !isKitPerk(perk)) return state;
  const has = state.kit.includes(perk);
  if (on === has) return state;
  if (on && state.kit.length >= kitSlots(state)) return state;
  const next = structuredClone(state);
  next.kit = on ? [...next.kit, perk] : next.kit.filter((p) => p !== perk);
  return next;
}

// ── XP and Token sources (§8.3.2, §8.3.4) ────────────────────────────────────────────────────────────────

/** §8.3.6 — the Field Report's lines: where a run's XP came from. */
export type ReportLine = 'fights' | 'recruits' | 'evolutions' | 'badges' | 'discoveries' | 'pokedex' | 'journal' | 'distance';
export const REPORT_LINES: readonly ReportLine[] = ['fights', 'recruits', 'evolutions', 'badges', 'discoveries', 'pokedex', 'journal', 'distance'];

export const XP = {
  combat: 5,
  recruit: 10,
  evolution: 15,
  gym: 50,
  /** §8.14 — the first time a Leader is beaten, on top of `gym`. */
  firstBadge: 100,
  /** §8.3.2 — a species the account had never met takes the field. */
  newSpecies: 5,
  /** §8.7.1 — a Field Note completed. */
  fieldNote: 25,
  failedRunPerLayer: 50,
  failedRunCap: 400,
} as const;

/**
 * §8.3.4 — where Tokens come from. A run's end pays one for every `perRunXp` XP the run earned, and one for every
 * `moneyPer` ₽ it ended with, at most `moneyCap`. Until v0.9.110 the income was ~2.3 a run against prices of 2–8;
 * it is ~20 in the first ten runs and ~14 after against prices of 6–70, so every run buys something small or moves
 * something big (`balance/accountCareer.test.ts`: at one Token for 50 XP the whole shop was paid off by run 21).
 */
export const TOKENS = { perRunXp: 80, moneyPer: 100, moneyCap: 10 } as const;

/** §8.3.4 — the Tokens a run's leftover ₽ is worth. */
export const tokensForMoney = (money: number): number => Math.min(TOKENS.moneyCap, Math.floor(Math.max(0, money) / TOKENS.moneyPer));

/** §8.9.3 — Oak's aide: what the Pokédex pays as it fills, by species owned. */
export interface AideRow {
  owned: number;
  parcels?: number;
  perk?: HubUpgrade;
  tokens?: number;
}
export const AIDES: readonly AideRow[] = [
  { owned: 10, parcels: 1 },
  { owned: 25, perk: 'ball-case' },
  { owned: 50, perk: 'exp-share' },
  { owned: 80, parcels: 2 },
  { owned: 110, perk: 'head-start' },
  { owned: 150, tokens: 50 },
];

/** §8.9.3 — species the account has owned: recruited, caught, or fought with (an evolved form counts once it fights). */
export const speciesOwned = (state: AccountState): number =>
  Object.values(state.dex).filter((e) => e.recruits > 0 || e.caught > 0 || e.winsWith > 0 || e.runsFinishedWith > 0).length;

// ── The fold ─────────────────────────────────────────────────────────────────────────────────────────────

/** What one event did to the account, for the Field Report and the toasts. */
export interface AccountDelta {
  xp: number;
  /** §8.3.6 — the same XP, by the Field Report's lines. */
  xpBy: Partial<Record<ReportLine, number>>;
  tokens: number;
  /** §8.3.4 — the Tokens the run's own XP became, at its end. */
  reportTokens: number;
  levelsGained: number[];
  rewards: { level: number; reward: TrackReward }[];
  unlockedAchievements: AchievementDef[];
  /** §8.7 — what each completed Journal entry paid. */
  journalRewards: { id: string; reward: JournalReward }[];
  dexPromotions: { speciesId: string; tier: DexTier }[];
  /** §6.8.1 — Bond points earned per line by this event. */
  bondGains: { line: string; points: number }[];
  /** §6.8.2 — ranks crossed by this event, in order. */
  bondRankUps: { line: string; rank: number }[];
  /** §6.8.5 — Ribbons first pinned by this event. */
  ribbons: { line: string; ribbon: RibbonId }[];
  /** §8.6.2 — Oak's Parcels earned. */
  parcels: number;
  /** §8.6.1 — vault entries opened outright: a Field Note's relic, a Leader's TM. */
  opened: string[];
  /** §8.7.1 — Field Notes completed, by relic id. */
  notes: string[];
  /** §8.14 — Badges won for the first time. */
  newBadges: string[];
  /** §8.9.3 — Pokédex milestones the aide paid. */
  aides: AideRow[];
  /** §8.8.5 — a League Ladder rung won for the first time. */
  ladderRung: number | null;
  /** §8.15 — the run went into the Hall of Fame. */
  hall: boolean;
  /** §8.3.4 — the run's leftover ₽ and the Tokens it became, at the run's end. */
  moneyTokens: { money: number; tokens: number }[];
}

export const emptyDelta = (): AccountDelta => ({
  xp: 0, xpBy: {}, tokens: 0, reportTokens: 0, levelsGained: [], rewards: [], unlockedAchievements: [], journalRewards: [], dexPromotions: [],
  bondGains: [], bondRankUps: [], ribbons: [], parcels: 0, opened: [], notes: [], newBadges: [], aides: [], ladderRung: null, hall: false, moneyTokens: [],
});

/** Add one delta into another: the app's ledger and `applyAccountEvents` both sum a run's events this way. */
export function mergeDelta(into: AccountDelta, d: AccountDelta): AccountDelta {
  const xpBy = { ...into.xpBy };
  for (const [line, n] of Object.entries(d.xpBy) as [ReportLine, number][]) xpBy[line] = (xpBy[line] ?? 0) + n;
  return {
    xp: into.xp + d.xp,
    xpBy,
    tokens: into.tokens + d.tokens,
    reportTokens: into.reportTokens + d.reportTokens,
    levelsGained: [...into.levelsGained, ...d.levelsGained],
    rewards: [...into.rewards, ...d.rewards],
    unlockedAchievements: [...into.unlockedAchievements, ...d.unlockedAchievements],
    journalRewards: [...into.journalRewards, ...d.journalRewards],
    dexPromotions: [...into.dexPromotions, ...d.dexPromotions],
    bondGains: [...into.bondGains, ...d.bondGains],
    bondRankUps: [...into.bondRankUps, ...d.bondRankUps],
    ribbons: [...into.ribbons, ...d.ribbons],
    parcels: into.parcels + d.parcels,
    opened: [...into.opened, ...d.opened],
    notes: [...into.notes, ...d.notes],
    newBadges: [...into.newBadges, ...d.newBadges],
    aides: [...into.aides, ...d.aides],
    ladderRung: d.ladderRung ?? into.ladderRung,
    hall: into.hall || d.hall,
    moneyTokens: [...into.moneyTokens, ...d.moneyTokens],
  };
}

export interface AccountContext {
  content: ContentRegistry;
  /** §8.8.3 — the run's difficulty multiplier, applied to every XP the run earns. 1 outside a run. */
  xpMultiplier: number;
}

function pay(next: AccountState, delta: AccountDelta, tokens: number): void {
  if (tokens <= 0) return;
  next.tokens += tokens;
  next.tokensEarned += tokens;
  delta.tokens += tokens;
}

/** §8.6.2 — hand over parcels; one earned with nothing left in the vault to hold is paid in Tokens instead. */
function grantParcels(next: AccountState, delta: AccountDelta, n: number): void {
  for (let i = 0; i < n; i++) {
    if (parcelPool(next).length - next.parcels > 0) {
      next.parcels += 1;
      delta.parcels += 1;
    } else pay(next, delta, PARCEL.overflowTokens);
  }
}

/** XP, and with it Research: every point counts toward the Rank, the run's Tokens and the next parcel. */
function bump(delta: AccountDelta, next: AccountState, xp: number, ctx: AccountContext, line: ReportLine): void {
  const earned = Math.round(xp * ctx.xpMultiplier);
  if (earned <= 0) return;
  next.xp += earned;
  next.runXp += earned;
  next.research += earned;
  delta.xp += earned;
  delta.xpBy[line] = (delta.xpBy[line] ?? 0) + earned;
  // §8.6.2 — a full Research bar is a parcel; what is left over carries.
  while (next.research >= parcelCost(next.parcelsEarned)) {
    next.research -= parcelCost(next.parcelsEarned);
    next.parcelsEarned += 1;
    grantParcels(next, delta, 1);
  }
}

/** Pay one rank's purse. Idempotent through `claimedLevels`, which the caller checks first. */
function grant(next: AccountState, level: number, delta: AccountDelta): void {
  const reward = REWARD_TRACK[level];
  if (!reward) return;
  pay(next, delta, reward.tokens);
  next.claimedLevels.push(level);
  delta.rewards.push({ level, reward });
}

/**
 * After XP moved: claim every rank at or below the current one that has not been claimed.
 *
 * Every rank, not just the ones crossed by this event: it makes the fold self-healing. An account that somehow
 * sits at rank 5 with rank 3 unclaimed collects it on the next XP rather than never. `claimedLevels` keeps it
 * idempotent.
 */
function settleLevels(next: AccountState, before: number, delta: AccountDelta): void {
  const now = rankFor(next.xp);
  const crossedFrom = rankFor(before);
  for (let l = 2; l <= now; l++) {
    if (next.claimedLevels.includes(l)) continue;
    if (l > crossedFrom) delta.levelsGained.push(l);
    grant(next, l, delta);
  }
}

function dexEntry(next: AccountState, speciesId: string): DexEntry {
  return (next.dex[speciesId] ??= emptyDexEntry());
}

/** §5.13.1 — re-evaluate a species' tier after its counters moved; award the promotion XP once. */
function promote(next: AccountState, speciesId: string, ctx: AccountContext, delta: AccountDelta): void {
  const entry = dexEntry(next, speciesId);
  const rarity = ctx.content.species(speciesId).rarity;
  const tier = dexTierFor(entry.defeats, rarity);
  if (entry.tier < tier) {
    entry.tier = tier;
    bump(delta, next, DEX_TIER_XP[entry.tier], ctx, 'pokedex');
    delta.dexPromotions.push({ speciesId, tier: entry.tier });
    // §8.7 Acquaintance counts species reaching Familiar; the promotion is an event of its own.
    foldMedals(next, { t: 'dex-tier-up', speciesId, tier: 1 }, ctx, delta);
  }
  // §8.7.1 Battle Tracker's Field Note counts species at Familiar.
  next.counters['familiar-species'] = Object.values(next.dex).filter((e) => e.tier >= 1).length;
}

// ── Field Notes (§8.7.1) ─────────────────────────────────────────────────────────────────────────────────

/** Move a Field Note counter. `atLeast` sets a floor instead of adding: for the "in one run / fight" criteria. */
function count(next: AccountState, counter: string, by = 1, atLeast = false): void {
  next.counters[counter] = atLeast ? Math.max(next.counters[counter] ?? 0, by) : (next.counters[counter] ?? 0) + by;
}

/** §8.6.1 — open a vault entry outright. Idempotent. */
function open(next: AccountState, delta: AccountDelta, entryId: string): void {
  if (next.unlocks.includes(entryId) || !vaultEntry(entryId)) return;
  next.unlocks.push(entryId);
  delta.opened.push(entryId);
}

/**
 * §8.7.1 — every Field Note whose deed is now done is written up, once: its relic leaves the vault if it was in
 * it, and a note on a relic that was never locked pays a parcel instead, so no note pays only a number.
 */
function writeNotes(next: AccountState, ctx: AccountContext, delta: AccountDelta): void {
  for (const r of ctx.content.allRelics()) {
    if (!r.discovery || next.notes.includes(r.id)) continue;
    if ((next.counters[r.discovery.counter] ?? 0) < r.discovery.goal) continue;
    next.notes.push(r.id);
    delta.notes.push(r.id);
    const entry = vaultEntryFor('relic', r.id);
    if (entry && !next.unlocks.includes(entry.id)) open(next, delta, entry.id);
    else grantParcels(next, delta, 1);
    bump(delta, next, XP.fieldNote, ctx, 'journal');
  }
}

/** The species' first type, which is what "an all-one-type team" is measured on (catalogs/relics.md §5). */
const monoType = (species: readonly string[], content: ContentRegistry): boolean =>
  species.length === 3 && new Set(species.map((id) => content.species(id).types[0])).size === 1;

/**
 * §6.8.1 — Bond points for a line, and the rank-ups they cross. Crossing a rank raises `bond-rank-up` for the
 * Journal (§8.7) and settles nothing else: Bond is not Trainer XP, it opens things on the line only.
 */
function bond(next: AccountState, speciesId: string, points: number, ctx: AccountContext, delta: AccountDelta): void {
  if (points <= 0) return;
  const line = lineOf(speciesId, ctx.content);
  const before = bondRank(next.bond[line] ?? 0);
  next.bond[line] = (next.bond[line] ?? 0) + points;
  delta.bondGains.push({ line, points });
  const after = bondRank(next.bond[line]);
  for (let r = before + 1; r <= after; r++) {
    delta.bondRankUps.push({ line, rank: r });
    foldMedals(next, { t: 'bond-rank-up', line, rank: r }, ctx, delta);
  }
}

/** §6.8.1 — a line waiting in the Box earns half of a Gym's and a run's end's Bond, once per line. */
function benchBond(next: AccountState, box: readonly string[] | undefined, active: readonly string[] | undefined, worth: number, ctx: AccountContext, delta: AccountDelta): void {
  const share = Math.floor(worth * BOND.benchShare);
  const activeLines = new Set((active ?? []).map((sid) => lineOf(sid, ctx.content)));
  const seen = new Set<string>();
  for (const sid of box ?? []) {
    const line = lineOf(sid, ctx.content);
    if (activeLines.has(line) || seen.has(line)) continue;
    seen.add(line);
    bond(next, sid, share, ctx, delta);
  }
}

/** §6.8.5 — pin a Ribbon on every line in the team, once each. */
function pinRibbon(next: AccountState, species: readonly string[] | undefined, ribbon: RibbonId, ctx: AccountContext, delta: AccountDelta): void {
  for (const sid of species ?? []) {
    const line = lineOf(sid, ctx.content);
    const worn = (next.ribbons[line] ??= []);
    if (worn.includes(ribbon)) continue;
    worn.push(ribbon);
    delta.ribbons.push({ line, ribbon });
  }
}

/** The base species of a line — Bond is tracked per line, whatever stage the Pokémon is at. */
export const lineOf = (speciesId: string, content: ContentRegistry): string => content.lineBase(speciesId);

/** §8.7 — hand over what a completed Journal entry pays: Tokens by medal, and its named prize. */
function payJournal(next: AccountState, delta: AccountDelta, id: string, reward: JournalReward): void {
  pay(next, delta, reward.tokens);
  if (reward.parcels) grantParcels(next, delta, reward.parcels);
  if (reward.cosmetic && !next.cosmetics.includes(reward.cosmetic)) {
    next.cosmetics.push(reward.cosmetic);
    // A trophy is worn the moment it is won, if the card wears nothing of its kind yet.
    const kind = cosmeticById(reward.cosmetic)?.kind;
    if (kind && !next.wearing[kind]) next.wearing[kind] = reward.cosmetic;
  }
  delta.journalRewards.push({ id, reward });
}

/** §8.7 — score an event against the Journal and pay what completes: XP and Tokens by medal, and the entry's prize. */
function foldMedals(next: AccountState, e: MetaEvent, ctx: AccountContext, delta: AccountDelta): void {
  const ach = applyMetaEvent(next.achievements, e);
  next.achievements = ach.progress;
  for (const a of ach.unlocked) {
    bump(delta, next, MEDAL_XP[a.tier], ctx, 'journal');
    payJournal(next, delta, a.id, journalReward(a));
  }
  delta.unlockedAchievements.push(...ach.unlocked);
}

/** §8.9.3 — Oak's aide pays every Pokédex milestone the account has reached and not been paid for. */
function settleAides(next: AccountState, delta: AccountDelta): void {
  const owned = speciesOwned(next);
  for (const row of AIDES) {
    if (owned < row.owned || next.aides.includes(row.owned)) continue;
    next.aides.push(row.owned);
    if (row.parcels) grantParcels(next, delta, row.parcels);
    if (row.perk && !next.hub.includes(row.perk)) next.hub.push(row.perk);
    if (row.tokens) pay(next, delta, row.tokens);
    delta.aides.push(row);
  }
}

/**
 * Fold one event into the account. Pure; returns the new state and what changed.
 *
 * XP arrives with the run's difficulty multiplier already in `ctx`, so a Ladder run's Gym is worth more here
 * without the event knowing it (§8.8.3). Ranks are settled after every XP change, so a single fight that crosses
 * two ranks pays both purses in order.
 */
export function applyAccountEvent(state: AccountState, e: MetaEvent, ctx: AccountContext): { state: AccountState; delta: AccountDelta } {
  const next: AccountState = structuredClone(state);
  const delta = emptyDelta();
  const xpBefore = next.xp;

  // The Journal first: its XP is part of the same event.
  foldMedals(next, e, ctx, delta);

  switch (e.t) {
    case 'combat-end': {
      // §8.3.2 — a species never met before is a discovery, whoever won. Measured before the record below moves.
      const fresh = (e.enemies ?? []).filter((sid) => !isMet(next.dex[sid], next.stats.leadTurns[sid])).length;
      if (fresh > 0) bump(delta, next, fresh * XP.newSpecies, ctx, 'discoveries');
      if (e.outcome === 'victory' || e.outcome === 'caught') {
        bump(delta, next, XP.combat, ctx, 'fights');
        next.stats.combatsWon += 1;
        if (e.outcome === 'caught') next.stats.catches += 1;
        // §6.8.1 — a won trainer, Elite or Gym fight is Bond for every line in the Active Team, one more for the one
        // that led, and a Gym is a Region cleared together. A wild fight pays none (v0.9.1).
        const lead = Object.entries(e.leadTurns ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
        const worth = e.kind === 'boss' ? BOND.gym : e.kind === 'wild' ? 0 : BOND.win;
        for (const sid of e.activeSpecies ?? []) {
          dexEntry(next, sid).winsWith += 1;
          if (worth > 0) bond(next, sid, worth + (sid === lead ? BOND.lead : 0), ctx, delta);
        }
        if (e.kind === 'boss') benchBond(next, e.boxSpecies, e.activeSpecies, BOND.gym, ctx, delta);
      }
      // §5.13.1 — kill credit for every species defeated, whoever landed the blow. Catching is not a kill.
      for (const sid of e.defeated ?? []) {
        dexEntry(next, sid).defeats += 1;
        promote(next, sid, ctx, delta);
      }
      // §8.9 — the record: met, caught, and what your own copies did out there.
      for (const sid of e.enemies ?? []) dexEntry(next, sid).encounters += 1;
      if (e.caughtSpecies) dexEntry(next, e.caughtSpecies).caught += 1;
      for (const sid of e.shinies ?? []) dexEntry(next, sid).shinySeen += 1;
      for (const [sid, n] of Object.entries(e.tally?.koBy ?? {})) dexEntry(next, sid).knockouts += n;
      for (const [sid, n] of Object.entries(e.tally?.faintsOf ?? {})) dexEntry(next, sid).faints += n;
      for (const [sid, n] of Object.entries(e.tally?.damageBy ?? {})) dexEntry(next, sid).damageDealt += n;
      for (const [sid, turns] of Object.entries(e.leadTurns ?? {})) next.stats.leadTurns[sid] = (next.stats.leadTurns[sid] ?? 0) + turns;

      // §8.7.1 — the Field Notes a fight can move (catalogs/relics.md §5).
      const t = e.tally;
      const won = e.outcome === 'victory' || e.outcome === 'caught';
      const active = e.activeSpecies ?? [];
      if (won) {
        count(next, 'combats-won');
        if (e.faints === 0) count(next, 'wins-no-faint');
        if (e.faints >= 2) count(next, 'wins-after-two-faints');
        if (active.length === 3 && e.faints === 0) count(next, 'full-team-wins');
        if (e.leadHpFraction !== undefined && e.leadHpFraction > 0 && e.leadHpFraction < 0.1) count(next, 'lead-under-ten');
      }
      if (monoType(active, ctx.content)) count(next, 'mono-type-teams');
      if (t) {
        if (t.crits) count(next, 'crits', t.crits);
        if (t.statusesCured) count(next, 'statuses-cured', t.statusesCured);
        if (t.riderFizzles) count(next, 'rider-fizzles', t.riderFizzles);
        if (t.peakHandAtTurnEnd >= 7) count(next, 'hand-of-seven');
        if (t.reshuffles >= 3) count(next, 'triple-reshuffle');
        if (t.maxApMove >= 4) count(next, 'four-ap-moves');
        if (t.catchFails) count(next, 'catch-fails', t.catchFails);
        if (t.confusionDiscards) count(next, 'confusion-discards', t.confusionDiscards);
        if (t.statusesApplied.length >= 4) count(next, 'four-statuses-one-fight');
      }
      if ((e.statusesTakenThisRun ?? 0) >= 10) count(next, 'ten-statuses-one-run', 1, true);
      break;
    }
    case 'recruit': {
      next.stats.recruits += 1;
      if (e.firstThisRun) bump(delta, next, XP.recruit, ctx, 'recruits');
      const entry = dexEntry(next, e.speciesId);
      entry.recruited = true;
      entry.recruits += 1;
      if (e.firstThisRun) bond(next, e.speciesId, BOND.recruit, ctx, delta);
      // §5.14 — a shiny is the collection's and the line's: +10 Bond, whatever else the recruit paid.
      if (e.shiny) {
        entry.shinyCaught += 1;
        bond(next, e.speciesId, BOND.shiny, ctx, delta);
      }
      // §8.7.1 Lure Module — three in one Region. Region 1 is the run until v0.7, so "this run" is the measure.
      if ((e.recruitsThisRun ?? 0) >= 3) count(next, 'region-recruits-three', 1, true);
      break;
    }
    case 'evolution':
      next.stats.evolutions += 1;
      bump(delta, next, XP.evolution, ctx, 'evolutions');
      // §6.8.1 — an evolution is the biggest single Bond step: it is the line changing in your hands.
      bond(next, e.toSpeciesId, BOND.evolution, ctx, delta);
      if (e.fromSpeciesId) dexEntry(next, e.fromSpeciesId).evolutions += 1;
      break;
    case 'badge-awarded':
      bump(delta, next, XP.gym, ctx, 'badges');
      // §6.8.5 — a Gym won is a Ribbon for every line that stood in it.
      pinRibbon(next, e.activeSpecies, 'gym', ctx, delta);
      // §8.14 — the Badge Case: the first time a Leader falls, the Badge goes on the wall and their TM into the world.
      if (!next.badges.includes(e.badgeId)) {
        next.badges.push(e.badgeId);
        delta.newBadges.push(e.badgeId);
        bump(delta, next, XP.firstBadge, ctx, 'badges');
        for (const entry of VAULT) if (typeof entry.source === 'object' && entry.source.badge === e.badgeId) open(next, delta, entry.id);
      }
      break;
    case 'relic-acquired':
    case 'dex-tier-up':
    case 'bond-rank-up':
      break;
    case 'run-end': {
      next.stats.runs += 1;
      const rung = e.ladderRung ?? 0;
      if (e.reachedLeague) pinRibbon(next, e.activeSpecies, 'league', ctx, delta);
      if (e.won) {
        next.stats.wins += 1;
        next.stats.hardestWin = Math.max(next.stats.hardestWin, e.modifierCount ?? 0);
        // §8.7.1 Soothe Bell — a won run that never took the Salve.
        if (!e.usedSalve) count(next, 'runs-won-no-salve');
        pinRibbon(next, e.activeSpecies, 'champion', ctx, delta);
        // §8.8.5 — a Ladder run won: a Ribbon, and the next rung if this was the highest yet.
        if (rung > 0) pinRibbon(next, e.activeSpecies, 'ladder', ctx, delta);
        if (rung === next.ladder + 1 && rung <= LADDER_TOP) {
          next.ladder = rung;
          delta.ladderRung = rung;
          pay(next, delta, LADDER_PRIZE.tokens);
          grantParcels(next, delta, LADDER_PRIZE.parcels);
        }
        // §8.15 — the Hall of Fame keeps the team that did it.
        if (e.hall) {
          next.hall.push({ run: next.stats.runs, rung, ...e.hall });
          if (next.hall.length > HALL_SIZE) next.hall.shift();
          delta.hall = true;
        }
      } else {
        next.stats.losses += 1;
        // §8.7.1 Phoenix Feather — a run lost to a wipe in Region 3, reachable since Region 3 is its own Region.
        if ((e.regionIndex ?? 0) >= 2) count(next, 'region-three-wipes');
        // §8.3.2 — a failed run still pays: floor(layers × 50), capped. Failure is fuel, made legible.
        bump(delta, next, Math.min(XP.failedRunCap, (e.layersCleared ?? 0) * XP.failedRunPerLayer), ctx, 'distance');
      }
      // §6.8.1 — finishing a run with a line in the Active Team, and more for winning it; half for the Box.
      const worth = e.won ? BOND.runWon : BOND.runFinished;
      for (const sid of e.activeSpecies ?? []) {
        dexEntry(next, sid).runsFinishedWith += 1;
        bond(next, sid, worth, ctx, delta);
      }
      benchBond(next, e.boxSpecies, e.activeSpecies, worth, ctx, delta);
      break;
    }
  }

  writeNotes(next, ctx, delta);
  settleAides(next, delta);

  if (e.t === 'run-end') {
    // §8.3.4 — the run's own XP becomes Tokens, and so does the ₽ it ended with. Last, so the run's last XP counts.
    const report = Math.floor(next.runXp / TOKENS.perRunXp);
    pay(next, delta, report);
    delta.reportTokens += report;
    next.runXp = 0;
    if (e.moneyLeft !== undefined) {
      const t = tokensForMoney(e.moneyLeft);
      pay(next, delta, t);
      delta.moneyTokens.push({ money: e.moneyLeft, tokens: t });
    }
  }

  settleLevels(next, xpBefore, delta);
  return { state: next, delta };
}

/** §8.15 — how many won runs the Hall keeps. */
export const HALL_SIZE = 50;

export function applyAccountEvents(state: AccountState, events: readonly MetaEvent[], ctx: AccountContext): { state: AccountState; delta: AccountDelta } {
  let cur = state;
  let total = emptyDelta();
  for (const e of events) {
    const step = applyAccountEvent(cur, e, ctx);
    cur = step.state;
    total = mergeDelta(total, step.delta);
  }
  return { state: cur, delta: total };
}

// ── Oak's Parcels (§8.6.2) ───────────────────────────────────────────────────────────────────────────────

/** Open one parcel by taking a card from its offer. Pure: the new account, or the old one if that cannot happen. */
export function takeParcel(state: AccountState, entryId: string): AccountState {
  const entry = vaultEntry(entryId);
  if (state.parcels <= 0 || !entry || entry.source !== 'parcel' || state.unlocks.includes(entryId)) return state;
  const next = structuredClone(state);
  next.parcels -= 1;
  next.parcelsOpened += 1;
  next.unlocks.push(entryId);
  return next;
}

/** §8.7.2 — pin or unpin a Journal entry: three at most, and never a finished one. */
export const PIN_LIMIT = 3;
export function pinEntry(state: AccountState, id: string, on: boolean): AccountState {
  const has = state.pins.includes(id);
  if (on === has || (on && state.pins.length >= PIN_LIMIT)) return state;
  const next = structuredClone(state);
  next.pins = on ? [...next.pins, id] : next.pins.filter((p) => p !== id);
  return next;
}

// ── Older saves (§8.10) ──────────────────────────────────────────────────────────────────────────────────

/**
 * Bring a save from an earlier account version up to this one. Pure; the app layer calls it on load.
 *
 * v4 (v0.9.110) is a reset: an account from before the rework starts again, with a salt of its own.
 */
export function upgradeAccount(state: Partial<AccountState> & { version?: number }, salt = 1): AccountState {
  if ((state.version ?? 0) < ACCOUNT_VERSION) return emptyAccount(salt);
  return state as AccountState;
}

/** The number of Journal medals complete, for the card. */
export const medalCount = (state: AccountState): { done: number; total: number } => ({ done: state.achievements.unlocked.length, total: ACHIEVEMENTS.length });

/**
 * §8.9.2 — has the account met this species? Any trace in the Pokédex, a turn as Lead, or — since v0.7.5 — owning
 * it as a bought starter: a Pokémon on your own starter screen is not a secret from you. Every surface that hides
 * an unmet species asks here, so the Mart and the Pokédex cannot disagree.
 */
export const speciesMet = (account: AccountState, id: string): boolean =>
  isMet(account.dex[id], account.stats.leadTurns[id]) || account.starters.includes(id);

// ── The Trainer Card's stars (§8.15) ─────────────────────────────────────────────────────────────────────

export type StarId = 'champion' | 'badges' | 'pokedex' | 'ladder';
export const STARS: readonly { id: StarId; name: string; earned: string }[] = [
  { id: 'champion', name: 'Champion', earned: 'Beat the Champion' },
  { id: 'badges', name: 'Badge Case', earned: 'Win every Badge' },
  { id: 'pokedex', name: 'Pokédex', earned: 'Meet every species' },
  { id: 'ladder', name: 'League Ladder', earned: 'Win the top rung' },
];

/** §8.15 — the stars the card wears. Derived from the account, never stored: a star cannot disagree with its feat. */
export function starsOf(state: AccountState, content: ContentRegistry): StarId[] {
  const out: StarId[] = [];
  if (state.stats.wins > 0) out.push('champion');
  if (content.allBadges().every((b) => state.badges.includes(b.id))) out.push('badges');
  if (content.allSpecies().every((s) => speciesMet(state, s.id))) out.push('pokedex');
  if (state.ladder >= LADDER_TOP) out.push('ladder');
  return out;
}

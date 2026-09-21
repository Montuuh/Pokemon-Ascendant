import type { ContentRegistry } from '../content/defs';
import { ACHIEVEMENTS, achievementById, applyMetaEvent, emptyProgress, MEDAL_XP, type AchievementDef, type AchievementProgress, type MetaEvent } from './achievements';
import { dexTierFor, DEX_TIER_XP, type DexEntry, type DexTier } from './pokedex';
import { BOND, bondRank } from './bond';
import { TITLE_ID_BY_NAME, type CosmeticKind } from './cosmetics';

// §8.3–§8.6, §8.9, §8.10 — the account: everything that outlives a run.
//
// Trainer XP, the level it drives, the Tokens that every level and the hard achievements pay, which starters,
// relics, Hub conveniences and cosmetics have been bought at the Poké Mart, the Pokédex, the Bond, the medals,
// and the lifetime numbers on the Trainer Card. §8.10 says it is one save; this is that save's shape.
//
// The same discipline as the run: a pure state and a pure fold over events. `RunState` is diffed into
// `MetaEvent`s by the run layer (see achievements.ts — nothing account-side ever lives inside a save that has
// to replay identically), and `applyAccountEvent` folds each one in. The app layer persists the result. The
// spending side — the shelves, the prices, `buy` — is mart.ts.

/** 2 since 2026-09-21: the track pays Tokens at every level and the Mart sells what it used to grant (`upgradeAccount`). */
export const ACCOUNT_VERSION = 2;

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

export interface AccountState {
  version: number;
  /** §8.3.1 — lifetime Trainer XP. Never spent. */
  xp: number;
  /** §8.3.4 — unspent Trainer Tokens. */
  tokens: number;
  /** Lifetime Tokens earned, so the card can say so even after they are spent. */
  tokensEarned: number;
  /** §8.3.5 — reward-track levels whose Tokens have been paid. The fold is idempotent through this. */
  claimedLevels: number[];
  /** §8.5.2 — meta-starters bought at the Mart, by species id. The three defaults are never listed. */
  starters: string[];
  /** §8.6.1 — Tier-2 relics discovered or bought, and Tier-3 relics bought. Tier 1 is always in the pool and never listed. */
  relics: string[];
  /**
   * §8.8 — difficulty modifiers opened by something other than Trainer Level. Nothing writes here since the
   * track stopped handing modifiers out (2026-09-21, §8.3.5); kept so a future unlock has a home and old
   * saves keep their shape.
   */
  modifiers: string[];
  /** §8.4.2 — Hub upgrades bought at the Mart (or granted by the v0.6.0 track, which counts the same). */
  hub: string[];
  /** §8.4.4 — cosmetics bought at the Trainer's Corner, by id. */
  cosmetics: string[];
  /** §8.4.4 — the one cosmetic of each kind the card wears. Buying one wears it; the Corner can swap. */
  wearing: Partial<Record<CosmeticKind, string>>;
  /** §5.13 / §8.9 — the Pokédex, per species. */
  dex: Record<string, DexEntry>;
  /** §6.8 — Bond points per *line* (keyed by base species). `bondRank` turns them into ranks 0–5. */
  bond: Record<string, number>;
  achievements: AchievementProgress;
  stats: LifetimeStats;
  /**
   * Running tallies that unlock things: Tier-2 discovery criteria and Mastery Lv2 achievements (§6.8.2).
   * Keyed by the criterion id. Kept flat rather than typed per criterion so adding one is a data row.
   */
  counters: Record<string, number>;
}

export const emptyAccount = (): AccountState => ({
  version: ACCOUNT_VERSION,
  xp: 0,
  tokens: 0,
  tokensEarned: 0,
  claimedLevels: [],
  starters: [],
  relics: [],
  modifiers: [],
  hub: [],
  cosmetics: [],
  wearing: {},
  dex: {},
  bond: {},
  achievements: emptyProgress(),
  stats: { runs: 0, wins: 0, losses: 0, combatsWon: 0, recruits: 0, evolutions: 0, catches: 0, leadTurns: {}, hardestWin: 0 },
  counters: {},
});

// ── The level curve (§8.3.3) ─────────────────────────────────────────────────────────────────────────────

/** Cumulative XP to *reach* level N: floor(500 × N^1.6). Level 1 is the floor and costs nothing. */
export const xpForLevel = (n: number): number => (n <= 1 ? 0 : Math.floor(500 * Math.pow(n, 1.6)));

export const MAX_LEVEL = 30;

/** The level a lifetime XP total has reached, 1–30. */
export function levelFor(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

/** Progress inside the current level, for the bar: 0–1. At the cap, 1. */
export function levelProgress(xp: number): { level: number; into: number; span: number; fraction: number } {
  const level = levelFor(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, span: 0, fraction: 1 };
  const floor = xpForLevel(level);
  const span = xpForLevel(level + 1) - floor;
  const into = xp - floor;
  return { level, into, span, fraction: span > 0 ? into / span : 1 };
}

// ── The shelves and the reward track (§8.3.5, §8.4.1) ───────────────────────────────────────────────────

/** §8.4.1 — the Poké Mart's five shelves. Trainer Level opens them; Tokens buy from them. */
export type ShelfId = 'corner' | 'starters' | 'hub' | 'discoveries' | 'mastery';

export const SHELF_ORDER: readonly ShelfId[] = ['corner', 'starters', 'hub', 'discoveries', 'mastery'];

/** §8.3.5 — what each shelf sells and the level that opens it. The Corner is the floor: open from Level 1. */
export const SHELVES: Record<ShelfId, { name: string; level: number; sells: string }> = {
  corner: { name: "Trainer's Corner", level: 1, sells: 'Titles, avatars and frames for the Trainer Card — and a fourth Starting Relic offer.' },
  starters: { name: 'Starters', level: 3, sells: 'Magikarp, Eevee and Pikachu, to start a run with.' },
  hub: { name: 'Hub upgrades', level: 5, sells: 'A bigger Box, a second modifier slot, a second starter — conveniences, never power.' },
  discoveries: { name: 'Discoveries', level: 8, sells: 'Any Tier-2 relic you have not discovered yet — the shortcut past a criterion you keep missing.' },
  mastery: { name: 'Mastery lane', level: 10, sells: 'The Tier-3 relics: the ones that change how a run works rather than how hard it hits.' },
};

/** §8.3.5 — what a level pays. Every level pays; the milestones pay more and are where a shelf tends to open. */
export interface TrackReward {
  tokens: number;
  /** The shelf this level opens at the Poké Mart, when it opens one. */
  opens?: ShelfId;
}

export const TRACK_TOKENS = {
  /** Every level from 2 to 30 that is not a milestone. */
  level: 2,
  /** Every fifth level. */
  milestone: { 5: 5, 10: 5, 15: 8, 20: 8, 25: 10, 30: 10 } as Record<number, number>,
} as const;

/** §8.4.2 — the seven Hub upgrades. Each is quality-of-life or option-expanding, never power. */
export type HubUpgrade =
  | 'starting-relic-plus-one'
  | 'expanded-box'
  | 'pokedex-insight'
  | 'trauma-salve-cache'
  | 'apex-reveal'
  | 'modifier-slot-plus-one'
  | 'twin-run';

export const HUB_UPGRADE_LABEL: Record<HubUpgrade, { name: string; effect: string; pending?: string }> = {
  'starting-relic-plus-one': { name: 'Curated Starting Relic +1', effect: 'A run start offers four Starting Relics instead of three.' },
  'expanded-box': { name: 'Expanded Box', effect: 'Box capacity 6 → 8 for every future run.' },
  'pokedex-insight': { name: 'Pokédex Insight', effect: 'The first fight against a species at Familiar tier reveals one intent free.' },
  'trauma-salve-cache': { name: 'Trauma Salve Cache', effect: 'The first City shop always stocks a Trauma Salve.', pending: 'Cities arrive in v0.7' },
  'apex-reveal': { name: 'Apex Pokémon Reveal', effect: 'The Victory Road Apex species is shown on entering Region 3.', pending: 'Victory Road arrives in v0.8' },
  'modifier-slot-plus-one': { name: 'Difficulty Modifier Slot +1', effect: 'Stack two difficulty modifiers per run instead of one.' },
  'twin-run': { name: 'Second Starter Slot (Twin Run)', effect: 'Choose two starters; the Box starts one larger.' },
};

/**
 * §8.3.5 — the whole track, one row per level. Level 1 is the floor and grants nothing; every level after pays
 * Tokens, and the four that open a shelf say so. 92 Tokens in all by Level 30.
 *
 * Derived rather than written out: the track *is* "two a level, more at the milestones, a shelf at 3/5/8/10",
 * and a table of twenty-nine rows would only be that sentence with room for a typo.
 */
export const REWARD_TRACK: Record<number, TrackReward> = Object.fromEntries(
  Array.from({ length: 29 }, (_, i) => i + 2).map((level) => {
    const opens = SHELF_ORDER.find((s) => SHELVES[s].level === level);
    const reward: TrackReward = { tokens: TRACK_TOKENS.milestone[level] ?? TRACK_TOKENS.level, ...(opens ? { opens } : {}) };
    return [level, reward];
  }),
);

/** §8.3.5 — the Tokens the track pays from the level after `from` up to and including `to`. */
export const trackTokensBetween = (from: number, to: number): number => {
  let sum = 0;
  for (let l = from + 1; l <= to; l++) sum += REWARD_TRACK[l]?.tokens ?? 0;
  return sum;
};

// ── XP sources (§8.3.2) ──────────────────────────────────────────────────────────────────────────────────

export const XP = {
  combat: 5,
  recruit: 10,
  evolution: 15,
  gym: 50,
  failedRunPerLayer: 50,
  failedRunCap: 400,
} as const;

// ── The fold ─────────────────────────────────────────────────────────────────────────────────────────────

/** What one event did to the account, for the run-end summary and the toasts. */
export interface AccountDelta {
  xp: number;
  tokens: number;
  levelsGained: number[];
  rewards: { level: number; reward: TrackReward }[];
  unlockedAchievements: AchievementDef[];
  dexPromotions: { speciesId: string; tier: DexTier }[];
  /** §6.8.1 — Bond points earned per line by this event. */
  bondGains: { line: string; points: number }[];
  /** §6.8.2 — ranks crossed by this event, in order. */
  bondRankUps: { line: string; rank: number }[];
  /** §8.6.1 — Tier-2 relics discovered by a criterion. */
  discoveredRelics: string[];
}

export const emptyDelta = (): AccountDelta => ({ xp: 0, tokens: 0, levelsGained: [], rewards: [], unlockedAchievements: [], dexPromotions: [], bondGains: [], bondRankUps: [], discoveredRelics: [] });

export interface AccountContext {
  content: ContentRegistry;
  /** §8.8.3 — the run's difficulty multiplier, applied to every XP the run earns. 1 outside a run. */
  xpMultiplier: number;
}

function bump(delta: AccountDelta, next: AccountState, xp: number, ctx: AccountContext): void {
  const earned = Math.round(xp * ctx.xpMultiplier);
  next.xp += earned;
  delta.xp += earned;
}

/** Pay one track level. Idempotent through `claimedLevels`, which the caller checks first. */
function grant(next: AccountState, level: number, delta: AccountDelta): void {
  const reward = REWARD_TRACK[level];
  if (!reward) return;
  next.tokens += reward.tokens;
  next.tokensEarned += reward.tokens;
  delta.tokens += reward.tokens;
  next.claimedLevels.push(level);
  delta.rewards.push({ level, reward });
}

/**
 * After XP moved: claim every level at or below the current one that has not been claimed.
 *
 * Every level, not just the ones crossed by this event: it makes the fold self-healing. An account that
 * somehow sits at level 9 with level 4 unclaimed — a track row added in a later version, a save from before
 * the track existed — collects it on the next XP rather than never. `claimedLevels` keeps it idempotent.
 */
function settleLevels(next: AccountState, before: number, delta: AccountDelta): void {
  const now = levelFor(next.xp);
  const crossedFrom = levelFor(before);
  for (let l = 2; l <= now; l++) {
    if (next.claimedLevels.includes(l)) continue;
    if (l > crossedFrom) delta.levelsGained.push(l);
    grant(next, l, delta);
  }
}

function dexEntry(next: AccountState, speciesId: string): DexEntry {
  return (next.dex[speciesId] ??= { defeats: 0, recruited: false, winsWith: 0, runsFinishedWith: 0, tier: 0 });
}

/** §5.13.1 — re-evaluate a species' tier after its counters moved; award the promotion XP once. */
function promote(next: AccountState, speciesId: string, ctx: AccountContext, delta: AccountDelta): void {
  const entry = dexEntry(next, speciesId);
  const rarity = ctx.content.species(speciesId).rarity;
  const tier = dexTierFor(entry.defeats, rarity);
  if (entry.tier < tier) {
    entry.tier = tier;
    const xpBefore = next.xp;
    bump(delta, next, DEX_TIER_XP[entry.tier], ctx);
    delta.dexPromotions.push({ speciesId, tier: entry.tier });
    // §8.7 Acquaintance counts species reaching Familiar; the promotion is an event of its own.
    foldMedals(next, { t: 'dex-tier-up', speciesId, tier: 1 }, ctx, delta);
    settleLevels(next, xpBefore, delta);
  }
  // §8.6.1 Battle Tracker's discovery counts species at Familiar.
  next.counters['familiar-species'] = Object.values(next.dex).filter((e) => e.tier >= 1).length;
}

// ── Tier-2 discovery (§8.6.1) ────────────────────────────────────────────────────────────────────────────

/** Move a discovery counter. `atLeast` sets a floor instead of adding: for the "in one run / fight" criteria. */
function count(next: AccountState, counter: string, by = 1, atLeast = false): void {
  next.counters[counter] = atLeast ? Math.max(next.counters[counter] ?? 0, by) : (next.counters[counter] ?? 0) + by;
}

/** §8.6.1 — every Tier-2 row whose criterion is now met joins the pool, once. */
function discover(next: AccountState, ctx: AccountContext, delta: AccountDelta): void {
  for (const r of ctx.content.allRelics()) {
    if (!r.discovery || next.relics.includes(r.id)) continue;
    if ((next.counters[r.discovery.counter] ?? 0) >= r.discovery.goal) {
      next.relics.push(r.id);
      delta.discoveredRelics.push(r.id);
    }
  }
}

/** The species' first type, which is what "an all-one-type team" is measured on (catalogs/relics.md §5). */
const monoType = (species: readonly string[], content: ContentRegistry): boolean =>
  species.length === 3 && new Set(species.map((id) => content.species(id).types[0])).size === 1;

/**
 * §6.8.1 — Bond points for a line, and the rank-ups they cross. Crossing a rank raises `bond-rank-up` for the
 * medals (§8.7) and settles nothing else: Bond is not Trainer XP, it opens things on the line only.
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

/** The base species of a line — Bond is tracked per line, whatever stage the Pokémon is at. */
export const lineOf = (speciesId: string, content: ContentRegistry): string => content.lineBase(speciesId);

/**
 * Fold one event into the account. Pure; returns the new state and what changed.
 *
 * XP arrives with the run's difficulty multiplier already in `ctx`, so a Hard run's Gym is worth more here
 * without the event knowing it (§8.8.3). Levels are settled after every XP change, so a single fight that
 * crosses two levels grants both rewards in order.
 */
/** §8.7 — score an event against the medal case and pay what completes: XP by tier, Tokens for Gold and Platinum (§8.7.0). */
function foldMedals(next: AccountState, e: MetaEvent, ctx: AccountContext, delta: AccountDelta): void {
  const ach = applyMetaEvent(next.achievements, e);
  next.achievements = ach.progress;
  for (const a of ach.unlocked) {
    bump(delta, next, MEDAL_XP[a.tier], ctx);
    const tokens = a.tier === 'gold' ? 2 : a.tier === 'platinum' ? 5 : 0;
    if (tokens) {
      next.tokens += tokens;
      next.tokensEarned += tokens;
      delta.tokens += tokens;
    }
  }
  delta.unlockedAchievements.push(...ach.unlocked);
}

export function applyAccountEvent(state: AccountState, e: MetaEvent, ctx: AccountContext): { state: AccountState; delta: AccountDelta } {
  const next: AccountState = structuredClone(state);
  const delta = emptyDelta();
  const xpBefore = next.xp;

  // Medals first: their XP is part of the same event.
  foldMedals(next, e, ctx, delta);

  switch (e.t) {
    case 'combat-end': {
      if (e.outcome === 'victory' || e.outcome === 'caught') {
        bump(delta, next, XP.combat, ctx);
        next.stats.combatsWon += 1;
        if (e.outcome === 'caught') next.stats.catches += 1;
        // §6.8.1 — a won fight is Bond for every line in the Active Team, and one more for the one that led.
        const lead = Object.entries(e.leadTurns ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
        for (const sid of e.activeSpecies ?? []) {
          dexEntry(next, sid).winsWith += 1;
          bond(next, sid, BOND.win + (sid === lead ? BOND.lead : 0), ctx, delta);
        }
      }
      // §5.13.1 — kill credit for every species defeated, whoever landed the blow. Catching is not a kill.
      for (const sid of e.defeated ?? []) {
        dexEntry(next, sid).defeats += 1;
        promote(next, sid, ctx, delta);
      }
      for (const [sid, turns] of Object.entries(e.leadTurns ?? {})) next.stats.leadTurns[sid] = (next.stats.leadTurns[sid] ?? 0) + turns;

      // §8.6.1 — the discovery criteria a fight can satisfy (catalogs/relics.md §5).
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
        if (t.statusesApplied.length >= 4) count(next, 'four-statuses-one-fight');
      }
      if ((e.statusesTakenThisRun ?? 0) >= 10) count(next, 'ten-statuses-one-run', 1, true);
      break;
    }
    case 'recruit': {
      next.stats.recruits += 1;
      if (e.firstThisRun) bump(delta, next, XP.recruit, ctx);
      const entry = dexEntry(next, e.speciesId);
      entry.recruited = true;
      if (e.firstThisRun) bond(next, e.speciesId, BOND.recruit, ctx, delta);
      // §8.6.1 Lure Module — three in one Region. Region 1 is the run until v0.7, so "this run" is the measure.
      if ((e.recruitsThisRun ?? 0) >= 3) count(next, 'region-recruits-three', 1, true);
      break;
    }
    case 'evolution':
      next.stats.evolutions += 1;
      bump(delta, next, XP.evolution, ctx);
      // §6.8.1 — an evolution is the biggest single Bond step: it is the line changing in your hands.
      bond(next, e.toSpeciesId, BOND.evolution, ctx, delta);
      break;
    case 'badge-awarded':
      bump(delta, next, XP.gym, ctx);
      break;
    case 'relic-acquired':
    case 'dex-tier-up':
    case 'bond-rank-up':
      break;
    case 'run-end': {
      next.stats.runs += 1;
      if (e.won) {
        next.stats.wins += 1;
        next.stats.hardestWin = Math.max(next.stats.hardestWin, e.modifierCount ?? 0);
        // §8.6.1 Soothe Bell — a won run that never took the Salve.
        if (!e.usedSalve) count(next, 'runs-won-no-salve');
      } else {
        next.stats.losses += 1;
        // §8.3.2 — a failed run still pays: floor(layers × 50), capped. Failure is fuel, made legible.
        bump(delta, next, Math.min(XP.failedRunCap, (e.layersCleared ?? 0) * XP.failedRunPerLayer), ctx);
      }
      // §6.8.1 — finishing a run with a line in the Active Team, and more for winning it.
      for (const sid of e.activeSpecies ?? []) {
        dexEntry(next, sid).runsFinishedWith += 1;
        bond(next, sid, e.won ? BOND.runWon : BOND.runFinished, ctx, delta);
      }
      break;
    }
  }

  discover(next, ctx, delta);
  settleLevels(next, xpBefore, delta);
  return { state: next, delta };
}

/**
 * The account of a player who earned medals before there was an account (v0.5's `achievements` save).
 *
 * Every medal already held pays what it would have paid — XP by tier, Tokens for Gold and Platinum — and the
 * levels that XP reaches are settled, so a returning player opens v0.6 at the level their play deserved rather
 * than at 1 with a full medal case. Pure, and idempotent in the sense that matters: it is run once, on the
 * one save that predates the account.
 */
export function accountFromProgress(progress: AchievementProgress, ctx: AccountContext): AccountState {
  const next = emptyAccount();
  next.achievements = structuredClone(progress);
  const delta = emptyDelta();
  for (const id of progress.unlocked) {
    const a = achievementById(id);
    if (!a) continue;
    bump(delta, next, MEDAL_XP[a.tier], ctx);
    const tokens = a.tier === 'gold' ? 2 : a.tier === 'platinum' ? 5 : 0;
    next.tokens += tokens;
    next.tokensEarned += tokens;
  }
  settleLevels(next, 0, delta);
  return next;
}

export function applyAccountEvents(state: AccountState, events: readonly MetaEvent[], ctx: AccountContext): { state: AccountState; delta: AccountDelta } {
  let cur = state;
  const total = emptyDelta();
  for (const e of events) {
    const step = applyAccountEvent(cur, e, ctx);
    cur = step.state;
    total.xp += step.delta.xp;
    total.tokens += step.delta.tokens;
    total.levelsGained.push(...step.delta.levelsGained);
    total.rewards.push(...step.delta.rewards);
    total.unlockedAchievements.push(...step.delta.unlockedAchievements);
    total.dexPromotions.push(...step.delta.dexPromotions);
    total.bondGains.push(...step.delta.bondGains);
    total.bondRankUps.push(...step.delta.bondRankUps);
    total.discoveredRelics.push(...step.delta.discoveredRelics);
  }
  return { state: cur, delta: total };
}

// ── Older saves (§8.10) ──────────────────────────────────────────────────────────────────────────────────

/** The v1 fields a v2 account no longer has. */
export interface LegacyAccountFields {
  /** v0.6.0–v0.6.2 — cosmetic titles the track granted, stored by name. */
  titles?: string[];
}

/**
 * Bring a save from an earlier account version up to this one. Pure; the app layer calls it on load.
 *
 * v1 → v2 (2026-09-21): the track paid Tokens only at the milestones and granted everything else outright.
 * Now every level pays and the Mart sells. What was granted stays granted — a Pikachu at Level 4 is not taken
 * back — and every claimed level that used to pay nothing pays its two Tokens now, so a returning player
 * opens the shop with the wallet the new track would have given them. Titles held by name become the
 * cosmetic ids the Corner sells, and the first one is worn, as the card used to do.
 */
export function upgradeAccount(state: AccountState & LegacyAccountFields): AccountState {
  if (state.version >= ACCOUNT_VERSION) return state;
  const next: AccountState & LegacyAccountFields = structuredClone(state);
  if (next.version < 2) {
    const backPay = next.claimedLevels.filter((l) => TRACK_TOKENS.milestone[l] === undefined).length * TRACK_TOKENS.level;
    next.tokens += backPay;
    next.tokensEarned += backPay;
    next.cosmetics = [...(next.cosmetics ?? [])];
    next.wearing = { ...(next.wearing ?? {}) };
    for (const name of next.titles ?? []) {
      const id = TITLE_ID_BY_NAME[name];
      if (id && !next.cosmetics.includes(id)) next.cosmetics.push(id);
      if (id && !next.wearing.title) next.wearing.title = id;
    }
    delete next.titles;
  }
  next.version = ACCOUNT_VERSION;
  return next;
}

/** Which Hub upgrades are in force. A pending one is granted but does nothing until its system exists. */
export const hasHubUpgrade = (state: AccountState, upgrade: HubUpgrade): boolean => state.hub.includes(upgrade) && !HUB_UPGRADE_LABEL[upgrade].pending;

/** The number of achievements complete, for the card. */
export const medalCount = (state: AccountState): { done: number; total: number } => ({ done: state.achievements.unlocked.length, total: ACHIEVEMENTS.length });

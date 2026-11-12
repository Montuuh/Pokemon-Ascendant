import type { AccountState } from './account';
import { ACHIEVEMENTS, type MedalTier } from './achievements';
import { ARRIVAL_RANK, DEX_AWARD_OWNED, PLATEAU_BADGES, rankFor } from './rank';

// §8.4, §8.4.1, §8.4.6 — the Road to the Plateau: where the Trainer Hub is, what stands in it, and what is new.
//
// The Hub is a different place as the career advances (the user's call, 2026-11-12): the bedroom a trainer leaves,
// Professor Oak's Lab, Viridian City's Pokémon Center, the Indigo Plateau. Each place holds the same features, and a
// feature the account has not earned yet stands there as a silhouette that names what earns it. Everything here is
// derived from facts the account already keeps — the rank, the Badge Case, the Journal, the Ladder, the Hall — so a
// room can never disagree with the career it draws, and nothing in it is a currency or a power (§8.1).
//
// What the account does store is what the player has already *seen* arrive (`hubSeen`), so a move and a new feature
// each get their moment once.

export type HubPlace = 'bedroom' | 'lab' | 'center' | 'plateau';
export type HubFeature = 'run' | 'card' | 'pc' | 'aide' | 'guide' | 'mart' | 'kit' | 'badges' | 'trophies' | 'dex' | 'banner' | 'ladder' | 'hall';

/** One fact of the account that opens a place or a feature. */
export type HubNeed =
  | { kind: 'start' }
  | { kind: 'rank'; rank: number }
  | { kind: 'badges'; count: number }
  | { kind: 'medal'; tier: MedalTier }
  | { kind: 'owned'; count: number }
  | { kind: 'ladder'; rung: number }
  | { kind: 'champion' };

export interface HubPlaceRow {
  id: HubPlace;
  name: string;
  /** Any one of these opens the place. */
  needs: readonly HubNeed[];
}

/**
 * §8.4 — the road, in order. The rank moves the first two stops because it is the one thing every run pays; the
 * Plateau asks for Badges — a quarter of the Case — because it is the League's own door, and opens to an Elite or a
 * Champion whatever the Case holds, so no career is left in Viridian. Viridian waits for Ace rather than Challenger so
 * the Lab is lived in. Measured as a career (`ACCOUNT_REPORT=1 CAREERS=3 CAREER_RUNS=40`,
 * `balance/accountCareer.test.ts`: 9 careers), median / latest run: the Lab 1 / 1, Viridian 5 / 7, the Plateau
 * 10 / 27 — every career there, the ones that win Badges first.
 */
export const HUB_PLACES: readonly HubPlaceRow[] = [
  { id: 'bedroom', name: 'Your room', needs: [{ kind: 'start' }] },
  { id: 'lab', name: "Professor Oak's Lab", needs: [{ kind: 'rank', rank: ARRIVAL_RANK.aide }] },
  { id: 'center', name: 'Viridian City Pokémon Center', needs: [{ kind: 'rank', rank: ARRIVAL_RANK.center }] },
  { id: 'plateau', name: 'Indigo Plateau', needs: [{ kind: 'badges', count: PLATEAU_BADGES }, { kind: 'rank', rank: ARRIVAL_RANK.elite }, { kind: 'champion' }] },
];

export interface HubFeatureRow {
  id: HubFeature;
  need: HubNeed;
  /** The places it can stand in; every place when absent. */
  places?: readonly HubPlace[];
  /** Later forms of the same thing, each replacing the one before: tier 2 at `tiers[0]`, tier 3 at `tiers[1]`. */
  tiers?: readonly HubNeed[];
}

const MEDAL_ORDER: readonly MedalTier[] = ['bronze', 'silver', 'gold', 'platinum'];

/**
 * §8.4.1 — every feature of the Hub and the fact that brings it. The first three are there on the first day; the
 * four doors after them come with the rank (§8.3.3); the next five are the career standing on the floor, and open
 * nothing; the last is the Hall of Fame's stairs, which only the Plateau has.
 */
export const HUB_FEATURES: readonly HubFeatureRow[] = [
  { id: 'run', need: { kind: 'start' } },
  { id: 'card', need: { kind: 'start' } },
  { id: 'pc', need: { kind: 'start' } },
  { id: 'aide', need: { kind: 'rank', rank: ARRIVAL_RANK.aide } },
  { id: 'guide', need: { kind: 'rank', rank: ARRIVAL_RANK.aide } },
  { id: 'mart', need: { kind: 'rank', rank: ARRIVAL_RANK.clerk } },
  { id: 'kit', need: { kind: 'rank', rank: ARRIVAL_RANK.kit } },
  { id: 'badges', need: { kind: 'badges', count: 1 } },
  { id: 'trophies', need: { kind: 'medal', tier: 'gold' }, tiers: [{ kind: 'medal', tier: 'platinum' }] },
  { id: 'dex', need: { kind: 'owned', count: DEX_AWARD_OWNED } },
  { id: 'banner', need: { kind: 'rank', rank: ARRIVAL_RANK.banner }, tiers: [{ kind: 'rank', rank: ARRIVAL_RANK.elite }, { kind: 'rank', rank: ARRIVAL_RANK.master }] },
  { id: 'ladder', need: { kind: 'ladder', rung: 1 } },
  { id: 'hall', need: { kind: 'champion' }, places: ['plateau'] },
];

/** The features that open a screen; the rest are the career on the floor. */
export const HUB_DOORS: readonly HubFeature[] = ['run', 'card', 'pc', 'aide', 'guide', 'mart', 'kit', 'hall'];

const TIER_OF = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a.tier])) as Record<string, MedalTier | undefined>;

/** Does the account hold this fact? */
export function hubNeedMet(account: AccountState, need: HubNeed): boolean {
  switch (need.kind) {
    case 'start':
      return true;
    case 'rank':
      return rankFor(account.xp) >= need.rank;
    case 'badges':
      return account.badges.length >= need.count;
    case 'medal':
      return account.achievements.unlocked.some((id) => MEDAL_ORDER.indexOf(TIER_OF[id] ?? 'bronze') >= MEDAL_ORDER.indexOf(need.tier));
    case 'owned':
      // §8.9.3 — read from the milestones Oak's aide has paid, which the account keeps; no content is needed.
      return account.aides.some((owned) => owned >= need.count);
    case 'ladder':
      return account.ladder >= need.rung;
    case 'champion':
      return account.hall.length > 0 || account.stats.wins > 0;
  }
}

/** §8.4 — where the Hub is: the furthest place on the road the account has opened. */
export function hubPlace(account: AccountState): HubPlace {
  let place: HubPlace = 'bedroom';
  for (const row of HUB_PLACES) if (row.needs.some((n) => hubNeedMet(account, n))) place = row.id;
  return place;
}

export const hubPlaceRow = (id: HubPlace): HubPlaceRow => HUB_PLACES.find((p) => p.id === id)!;

export interface HubFeatureState {
  id: HubFeature;
  unlocked: boolean;
  /** What brings it — for the silhouette's bubble. */
  need: HubNeed;
  /** 0 while locked, 1 once there, 2 and 3 for its later forms. */
  tier: number;
}

export interface HubState {
  place: HubPlace;
  /** The next stop and what opens it; null at the Plateau. */
  next: HubPlaceRow | null;
  /** Every feature that can stand in this place, in the table's order, locked ones included (§8.4.6). */
  features: HubFeatureState[];
  /** What has arrived since the player last looked: `place:lab`, `mart`, `banner:2`. */
  fresh: string[];
}

const tierOf = (account: AccountState, row: HubFeatureRow): number => {
  if (!hubNeedMet(account, row.need)) return 0;
  let tier = 1;
  for (const need of row.tiers ?? []) {
    if (!hubNeedMet(account, need)) break;
    tier++;
  }
  return tier;
};

/** The key the seen-list keeps for a place. */
export const hubPlaceKey = (place: HubPlace): string => `place:${place}`;
/** The key for a feature, and for each of its later forms. */
export const hubFeatureKey = (id: HubFeature, tier = 1): string => (tier <= 1 ? id : `${id}:${tier}`);

/**
 * Everything the account has earned that has a moment of its own: every place up to the current one, every feature
 * and form past the first day's. A fresh account has earned nothing, so the bedroom plays no arrival.
 */
export function hubEarned(account: AccountState): string[] {
  const out: string[] = [];
  const at = HUB_PLACES.findIndex((p) => p.id === hubPlace(account));
  for (const row of HUB_PLACES.slice(1, at + 1)) out.push(hubPlaceKey(row.id));
  for (const row of HUB_FEATURES) {
    if (row.need.kind === 'start') continue;
    const tier = tierOf(account, row);
    for (let t = 1; t <= tier; t++) out.push(hubFeatureKey(row.id, t));
  }
  return out;
}

/** §8.4 — the Hub as the account stands: the place, what is in it, and what is new. Pure. */
export function hubState(account: AccountState): HubState {
  const place = hubPlace(account);
  const at = HUB_PLACES.findIndex((p) => p.id === place);
  const seen = new Set(account.hubSeen);
  return {
    place,
    next: HUB_PLACES[at + 1] ?? null,
    features: HUB_FEATURES.filter((row) => !row.places || row.places.includes(place)).map((row) => {
      const tier = tierOf(account, row);
      return { id: row.id, unlocked: tier > 0, need: row.need, tier };
    }),
    fresh: hubEarned(account).filter((key) => !seen.has(key)),
  };
}

/** The player has looked: nothing earned so far plays its arrival again. Returns the same account if nothing is new. */
export function markHubSeen(account: AccountState): AccountState {
  const seen = new Set(account.hubSeen);
  const fresh = hubEarned(account).filter((key) => !seen.has(key));
  return fresh.length ? { ...account, hubSeen: [...account.hubSeen, ...fresh] } : account;
}

import type { ContentRegistry } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import {
  GYMS, REGION1_BIOME_WEIGHTS, eliteTeamFor, eliteWildTeamFor, evolvedAt, gymById, gymTeamFor, regionContent, trainerTeamFor,
  WILD_TIER_ODDS, WILD_TIERS, wildBandFor, type BiomeId, type GymDef, type RegionContent, type TrainerRoster, type WildTier,
} from './region';
import { AID_HEAL_PCT } from './economy';
import { hasModifier } from './modifiers';
import { rollGroundFind, supplyLabel, type GroundFind } from './rewards';
import type { MapNode, NodeKind, NodePreview, RegionMap } from './types';
import type { PokemonType } from '../types';

// §2.5 — the Region map, v3 (v0.8.7): a route of twenty columns walked left to right.
//
//   0–7     THE TRUNK. Three or four tracks that drift, split, merge and cross. Wild-heavy at 0–1.
//   8       the crossroads: a stop column at the mouth of the Y.
//   8–p     THE Y. Exactly three tracks: the top one leans toward the first Gym, the bottom one toward the
//           second (their wilds and trainers already wear its theme), the middle one stays neutral and carries
//           the Elite Trainer at column 9 or 10.
//   p       THE POINT OF NO RETURN, column 11–13. Every edge out of it enters one lane or the other.
//   p+1–18  two lanes of two tracks each, themed after their Gym. Edges never leave a lane.
//   19      the two Gyms.
//
// **Tracks, not a lattice.** v0.5's map let every node reach any of three columns at every step, so every step
// was a fork and the route read as a tangle. Here a node usually has one child, on its own track, and the choices
// are the *crossings*: a diagonal to the adjacent track, at most one per pair of tracks in a column (never an X)
// and never on the same pair two columns running. Pivoting from the top track to the bottom one therefore takes
// two steps at least. Edges are laid monotone top to bottom, so no edge crosses another — by construction, not by
// a retry loop.
//
// **Stop columns.** Six columns are all stops (nurse, merchant, Mystery, something on the ground), so every route
// walks the same number of fights however it goes — the level curve does not depend on the path — and "rest or
// fight" becomes "which rest" (§2.5.1).
//
// Generation is seeded: the same (runSeed, regionIndex) always produces the same route, the same Gym pair, the
// same lane themes and the same finds on the ground.

/** §2.5 — the route's columns. The last one is the two Gyms. */
export const LAYERS = 20;
const GYM_LAYER = LAYERS - 1;
/** §2.5 — the crossroads: the Y opens here, with exactly three tracks. */
export const Y_LAYER = 8;
/** §2.5 — the point of no return falls on one of these columns, seeded. */
const NO_RETURN_LAYERS = [11, 12, 13] as const;
/** §2.8.1 — the guaranteed Elite stands on the Y's middle track at one of these columns. */
const ELITE_LAYERS = [9, 10] as const;
/** §2.5 — the row grid the tracks are laid on, top to bottom. */
export const MAP_ROWS = 11;
/** One clear row between two tracks, so the terrain has room for the scenery between two routes. */
export const TRACK_GAP = 2;

/** Where each kind of track may sit on the row grid. */
type Group = 'trunk' | 'lean0' | 'mid' | 'lean1' | 'lane0' | 'lane1';
const ROW_BAND: Record<Group, readonly [number, number]> = {
  trunk: [1, 9],
  lean0: [0, 3],
  mid: [5, 5],
  lean1: [7, 10],
  lane0: [0, 4],
  lane1: [6, 10],
};
/** On the Y the leaning tracks drift outward, toward their lanes: the split is something you watch happen. */
const ROW_PULL: Partial<Record<Group, number>> = { lean0: 1, lean1: 9 };

/**
 * §2.5 — how often an adjacent pair of tracks carries a crossing in a column. The Y is the busiest: it is where a
 * player who has not decided yet moves between the leaning tracks and the neutral one.
 */
const CROSS_CHANCE = { trunk: 0.35, y: 0.45, lane: 0.35 } as const;
/** How often the trunk's tracks split or merge from one column to the next — why no two routes share a shape. */
const TRUNK_SPLIT_CHANCE = 0.2;
const TRUNK_MERGE_CHANCE = 0.2;
/** A lane narrows to one track now and then, and a narrowed lane soon widens again. */
const LANE_MERGE_CHANCE = 0.12;
const LANE_SPLIT_CHANCE = 0.65;

/**
 * §2.5 — fight-column weights by column. Two rules the user asked for live here:
 *
 *   **Wild-heavy opening.** Columns 0 and 1 are mostly Wild Areas. A lone Lv 5 starter loses the first *trainer*
 *   fight about as often as not — the answer is bodies, not levels. Not a *forced* Wild (§2.5.3 rejected that:
 *   it wastes the first decision) — a weighting, and *which* wild is the choice, because each names its species.
 *
 *   **A fight column is for fighting.** A Mystery or a find turns up in one now and then, as a way around a fight,
 *   but the route's stops are its stop columns.
 */
function fightWeights(layer: number, inLane: boolean): Partial<Record<NodeKind, number>> {
  if (inLane) return { wild: 5, trainer: 5, cache: 0.4 };
  if (layer === 0) return { wild: 9, trainer: 2 };
  if (layer === 1) return { wild: 7, trainer: 3 };
  if (layer < 5) return { wild: 5, trainer: 4, mystery: 0.5, cache: 0.5 };
  return { wild: 4, trainer: 5, mystery: 0.4, cache: 0.4 };
}

/**
 * §2.5.1 / §2.9 — what a stop column offers, by where it stands. The opening stops have no nurse (a rest at
 * column 2 is a rest nobody needs); the merchant is early, so what it sells has the route to pay back; the point
 * of no return is a camp before the commitment; the last column before the Gym guarantees each lane its nurse.
 */
type StopMix = 'early' | 'mid' | 'cross' | 'no-return' | 'lane' | 'last';
const STOP_MIX: Record<StopMix, Partial<Record<NodeKind, number>>> = {
  early: { cache: 4, mystery: 3, merchant: 3 },
  mid: { cache: 3, mystery: 3, merchant: 2, aid: 2 },
  cross: { merchant: 3, mystery: 3, cache: 3 },
  'no-return': { aid: 3, cache: 3, mystery: 2 },
  lane: { cache: 3, mystery: 3, merchant: 2 },
  last: { cache: 3, mystery: 2 },
};
/** A stop column holds at most one of each of these: two nurses side by side is one nurse and a wasted node. */
const ONE_PER_COLUMN: readonly NodeKind[] = ['aid', 'merchant'];
/** §2.9 — the kinds that are stops rather than fights. */
const STOP_KINDS: readonly NodeKind[] = ['aid', 'merchant', 'mystery', 'cache'];

/**
 * §2.5.1 — the two rolled special nodes, and the reason they are percentages rather than guarantees.
 *
 * The Elite Trainer on the Y is the *landmark*: guaranteed on the map, the price of keeping both Gyms open, and
 * the thing you level for. These two are the opposite — they are why two runs on the same route feel different.
 * An extra Elite Trainer in a lane is a spike you route around or level into; an Elite Wild is the catch-or-kill
 * dilemma (§2.8.2), at most one per Region, and genuinely not on every map.
 */
const EXTRA_ELITE_TRAINER_CHANCE = 0.22;
const ELITE_WILD_CHANCE = 0.45;

function pickWeighted<T>(rng: GameRng, entries: { value: T; weight: number }[]): T {
  const total = entries.reduce((n, e) => n + e.weight, 0);
  let roll = rng.range01() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.value;
  }
  return entries[entries.length - 1]!.value;
}

function pickOne<T>(rng: GameRng, list: readonly T[]): T {
  return list[Math.min(list.length - 1, Math.floor(rng.range01() * list.length))]!;
}

export function biomeFor(rng: GameRng, weights: readonly { biome: BiomeId; weight: number }[] = REGION1_BIOME_WEIGHTS): BiomeId {
  return pickWeighted(rng, weights.map((b) => ({ value: b.biome, weight: b.weight })));
}

/**
 * §5.9.2 — draw **two distinct** Gym types for this Region, and assign one to each lane. Nine of the twelve
 * Gym types are missed by any one run, which is what makes a three-Badge combination worth talking about.
 */
export function drawGymPair(rng: GameRng, onePath = false, exclude: readonly string[] = [], gyms: readonly GymDef[] = GYMS): [GymDef, GymDef] {
  // §2.1 placeholder — Region 3 draws from Region 1's pool until its own Gyms exist (v0.7.4), so a Gym whose
  // Badge the run already holds is left out: nobody fights Brock twice. Only if that would leave fewer than two
  // does the full pool come back.
  const fresh = gyms.filter((g) => !exclude.includes(g.id));
  const pool = fresh.length >= 2 ? [...fresh] : fresh.length === 1 && onePath ? [...fresh] : [...gyms];
  const a = pool.splice(Math.floor(rng.range01() * pool.length), 1)[0]!;
  const b = pool[Math.min(pool.length - 1, Math.floor(rng.range01() * pool.length))]!;
  // §8.8.2 One Path — both lanes lead to the same Gym, so the fork offers a route and never a counter-pick.
  // The second draw still happens, so a seed's map is otherwise the same with the modifier on or off.
  return [a, onePath ? a : b];
}

/** §2.6.2 — the Rare share a Wild Area rolls. Naturalist's Lens raises it (§2.11.3). */
export const WILD_RARE_CHANCE = WILD_TIER_ODDS.rare;

/**
 * §2.6.2 — the rarity odds for a Rare share: the Rare takes `rareChance`, and the rest keeps the Common and the
 * Uncommon in their usual proportion (60 : 30), so the Lens buys Rares out of both.
 */
export function wildOdds(rareChance = WILD_RARE_CHANCE): Record<WildTier, number> {
  const rest = WILD_TIER_ODDS.common + WILD_TIER_ODDS.uncommon;
  const left = 1 - rareChance;
  return { common: (WILD_TIER_ODDS.common / rest) * left, uncommon: (WILD_TIER_ODDS.uncommon / rest) * left, rare: rareChance };
}

/** §2.6.2 — the species a Wild preview names: every tier, the Commons first. */
const wildSpecies = (pool: Record<WildTier, string[]>): string[] => [...new Set(WILD_TIERS.flatMap((t) => pool[t]))];

/**
 * §2.6.2 — a Wild node shows its whole pool before you commit: every species its biome can hold, by rarity, with
 * each rarity's chance (v0.9.7, the user's call — a big, varied pool rather than three names). Which one is waiting
 * is rolled when you walk in (`rollWild`).
 *
 * `theme` is the lane's, once the trunk has forked: the biome is the Gym's biome. The lane's `counter` — the one
 * species that answers its own Gym — is always in the pool (an Uncommon if the biome lacks it), so a lane is a
 * commitment and never a dead end.
 */
function wildPreview(rng: GameRng, content: ContentRegistry, layer: number, lane: GymDef | null, region: RegionContent, rareChance = WILD_RARE_CHANCE): { preview: NodePreview; biome: BiomeId } {
  const theme = lane ? region.laneThemes[lane.type] : undefined;
  const biome = theme ? theme.biome : biomeFor(rng, region.biomeWeights);
  const source = region.biomes[biome]!;
  const pool: Record<WildTier, string[]> = { common: [...source.common], uncommon: [...source.uncommon], rare: [...source.rare] };
  if (theme && !WILD_TIERS.some((t) => pool[t].includes(theme.counter))) pool.uncommon.push(theme.counter);
  const speciesIds = wildSpecies(pool);
  return {
    biome,
    preview: {
      title: `Wild — ${source.name}`,
      detail: `${speciesIds.length} species`,
      speciesIds,
      wild: { pool, odds: wildOdds(rareChance) },
      levelBand: wildBandFor(layer, region.wildBand),
      icon: `wild-${biome}`,
    },
  };
}

/**
 * §2.7.3 — a trainer's, an Elite's or a Gym's Pokémon stands in the form its level warrants: one sent out at or past
 * its evolution threshold is evolved (`evolvedAt`), in every Region (v0.9.8, the user's call — until then Region 1's
 * rosters kept their first forms, and a Lv 13 Geodude stood in Brock's Gym). The wild is the exception: a Wild Area
 * shows its pool as it is, and a catch past its threshold evolves after the catch (§2.6.5).
 */
function evolveTeam<T extends { species: string; level: number }>(team: T[], content: ContentRegistry): T[] {
  return team.map((m) => ({ ...m, species: evolvedAt(m.species, m.level, content) }));
}

/**
 * §2.7.3 — the two types a set of Pokémon fields most (counting each Pokémon's every type), commonest first: what a
 * trainer "usually brings". Ties go to the type met first, so the hint is stable for a given Region.
 */
function usualTypes(species: readonly string[], content: ContentRegistry): PokemonType[] {
  const tally = new Map<PokemonType, number>();
  for (const id of species) for (const t of content.species(id).types) tally.set(t, (tally.get(t) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
}

/** A trainer node. In a lane, the archetype is the Gym's; in the trunk, anything the Region fields. */
function trainerPreview(rng: GameRng, content: ContentRegistry, used: Set<string>, layer: number, lane: GymDef | null, region: RegionContent): NodePreview {
  const themed = lane ? region.laneThemes[lane.type]!.trainers.flatMap((a) => region.trainers.filter((t) => t.archetype === a)) : region.trainers;
  const unused = themed.filter((t) => !used.has(t.id));
  // A lane has only two rosters of its archetype, so a long lane will repeat one; that is better than a
  // Swimmer lane with a Hiker in the middle of it, which would break the telegraph the lane exists to give.
  const roster: TrainerRoster = pickOne(rng, unused.length ? unused : themed.length ? themed : region.trainers);
  used.add(roster.id);

  const team = evolveTeam(trainerTeamFor(roster, layer, region.wildBand), content);
  const levels = team.map((m) => m.level);
  return {
    title: roster.name,
    rosterId: roster.id,
    icon: `trainer-${roster.archetype}`,
    // §2.7.3 — across every roster of the archetype in the Region, not this one: a hint, not a reveal.
    usualTypes: usualTypes(region.trainers.filter((t) => t.archetype === roster.archetype).flatMap((t) => t.team.map((m) => m.species)), content),
    // §2.7 — a trainer's team is a surprise, as it is in the games (v0.8.6, the user's call): the map says how many.
    detail: teamSizeLine(team.length),
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...levels), Math.max(...levels)],
    enemies: team,
  };
}

/** §2.7 — what the map says of a trainer's, an Elite's or a Gym's team: how many, never who (v0.8.6). */
const teamSizeLine = (n: number) => `A team of ${n} Pokémon`;

/** §2.9.1 — the field nurse. */
const AID_PREVIEW: NodePreview = {
  title: 'Field nurse',
  detail: `${AID_HEAL_PCT} % of max HP back for everyone in the Box, fainted or not, and every status cured. Free. Trauma stays — only a Pokémon Center's Therapy takes it off.`,
  speciesIds: [],
  levelBand: [0, 0],
};

/** §2.9.2 — the travelling merchant. */
const MERCHANT_PREVIEW: NodePreview = {
  title: 'Travelling merchant',
  detail: 'A cart with the basics: a couple of cures, Poké Balls, and one thing worth a look. One re-roll.',
  speciesIds: [],
  levelBand: [0, 0],
};

const MYSTERY_PREVIEW: NodePreview = {
  title: 'Something off the path',
  detail: 'A choice with its outcome stated up front — unless it is a gamble, and then it says that too.',
  speciesIds: [],
  levelBand: [0, 0],
};

/** §2.8.1 — the Elite Trainer: two Pokémon, both two-phase, a guaranteed relic. */
function elitePreview(content: ContentRegistry, layer: number, region: RegionContent): NodePreview {
  const team = evolveTeam(eliteTeamFor(layer, region.elite, region.wildBand), content);
  const levels = team.map((m) => m.level);
  return {
    title: region.elite.name,
    icon: 'elite',
    usualTypes: usualTypes(team.map((m) => m.species), content),
    detail: `${teamSizeLine(team.length)} · reward: a relic pick`,
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...levels), Math.max(...levels)],
    enemies: team,
  };
}

/** §2.8.2 — the Elite Wild: a boss-tier catchable. Catch it or beat it, never both. */
function eliteWildPreview(content: ContentRegistry, layer: number, region: RegionContent): NodePreview {
  const team = eliteWildTeamFor(layer, region.eliteWild, region.wildBand);
  const levels = team.map((m) => m.level);
  return {
    title: `Wild ${content.species(team[0]!.species).name}`,
    icon: 'elite-wild',
    detail: `${content.species(team[0]!.species).name} L${team[0]!.level} · catch it for the recruit, or beat it for a relic`,
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...levels), Math.max(...levels)],
    enemies: team,
  };
}

/** "water" is a type id; "Water Gym" is what a player reads. */
const typeName = (t: string) => t[0]!.toUpperCase() + t.slice(1);

function gymPreview(content: ContentRegistry, gym: GymDef): NodePreview {
  const team = evolveTeam(gymTeamFor(gym), content);
  const levels = team.map((m) => m.level);
  return {
    title: `${gym.name} — ${typeName(gym.type)} Gym`,
    icon: `gym-${gym.type}`,
    detail: `${teamSizeLine(team.length)} · ${gym.telegraph}`,
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...levels), Math.max(...levels)],
    enemies: team.map((m) => ({ species: m.species, level: m.level })),
  };
}


/** §2.9.5 — something on the ground. The find is named on the map: you see a Great Ball, not "an item". */
function cachePreview(find: GroundFind, content: ContentRegistry): NodePreview {
  const parts = [
    ...(find.items.length ? [supplyLabel(find.items, (id) => content.consumable(id).name)] : []),
    ...(find.money ? [`${find.money} ₽`] : []),
  ];
  return {
    title: 'Something on the ground',
    detail: parts.join(' and '),
    speciesIds: [],
    levelBand: [0, 0],
    icon: 'cache',
    find: { items: [...find.items], money: find.money },
  };
}

/** A track's place in one column: its row on the grid, and which part of the route it belongs to. */
interface Slot {
  row: number;
  group: Group;
}
/** One column of the route and the edges that reach it: `[parent index in the previous column, child index]`. */
interface Column {
  slots: Slot[];
  edges: [number, number][];
}

const clamp = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, n));
const isY = (g: Group) => g === 'lean0' || g === 'mid' || g === 'lean1';

/**
 * Settle a column's rows: each track inside its band, top to bottom, at least TRACK_GAP apart. The bands are sized
 * for the most tracks a part of the route can hold, so a top-down then a bottom-up pass always finds room.
 */
function settle(slots: Slot[]): void {
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    s.row = clamp(s.row, ROW_BAND[s.group]);
    if (i > 0) s.row = Math.max(s.row, slots[i - 1]!.row + TRACK_GAP);
  }
  for (let i = slots.length - 1; i >= 0; i--) {
    const s = slots[i]!;
    s.row = Math.min(s.row, ROW_BAND[s.group][1]);
    if (i < slots.length - 1) s.row = Math.min(s.row, slots[i + 1]!.row - TRACK_GAP);
  }
}

/**
 * One block of tracks carried into the next column: unchanged, one of them split in two, or two of them merged.
 * The children keep their parents' order, which is what keeps every edge monotone.
 */
function carry(rng: GameRng, prev: Slot[], from: number[], op: 'none' | 'split' | 'merge', group: (i: number, n: number) => Group, out: Column): void {
  const n = from.length;
  const at = op === 'none' ? -1 : Math.floor(rng.range01() * (op === 'split' ? n : n - 1));
  const drift = () => {
    const r = rng.range01();
    return r < 0.12 ? -1 : r > 0.88 ? 1 : 0;
  };
  const count = op === 'split' ? n + 1 : op === 'merge' ? n - 1 : n;
  let child = 0;
  for (let i = 0; i < n; i++) {
    const p = from[i]!;
    const row = prev[p]!.row;
    if (op === 'split' && i === at) {
      out.slots.push({ row: row - 1, group: group(child, count) }, { row: row + 1, group: group(child + 1, count) });
      out.edges.push([p, out.slots.length - 2], [p, out.slots.length - 1]);
      child += 2;
    } else if (op === 'merge' && i === at) {
      const q = from[i + 1]!;
      out.slots.push({ row: Math.round((row + prev[q]!.row) / 2), group: group(child, count) });
      out.edges.push([p, out.slots.length - 1], [q, out.slots.length - 1]);
      child += 1;
      i += 1;
    } else {
      const g = group(child, count);
      const pull = ROW_PULL[g];
      const toward = pull === undefined ? 0 : Math.sign(pull - row);
      out.slots.push({ row: row + (toward || drift()), group: g });
      out.edges.push([p, out.slots.length - 1]);
      child += 1;
    }
  }
}

/** Lay the next column from the previous one: §2.5's segments, each with its own way of moving its tracks. */
function nextColumn(rng: GameRng, prev: Slot[], layer: number, noReturn: number): Column {
  const out: Column = { slots: [], edges: [] };
  const all = prev.map((_, i) => i);

  if (layer === GYM_LAYER) {
    // Every lane track walks into its own Gym. The Gym sits where its lane's tracks come in.
    for (const lane of [0, 1] as const) {
      const from = all.filter((i) => prev[i]!.group === `lane${lane}`);
      const row = Math.round(from.reduce((a, i) => a + prev[i]!.row, 0) / from.length);
      out.slots.push({ row, group: `lane${lane}` });
      for (const p of from) out.edges.push([p, out.slots.length - 1]);
    }
    return out;
  }

  if (layer === noReturn + 1) {
    // §2.5 — the point of no return. The leaning tracks enter their own lane; the middle track's last node offers
    // both, one edge into each — the one node on the map where the choice is a single click.
    const top = ROW_BAND.lane0[0] + Math.floor(rng.range01() * 3);
    const bottom = ROW_BAND.lane1[0] + Math.floor(rng.range01() * 3);
    out.slots.push({ row: top, group: 'lane0' }, { row: top + TRACK_GAP, group: 'lane0' });
    out.slots.push({ row: bottom, group: 'lane1' }, { row: bottom + TRACK_GAP, group: 'lane1' });
    const [a, m, b] = [0, 1, 2];
    out.edges.push([a, 0]);
    if (rng.range01() < 0.5) out.edges.push([a, 1]);
    out.edges.push([m, 1], [m, 2]);
    if (rng.range01() < 0.5) out.edges.push([b, 2]);
    out.edges.push([b, 3]);
    return out;
  }

  if (layer <= Y_LAYER) {
    // The trunk: drift, and now and then a split or a merge — three or four tracks, never fewer than two. Into the
    // crossroads it settles on exactly three, which become the Y's leaning, middle and leaning tracks.
    const n = prev.length;
    let op: 'none' | 'split' | 'merge' = 'none';
    if (layer === Y_LAYER) op = n > 3 ? 'merge' : n < 3 ? 'split' : 'none';
    else {
      const r = rng.range01();
      if (r < TRUNK_SPLIT_CHANCE && n < 4) op = 'split';
      else if (r < TRUNK_SPLIT_CHANCE + TRUNK_MERGE_CHANCE && n > 2) op = 'merge';
    }
    const yGroups: Group[] = ['lean0', 'mid', 'lean1'];
    carry(rng, prev, all, op, (i) => (layer === Y_LAYER ? yGroups[i]! : 'trunk'), out);
    return out;
  }

  if (layer <= noReturn) {
    // The Y: three tracks, no splits — the shape is the three-way choice itself.
    carry(rng, prev, all, 'none', (i) => prev[i]!.group, out);
    return out;
  }

  // The lanes: each its own block, two tracks that may narrow to one for a column and widen again.
  for (const lane of [0, 1] as const) {
    const from = all.filter((i) => prev[i]!.group === `lane${lane}`);
    const r = rng.range01();
    const op = from.length === 2 && r < LANE_MERGE_CHANCE ? 'merge' : from.length === 1 && r < LANE_SPLIT_CHANCE ? 'split' : 'none';
    carry(rng, prev, from, op, () => `lane${lane}`, out);
  }
  return out;
}

/**
 * §2.5 — the crossings: the route's choices. For each adjacent pair of tracks that may meet (both in the trunk,
 * both on the Y, or both in one lane), at most one diagonal — down from the upper one to its neighbour's first
 * child, or up from the lower one to its neighbour's last — so the edges stay monotone and never form an X. A
 * pair that crossed in the column before does not cross again, and a node never takes a third child.
 */
function addCrossings(rng: GameRng, prev: Slot[], col: Column, layer: number, noReturn: number, lastCross: Map<number, number>): void {
  if (layer === GYM_LAYER || layer === noReturn + 1) return;
  const children = (p: number) => col.edges.filter(([a]) => a === p).map(([, c]) => c);
  for (let i = 0; i + 1 < prev.length; i++) {
    const [g, h] = [prev[i]!.group, prev[i + 1]!.group];
    const segment = g === 'trunk' && h === 'trunk' ? 'trunk' : isY(g) && isY(h) ? 'y' : g === h ? 'lane' : null;
    if (!segment || lastCross.get(i) === layer - 1) continue;
    if (rng.range01() >= CROSS_CHANCE[segment]) continue;
    const [ci, cj] = [children(i), children(i + 1)];
    if (ci.some((c) => cj.includes(c))) continue; // a merge already joins them
    const down = ci.length === 1;
    const up = cj.length === 1;
    if (!down && !up) continue;
    const goDown = down && (!up || rng.range01() < 0.5);
    const edge: [number, number] = goDown ? [i, Math.min(...cj)] : [i + 1, Math.max(...ci)];
    // At most three parents: a crossing onto a merge would make a funnel, not a choice.
    if (col.edges.filter(([, c]) => c === edge[1]).length >= 3) continue;
    col.edges.push(edge);
    lastCross.set(i, layer);
  }
}

/**
 * §2.9.1 — where a lane's nurse stands in the last column before its Gym: on a track every one of the lane's
 * tracks reaches, so no route in the lane walks into its Gym without passing her. If no track is reached by all,
 * the missing edge is added where it keeps the edges monotone; it nearly always can.
 */
function placeNurse(rng: GameRng, columns: Column[], layer: number, lane: 0 | 1): number {
  const col = columns[layer]!;
  const prev = columns[layer - 1]!.slots;
  const group = `lane${lane}`;
  const parents = prev.map((s, i) => (s.group === group ? i : -1)).filter((i) => i >= 0);
  const mine = col.slots.map((s, i) => (s.group === group ? i : -1)).filter((i) => i >= 0);
  const reaches = (c: number) => parents.every((p) => col.edges.some(([a, b]) => a === p && b === c));
  const covered = mine.filter(reaches);
  if (covered.length) return pickOne(rng, covered);
  for (const c of mine) {
    const missing = parents.filter((p) => !col.edges.some(([a, b]) => a === p && b === c));
    const ok = missing.every((p) => {
      if (col.edges.filter(([a]) => a === p).length >= 2) return false;
      return col.edges.every(([a, b]) => (a < p ? b <= c : a > p ? b >= c : true));
    });
    if (!ok) continue;
    for (const p of missing) col.edges.push([p, c]);
    return c;
  }
  return pickOne(rng, mine);
}

/** §2.5.1 — the stop columns: 2|3, 5|6, the crossroads, the point of no return, p+2|p+3, and the last before the Gym. */
function stopColumns(rng: GameRng, noReturn: number): Map<number, StopMix> {
  const stops = new Map<number, StopMix>();
  stops.set(2 + Math.floor(rng.range01() * 2), 'early');
  stops.set(5 + Math.floor(rng.range01() * 2), 'mid');
  stops.set(Y_LAYER, 'cross');
  stops.set(noReturn, 'no-return');
  stops.set(noReturn + 2 + Math.floor(rng.range01() * 2), 'lane');
  stops.set(GYM_LAYER - 1, 'last');
  return stops;
}

/** A stop: weighted by where it stands, never the same as the stop above it, and one nurse and one merchant a column at most. */
function rolledStop(rng: GameRng, mix: StopMix, column: readonly NodeKind[]): NodeKind {
  const above = column[column.length - 1];
  const entries = Object.entries(STOP_MIX[mix])
    .map(([value, weight]) => ({ value: value as NodeKind, weight: weight! }))
    .filter((e) => e.value !== above && !(ONE_PER_COLUMN.includes(e.value) && column.includes(e.value)));
  return entries.length ? pickWeighted(rng, entries) : 'cache';
}

/**
 * A rolled fight, weighted by column.
 *
 * §2.5's "no two adjacent nodes share a type" was the rule here until v0.5, and it turned out to *override*
 * the weighting rather than season it: at column 0's 9:2 Wild bias it fired on almost every roll. A row cannot be
 * both mostly-one-kind and never-twice-in-a-row; those are contradictory instructions. So the rule is **no three
 * in a row**: it still breaks up a wall of identical badges, and it leaves a deliberate weighting alone.
 */
function rolled(rng: GameRng, weights: Partial<Record<NodeKind, number>>, column: readonly NodeKind[]): NodeKind {
  const kind = pickWeighted(rng, Object.entries(weights).map(([value, weight]) => ({ value: value as NodeKind, weight: weight! })));
  const [a, b] = [column[column.length - 1], column[column.length - 2]];
  if (a && b && a === kind && b === kind) return kind === 'wild' ? 'trainer' : 'wild';
  return kind;
}

/**
 * §2.1 placeholder — a preview moved up the level ladder, its Pokémon evolved to the forms those levels warrant
 * (`evolvedAt`). Every species and level a fight uses is read off its preview (the wild band and pool, the
 * trainer, Elite and Gym rosters), so shifting the preview shifts the fight, and the map and the fight can
 * never disagree (Pillar 1). A service node has no levels to move.
 */
function shifted(preview: NodePreview, offset: number, content: ContentRegistry): NodePreview {
  if (!offset || (preview.levelBand[0] === 0 && preview.levelBand[1] === 0)) return preview;
  const levelBand: [number, number] = [preview.levelBand[0] + offset, preview.levelBand[1] + offset];
  const name = (id: string) => content.species(id).name;
  if (!preview.enemies) {
    // A wild pool: the band's floor decides the form, so every level the node can roll shows the species named. A
    // form two tiers share stays in the commoner one.
    if (preview.wild) {
      const seen = new Set<string>();
      const pool = Object.fromEntries(
        WILD_TIERS.map((t) => [t, [...new Set(preview.wild!.pool[t].map((id) => evolvedAt(id, levelBand[0], content)))].filter((id) => !seen.has(id) && !!seen.add(id))]),
      ) as Record<WildTier, string[]>;
      const speciesIds = wildSpecies(pool);
      return { ...preview, levelBand, speciesIds, detail: `${speciesIds.length} species`, wild: { ...preview.wild, pool } };
    }
    const speciesIds = [...new Set(preview.speciesIds.map((id) => evolvedAt(id, levelBand[0], content)))];
    return { ...preview, levelBand, speciesIds, detail: speciesIds.map(name).join(' · ') };
  }
  let detail = preview.detail;
  let title = preview.title;
  const enemies = preview.enemies.map((e) => {
    const level = e.level + offset;
    const species = evolvedAt(e.species, level, content);
    detail = detail.replace(`${name(e.species)} L${e.level}`, `${name(species)} L${level}`);
    if (title === `Wild ${name(e.species)}`) title = `Wild ${name(species)}`;
    return { ...e, species, level };
  });
  return { ...preview, title, levelBand, detail, enemies, speciesIds: enemies.map((e) => e.species) };
}

/** §2.5 — build a Region. Deterministic in `rng`, which the caller seeds from the run seed. */
export function generateRegion(rng: GameRng, content: ContentRegistry, regionIndex = 0, seed = 0, modifiers: readonly string[] = [], excludeGyms: readonly string[] = [], rareChance = WILD_RARE_CHANCE): RegionMap {
  // §2.1 — which Region's tables this route is built from.
  const region = regionContent(regionIndex);
  // §5.9.2 — two distinct Gyms, drawn before anything else so every lane node can be themed by its own.
  // §8.8.2 One Path collapses them to one.
  const [gymA, gymB] = drawGymPair(rng, hasModifier(modifiers, 'one-path'), excludeGyms, region.gyms);
  const lanes: GymDef[] = [gymA, gymB];
  // §2.1 placeholder — how far above its tables this Region's levels sit.
  const offset = region.levelOffset;

  // The shape first: where the Y closes, where the Elite and the stops stand, then the tracks column by column.
  const noReturn = pickOne(rng, NO_RETURN_LAYERS);
  const eliteLayer = pickOne(rng, ELITE_LAYERS);
  const stops = stopColumns(rng, noReturn);
  const entryTracks = rng.range01() < 0.6 ? 3 : 4;
  // The entry tracks sit about the middle of the trunk's band, nudged a row either way.
  const [lo, hi] = ROW_BAND.trunk;
  const free = hi - lo - (entryTracks - 1) * TRACK_GAP;
  const base = lo + Math.floor(free / 2) + Math.round(rng.range01() * 2 - 1);
  const columns: Column[] = [{ slots: Array.from({ length: entryTracks }, (_, i) => ({ row: base + i * TRACK_GAP, group: 'trunk' as Group })), edges: [] }];
  settle(columns[0]!.slots);
  const lastCross = new Map<number, number>();
  for (let layer = 1; layer < LAYERS; layer++) {
    const prev = columns[layer - 1]!.slots;
    const col = nextColumn(rng, prev, layer, noReturn);
    settle(col.slots);
    addCrossings(rng, prev, col, layer, noReturn, lastCross);
    columns.push(col);
  }

  // §2.5.1 — the two rolled specials, both in a lane's fight column. The extra Elite goes in a lane, not the trunk:
  // a second Elite before the fork is a wall in a corridor everyone walks; in a lane it is a reason to take the
  // other one. A lane holds at most one special, and the stops never hold one.
  const laneFights = Array.from({ length: GYM_LAYER - noReturn - 1 }, (_, i) => noReturn + 1 + i).filter((l) => !stops.has(l));
  const extraElite = rng.range01() < EXTRA_ELITE_TRAINER_CHANCE ? { lane: Math.floor(rng.range01() * 2), layer: pickOne(rng, laneFights) } : null;
  const eliteWild = rng.range01() < ELITE_WILD_CHANCE ? { lane: Math.floor(rng.range01() * 2), layer: pickOne(rng, laneFights) } : null;
  if (eliteWild && extraElite && eliteWild.lane === extraElite.lane) eliteWild.lane = 1 - extraElite.lane;

  const nodes: Record<string, MapNode> = {};
  const usedTrainers = new Set<string>();
  const ids = columns.map((c, layer) => c.slots.map((_, col) => `n${layer}-${col}`));
  // Placed before any node is built, because placing her may add the edge that lets every lane track reach her.
  const nurses = ([0, 1] as const).map((lane) => placeNurse(rng, columns, GYM_LAYER - 1, lane));
  for (let layer = 0; layer < LAYERS; layer++) {
    const { slots } = columns[layer]!;
    const kinds: NodeKind[] = [];
    const mix = stops.get(layer);
    // §2.9.1 — the last stop guarantees each lane its nurse, on one of its tracks — reachable from every track.
    const nurseAt = layer === GYM_LAYER - 1 ? nurses : [];
    for (let col = 0; col < slots.length; col++) {
      const slot = slots[col]!;
      const lane = slot.group === 'lane0' ? 0 : slot.group === 'lane1' ? 1 : undefined;
      let kind: NodeKind;
      if (layer === GYM_LAYER) kind = 'gym';
      else if (nurseAt.includes(col)) kind = 'aid';
      else if (mix) kind = rolledStop(rng, mix, kinds);
      // §2.8.1 — the Elite on the Y's middle track: the price of keeping both Gyms open, with a fight on each side.
      else if (layer === eliteLayer && slot.group === 'mid') kind = 'elite';
      else if (eliteWild && layer === eliteWild.layer && lane === eliteWild.lane && !kinds.some((k) => k === 'elite-wild')) kind = 'elite-wild';
      else if (extraElite && layer === extraElite.layer && lane === extraElite.lane && !kinds.includes('elite')) kind = 'elite';
      else kind = rolled(rng, fightWeights(layer, lane !== undefined), kinds);
      kinds.push(kind);
    }
    // §2.5 — the opening always offers a Wild to walk into, however the weighting rolled.
    if (layer === 0 && !kinds.includes('wild')) kinds[0] = 'wild';
    // §2.5.1 — a fight column always holds a fight: a column of stops is a stop column, and there are six of those.
    if (!mix && layer !== GYM_LAYER && kinds.every((k) => STOP_KINDS.includes(k))) kinds[kinds.length - 1] = 'trainer';

    for (let col = 0; col < slots.length; col++) {
      const slot = slots[col]!;
      const kind = kinds[col]!;
      const lane = layer === GYM_LAYER ? col : slot.group === 'lane0' ? 0 : slot.group === 'lane1' ? 1 : undefined;
      const lean = slot.group === 'lean0' ? 0 : slot.group === 'lean1' ? 1 : undefined;
      // A committed lane, or a leaning track, wears its Gym's theme; the trunk and the middle track draw from the Region.
      const theme = lane !== undefined ? lanes[lane]! : lean !== undefined ? lanes[lean]! : null;
      const preview = shifted(
        kind === 'wild' ? wildPreview(rng, content, layer, theme, region, rareChance).preview
        : kind === 'trainer' ? trainerPreview(rng, content, usedTrainers, layer, theme, region)
        : kind === 'aid' ? AID_PREVIEW
        : kind === 'merchant' ? MERCHANT_PREVIEW
        : kind === 'mystery' ? MYSTERY_PREVIEW
        : kind === 'cache' ? cachePreview(rollGroundFind(rng, regionIndex), content)
        : kind === 'elite' ? elitePreview(content, layer, region)
        : kind === 'elite-wild' ? eliteWildPreview(content, layer, region)
        : gymPreview(content, lanes[col]!),
        offset,
        content,
      );
      const id = ids[layer]![col]!;
      const next = layer + 1 < LAYERS
        ? [...new Set(columns[layer + 1]!.edges.filter(([p]) => p === col).map(([, c]) => ids[layer + 1]![c]!))].sort()
        : [];
      const node: MapNode = { id, layer, col, row: slot.row, kind, next, preview };
      if (lane !== undefined) node.lane = lane;
      if (lean !== undefined) node.lean = lean;
      nodes[id] = node;
    }
  }

  // §2.9.2 — at least one merchant in the trunk's stops, so what it sells has the route to pay back.
  const trunkStops = [...stops].filter(([, m]) => m === 'early' || m === 'mid').map(([l]) => l);
  const trunkStopNodes = Object.values(nodes).filter((n) => trunkStops.includes(n.layer));
  if (!trunkStopNodes.some((n) => n.kind === 'merchant')) {
    const early = trunkStopNodes.filter((n) => n.layer === Math.min(...trunkStops));
    const pick = pickOne(rng, early);
    pick.kind = 'merchant';
    pick.preview = MERCHANT_PREVIEW;
  }

  return {
    seed,
    regionIndex,
    layers: LAYERS,
    rows: MAP_ROWS,
    nodes,
    entry: ids[0]!,
    gyms: [gymA.id, gymB.id],
    forkLayer: noReturn + 1,
    yLayer: Y_LAYER,
  };
}

/** The column the point of no return stands on: the last one before the lanes. */
export const noReturnLayer = (map: RegionMap): number => map.forkLayer - 1;

export const nodesInLayer = (map: RegionMap, layer: number): MapNode[] =>
  Object.values(map.nodes).filter((n) => n.layer === layer).sort((a, b) => a.col - b.col);

/** Which Gym a node's lane leads to, or null in the shared trunk. */
export function laneGymOf(map: RegionMap, node: MapNode): GymDef | null {
  return node.lane === undefined ? null : gymById(map.gyms[node.lane]!);
}

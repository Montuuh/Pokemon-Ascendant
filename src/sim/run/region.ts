import type { GymRuleId } from '../combat/gymRules';
import type { ContentRegistry } from '../content/defs';
import type { PokemonType } from '../types';
import { fnv1a } from '../rng/rngStreams';

// The Regions' content tables: biomes, wild pools, trainer rosters, the Elites and the Gyms (§2.6.1, §2.6.3,
// §2.7.1, §2.8, §5.9), one `RegionContent` per Region. Rows mirror docs/design/catalogs/{biomes-regions,trainers,
// elites,gyms,species-r2}.md; ids are validated against the registry by `assertRegionContent`, so a typo here
// fails the content test rather than a playthrough.
//
// The Region 1 tables keep their historical names (`BIOMES`, `TRAINERS`, `GYMS`, `ELITE`…) because fixtures,
// tests and the v0.2–v0.6 code read them by those names; everything that has to know *which* Region asks
// `regionContent(index)`.

/**
 * §2.6.1 — a Wild Area's habitat (2026-10-20: "many more kinds of Wild Area, with more pools"). The ids of the first
 * three — `meadow`, `cave`, `river` — are the v0.9.7 biomes', kept so a saved map's nodes still find their ground.
 */
export type BiomeId =
  | 'tall-grass' | 'meadow' | 'forest' | 'cave' | 'ridge' | 'river' | 'shore' | 'sea' | 'power-plant' | 'tower'
  | 'swamp' | 'badlands' | 'volcano' | 'lake' | 'sky' | 'ruins';

export interface BiomePool {
  id: BiomeId;
  name: string;
  /** Stage backdrop id under public/art/stages. */
  stage: string;
  common: string[];
  uncommon: string[];
  rare: string[];
}

/** §2.6.2 — the three rarities a Wild Area rolls between on entry. */
export type WildTier = 'common' | 'uncommon' | 'rare';
export const WILD_TIERS: readonly WildTier[] = ['common', 'uncommon', 'rare'];

/**
 * §2.6.2 — the chance each rarity is rolled when you walk into a Wild Area (v0.9.7, the user's call): a Common
 * most of the time, a Rare one time in ten. The species is then drawn evenly inside the rolled tier, so a tier's
 * share is split between its members. The Naturalist's Lens raises the Rare share (§2.11.3).
 */
export const WILD_TIER_ODDS: Record<WildTier, number> = { common: 0.6, uncommon: 0.3, rare: 0.1 };

/**
 * §2.6.1 / §2.6.3 — Region 1's habitats (2026-10-20). Nine pools of eight to eleven (the floor stays v0.9.7's "big and
 * varied" eight), each with a type of its own, so *where* you look
 * is a plan — a Fishing Spot for Water, a Rocky Ridge for Fighting and Fire, the Power Plant for Electric — where the
 * v0.9.7 Meadow held twenty-five species and every lane looked the same. First forms only, as before: every one with an
 * evolution ahead of it, no last form on Route 1. Every Rare has a home: the starters' basics, Pikachu and Eevee, the
 * fossils in the Cave, Dratini in the pond.
 */
export const BIOMES: Partial<Record<BiomeId, BiomePool>> & Record<'meadow' | 'cave' | 'river', BiomePool> = {
  'tall-grass': {
    id: 'tall-grass', name: 'Tall Grass', stage: 'tall-grass',
    common: ['pidgey', 'rattata', 'spearow', 'nidoran-f', 'nidoran-m'],
    uncommon: ['ekans', 'meowth', 'doduo', 'jigglypuff'],
    rare: ['eevee'],
  },
  forest: {
    id: 'forest', name: 'Forest', stage: 'forest',
    common: ['caterpie', 'weedle', 'oddish', 'paras'],
    uncommon: ['bellsprout', 'venonat', 'exeggcute'],
    rare: ['pikachu', 'bulbasaur', 'scyther'],
  },
  meadow: {
    id: 'meadow', name: 'Flower Meadow', stage: 'meadow',
    common: ['oddish', 'bellsprout', 'jigglypuff', 'nidoran-f'],
    uncommon: ['clefairy', 'exeggcute', 'vulpix', 'growlithe', 'ponyta'],
    rare: ['bulbasaur', 'eevee'],
  },
  cave: {
    id: 'cave', name: 'Cave', stage: 'cave',
    common: ['zubat', 'geodude', 'diglett', 'paras'],
    uncommon: ['clefairy', 'sandshrew', 'cubone', 'rhyhorn', 'onix'],
    rare: ['kabuto', 'omanyte'],
  },
  ridge: {
    id: 'ridge', name: 'Rocky Ridge', stage: 'mountain',
    common: ['geodude', 'mankey', 'machop', 'sandshrew', 'spearow'],
    uncommon: ['rhyhorn', 'cubone', 'ponyta', 'growlithe'],
    rare: ['charmander'],
  },
  river: {
    id: 'river', name: 'Fishing Spot', stage: 'pond',
    common: ['magikarp', 'poliwag', 'goldeen', 'psyduck', 'krabby'],
    uncommon: ['slowpoke', 'horsea', 'shellder'],
    rare: ['dratini', 'squirtle'],
  },
  shore: {
    id: 'shore', name: 'Seashore', stage: 'beach',
    common: ['tentacool', 'krabby', 'shellder', 'psyduck'],
    uncommon: ['staryu', 'seel', 'horsea'],
    rare: ['squirtle', 'omanyte'],
  },
  'power-plant': {
    id: 'power-plant', name: 'Power Plant', stage: 'power-plant',
    common: ['magnemite', 'voltorb', 'rattata', 'grimer'],
    uncommon: ['koffing', 'meowth', 'ekans'],
    rare: ['pikachu'],
  },
  tower: {
    id: 'tower', name: 'Old Tower', stage: 'tower',
    common: ['gastly', 'zubat', 'koffing'],
    uncommon: ['drowzee', 'cubone', 'grimer', 'exeggcute'],
    rare: ['abra'],
  },
};

/** §2.6.1 — Region 1 is grass country: its Tall Grass and its Forest come up most, the Tower and the shore least. */
export const REGION1_BIOME_WEIGHTS: { biome: BiomeId; weight: number }[] = [
  { biome: 'tall-grass', weight: 4 },
  { biome: 'forest', weight: 3 },
  { biome: 'meadow', weight: 2 },
  { biome: 'cave', weight: 2 },
  { biome: 'ridge', weight: 2 },
  { biome: 'river', weight: 2 },
  { biome: 'shore', weight: 1 },
  { biome: 'power-plant', weight: 1 },
  { biome: 'tower', weight: 1 },
];

/**
 * §2.6.3 — the whole route's wild span. A single flat band made layer 0 as dangerous as layer 5, so the band
 * walks with the route instead: the first node is L5–6, the last before the Gym is L12–13.
 */
export const WILD_LEVEL_BAND: [number, number] = [5, 18];

/**
 * The layer count the band is spread across. It is a constant here rather than an import from `map.ts`
 * because `map.ts` imports *this* file; the map test asserts they agree.
 */
export const ROUTE_LAYERS = 20;

/**
 * The wild band at a given layer, spread across the whole route.
 *
 * It used to be `band[0] + layer`, capped — which worked on a route that was as long as the band was wide.
 * On v0.5's twelve layers that capped at layer 8 and left the last four layers offering the same level as the
 * eighth, so a team walked into the Gym four fights over-levelled: the harness measured 18–20 against a Gym
 * built for 14. The band is a *ramp across the route* now, not an offset from the layer index.
 */
export function wildBandFor(layer: number, band: readonly [number, number] = WILD_LEVEL_BAND): [number, number] {
  const [lo, hi] = band;
  const t = Math.min(1, Math.max(0, layer) / (ROUTE_LAYERS - 2));
  const base = Math.round(lo + (hi - lo - 1) * t);
  return [base, base + 1];
}

/**
 * §2.7.3 — a trainer sits 1–2 levels above the wild band of its layer. The roster table keeps the team's
 * internal spread; the layer decides where that spread sits.
 */
export function trainerTeamFor(roster: TrainerRoster, layer: number, band: readonly [number, number] = WILD_LEVEL_BAND): { species: string; level: number }[] {
  const base = wildBandFor(layer, band)[1] + 1;
  const floor = Math.min(...roster.team.map((m) => m.level));
  const team = roster.team.map((m) => ({ species: m.species, level: base + (m.level - floor) }));
  // §2.7.1 / §5.6.3 — a trainer carries the Region's team size (TEAM_SIZE): the roster's own Pokémon first, then
  // more of its archetype's, at its lowest level. Pure, so the map's preview and the fight always agree.
  const regionIndex = Math.max(0, REGIONS.findIndex((r) => r.trainers.some((t) => t.id === roster.id)));
  const pool = [...new Set(REGIONS[regionIndex]!.trainers.filter((t) => t.archetype === roster.archetype).flatMap((t) => t.team.map((m) => m.species)))];
  return padTeam(team, pool, TEAM_SIZE.trainer[regionIndex] ?? team.length, base - PAD_LEVEL_GAP.trainer, roster.id);
}

/**
 * §5.6.3 — how many Pokémon a trainer, an Elite and a Gym Leader carry, per Region. The user's call (2026-09-30):
 * trainers carry more and fight two or three at once; an Elite at least four, a Gym Leader five.
 */
export const TEAM_SIZE = { trainer: [3, 3, 3], elite: [4, 4, 4], gym: [5, 5, 5] } as const;

/**
 * §5.6.3 — how many levels under the team's own Pokémon the ones padding it stand. The padding widens a fight; the
 * Leader's and the Elite's own Pokémon stay the threat. Since 2026-10-20 a padded Pokémon stands at its column's level
 * (§2.8.1, "levels read right"): until then the gaps were 4 / 6 / 8, which put a Lv 2 Onix beside a Lv 8 Pidgeotto in
 * the Region 1 Elite and Lv 3 Pokémon in front of Brock — the user's playtest, against a team at Lv 11.
 */
export const PAD_LEVEL_GAP = { trainer: 4, elite: 4, gym: 3 } as const;

/**
 * §2.8.1 / §5.9.3 — the Elite's and the Gym's level premium over the band: **levels read right** (2026-10-20). A boss's
 * own Pokémon stand over the team that can reach it — the Elite's opener two over the band's top and its closer three,
 * a Gym's non-aces one over the Region's top and its ace three — and its threat is tuned by Attack
 * (`ELITE_ATTACK_MULTIPLIER`, `GYM_ATTACK_MULTIPLIER`), its pay by its tier's XP (§6.2.1 `eliteXp`, `gymXp`), so a
 * higher level never refunds itself in XP. History: +2 and +4/+6 until v0.8.5, when a boss fought one Pokémon at a
 * time; then −2 and −2/0, which kept the difficulty by standing the boss five to eight levels under the team.
 */
export const ELITE_LEVEL_PREMIUM = 3;
export const GYM_LEVEL_PREMIUM = { other: 1, middle: -1, ace: 3 } as const;
/** §2.8.1 — the Elite's own Attack, on top of the Region's tier: its threat, now that its levels read right. */
export const ELITE_ATTACK_MULTIPLIER: readonly number[] = [0.65, 0.85, 1.0];
/**
 * §5.9.3 — a Gym's own Attack, on top of the Region's tier (v0.8.8): the climax is a threat by how hard it hits, not
 * by levels — a higher premium made the run easier, because a Gym above the team pays it more XP (§6.2.1). v0.9.8 walked
 * every Gym through its evolutions (§2.7.3) — Region 2's fielded Arcanine and Electrode where they had held a Growlithe
 * and a Voltorb, and lost 34 % of the time — so ×1.3 / ×1.5 / ×1.15 became ×1.15 / ×1.1 / ×1.15. v0.9.12 (whole HP,
 * divisor 5, the Gym's ace acting twice): ×1.15 / ×1.0 / ×1.0. v0.9.13 gave every Leader a rule of its own (§5.9.5), the
 * climax's threat by how it fights; Regions 2 and 3 handed back a little Attack for it: ×1.15 / ×0.95 / ×0.9. v0.9.88's
 * authored fives put four real attackers where Region 2 had padding: its Gyms lost 16 % against 5 % over 990 runs, so
 * Region 2 went 0.62 → 0.55. v0.9.92 (§5.9.3) re-cut the Gyms to forms legal at their levels — Region 1's Kabuto where it
 * fielded Kabutops — and gave every ace a combo: Region 1 0.7 → 0.8, Region 3 0.5 → 0.58.
 */
export const GYM_ATTACK_MULTIPLIER: readonly number[] = [0.8, 0.55, 0.58];

/**
 * Pad a team to `size` from `pool` (another species first), deterministically: the pick is a hash of `key` and
 * the slot, never a draw, so no stream moves and a saved map rebuilds the same teams.
 */
function padTeam<T extends { species: string; level: number }>(team: T[], pool: string[], size: number, level: number, key: string, extra?: Omit<T, 'species' | 'level'>): T[] {
  const out = [...team];
  for (let i = 0; out.length < size && pool.length; i++) {
    const fresh = pool.filter((s) => !out.some((m) => m.species === s));
    const from = fresh.length ? fresh : pool;
    const species = from[fnv1a(`${key}:${i}`) % from.length]!;
    out.push({ ...(extra as object), species, level } as T);
  }
  return out;
}

export interface TrainerRoster {
  id: string;
  /** §2.7.1 — the archetype this roster belongs to. A lane theme names archetypes, not rosters. */
  archetype: string;
  name: string;
  /** Showdown sprite id under public/art/trainers. */
  sprite: string;
  /** §2.7.3 — a trainer sits 1–2 levels above the wild band. */
  team: { species: string; level: number }[];
  line: string;
  /**
   * §2.7.1 Hex Maniac — "vision disruption": every one of its Pokémon hides its first intent, the rule an Elite
   * or a Gym plays by (§5.5), on an ordinary trainer. Keen Eye, the Marsh Badge or a Familiar species read through it.
   */
  veiled?: boolean;
}

/**
 * §2.7.1 — the Region 1 archetypes, two rosters each so a route never repeats a team. Rows are ported from
 * `catalogs/trainers.md` §2.
 *
 * Swimmers joined in v0.5 because the Gym fork needs a trainer archetype per Gym type (§2.5): the Water lane
 * is Swimmers the way the Rock lane is Hikers, and without them a Water lane would have looked like every
 * other lane with a different signpost at the end.
 */
export const TRAINERS: TrainerRoster[] = [
  { id: 'bug-catcher-a', archetype: 'bug-catcher', name: 'Bug Catcher Rick', sprite: 'bug-catcher', line: 'My bugs are stronger than they look!',
    team: [{ species: 'caterpie', level: 11 }, { species: 'weedle', level: 12 }] },
  { id: 'bug-catcher-b', archetype: 'bug-catcher', name: 'Bug Catcher Doug', sprite: 'bug-catcher', line: 'I caught these myself, you know.',
    team: [{ species: 'metapod', level: 14 }, { species: 'kakuna', level: 14 }] },
  { id: 'youngster-a', archetype: 'youngster', name: 'Youngster Joey', sprite: 'youngster', line: 'My Rattata is in the top percentage!',
    team: [{ species: 'rattata', level: 14 }] },
  { id: 'youngster-b', archetype: 'youngster', name: 'Youngster Ben', sprite: 'youngster', line: 'Shorts are comfy and easy to wear!',
    team: [{ species: 'pidgey', level: 14 }, { species: 'rattata', level: 15 }] },
  { id: 'lass-a', archetype: 'lass', name: 'Lass Iris', sprite: 'lass', line: 'Let me show you what I have been growing.',
    team: [{ species: 'oddish', level: 14 }, { species: 'pidgey', level: 15 }] },
  { id: 'lass-b', archetype: 'lass', name: 'Lass Nina', sprite: 'lass', line: 'Do not underestimate an Oddish.',
    team: [{ species: 'weedle', level: 14 }, { species: 'oddish', level: 15 }] },
  { id: 'hiker-a', archetype: 'hiker', name: 'Hiker Marcos', sprite: 'hiker', line: 'This whole ridge is my training ground.',
    team: [{ species: 'geodude', level: 15 }, { species: 'onix', level: 15 }] },
  { id: 'hiker-b', archetype: 'hiker', name: 'Hiker Dov', sprite: 'hiker', line: 'You will not get past a wall of rock.',
    team: [{ species: 'diglett', level: 14 }, { species: 'geodude', level: 16 }] },
  { id: 'swimmer-a', archetype: 'swimmer', name: 'Swimmer Cass', sprite: 'swimmer', line: 'The water is warmer than it looks. Come in.',
    team: [{ species: 'poliwag', level: 14 }, { species: 'magikarp', level: 12 }] },
  { id: 'swimmer-b', archetype: 'swimmer', name: 'Swimmer Tomas', sprite: 'swimmer', line: 'I train out past the shelf. You would not last.',
    team: [{ species: 'psyduck', level: 15 }, { species: 'krabby', level: 15 }] },
];

/** The rosters of one archetype, for the lane themes. */
export const rostersOf = (archetype: string): TrainerRoster[] => TRAINERS.filter((t) => t.archetype === archetype);

/**
 * §2.8.1 — the Region 1 Elite Trainer. Two Pokémon, both two-phase, no type lock (that is the Gym's identity).
 *
 * The catalogue's Rival counter-picks your starter and the Specialist is an Ace Trainer with Pidgeotto and
 * Ivysaur. The counter-pick needs a Rival who reappears across Regions to mean anything, so v0.4 ships the
 * Specialist — the same fight, minus a narrative hook that has nowhere to land yet.
 */
export interface EliteDef {
  id: string;
  name: string;
  sprite: string;
  line: string;
  team: { species: string; level: number; phaseCount: 1 | 2 | 3 }[];
}

export const ELITE: EliteDef = {
  id: 'elite-ace-trainer-r1',
  name: 'Ace Trainer Nadia',
  sprite: 'acetrainer',
  line: 'I only battle people who are going somewhere. Show me.',
  team: [
    { species: 'pidgeotto', level: 16, phaseCount: 2 },
    { species: 'ivysaur', level: 18, phaseCount: 2 },
  ],
};

/** §2.8.1 — the Elite sits two levels above the wild band of its layer. It is the run's hardest fight but one. */
export function eliteTeamFor(layer: number, elite: EliteDef = ELITE, band: readonly [number, number] = WILD_LEVEL_BAND): { species: string; level: number; phaseCount: 1 | 2 | 3 }[] {
  // §2.8.1 — band + ELITE_LEVEL_PREMIUM. Two before v0.8.5; the Elite fights two at a time with four Pokémon now.
  const base = wildBandFor(layer, band)[1] + ELITE_LEVEL_PREMIUM;
  const floor = Math.min(...elite.team.map((m) => m.level));
  const own = elite.team.map((m) => ({ species: m.species, level: base + (m.level - floor), phaseCount: m.phaseCount }));
  // §5.6.3 — four at least (TEAM_SIZE.elite): the Region's trainers lend the rest, a level under the Elite's floor,
  // one phase each. Its first Pokémon opens, its last closes; the loaned ones stand between.
  const regionIndex = Math.max(0, REGIONS.findIndex((r) => r.elite.id === elite.id));
  const pool = [...new Set(REGIONS[regionIndex]!.trainers.flatMap((t) => t.team.map((m) => m.species)))];
  const size = TEAM_SIZE.elite[regionIndex] ?? own.length;
  const filled = padTeam(own.slice(0, 1), pool, size - (own.length - 1), base - PAD_LEVEL_GAP.elite, elite.id, { phaseCount: 1 as const });
  return [...filled, ...own.slice(1)];
}

/**
 * §2.8.2 — the Elite Wild: a boss-tier **catchable**. Catch it for the recruit, or beat it for a Rare relic;
 * never both. It is a seeded special node, at most one per Region and genuinely not on every map.
 *
 * `catalogs/elites.md` offers two Region 1 rows. `elite-wild-snorlax` is the one that ships, because the
 * other — `marowak-spirit` — is a Ghost-typed variant species with four moves the sim has no effect kind for,
 * and a boss whose script cannot run is worse than a boss that is not there.
 *
 * Snorlax's own script needs two of those kinds too (`snore`'s while-asleep gate, `yawn`'s delayed status),
 * so the shipped profile is the half that has a definition: Amnesia to brace, Rest to heal and sleep, Body
 * Slam and Crunch when it wakes. The catch threshold still rises in Phase 2, which is the mechanic the node
 * exists for (§2.8.2: "it is tiring — throw now").
 */
export interface EliteWildDef {
  id: string;
  species: string;
  level: number;
  phaseCount: 2;
  stage: string;
  line: string;
  /** §2.8.2 — the boss script's kit when the catalogue gives it one; otherwise the species' own at its level. */
  moves?: string[];
}

export const ELITE_WILD: EliteWildDef = {
  id: 'elite-wild-snorlax',
  species: 'snorlax',
  level: 21,
  /** §2.8.2 — boss-tier HP, two phases, no evolution: it is a wild, not an ace. */
  phaseCount: 2,
  stage: 'elite-snorlax',
  line: 'Something enormous is asleep across the path. It has not noticed you yet.',
};

/** §2.8.2 — the Elite Wild sits with the Elite Trainer's premium: it is the other hardest fight but one. */
export function eliteWildTeamFor(layer: number, eliteWild: EliteWildDef = ELITE_WILD, band: readonly [number, number] = WILD_LEVEL_BAND): { species: string; level: number }[] {
  return [{ species: eliteWild.species, level: wildBandFor(layer, band)[1] + 4 }];
}

/** §5.9.3 — one authored Gym slot. `guest` is the declared off-type member's job, promised before the fork (§2.7.3). */
export interface GymMember {
  species: string;
  phaseCount: 1 | 2 | 3;
  moves: string[];
  signature?: { move: string; response: string };
  guest?: string;
  /** §5.5.2 — its authored combo: a set-up, then what it sets up (both join its kit). */
  combo?: [string, string];
}
/** A Gym slot as fielded: its level from the band. A legacy roster's padded slots carry no scripted kit. */
export type GymFielded = Omit<GymMember, 'moves'> & { level: number; moves?: string[] };

export interface GymDef {
  id: string;
  /** §5.9.2 — the Region whose pool it belongs to (1–3); its levels come from that Region's band. */
  region: number;
  name: string;
  sprite: string;
  type: PokemonType;
  /** §5.10 — the id of the Badge this Gym awards, in `content/data/badges.json`. */
  badgeId: string;
  stage: string;
  line: string;
  /**
   * §5.9.3 — the Leader's five, in deployment order, the ace last (v0.9.88: authored, never padded from a lane). Each
   * carries its four scripted moves; levels come from the Region's band (`gymTeamFor`).
   */
  team: GymMember[];
  /** §5.2.2 — the moves the Leader teaches, filling the roles a scripted kit lacks (its six, §5.2.2). */
  repertoire?: readonly string[];
  /** §2.5 — the one-line promise the map shows from layer 0, so the fork is never a surprise. */
  telegraph: string;
  /** §5.9.5 — the Leader's own rule, for the whole fight. */
  rule: GymRuleId;
  /**
   * §5.9.3 — this Leader's Attack against its Region's (`GYM_ATTACK_MULTIPLIER`), where its rule and its type's
   * matchups against the Region's recruits make it a harder fight than its neighbours: a rule is tuned per Leader.
   */
  attackScale?: number;
}

/**
 * §5.9.2 — the Region 1 Gym pool: Rock · Water · Bug · Normal. The map draws **two distinct types** per run
 * and puts one at the end of each lane (§2.5), so nine of the twelve Gym types in the game are missed by any
 * single run and the two you do meet are a choice rather than a schedule.
 *
 * Five authored members each (§5.9.3, v0.9.88 — `catalogs/gyms.md`): the opener two-phase, three one-phase, the
 * three-phase ace last; levels come from the band (`gymTeamFor`), at most one member is a declared off-type guest.
 *
 * Every team carries one off-type answer (§5.9.3): a Gym you can hard-counter with a single type is not a
 * fight, it is a type check. Since v0.9.5 the aces' kits are scripted from their lines' Gen I moves, so the answer and
 * the telegraph are the cards fought rather than whatever a five-card pool's Auto pick lands on: Brock's Graveler
 * carries Dig, Misty's Kingler Stomp, Aster's Butterfree Confusion beside Sleep Powder, Whitney's Raticate Dig.
 */
export const GYMS: GymDef[] = [
  {
    id: 'rock-gym-r1',
    region: 1,
    name: 'Leader Brock',
    sprite: 'brock',
    type: 'rock',
    badgeId: 'boulder-badge', rule: 'rock-solid',
    // §5.9.3 — Rock resists most of what Region 1 recruits, and Rock Solid caps the hits that get through: with its
    // whole team at its real level (2026-10-20) Brock ended two runs in three at the Region's Attack.
    attackScale: 0.6,
    // §2.5 — each Gym Leader fights in their own dedicated Gym arena backdrop.
    stage: 'gym-rock',
    line: 'My rock-hard willpower is evident even in my Pokémon!',
    telegraph: 'A wall that braces harder the more you hit it. Bring Water, Grass or Fighting.',
    // Tuned on the whole-run harness: a route team arrives around Lv 14 having evolved once, so the Region 1
    // climax is the line's mid-stage at a level premium, not its final form. Golem is a Region 3 problem.
    team: [
      { species: 'geodude', phaseCount: 2, moves: ['rock-throw', 'tackle', 'defense-curl', 'sand-attack'] },
      { species: 'kabuto', phaseCount: 1, moves: ['scratch-plus', 'rock-throw', 'absorb', 'harden'] },
      { species: 'omanyte', phaseCount: 1, moves: ['bubble-beam', 'horn-attack', 'withdraw', 'rock-slide'] },
      { species: 'sandshrew', phaseCount: 1, moves: ['slash', 'sand-attack', 'dig', 'defense-curl'], guest: 'Sand control: Ground coverage and accuracy drops.' },
      // §5.5.2 — Brock's combo: the rocks go down, then Roar drags your Lead out onto them.
      { species: 'onix', phaseCount: 3, moves: ['rock-slide', 'rock-throw', 'bind', 'screech'], signature: { move: 'rock-slide', response: 'Rock-resistant Lead; reduce its Attack or finish the ace before Resolution.' }, combo: ['stealth-rock', 'roar'] },
    ],
  },
  {
    id: 'water-gym-r1',
    region: 1,
    name: 'Leader Misty',
    sprite: 'misty',
    type: 'water',
    badgeId: 'cascade-badge', rule: 'riptide',
    // §5.9.3 — the tide's turns hit the whole team at once; at its real levels Misty lost one run in four.
    attackScale: 0.85,
    stage: 'gym-water',
    line: 'My policy is an all-out offensive with Water-type Pokémon!',
    telegraph: 'Taxes your AP and muddles your hand. Bring Grass or Electric, and cards you can afford.',
    // §5.9.3 forbids fielding a starter line: a Gym Leader should not hold a Pokémon the player may own.
    // That is why the Water Gym is Krabby and Kingler rather than Squirtle and Wartortle.
    team: [
      { species: 'psyduck', phaseCount: 2, moves: ['confusion', 'water-gun', 'tail-whip', 'disable'] },
      // §5.5.2 — Hypnosis, then the slap that doubles on a sleeper: swap the sleeper out.
      { species: 'poliwag', phaseCount: 1, moves: ['bubble-plus', 'body-slam', 'hypnosis', 'wake-up-slap'], combo: ['hypnosis', 'wake-up-slap'] },
      { species: 'goldeen', phaseCount: 1, moves: ['horn-attack-plus', 'water-gun', 'supersonic', 'tail-whip'] },
      { species: 'horsea', phaseCount: 1, moves: ['bubble-beam', 'smokescreen', 'leer', 'ice-beam'] },
      // §5.5.2 — Misty's Starmie (a Water Stone, legal at any level for a trainer): the rain, then the Bubble Beam it doubles.
      { species: 'starmie', phaseCount: 3, moves: ['bubble-beam', 'swift', 'recover', 'rain-dance'], signature: { move: 'bubble-beam', response: 'Water/Grass/Dragon resistance; in the rain it hits half again as hard.' }, combo: ['rain-dance', 'bubble-beam'] },
    ],
  },
  {
    id: 'bug-gym-r1',
    region: 1,
    name: 'Leader Aster',
    sprite: 'bugsy',
    type: 'bug',
    badgeId: 'hive-badge', rule: 'swarm',
    stage: 'gym-bug',
    line: 'Bug Pokémon are tougher than you think. Let me show you.',
    telegraph: 'Floods you with Sleep and Confusion. Bring cures, Fire or Flying.',
    team: [
      { species: 'venonat', phaseCount: 2, moves: ['psybeam', 'leech-life', 'disable', 'supersonic'] },
      { species: 'paras', phaseCount: 1, moves: ['leech-life-plus', 'absorb', 'stun-spore', 'slash'] },
      { species: 'beedrill', phaseCount: 1, moves: ['twineedle-plus', 'poison-sting-plus', 'agility', 'harden-plus'] },
      { species: 'oddish', phaseCount: 1, moves: ['mega-drain', 'acid-plus', 'poison-powder', 'stun-spore'], guest: 'Garden spores: Poison, Paralysis and drain.' },
      // §5.5.2 — Sleep Powder, then Dream Eater on the sleeper.
      { species: 'butterfree', phaseCount: 3, moves: ['sleep-powder', 'confusion', 'gust', 'harden'], signature: { move: 'confusion', response: 'Psychic resistance or Dark immunity; reduce the forecast rather than relying on a late Sleep.' }, combo: ['sleep-powder', 'dream-eater'] },
    ],
  },
  {
    id: 'normal-gym-r1',
    region: 1,
    name: 'Leader Whitney',
    sprite: 'whitney',
    type: 'normal',
    badgeId: 'plain-badge', rule: 'rollout',
    stage: 'gym-normal',
    line: 'Nothing fancy. Just everything, all at once.',
    telegraph: 'No weakness to exploit and a Home Field that makes every hit land harder. Bring Fighting, or bring more HP.',
    team: [
      { species: 'pidgeotto', phaseCount: 2, moves: ['wing-attack', 'gust', 'sand-attack', 'quick-attack-plus'] },
      { species: 'farfetchd', phaseCount: 1, moves: ['peck', 'gust', 'leer', 'sand-attack'] },
      { species: 'meowth', phaseCount: 1, moves: ['slash', 'bite-plus', 'pay-day', 'screech'] },
      { species: 'wigglytuff', phaseCount: 1, moves: ['body-slam', 'double-slap-plus', 'sing', 'defense-curl'] },
      // §5.5.2 — your whole side's Defence down, then the fang.
      { species: 'raticate', phaseCount: 3, moves: ['hyper-fang', 'quick-attack-plus', 'dig', 'tail-whip'], signature: { move: 'hyper-fang', response: 'Rock/Steel resistance or Ghost immunity; a defensive swap also answers it.' }, combo: ['tail-whip', 'hyper-fang'] },
    ],
  },
];

/**
 * §5.9.3's level premium, read off the Region's band rather than the catalogue so a change to the route length
 * cannot silently leave the climax behind (v0.5's jump from ten layers to twelve did): the opener one over the band's
 * top, the middle three one under it — the old padding's budget, not the opener's premium — and the ace two over.
 */
export function gymTeamFor(gym: GymDef): GymFielded[] {
  const top = wildBandFor(ROUTE_LAYERS - 2, regionContent(gym.region - 1).wildBand)[1];
  const last = gym.team.length - 1;
  return gym.team.map((m, i) => ({
    ...m,
    moves: [...m.moves],
    level: top + (i === 0 ? GYM_LEVEL_PREMIUM.other : i === last ? GYM_LEVEL_PREMIUM.ace : GYM_LEVEL_PREMIUM.middle),
  }));
}

/**
 * §5.9.3 — which Gym roster a map's preview promised. A map generated from v0.9.88 on stamps `GYM_ROSTER`; a saved map
 * from before carries none, and its Gym keeps the roster it promised — the two v0.9.87 members and the lane padding —
 * through that Region, so a saved species order is never paired with the new slots' moves or phases.
 */
export const GYM_ROSTER = 2;

/** The v0.9.87 rows, frozen: what a pre-v0.9.88 map's Gym fields. Not content — do not author here. */
const LEGACY_GYM_TEAMS: Record<string, { species: string; level: number; phaseCount: 1 | 2 | 3; moves?: string[]; signature?: { move: string; response: string } }[]> = {
  'rock-gym-r1': [{ species: 'geodude', level: 19, phaseCount: 2 }, { species: 'graveler', level: 22, phaseCount: 3, moves: ['rock-slide', 'rock-throw', 'harden', 'dig'], signature: { move: 'rock-slide', response: 'Rock-resistant Lead; reduce its Attack or finish the ace before Resolution.' } }],
  'water-gym-r1': [{ species: 'krabby', level: 19, phaseCount: 2 }, { species: 'kingler', level: 22, phaseCount: 3, moves: ['crabhammer', 'bubble-beam', 'stomp', 'harden'], signature: { move: 'crabhammer', response: 'Water/Grass resistance, Defence or a KO before its claws land.' } }],
  'bug-gym-r1': [{ species: 'metapod', level: 19, phaseCount: 2 }, { species: 'butterfree', level: 22, phaseCount: 3, moves: ['sleep-powder', 'confusion', 'gust', 'harden'], signature: { move: 'confusion', response: 'Psychic resistance or Dark immunity; reduce the forecast rather than relying on a late Sleep.' } }],
  'normal-gym-r1': [{ species: 'pidgeotto', level: 19, phaseCount: 2 }, { species: 'raticate', level: 22, phaseCount: 3, moves: ['hyper-fang', 'quick-attack-plus', 'dig', 'tail-whip'], signature: { move: 'hyper-fang', response: 'Rock/Steel resistance or Ghost immunity; a defensive swap also answers it.' } }],
  'fire-gym-r2': [{ species: 'growlithe', level: 28, phaseCount: 2 }, { species: 'arcanine', level: 30, phaseCount: 3, moves: ['flamethrower', 'take-down', 'bite-plus', 'roar'], signature: { move: 'flamethrower', response: 'Fire/Water/Rock resistance or damage reduction; remove it before the hit.' } }],
  'grass-gym-r2': [{ species: 'weepinbell', level: 28, phaseCount: 2 }, { species: 'vileplume', level: 30, phaseCount: 3, signature: { move: 'petal-dance', response: 'Grass-resistant Lead; the move keeps its own self-Confusion drawback.' } }],
  'electric-gym-r2': [{ species: 'voltorb', level: 28, phaseCount: 2 }, { species: 'electrode', level: 30, phaseCount: 3, moves: ['thunderbolt', 'thunder-wave', 'sonic-boom-plus', 'self-destruct'], signature: { move: 'thunderbolt', response: 'Ground immunity or Electric resistance; the signature overrides neither.' } }],
  'poison-gym-r2': [{ species: 'koffing', level: 28, phaseCount: 2 }, { species: 'weezing', level: 30, phaseCount: 3, signature: { move: 'self-destruct', response: 'Ghost immunity or Rock/Steel resistance; its recoil follows the damage, not an automatic self-KO.' } }],
  'psychic-gym-r3': [{ species: 'kadabra', level: 46, phaseCount: 2 }, { species: 'alakazam', level: 49, phaseCount: 3, moves: ['psychic', 'psybeam', 'reflect', 'seismic-toss'], signature: { move: 'psychic', response: 'Dark immunity or Psychic/Steel resistance; keep its Attack drops in place.' } }],
  'ground-gym-r3': [{ species: 'nidoqueen', level: 47, phaseCount: 2 }, { species: 'rhydon', level: 50, phaseCount: 3, signature: { move: 'rock-slide', response: 'Rock-resistant Lead and Defence; Water or Grass burst can KO it before Resolution.' } }],
  'fighting-gym-r3': [{ species: 'machoke', level: 47, phaseCount: 2 }, { species: 'machamp', level: 50, phaseCount: 3, moves: ['karate-chop', 'submission', 'seismic-toss', 'thunder-punch'], signature: { move: 'submission', response: 'Ghost immunity or Fighting resistance; the move keeps its recoil.' } }],
  'ice-gym-r3': [{ species: 'dewgong', level: 47, phaseCount: 2 }, { species: 'cloyster', level: 50, phaseCount: 3, moves: ['ice-beam', 'clamp-plus', 'spike-cannon', 'withdraw-plus'], signature: { move: 'ice-beam', response: 'Water/Fire/Ice/Steel resistance or damage reduction; Fire can also shatter Ice Armour.' } }],
};

/** The v0.9.87 Gym team, padded from the lane's favourites as it was: for a map generated before `GYM_ROSTER`. */
export function legacyGymTeamFor(gym: GymDef): GymFielded[] {
  const rows = LEGACY_GYM_TEAMS[gym.id] ?? [];
  const top = wildBandFor(ROUTE_LAYERS - 2, regionContent(gym.region - 1).wildBand)[1];
  const own = rows.map((m, i) => ({ ...m, level: top + (i === rows.length - 1 ? GYM_LEVEL_PREMIUM.ace : GYM_LEVEL_PREMIUM.other) }));
  const theme = regionContent(gym.region - 1).laneThemes[gym.type];
  const pool = [...new Set([...(theme?.favours ?? []), ...rows.slice(0, -1).map((m) => m.species)])];
  const size = TEAM_SIZE.gym[gym.region - 1] ?? own.length;
  const opening = padTeam(own.slice(0, -1), pool, size - 1, top + GYM_LEVEL_PREMIUM.other - PAD_LEVEL_GAP.gym, gym.id, { phaseCount: 1 as const });
  return [...opening, own[own.length - 1]!];
}

/** The roster a Gym node fields: the one its preview promised. */
export const gymTeamOf = (gym: GymDef, roster: number | undefined): GymFielded[] =>
  roster === GYM_ROSTER ? gymTeamFor(gym) : legacyGymTeamFor(gym);

const GYM_BY_ID = new Map<string, GymDef>();
/** Every Gym in the game, by id — the map stores ids, and a later Region's run still names Region 1's Badge. */
export const gymById = (id: string): GymDef => {
  if (!GYM_BY_ID.size) for (const g of ALL_GYMS) GYM_BY_ID.set(g.id, g);
  const g = GYM_BY_ID.get(id);
  if (!g) throw new Error(`Unknown gym "${id}"`);
  return g;
};

/**
 * The Rock Gym, still exported by name because the fixtures and the v0.2–v0.4 tests reference it directly.
 * Generated routes go through `GYMS` and the seeded 2-of-4 draw instead.
 */
export const GYM = GYMS[0]!;

/**
 * §2.5 — a Gym lane's **theme**: which biome its Wild nodes draw from, which species that biome favours, and
 * which trainer archetypes stand in the way.
 *
 * This is the idea the twelve-layer map is built around. Once the trunk forks, each lane looks like the Gym
 * at the end of it: the Rock lane is caves and Hikers, the Water lane is rivers and Swimmers. Pillar 1 says
 * the game telegraphs, and a lane that *looks* like its destination telegraphs it for four layers rather
 * than on one signpost.
 *
 * It also makes the fork a real decision rather than a coin flip, because a lane is where you recruit for the
 * Gym at the end of it — and the wilds a lane offers are thematically *adjacent* to that Gym, not counter to
 * it. Walk the Rock lane and you will be offered Geodudes, which do not beat Brock. The counter is built in
 * the **trunk**, before the fork, out of a mixed pool; the lane is where you commit. That is the shape of the
 * decision: plan in the trunk, commit at the fork.
 *
 * `counter` is the escape hatch that stops it being a trap — one species in each lane's pool that answers its
 * own Gym, so a player who chose late is behind, not dead.
 */
export interface LaneTheme {
  /** The lane's ground: the stage its trainers, its Elite and its Gym fight on. */
  biome: BiomeId;
  /**
   * §2.6.1 — the habitats its Wild Areas are drawn from (2026-10-20): the Gym's own ground, and one beside it, so a lane
   * is not one pool ten times. A node takes one by its place on the map, never by a draw.
   */
  habitats: BiomeId[];
  /** The lane's own-type Pokémon: the Gym pads its team from them (§5.9.3). */
  favours: string[];
  /**
   * The one species in the lane that beats its own Gym, in a form the Region shows: a lane's Wild Areas always carry
   * it (as an Uncommon when the biome's pool lacks it). A late commit is a handicap, not a loss.
   */
  counter: string;
  trainers: string[];
}

export const LANE_THEME: Record<string, LaneTheme> = {
  rock: { biome: 'cave', habitats: ['cave', 'ridge'], favours: ['geodude', 'onix', 'diglett', 'zubat'], counter: 'machop', trainers: ['hiker'] },
  water: { biome: 'river', habitats: ['river', 'shore'], favours: ['magikarp', 'poliwag', 'psyduck', 'krabby'], counter: 'oddish', trainers: ['swimmer'] },
  bug: { biome: 'forest', habitats: ['forest', 'meadow'], favours: ['caterpie', 'weedle', 'oddish'], counter: 'pidgey', trainers: ['bug-catcher'] },
  normal: { biome: 'meadow', habitats: ['tall-grass', 'meadow'], favours: ['pidgey', 'rattata'], counter: 'machop', trainers: ['youngster', 'lass'] },
};

// ── Region 2 — Coastal Cliffs (v0.7.3) ──────────────────────────────────────────────────────────────────────

/**
 * §2.6.1 / §2.6.3 — Region 2's habitats (2026-10-20). The Open Sea is primary; the Power Plant, the Fishing Spot, the
 * Rocky Shore, the Cave, the Mountain Trail and the Toxic Marsh beside it, the Tall Grass and the Forest rare. Region 2
 * is the middle of the lines (v0.9.7): first evolutions, and the basics that never evolve (Electabuzz, Scyther,
 * Porygon, the Hitmons). The Rares are the starters' middle forms, Dragonair, and the Pokémon the Region has no other
 * home for.
 */
export const BIOMES_R2: Partial<Record<BiomeId, BiomePool>> = {
  sea: {
    id: 'sea', name: 'Open Sea', stage: 'sea',
    common: ['tentacruel', 'seadra', 'seaking', 'golduck'],
    uncommon: ['starmie', 'dewgong', 'slowbro'],
    rare: ['jynx', 'dragonair'],
  },
  river: {
    id: 'river', name: 'Fishing Spot', stage: 'pond',
    common: ['poliwhirl', 'seaking', 'golduck', 'kingler'],
    uncommon: ['slowbro', 'seadra'],
    rare: ['wartortle', 'dragonair'],
  },
  shore: {
    id: 'shore', name: 'Rocky Shore', stage: 'beach',
    common: ['kingler', 'golbat', 'graveler', 'pidgeotto'],
    uncommon: ['marowak', 'dewgong', 'starmie'],
    rare: ['farfetchd', 'wartortle'],
  },
  'power-plant': {
    id: 'power-plant', name: 'Power Plant', stage: 'power-plant',
    common: ['magneton', 'electrode', 'raichu'],
    uncommon: ['electabuzz', 'muk', 'weezing'],
    rare: ['porygon', 'ditto'],
  },
  cave: {
    id: 'cave', name: 'Cave', stage: 'cave',
    common: ['golbat', 'graveler', 'dugtrio', 'sandslash'],
    uncommon: ['rhydon', 'haunter', 'kadabra'],
    rare: ['charmeleon'],
  },
  ridge: {
    id: 'ridge', name: 'Mountain Trail', stage: 'mountain',
    common: ['machoke', 'primeape', 'graveler', 'sandslash'],
    uncommon: ['dugtrio', 'marowak', 'nidorino'],
    rare: ['hitmonlee', 'hitmonchan'],
  },
  swamp: {
    id: 'swamp', name: 'Toxic Marsh', stage: 'swamp',
    common: ['muk', 'weezing', 'arbok', 'gloom'],
    uncommon: ['haunter', 'golbat', 'weepinbell', 'venomoth'],
    rare: ['ditto'],
  },
  'tall-grass': {
    id: 'tall-grass', name: 'Tall Grass', stage: 'tall-grass',
    common: ['raticate', 'pidgeotto', 'arbok', 'nidorina', 'nidorino'],
    uncommon: ['persian', 'wigglytuff', 'clefable', 'lickitung', 'hypno'],
    rare: ['farfetchd', 'ivysaur'],
  },
  forest: {
    id: 'forest', name: 'Forest', stage: 'forest',
    common: ['butterfree', 'beedrill', 'parasect', 'venomoth', 'metapod', 'kakuna'],
    uncommon: ['gloom', 'weepinbell', 'tangela'],
    rare: ['victreebel', 'pinsir', 'ivysaur'],
  },
};

/** §2.6.1 — the Open Sea is Region 2's primary; the Tall Grass and the Forest are its rare ones. */
export const REGION2_BIOME_WEIGHTS: { biome: BiomeId; weight: number }[] = [
  { biome: 'sea', weight: 4 },
  { biome: 'power-plant', weight: 3 },
  { biome: 'river', weight: 2 },
  { biome: 'shore', weight: 2 },
  { biome: 'cave', weight: 2 },
  { biome: 'ridge', weight: 2 },
  { biome: 'swamp', weight: 2 },
  { biome: 'tall-grass', weight: 1 },
  { biome: 'forest', weight: 1 },
];

/**
 * §2.7 — the Region 2 rosters (`catalogs/trainers.md` §3), two per archetype. Written in the forms their band
 * warrants (every Region 2 line evolves at 12) and walked through `evolvedAt` on top, so a roster level the band
 * lifts past a threshold still fields the right form. The Hex Maniac waits for Region 3, where its Ghosts are.
 */
export const TRAINERS_R2: TrainerRoster[] = [
  // §5.6.1 — an Ace Trainer's Lead acts twice from Region 2 (v0.9.12): two Pokémon at their best, one of them fast.
  { id: 'ace-trainer-r2-a', archetype: 'ace-trainer', name: 'Ace Trainer Iris', sprite: 'acetrainer', line: 'I train for the turn nobody sees coming.',
    team: [{ species: 'pidgeotto', level: 23 }, { species: 'wartortle', level: 25 }] },
  { id: 'ace-trainer-r2-b', archetype: 'ace-trainer', name: 'Ace Trainer Marco', sprite: 'acetrainer', line: 'Two moves a turn. Keep up.',
    team: [{ species: 'kadabra', level: 23 }, { species: 'charmeleon', level: 25 }] },
  { id: 'youngster-r2-a', archetype: 'youngster', name: 'Youngster Calvin', sprite: 'youngster', line: 'I have been training since Pallet. Look how big they got!',
    team: [{ species: 'raticate', level: 21 }, { species: 'pidgeotto', level: 22 }] },
  { id: 'youngster-r2-b', archetype: 'youngster', name: 'Youngster Otis', sprite: 'youngster', line: 'Only one Pokémon. It is the only one I need.',
    team: [{ species: 'raichu', level: 23 }] },
  { id: 'lass-r2-a', archetype: 'lass', name: 'Lass Dana', sprite: 'lass', line: 'The sea breeze is lovely. So is a good Sleep Powder.',
    team: [{ species: 'gloom', level: 22 }, { species: 'starmie', level: 23 }] },
  { id: 'lass-r2-b', archetype: 'lass', name: 'Lass Mei', sprite: 'lass', line: 'Careful — mine sting.',
    team: [{ species: 'weepinbell', level: 22 }, { species: 'raichu', level: 23 }] },
  { id: 'hiker-r2-a', archetype: 'hiker', name: 'Hiker Bruno', sprite: 'hiker', line: 'These cliffs are softer than my Pokémon.',
    team: [{ species: 'graveler', level: 23 }, { species: 'machoke', level: 23 }] },
  { id: 'hiker-r2-b', archetype: 'hiker', name: 'Hiker Alan', sprite: 'hiker', line: 'The tide cannot move a mountain.',
    team: [{ species: 'onix', level: 23 }, { species: 'graveler', level: 25 }] },
  { id: 'swimmer-r2-a', archetype: 'swimmer', name: 'Swimmer Luis', sprite: 'swimmer', line: 'Out here the water bites back.',
    team: [{ species: 'dewgong', level: 22 }, { species: 'tentacruel', level: 23 }] },
  { id: 'swimmer-r2-b', archetype: 'swimmer', name: 'Swimmer Paula', sprite: 'swimmer', line: 'I race the Seadra to the point every morning.',
    team: [{ species: 'seadra', level: 22 }, { species: 'cloyster', level: 23 }] },
  { id: 'engineer-r2-a', archetype: 'engineer', name: 'Engineer Hugo', sprite: 'scientist', line: 'Give me two turns and I will show you a real current.',
    team: [{ species: 'magneton', level: 23 }, { species: 'electrode', level: 25 }] },
  { id: 'engineer-r2-b', archetype: 'engineer', name: 'Engineer Ines', sprite: 'scientist', line: 'The plant never sleeps. Neither do I.',
    team: [{ species: 'electrode', level: 23 }, { species: 'electabuzz', level: 25 }] },
  { id: 'rocket-grunt-r2-a', archetype: 'rocket-grunt', name: 'Rocket Grunt', sprite: 'rocketgrunt', line: 'Hand over anything rare and nobody gets poisoned.',
    team: [{ species: 'weezing', level: 25 }, { species: 'golbat', level: 25 }] },
  { id: 'rocket-grunt-r2-b', archetype: 'rocket-grunt', name: 'Rocket Grunt', sprite: 'rocketgrunt', line: 'You picked the wrong pier, kid.',
    team: [{ species: 'raticate', level: 23 }, { species: 'weezing', level: 25 }] },
];

/**
 * §2.8.1 — the Region 2 Specialist (`catalogs/elites.md` §3). The Karate King's second Pokémon is a Machoke in
 * place of the catalogue's Primeape (kept: a Machoke is what the fight was tuned on); Hitmonchan's three elemental
 * punches are why a Fighting type check does not beat it. He is Koichi, FireRed's Karate King — Kiyo, the other
 * one, leads Region 3's Fighting Gym, and one man at two ranks would read as a mistake.
 */
export const ELITE_R2: EliteDef = {
  id: 'elite-karate-king-r2',
  name: 'Karate King Koichi',
  sprite: 'blackbelt',
  line: 'I trained on these cliffs until the sea gave up first. Come.',
  team: [
    { species: 'machoke', level: 30, phaseCount: 2 },
    { species: 'hitmonchan', level: 32, phaseCount: 2 },
  ],
};

/**
 * §2.8.2 — Lapras, the Region 2 boss-wild (catalogs/elites.md §5): Sing and Ice Shard to control, Ice Beam and
 * Surf when it tires. Its learnset only reaches Ice Beam at 30, so the script is its kit, not its level's.
 */
export const ELITE_WILD_R2: EliteWildDef = {
  id: 'elite-wild-lapras',
  species: 'lapras',
  level: 33,
  phaseCount: 2,
  stage: 'elite-lapras',
  moves: ['sing', 'body-slam', 'ice-beam', 'surf'],
  line: 'A song carries over the water. Something large is riding the swell toward you.',
};

/**
 * §5.9.2 — the Region 2 pool: Fire · Grass · Electric · Poison (`catalogs/gyms.md` §2). Same shape as Region 1:
 * slot 1 two-phase, the ace three-phase, levels from the band (§5.9.3), one off-type answer each.
 */
export const GYMS_R2: GymDef[] = [
  {
    id: 'fire-gym-r2', region: 2, name: 'Leader Blaine', sprite: 'blaine', type: 'fire', badgeId: 'volcano-badge', rule: 'meltdown',
    // §5.9.3 — five Fire attackers on a Home Field, not one: its authored team lost 17 % of 29 arrivals at the Region's Attack (v0.9.88).
    attackScale: 0.85,
    stage: 'gym-fire',
    line: 'Hah! I hope you brought Burn Heal. My Pokémon burn hotter than this whole coast.',
    telegraph: 'A burst race on a Home Field that makes every Fire hit land harder. Bring Water or Rock, or bring more HP.',
    team: [
      { species: 'ninetales', phaseCount: 2, moves: ['flamethrower', 'quick-attack', 'fire-spin', 'tail-whip-plus'] },
      { species: 'ponyta', phaseCount: 1, moves: ['stomp-plus', 'ember', 'agility', 'growl'] },
      { species: 'magmar', phaseCount: 1, moves: ['fire-punch', 'confuse-ray', 'ember', 'leer'] },
      { species: 'flareon', phaseCount: 1, moves: ['flamethrower', 'swift', 'sand-attack', 'fire-spin'] },
      // §5.5.2 — the Sun, then the Flamethrower it strengthens.
      { species: 'arcanine', phaseCount: 3, moves: ['flamethrower', 'take-down', 'bite-plus', 'roar'], signature: { move: 'flamethrower', response: 'Fire/Water/Rock resistance or damage reduction; remove it before the hit.' }, combo: ['sunny-day', 'flamethrower'] },
    ],
  },
  {
    id: 'grass-gym-r2', region: 2, name: 'Leader Erika', sprite: 'erika', type: 'grass', badgeId: 'rainbow-badge', rule: 'bloom',
    // §5.9.3 — five members each untouched by a hit bloom back: its authored team lost 14 % of 28 arrivals (v0.9.88).
    attackScale: 0.9,
    stage: 'gym-grass',
    line: 'Oh… I was dozing among the flowers. Shall we? I do not intend to lose.',
    telegraph: 'Floods your Lead with Sleep and Poison. Bring cures, Fire or Flying.',
    team: [
      { species: 'tangela', phaseCount: 2, moves: ['mega-drain', 'constrict', 'poison-powder', 'bind'] },
      { species: 'parasect', phaseCount: 1, moves: ['leech-life-plus', 'slash', 'stun-spore', 'absorb'] },
      { species: 'exeggutor', phaseCount: 1, moves: ['razor-leaf', 'psychic', 'leech-seed', 'stomp'] },
      { species: 'victreebel', phaseCount: 1, moves: ['razor-leaf', 'vine-whip-plus', 'slam-plus', 'swords-dance'] },
      // §5.5.2 — the Sun, then a Solar Beam with no charge.
      { species: 'vileplume', phaseCount: 3, moves: ['petal-dance', 'mega-drain', 'toxic-plus', 'sludge'], signature: { move: 'petal-dance', response: 'Grass-resistant Lead; the move keeps its own self-Confusion drawback.' }, combo: ['sunny-day', 'solar-beam'] },
    ],
  },
  {
    id: 'electric-gym-r2', region: 2, name: 'Leader Surge', sprite: 'ltsurge', type: 'electric', badgeId: 'thunder-badge', rule: 'overcharge',
    stage: 'gym-electric',
    line: 'Hey, kid! Electric Pokémon saved me in the war. They will shock you just the same!',
    telegraph: 'Taxes your AP and locks your Lead with Paralysis. Bring Ground, and cards you can afford.',
    team: [
      { species: 'raichu', phaseCount: 2, moves: ['thunderbolt', 'thunder-wave', 'quick-attack-plus', 'slam'] },
      { species: 'magnemite', phaseCount: 1, moves: ['thunderbolt', 'sonic-boom-plus', 'swift', 'supersonic'] },
      { species: 'electabuzz', phaseCount: 1, moves: ['thunderbolt', 'quick-attack', 'leer', 'screech'] },
      { species: 'jolteon', phaseCount: 1, moves: ['thunderbolt', 'pin-missile', 'swift', 'sand-attack'] },
      // §5.5.2 — the rain, then a Thunder it makes cheaper.
      { species: 'electrode', phaseCount: 3, moves: ['thunderbolt', 'thunder-wave', 'sonic-boom-plus', 'self-destruct'], signature: { move: 'thunderbolt', response: 'Ground immunity or Electric resistance; the signature overrides neither.' }, combo: ['rain-dance', 'thunder'] },
    ],
  },
  {
    id: 'poison-gym-r2', region: 2, name: 'Leader Koga', sprite: 'koga', type: 'poison', badgeId: 'soul-badge', rule: 'toxic',
    // §5.9.3 — Toxic doubling on five Poison carriers, not two: 25 % of 64 arrivals lost at the Region's Attack (v0.9.88).
    attackScale: 0.85,
    stage: 'gym-poison',
    line: 'Fwahahaha! A ninja does not strike. He waits for the poison to do it.',
    telegraph: 'Poisons everything and waits you out. Bring cures, Psychic or Ground.',
    team: [
      { species: 'arbok', phaseCount: 2, moves: ['wrap-plus', 'glare', 'bite-plus', 'sludge'] },
      { species: 'golbat', phaseCount: 1, moves: ['wing-attack', 'bite-plus', 'supersonic', 'haze'] },
      { species: 'grimer', phaseCount: 1, moves: ['sludge', 'acid-plus', 'disable', 'pound-plus'] },
      { species: 'koffing', phaseCount: 1, moves: ['smog-plus', 'poison-gas', 'smokescreen-plus', 'self-destruct'] },
      // §5.5.2 — Koga's ace (a Moon Stone): it holds your Lead in place, then poisons it badly.
      { species: 'nidoking', phaseCount: 3, moves: ['sludge', 'double-kick', 'toxic-plus', 'horn-attack-plus'], signature: { move: 'sludge', response: 'Poison immunity or Steel/Ground resistance; cure the Poison it leaves.' }, combo: ['mean-look', 'toxic-plus'] },
    ],
  },
];

export const LANE_THEME_R2: Record<string, LaneTheme> = {
  fire: { biome: 'ridge', habitats: ['ridge', 'tall-grass'], favours: ['growlithe', 'rattata', 'pidgey'], counter: 'golduck', trainers: ['youngster'] },
  grass: { biome: 'forest', habitats: ['forest', 'tall-grass'], favours: ['bellsprout', 'oddish'], counter: 'rapidash', trainers: ['lass'] },
  electric: { biome: 'power-plant', habitats: ['power-plant', 'shore'], favours: ['voltorb', 'magnemite', 'pikachu'], counter: 'graveler', trainers: ['engineer'] },
  poison: { biome: 'swamp', habitats: ['swamp', 'cave'], favours: ['koffing', 'zubat'], counter: 'kadabra', trainers: ['rocket-grunt'] },
};

// ── Region 3 — Volcanic Highlands (v0.7.4) ──────────────────────────────────────────────────────────────────

/**
 * §2.6.1 / §2.6.3 — Region 3's habitats (2026-10-20). The Volcano Slope is primary; the Badlands, the Deep Cave, the
 * Underground Lake and the Sky Cliffs beside it, the Haunted Tower and the Overgrown Ruins rare. Region 3 is final
 * forms only (v0.9.7): no Pokémon here has an evolution left. The Rares are the starters' final forms and the giants —
 * Lapras, Snorlax, Dragonite, Aerodactyl. The Legendaries stay out of every pool.
 */
export const BIOMES_R3: Partial<Record<BiomeId, BiomePool>> = {
  volcano: {
    id: 'volcano', name: 'Volcano Slope', stage: 'volcano',
    common: ['arcanine', 'ninetales', 'rapidash', 'rhydon'],
    uncommon: ['magmar', 'flareon', 'golem'],
    rare: ['charizard'],
  },
  badlands: {
    id: 'badlands', name: 'Badlands', stage: 'badlands',
    common: ['rhydon', 'golem', 'nidoking', 'nidoqueen'],
    uncommon: ['marowak', 'tauros', 'dodrio', 'steelix'],
    rare: ['aerodactyl'],
  },
  cave: {
    id: 'cave', name: 'Deep Cave', stage: 'cave',
    common: ['machamp', 'golem', 'poliwrath'],
    uncommon: ['omastar', 'kabutops', 'marowak', 'magnezone'],
    rare: ['snorlax', 'kangaskhan'],
  },
  lake: {
    id: 'lake', name: 'Underground Lake', stage: 'underwater',
    common: ['cloyster', 'poliwrath', 'vaporeon'],
    uncommon: ['gyarados', 'omastar', 'kabutops'],
    rare: ['lapras', 'blastoise'],
  },
  sky: {
    id: 'sky', name: 'Sky Cliffs', stage: 'sky-pillar',
    common: ['pidgeot', 'fearow', 'dodrio'],
    uncommon: ['gyarados', 'scizor', 'jolteon'],
    rare: ['dragonite', 'aerodactyl'],
  },
  tower: {
    id: 'tower', name: 'Haunted Tower', stage: 'tower',
    common: ['gengar', 'hypno'],
    uncommon: ['alakazam', 'mr-mime', 'exeggutor', 'vileplume', 'umbreon'],
    rare: ['chansey', 'venusaur'],
  },
  ruins: {
    id: 'ruins', name: 'Overgrown Ruins', stage: 'ruins',
    common: ['vileplume', 'victreebel', 'exeggutor'],
    uncommon: ['hypno', 'jolteon', 'mr-mime', 'scizor'],
    rare: ['venusaur'],
  },
};

/** §2.6.1 — the Volcano Slope is Region 3's primary; the Haunted Tower and the Overgrown Ruins are the rare ones. */
export const REGION3_BIOME_WEIGHTS: { biome: BiomeId; weight: number }[] = [
  { biome: 'volcano', weight: 4 },
  { biome: 'badlands', weight: 2 },
  { biome: 'cave', weight: 2 },
  { biome: 'lake', weight: 2 },
  { biome: 'sky', weight: 2 },
  { biome: 'tower', weight: 1 },
  { biome: 'ruins', weight: 1 },
];

/**
 * §2.7 — the Region 3 rosters (`catalogs/trainers.md` §4), two per archetype, written in their forms and walked
 * through `evolvedAt` like Region 2's. The Hex Maniacs are veiled (§2.7.1): each of their Pokémon hides its first
 * intent. Swimmers stay on for the Ice lane, whose cave is the Seafoam kind.
 */
export const TRAINERS_R3: TrainerRoster[] = [
  { id: 'ace-trainer-r3-a', archetype: 'ace-trainer', name: 'Ace Trainer Rhea', sprite: 'acetrainer', line: 'Two Pokémon, both at their best. That is all an Ace needs.',
    team: [{ species: 'pidgeot', level: 42 }, { species: 'arcanine', level: 44 }] },
  { id: 'ace-trainer-r3-b', archetype: 'ace-trainer', name: 'Ace Trainer Dario', sprite: 'acetrainer', line: 'Mind or muscle? I brought both.',
    team: [{ species: 'alakazam', level: 43 }, { species: 'machamp', level: 44 }] },
  { id: 'hex-maniac-r3-a', archetype: 'hex-maniac', name: 'Hex Maniac Vera', sprite: 'hexmaniac', line: 'You cannot see what they are planning. That is the point.', veiled: true,
    team: [{ species: 'hypno', level: 42 }, { species: 'gengar', level: 43 }] },
  { id: 'hex-maniac-r3-b', archetype: 'hex-maniac', name: 'Hex Maniac Mona', sprite: 'hexmaniac', line: 'The tower tells me your moves. It tells you nothing.', veiled: true,
    team: [{ species: 'mr-mime', level: 42 }, { species: 'slowbro', level: 43 }] },
  { id: 'rocket-grunt-r3-a', archetype: 'rocket-grunt', name: 'Rocket Grunt', sprite: 'rocketgrunt', line: 'The Boss wants this mountain. You are standing on it.',
    team: [{ species: 'weezing', level: 42 }, { species: 'arbok', level: 43 }] },
  { id: 'rocket-grunt-r3-b', archetype: 'rocket-grunt', name: 'Rocket Grunt', sprite: 'rocketgrunt', line: 'Team Rocket never loses twice. Well — never three times.',
    team: [{ species: 'golbat', level: 42 }, { species: 'muk', level: 43 }] },
  { id: 'engineer-r3-a', archetype: 'engineer', name: 'Engineer Otto', sprite: 'scientist', line: 'The geothermal plant runs on these two. So do I.',
    team: [{ species: 'electrode', level: 42 }, { species: 'electabuzz', level: 43 }] },
  { id: 'engineer-r3-b', archetype: 'engineer', name: 'Engineer Silvia', sprite: 'scientist', line: 'Porygon was built at Silph. I rebuilt it better.',
    team: [{ species: 'porygon', level: 42 }, { species: 'raichu', level: 43 }] },
  { id: 'hiker-r3-a', archetype: 'hiker', name: 'Hiker Ernesto', sprite: 'hiker', line: 'This mountain was here before you. So were we.',
    team: [{ species: 'rhyhorn', level: 43 }, { species: 'golem', level: 44 }] },
  { id: 'hiker-r3-b', archetype: 'hiker', name: 'Hiker Ivan', sprite: 'hiker', line: 'I carried Machamp up here. Then it carried me.',
    team: [{ species: 'rhydon', level: 42 }, { species: 'machamp', level: 44 }] },
  { id: 'swimmer-r3-a', archetype: 'swimmer', name: 'Swimmer Nerea', sprite: 'swimmer', line: 'The water under the ice is freezing. You get used to it.',
    team: [{ species: 'dewgong', level: 42 }, { species: 'seaking', level: 43 }] },
  { id: 'swimmer-r3-b', archetype: 'swimmer', name: 'Swimmer Marco', sprite: 'swimmer', line: 'Swim the ice caves long enough and nothing scares you.',
    team: [{ species: 'cloyster', level: 42 }, { species: 'starmie', level: 43 }] },
];

/**
 * §2.8.1 — the Region 3 Elite Trainer: Giovanni's lane (`catalogs/elites.md` §4). Of the three the catalogue
 * weighs for Region 3, the Rival waits for the counter-pick that gives him meaning and the Specialist's Dewgong
 * and Cloyster are Lorelei's own team; Giovanni can also lead the Ground Gym, and canon keeps both.
 */
export const ELITE_R3: EliteDef = {
  id: 'elite-giovanni-r3',
  name: 'Boss Giovanni',
  // The Team Rocket boss, in its suit (the user's note, 2026-10-19) — apart from the Ground Gym's Leader Giovanni.
  sprite: 'giovanni-rocket',
  line: 'So you are the one who keeps getting in Team Rocket’s way. I will end that here.',
  team: [
    { species: 'dugtrio', level: 44, phaseCount: 2 },
    { species: 'persian', level: 47, phaseCount: 2 },
  ],
};

/**
 * §2.8.2 — Aerodactyl, the Region 3 boss-wild (catalogs/elites.md §5): Agility and Ancient Power to set up, Sky
 * Drop and Rock Slide when it tires. The script is its kit, as Lapras's is.
 */
export const ELITE_WILD_R3: EliteWildDef = {
  id: 'elite-wild-aerodactyl',
  species: 'aerodactyl',
  level: 47,
  phaseCount: 2,
  stage: 'elite-aerodactyl',
  moves: ['agility', 'bite', 'fly', 'rock-slide'],
  line: 'A shriek from the crags. Something ancient is circling overhead, and it has seen you.',
};

/**
 * §5.9.2 — the Region 3 pool: Psychic · Ground · Fighting · Ice (`catalogs/gyms.md` §3). Same shape as the other
 * two, one off-type answer each (§5.9.3): Alakazam's Shadow Ball and Machamp's Thunder Punch are scripted because
 * their learnsets at the Gym's level are all their own type; Rhydon's Megahorn and Dewgong's Surf are their own.
 */
export const GYMS_R3: GymDef[] = [
  {
    id: 'psychic-gym-r3', region: 3, name: 'Leader Sabrina', sprite: 'sabrina', type: 'psychic', badgeId: 'marsh-badge', rule: 'mind-lock',
    stage: 'gym-psychic',
    line: 'I foresaw your arrival. I also foresaw how this ends.',
    telegraph: 'Taxes your AP and locks your hand. Bring Bug or Ghost, and cards you can afford.',
    // §5.9.3 — Reflect, not Recover (2026-10-20): at its real level a Lv 34 Alakazam healing 40 % every other turn
    // through three phases outlasted the team — 160-turn fights, seven in ten lost. Mind Lock is the fight.
    team: [
      { species: 'hypno', phaseCount: 2, moves: ['psychic', 'headbutt', 'hypnosis', 'disable'] },
      { species: 'mr-mime', phaseCount: 1, moves: ['psychic', 'reflect', 'barrier', 'seismic-toss'] },
      { species: 'slowbro', phaseCount: 1, moves: ['surf', 'psychic', 'disable', 'growl'] },
      { species: 'exeggutor', phaseCount: 1, moves: ['razor-leaf', 'stomp', 'leech-seed', 'psychic'] },
      // §5.5.2 — Calm Mind, then the Psychic it sharpens.
      { species: 'alakazam', phaseCount: 3, moves: ['psychic', 'psybeam', 'reflect', 'seismic-toss'], signature: { move: 'psychic', response: 'Dark immunity or Psychic/Steel resistance; keep its Attack drops in place.' }, combo: ['calm-mind', 'psychic'] },
    ],
  },
  {
    id: 'ground-gym-r3', region: 3, name: 'Leader Giovanni', sprite: 'giovanni', type: 'ground', badgeId: 'earth-badge', rule: 'tremor',
    stage: 'gym-ground',
    line: 'This Gym is the last thing between you and the League. It does not move.',
    telegraph: 'A wall that braces harder the more you hit it. Bring Water, Grass or Ice.',
    team: [
      { species: 'nidoqueen', phaseCount: 2, moves: ['earthquake', 'body-slam', 'sludge', 'toxic-plus'] },
      { species: 'sandslash', phaseCount: 1, moves: ['slash', 'dig', 'sand-attack', 'swift'] },
      { species: 'dugtrio', phaseCount: 1, moves: ['earthquake', 'slash', 'sand-attack', 'growl'] },
      { species: 'marowak', phaseCount: 1, moves: ['bone-club-plus', 'earthquake', 'headbutt', 'leer'] },
      // §5.5.2 — Rock Polish, then Earthquake on everyone.
      { species: 'rhydon', phaseCount: 3, moves: ['rock-slide', 'dig', 'stomp-plus', 'tail-whip'], signature: { move: 'rock-slide', response: 'Rock-resistant Lead and Defence; Water or Grass burst can KO it before Resolution.' }, combo: ['rock-polish', 'earthquake'] },
    ],
  },
  {
    id: 'fighting-gym-r3', region: 3, name: 'Leader Kiyo', sprite: 'kiyo', type: 'fighting', badgeId: 'knuckle-badge', rule: 'close-quarters',
    stage: 'gym-fighting',
    line: 'A hundred days on this mountain, training. Show me your hundred.',
    telegraph: 'A burst race on a Home Field that makes every Fighting hit land harder. Bring Psychic or Flying, or more HP.',
    team: [
      { species: 'primeape', phaseCount: 2, moves: ['karate-chop-plus', 'thrash', 'rock-slide', 'leer'] },
      { species: 'poliwrath', phaseCount: 1, moves: ['submission-plus', 'bubble-beam', 'hypnosis', 'ice-punch'] },
      { species: 'hitmonlee', phaseCount: 1, moves: ['double-kick', 'rolling-kick', 'meditate', 'swift'] },
      { species: 'hitmonchan', phaseCount: 1, moves: ['submission', 'mega-punch', 'fire-punch', 'ice-punch'] },
      // §5.5.2 — Bulk Up, then Submission.
      { species: 'machamp', phaseCount: 3, moves: ['karate-chop', 'submission', 'seismic-toss', 'thunder-punch'], signature: { move: 'submission', response: 'Ghost immunity or Fighting resistance; the move keeps its recoil.' }, combo: ['bulk-up', 'submission'] },
    ],
  },
  {
    id: 'ice-gym-r3', region: 3, name: 'Leader Lorelei', sprite: 'lorelei', type: 'ice', badgeId: 'glacier-badge', rule: 'ice-armour',
    stage: 'gym-ice',
    line: 'Your Pokémon will freeze before they reach me. Let us see how long you last.',
    telegraph: 'Freezes your Lead and taxes your AP. Bring Fighting, Electric or Rock.',
    team: [
      { species: 'dewgong', phaseCount: 2, moves: ['aurora-beam', 'surf', 'take-down', 'growl'] },
      { species: 'jynx', phaseCount: 1, moves: ['ice-beam', 'psychic', 'lovely-kiss', 'double-slap'] },
      { species: 'slowbro', phaseCount: 1, moves: ['ice-beam', 'psychic', 'disable', 'surf'], guest: 'Cold-water control: Ice Beam, Psychic and Disable.' },
      { species: 'cloyster', phaseCount: 1, moves: ['ice-beam', 'clamp-plus', 'spike-cannon', 'withdraw-plus'] },
      // §5.5.2 — the hail, then a cheaper Blizzard.
      { species: 'lapras', phaseCount: 3, moves: ['ice-beam', 'surf', 'body-slam', 'mist'], signature: { move: 'ice-beam', response: 'Water/Fire/Ice/Steel resistance or damage reduction; Fire can also shatter Ice Armour.' }, combo: ['hail', 'blizzard'] },
    ],
  },
];

export const LANE_THEME_R3: Record<string, LaneTheme> = {
  psychic: { biome: 'tower', habitats: ['tower', 'ruins'], favours: ['drowzee', 'gastly'], counter: 'scyther', trainers: ['hex-maniac'] },
  ground: { biome: 'badlands', habitats: ['badlands', 'volcano'], favours: ['sandshrew', 'vulpix'], counter: 'exeggutor', trainers: ['rocket-grunt'] },
  fighting: { biome: 'cave', habitats: ['cave', 'badlands'], favours: ['machop', 'mankey'], counter: 'alakazam', trainers: ['hiker'] },
  ice: { biome: 'lake', habitats: ['lake', 'cave'], favours: ['seel', 'shellder'], counter: 'machamp', trainers: ['swimmer'] },
};

// ── The Regions ─────────────────────────────────────────────────────────────────────────────────────────────

/** §2.1 / §2.2 — one Region's generator input: everything `generateRegion` and the encounters read. */
export interface RegionContent {
  index: number;
  /** §2.13 — the Region's name, shown on the map. */
  name: string;
  biomes: Partial<Record<BiomeId, BiomePool>>;
  biomeWeights: { biome: BiomeId; weight: number }[];
  /** §2.6.5 — the recruit band the route ramps across. */
  wildBand: readonly [number, number];
  /** Where a fight in the shared trunk happens (§2.5): a lane uses its own biome. */
  trunkStage: string;
  trainers: TrainerRoster[];
  elite: EliteDef;
  eliteWild: EliteWildDef;
  gyms: GymDef[];
  laneThemes: Record<string, LaneTheme>;
  /**
   * §2.1 placeholder — levels this far above the tables' own and every species walked to the form those levels
   * warrant. Region 3 was Region 1 at +16 until v0.7.4 wrote its own tables; every Region is 0 now, and the
   * mechanism stays for a Region that ships before its content does.
   */
  levelOffset: number;
}

export const REGIONS: readonly RegionContent[] = [
  {
    index: 0, name: 'Verdant Route', biomes: BIOMES, biomeWeights: REGION1_BIOME_WEIGHTS, wildBand: WILD_LEVEL_BAND, trunkStage: 'tall-grass',
    trainers: TRAINERS, elite: ELITE, eliteWild: ELITE_WILD, gyms: GYMS, laneThemes: LANE_THEME, levelOffset: 0,
  },
  {
    // §2.6.5 — 14–22 and 24–32 since v0.8.10 (were 12–20, 22–30): the team entered Region 2 four levels over.
    index: 1, name: 'Coastal Cliffs', biomes: BIOMES_R2, biomeWeights: REGION2_BIOME_WEIGHTS, wildBand: [19, 30], trunkStage: 'beach',
    trainers: TRAINERS_R2, elite: ELITE_R2, eliteWild: ELITE_WILD_R2, gyms: GYMS_R2, laneThemes: LANE_THEME_R2, levelOffset: 0,
  },
  {
    index: 2, name: 'Volcanic Highlands', biomes: BIOMES_R3, biomeWeights: REGION3_BIOME_WEIGHTS, wildBand: [33, 44], trunkStage: 'volcano',
    trainers: TRAINERS_R3, elite: ELITE_R3, eliteWild: ELITE_WILD_R3, gyms: GYMS_R3, laneThemes: LANE_THEME_R3, levelOffset: 0,
  },
];

/**
 * §2.13 — the name the map shows for a Region, or null while it is a placeholder (Region 3 was, until v0.7.4):
 * a name promises a place, and a Volcanic Highlands drawn as Region 1's meadow is not one.
 */
export function regionName(regionIndex: number): string | null {
  const r = regionContent(regionIndex);
  return r.levelOffset ? null : r.name;
}

/** The content a Region's route is generated from. Past the last Region, the last one. */
export function regionContent(regionIndex: number): RegionContent {
  return REGIONS[Math.min(Math.max(0, regionIndex), REGIONS.length - 1)]!;
}

/** Every roster, Elite and Gym in the game — for lookups by id or name that cannot know the Region. */
export const ALL_TRAINERS: readonly TrainerRoster[] = [...TRAINERS, ...TRAINERS_R2, ...TRAINERS_R3];
export const ALL_GYMS: readonly GymDef[] = [...GYMS, ...GYMS_R2, ...GYMS_R3];
export const ALL_ELITES: readonly EliteDef[] = [ELITE, ELITE_R2, ELITE_R3];

/**
 * §2.1 / §2.2 — how far above its own tables each Region's levels sit (`RegionContent.levelOffset`). Every
 * Region has its own content and band since v0.7.4, so every entry is 0.
 */
export const REGION_LEVEL_OFFSET: readonly number[] = REGIONS.map((r) => r.levelOffset);

/**
 * §2.1 placeholder, §2.7.3 — the form a Pokémon of this line has at this level: it walks `evolvesTo` for as long
 * as the level has reached each stage's `evolveLevel`, the way a trainer's team is levelled in the games. A
 * later Region borrows Region 1's rosters, and a Lv 29 Geodude is a Graveler — the player's own team has been
 * evolving on the same thresholds all run (§6.2.4), and a basic form at a final form's level is not a fight.
 * A branching line (Eevee) takes its first branch; a stage the content does not have yet stops the walk.
 */
export function evolvedAt(speciesId: string, level: number, content: ContentRegistry): string {
  let id = speciesId;
  for (let guard = 0; guard < 3; guard++) {
    const s = content.species(id);
    const next = s.evolvesTo?.[0];
    if (!next || !s.evolveLevel || level < s.evolveLevel || !content.hasSpecies(next)) break;
    id = next;
  }
  return id;
}

/**
 * §2.2 — Region 2's accent, which Region 3 inherits: **status conditions on enemy intents become routine.**
 * From `STATUS_ACCENT_FROM` on, every enemy carries its type's status move on top of its own kit, so a
 * `Status` intent — telegraphed like any other (§5.2), never re-applied to a Pokémon that already has one
 * (§5.3) — is part of every fight. With every status now carried between fights (§4.2.7.1) that is attrition
 * the route has to be planned around: the nurse, the cures in the bag, an immune Lead.
 *
 * The enemy's first type picks the move. A type Gen I never gave a status move falls back to Glare, a Normal move that
 * leaves a Paralysis to carry — since v0.9.5, when Will-O-Wisp left with every move the first generation did not have
 * and Supersonic's Confusion, which never outlasts a fight, stopped being enough of an accent. Bug borrows its lines'
 * powders.
 */
export const STATUS_ACCENT_FROM = 1;

/**
 * §5.2.2 — how many moves an enemy carries by who it is (v0.9.92, the user's call: "many more moves"): a wild Pokémon
 * four, a trainer's five, the climaxes six — an Elite Trainer's, a Gauntlet's, a Gym's, the League's.
 */
export const ENEMY_KIT_SIZE = { wild: 4, trainer: 5, climax: 6 } as const;

/**
 * §5.2.2 — each trainer archetype's repertoire: the moves its trainers teach their Pokémon, whatever their learnsets
 * say, so a Hiker's fight reads as a Hiker's (rocks and sand) and a Hex Maniac's as a Hex Maniac's. They fill the roles a
 * kit lacks first (§5.2.2's template), and the rest of the kit after.
 */
export const TRAINER_REPERTOIRE: Record<string, readonly string[]> = {
  hiker: ['stealth-rock', 'sandstorm', 'rock-polish'],
  swimmer: ['rain-dance', 'aqua-ring', 'haze'],
  'bug-catcher': ['string-shot', 'leech-life', 'poison-powder'],
  engineer: ['thunder-wave', 'light-screen', 'reflect'],
  lass: ['charm', 'sing', 'wish'],
  youngster: ['focus-energy', 'quick-attack', 'endure'],
  'hex-maniac': ['curse', 'mean-look', 'confuse-ray'],
  'rocket-grunt': ['knock-off', 'smokescreen', 'toxic'],
  'ace-trainer': ['swords-dance', 'taunt', 'protect'],
};
/** §5.2.2 — a Gym Leader's, by its type: what fills the two roles its scripted four lack. */
export const GYM_REPERTOIRE: Partial<Record<PokemonType, readonly string[]>> = {
  rock: ['stealth-rock', 'sandstorm', 'rock-polish'],
  water: ['rain-dance', 'haze', 'aqua-ring'],
  bug: ['string-shot', 'leech-seed', 'protect'],
  normal: ['helping-hand', 'taunt', 'protect'],
  fire: ['sunny-day', 'will-o-wisp', 'roar'],
  grass: ['sunny-day', 'leech-seed', 'synthesis'],
  electric: ['rain-dance', 'light-screen', 'thunder-wave'],
  poison: ['mean-look', 'haze', 'spikes'],
  psychic: ['calm-mind', 'light-screen', 'reflect'],
  ground: ['rock-polish', 'spikes', 'roar'],
  fighting: ['bulk-up', 'detect', 'revenge'],
  ice: ['hail', 'haze', 'mist'],
};
/** §5.2.2 — an Elite Trainer's and a Gauntlet's Ace Trainer's: a team that plays together. */
export const ELITE_REPERTOIRE: readonly string[] = ['helping-hand', 'taunt', 'protect'];
export const STATUS_ACCENT_MOVES: Partial<Record<PokemonType, string>> = {
  electric: 'thunder-wave',
  poison: 'poison-powder',
  grass: 'stun-spore',
  bug: 'sleep-powder',
  psychic: 'hypnosis',
  ghost: 'confuse-ray',
};
export const STATUS_ACCENT_FALLBACK = 'glare';

/**
 * §2.2 — the enemy stat tier: every enemy's Max HP and Attack are multiplied by its Region's entry. Levels alone do not
 * keep up with a team that has grown to three evolved Pokémon, a case of relics and a Badge or two — the
 * player's power compounds and a level-derived enemy's does not. This is the numeric half of the escalation;
 * the accent above is the half the player is meant to notice. Tuned by the whole-run harness against the
 * clear-rate bands in §2.2.1.
 *
 * **Attack-heavy on purpose.** An even split (×1.2/×1.55 on both) bought similar clear rates with Region 3
 * fights 7.5 turns long; weighting Attack keeps every Region between 4 and 5. More HP makes a fight longer,
 * more Attack makes it dangerous, and the curve is meant to be tension, not length. Measured over 720 runs.
 *
 * Region 3's Attack came down from ×2.3 to ×1.95 in v0.7.4: ×2.3 was tuned on the placeholder (Region 1's lines
 * evolved up), and Region 3's own roster — Alakazam, Gengar, Machamp — hits harder by itself, which took Region 3
 * given Region 2 from ~45 % to 37 %. At ×1.95 it reads 47 % over 720 runs, fights 4.9 turns long.
 *
 * Region 1's Attack ×1.45 → ×1.55 in v0.8.9, once the harness played status cards and pre-emptive swaps and read the
 * run four points easier than v0.8.8 had (§2.2.1): R1 60 % · R2|R1 60 % · R3|R2 50 % · run 18 % over 720 runs.
 *
 * Region 2's and Region 3's HP ×0.55 → ×0.45 and ×0.38 → ×0.27 in v0.8.10, paying for their bands moving up two
 * levels (§2.6.5): R1 60 % · R2|R1 58 % · R3|R2 48 % · run 17 %.
 *
 * v0.9.5 rewrote every kit to Gen I moves, four learned and the rest by evolution: an evolved foe holds five cards
 * where it once held up to nine, and Regions 2 and 3 got easier (R2|R1 65 %, R3|R2 57 %). Attack ×1.55/×1.75/×2.25 →
 * ×1.45/×1.9/×2.6 put them back, with the Gym aces' kits scripted and the accent's fallback Glare: R1 59 % · R2|R1 60 % ·
 * R3|R2 48 % · run 17 % (720 runs).
 *
 * v0.9.6's archetype lean (§6.3.4) made the evolved team a touch stronger: Region 3 ×2.6 → ×2.7 Attack and ×0.27 → ×0.3
 * HP, R1 59 % · R2|R1 60 % · R3|R2 47 % · run 17 % (720 runs).
 *
 * v0.9.7's Wild Areas (§2.6.3) recruit each Region's strength — middle forms in Region 2, final forms in Region 3 —
 * and the team arrived far stronger (R2|R1 85 %, R3|R2 75 % in the quick table). Attack ×1.6/×2.65/×3.9 and Region 3's
 * HP ×0.35: R1 62 % · R2|R1 60 % · R3|R2 55 % · run 20 % (720 runs; ×4.0 reads 52 %, but the quick band test then dips under its floor).
 *
 * v0.9.8 evolved every roster by its level, Region 1's and the Gyms' too (§2.7.3): R1 50 % · R2|R1 40 %. Attack
 * ×1.4 / ×2.5 / ×3.6 with the Gyms' own multiplier eased: R1 64 % · R2|R1 57 % · R3|R2 50 % · run 18 % (720 runs).
 *
 * v0.9.9 turned Region Modifiers off (§2.11.3), and the harness lost the pick it took at each gate: R2|R1 51 %. Region
 * 2's Attack ×2.5 → ×2.4: R1 61 % · R2|R1 60 % · R3|R2 49 % · run 18 % (720 runs).
 *
 * v0.9.10 made the Pokémon behind an enemy Lead whole (§5.6: no role, all its HP and Attack) and cut the relics a run
 * collects (§7.3: ~10 at a won run's end → ~7): R1 44 % · R2|R1 36 %. Attack ×1.2 / ×1.9 / ×2.7: R1 57 % · R2|R1 61 % ·
 * R3|R2 52 % · run 18 % (720 runs).
 *
 * Stats then grew in proportion to their base (§6.2.3): R1 55 % · R3|R2 43 %. Attack ×1.15 / ×1.9 / ×2.55: R1 60 % ·
 * R2|R1 59 % · R3|R2 51 % · run 18 % (720 runs).
 *
 * v0.9.11 gave evolved forms their learnsets (§6.9): the enemies' kits grew too — R2|R1 53 % · R3|R2 56 %. Attack ×1.15 /
 * ×1.75 / ×2.6: R1 60 % · R2|R1 60 % · R3|R2 51 % · run 18 % (720 runs).
 */
export interface StatTier {
  attack: number;
}
/**
 * v0.9.12 — the tier is Attack only (the user: an enemy's HP should not be modified). Until then every enemy fought on
 * a fraction of its Max HP — ×0.6 / ×0.45 / ×0.35 — so a Region's foe was not the Pokémon its species and level say;
 * now it is, the HP its level gives, the same as yours. Whole HP alone doubled the fights and, tuned by Attack alone,
 * left Region 3 at 37 % with 46-turn Gyms and 3 % hits — attrition, not threat. So the damage divisor came down for
 * everyone (§4.1.1: 8 → 5, the user's pick) and the tier with it, with Acting Twice placed from Region 2 (§5.6.1):
 * Attack ×0.62 / ×0.78 / ×0.82 — R1 60 % · R2|R1 61 % · R3|R2 46 % · run 17 % (720 runs), fights 5.0 / 7.8 / 9.7 turns.
 * v0.9.90 (§6.2.4) — real evolution levels: a team evolves when the series says, and a stone or trade line only by its item,
 * so the harness's Region 1 team evolved 2.7 times where it evolved 4.0 (R1 50 % · R2|R1 37 % · R3|R2 41 % · run 4 %). The
 * enemies come down to meet it, not the levels: ×0.55 / ×0.70 / ×0.76 — R1 61 % · R2|R1 49 % · R3|R2 56 % · League 60 %
 * · run 10 % (360 runs), v0.9.89's curve.
 * v0.9.91 (§6.9.1) — the progressive learnsets: both sides hold their tracks' moves (a wild Charmeleon Fire Fang, not
 * Scratch), and the enemies gained more by it (R1 53 % · R2|R1 39 % · R3|R2 44 % · run 5 %). ×0.50 / ×0.64 / ×0.67 — R1 63 %
 * · R2|R1 48 % · R3|R2 47 % · League 59 % · run 8 % (360 runs).
 * v0.9.92 (§6.2.4) — the slower XP curve: the team stands at Lv 18 / 30 / 44 at each Gym where it stood at 20 / 32 / 44,
 * and evolves later (R1 47 % · R2|R1 36 %). ×0.46 / ×0.52 / ×0.60 — R1 63 % · R2|R1 49 % · R3|R2 48 % · League 83 % · run
 * 12 % (720 runs, two blocks).
 * v0.9.92 (§5.2.2) — enemies with intent: kits of five and six by role, disruption, more double actions, combos. On the
 * old curve the AI's set-ups and tricks eased Region 1 (73 %), and Region 2's every trainer's ace and Gym first acting
 * twice took it to 40 %: Region 1 +0.03, Region 2 −0.04 on the tier, and the climaxes' own multipliers below
 * (`GYM_ATTACK_MULTIPLIER`, `ELITE_ATTACK_MULTIPLIER`, `LEAGUE.attackMultiplier`). With the slower curve: ×0.49 / ×0.48 /
 * ×0.60 — R1 58 % · R2|R1 46 % · R3|R2 44 % · League 71 % · run 8 %.
 */
export const REGION_STAT_TIER: readonly StatTier[] = [
  { attack: 0.49 },
  { attack: 0.48 },
  { attack: 0.6 },
];

/**
 * §2.2, §8.8 Greater Threats — the tier a Region's enemies fight at. The modifier borrows the next Region's
 * tier; past the last Region it extrapolates one more step of the same size, so Region 3 under Greater Threats
 * is as far above Region 3 as Region 3 is above Region 2.
 */
export function statTierFor(regionIndex: number, greaterThreats: boolean): StatTier {
  const i = regionIndex + (greaterThreats ? 1 : 0);
  const last = REGION_STAT_TIER.length - 1;
  if (i <= last) return REGION_STAT_TIER[Math.max(0, i)]!;
  const top = REGION_STAT_TIER[last]!;
  const prev = REGION_STAT_TIER[last - 1]!;
  const steps = i - last;
  return { attack: top.attack + (top.attack - prev.attack) * steps };
}

export const RUN_START = {
  balls: 3,
  /** docs/design/catalogs/economy.md §1 — "start 3, +1 per Region": one more ball as each new Region begins. */
  ballsPerRegion: 1,
  /**
   * Canon does not fix the starting kit, so this is ours to tune against the harness. Consumables are spent
   * since v0.8.6 (§3.5), so this is three Potions for the whole opening, not three per fight.
   */
  consumables: ['potion', 'potion', 'potion', 'antidote', 'paralyze-heal'],
  starterLevel: 5,
  /** §8.5.3 — a starter's run flourish: Pikachu walks in holding a Light Ball. */
  starterItems: { pikachu: 'light-ball' } as Readonly<Record<string, string>>,
  boxCapacity: 6,
  /**
   * docs/design/catalogs/economy.md §2 — a Region earns roughly 1 000–1 700 ₽, and the Dojo is meant to
   * absorb about half of it. Starting at 150 means the first Dojo is reachable without a Trainer drop, so
   * the node is a choice from the first time you see it rather than a locked door.
   */
  money: 150,
};

/** §7.5 — a TM drops from a Trainer battle at canon's 5 %, now that the Shop is its other source. */
export const TM_DROP_CHANCE = 0.05;

/** §7.4.1 — trainers drop equipment half the time; the Elite guarantees it. No wild combat drops. */
export const HELD_ITEM_DROP_CHANCE = 0.5;

/** The three default starters (§8.5.1). */
export const STARTER_IDS = ['bulbasaur', 'charmander', 'squirtle'];

/** §8.5.2 — the three meta-starters the Poké Mart sells, in shelf order: cheapest first. */
export const META_STARTERS: readonly string[] = ['magikarp', 'eevee', 'pikachu'];

/** §6.8.2 — a line that can start a run without its Bond: a default starter or one the Poké Mart sells. */
export const isStarterLine = (line: string): boolean => STARTER_IDS.includes(line) || META_STARTERS.includes(line);

/** Every sprite a roster or the Gym names, so a missing file is caught by a test and not by a player. */
export const TRAINER_SPRITES = [...new Set([...ALL_TRAINERS.map((t) => t.sprite), ...ALL_GYMS.map((g) => g.sprite), ...ALL_ELITES.map((e) => e.sprite)])];

/** Fails loudly at load if a table above names content that does not exist. */
export function assertRegionContent(content: ContentRegistry): void {
  const check = (id: string) => content.species(id);
  for (const r of REGIONS) {
    for (const b of Object.values(r.biomes)) [...b!.common, ...b!.uncommon, ...b!.rare].forEach(check);
    for (const t of r.trainers) t.team.forEach((m) => check(m.species));
    for (const g of r.gyms) g.team.forEach((m) => check(m.species));
    r.elite.team.forEach((m) => check(m.species));
    check(r.eliteWild.species);
    // §2.5 — a lane theme that names a species the Region cannot produce is a lane that silently falls back.
    for (const t of Object.values(r.laneThemes)) [...t.favours, t.counter].forEach(check);
    // …and a lane whose biome is not in its Region's pools has nowhere to draw from.
    for (const t of Object.values(r.laneThemes)) for (const b of [t.biome, ...t.habitats]) if (!r.biomes[b]) throw new Error(`${r.name}: lane habitat ${b} has no pool`);
  }
  STARTER_IDS.forEach(check);
  for (const c of RUN_START.consumables) content.consumable(c);
}

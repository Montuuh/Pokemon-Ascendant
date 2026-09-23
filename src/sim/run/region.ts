import type { ContentRegistry } from '../content/defs';
import type { PokemonType } from '../types';

// The Regions' content tables: biomes, wild pools, trainer rosters, the Elites and the Gyms (§2.6.1, §2.6.3,
// §2.7.1, §2.8, §5.9), one `RegionContent` per Region. Rows mirror docs/design/catalogs/{biomes-regions,trainers,
// elites,gyms,species-r2}.md; ids are validated against the registry by `assertRegionContent`, so a typo here
// fails the content test rather than a playthrough.
//
// The Region 1 tables keep their historical names (`BIOMES`, `TRAINERS`, `GYMS`, `ELITE`…) because fixtures,
// tests and the v0.2–v0.6 code read them by those names; everything that has to know *which* Region asks
// `regionContent(index)`.

export type BiomeId = 'meadow' | 'cave' | 'river' | 'sea' | 'power-plant' | 'volcano' | 'sky' | 'tower';

export interface BiomePool {
  id: BiomeId;
  name: string;
  /** Stage backdrop id under public/art/stages. */
  stage: string;
  common: string[];
  uncommon: string[];
  rare: string[];
}

/**
 * §2.6.3 — the Region 1 wild pools. A Wild node offers 2 Common + 1 Uncommon (§2.6.2).
 *
 * v0.7.3 widened them (§2.6.1: "a pool that offers the same three Pokémon twice is the failure state"): the
 * Meadow gains Bellsprout, the River Krabby, and the Rares are the catalogue's finds now — an Eevee in the grass
 * and Lapras in the water — instead of an Uncommon repeated in the Rare slot.
 */
export const BIOMES: Partial<Record<BiomeId, BiomePool>> & Record<'meadow' | 'cave' | 'river', BiomePool> = {
  meadow: {
    id: 'meadow', name: 'Meadow', stage: 'meadow',
    common: ['caterpie', 'weedle', 'pidgey', 'rattata'],
    uncommon: ['oddish', 'bellsprout'],
    rare: ['eevee'],
  },
  cave: {
    id: 'cave', name: 'Cave', stage: 'cave',
    common: ['zubat', 'geodude', 'diglett'],
    uncommon: ['machop', 'onix'],
    rare: ['lapras'],
  },
  river: {
    id: 'river', name: 'River', stage: 'river',
    common: ['magikarp', 'poliwag'],
    uncommon: ['psyduck', 'krabby'],
    rare: ['lapras'],
  },
};

/** Region 1's primary biome appears most often (§2.6.1). */
export const REGION1_BIOME_WEIGHTS: { biome: BiomeId; weight: number }[] = [
  { biome: 'meadow', weight: 5 },
  { biome: 'cave', weight: 3 },
  { biome: 'river', weight: 2 },
];

/**
 * §2.6.3 — the whole route's wild span. A single flat band made layer 0 as dangerous as layer 5, so the band
 * walks with the route instead: the first node is L5–6, the last before the Gym is L12–13.
 */
export const WILD_LEVEL_BAND: [number, number] = [5, 13];

/**
 * The layer count the band is spread across. It is a constant here rather than an import from `map.ts`
 * because `map.ts` imports *this* file; the map test asserts they agree.
 */
export const ROUTE_LAYERS = 12;

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
  return roster.team.map((m) => ({ species: m.species, level: base + (m.level - floor) }));
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
    team: [{ species: 'caterpie', level: 8 }, { species: 'weedle', level: 9 }] },
  { id: 'bug-catcher-b', archetype: 'bug-catcher', name: 'Bug Catcher Doug', sprite: 'bug-catcher', line: 'I caught these myself, you know.',
    team: [{ species: 'metapod', level: 10 }, { species: 'kakuna', level: 10 }] },
  { id: 'youngster-a', archetype: 'youngster', name: 'Youngster Joey', sprite: 'youngster', line: 'My Rattata is in the top percentage!',
    team: [{ species: 'rattata', level: 10 }] },
  { id: 'youngster-b', archetype: 'youngster', name: 'Youngster Ben', sprite: 'youngster', line: 'Shorts are comfy and easy to wear!',
    team: [{ species: 'pidgey', level: 10 }, { species: 'rattata', level: 11 }] },
  { id: 'lass-a', archetype: 'lass', name: 'Lass Iris', sprite: 'lass', line: 'Let me show you what I have been growing.',
    team: [{ species: 'oddish', level: 10 }, { species: 'pidgey', level: 11 }] },
  { id: 'lass-b', archetype: 'lass', name: 'Lass Nina', sprite: 'lass', line: 'Do not underestimate an Oddish.',
    team: [{ species: 'weedle', level: 10 }, { species: 'oddish', level: 11 }] },
  { id: 'hiker-a', archetype: 'hiker', name: 'Hiker Marcos', sprite: 'hiker', line: 'This whole ridge is my training ground.',
    team: [{ species: 'geodude', level: 11 }, { species: 'onix', level: 11 }] },
  { id: 'hiker-b', archetype: 'hiker', name: 'Hiker Dov', sprite: 'hiker', line: 'You will not get past a wall of rock.',
    team: [{ species: 'diglett', level: 10 }, { species: 'geodude', level: 12 }] },
  { id: 'swimmer-a', archetype: 'swimmer', name: 'Swimmer Cass', sprite: 'swimmer', line: 'The water is warmer than it looks. Come in.',
    team: [{ species: 'poliwag', level: 10 }, { species: 'magikarp', level: 9 }] },
  { id: 'swimmer-b', archetype: 'swimmer', name: 'Swimmer Tomas', sprite: 'swimmer', line: 'I train out past the shelf. You would not last.',
    team: [{ species: 'psyduck', level: 11 }, { species: 'krabby', level: 11 }] },
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
    { species: 'pidgeotto', level: 12, phaseCount: 2 },
    { species: 'ivysaur', level: 13, phaseCount: 2 },
  ],
};

/** §2.8.1 — the Elite sits two levels above the wild band of its layer. It is the run's hardest fight but one. */
export function eliteTeamFor(layer: number, elite: EliteDef = ELITE, band: readonly [number, number] = WILD_LEVEL_BAND): { species: string; level: number }[] {
  const base = wildBandFor(layer, band)[1] + 2;
  const floor = Math.min(...elite.team.map((m) => m.level));
  return elite.team.map((m) => ({ species: m.species, level: base + (m.level - floor) }));
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
  level: 15,
  /** §2.8.2 — boss-tier HP, two phases, no evolution: it is a wild, not an ace. */
  phaseCount: 2,
  stage: 'meadow',
  line: 'Something enormous is asleep across the path. It has not noticed you yet.',
};

/** §2.8.2 — the Elite Wild sits with the Elite Trainer's premium: it is the other hardest fight but one. */
export function eliteWildTeamFor(layer: number, eliteWild: EliteWildDef = ELITE_WILD, band: readonly [number, number] = WILD_LEVEL_BAND): { species: string; level: number }[] {
  return [{ species: eliteWild.species, level: wildBandFor(layer, band)[1] + 3 }];
}

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
   * `moves` scripts a member's kit when its learnset at that level has no off-type answer (§5.9.3: "a Gym you
   * can hard-counter with a single type is not a fight").
   */
  team: { species: string; level: number; phaseCount: 1 | 2 | 3; moves?: string[] }[];
  /** §2.5 — the one-line promise the map shows from layer 0, so the fork is never a surprise. */
  telegraph: string;
}

/**
 * §5.9.2 — the Region 1 Gym pool: Rock · Water · Bug · Normal. The map draws **two distinct types** per run
 * and puts one at the end of each lane (§2.5), so nine of the twelve Gym types in the game are missed by any
 * single run and the two you do meet are a choice rather than a schedule.
 *
 * Levels are the §5.9.3 power premium: the non-ace sits 4 levels above the Region's wild band and the ace 6.
 * The Rock Gym's exact numbers were set by the whole-run harness in v0.2 — a final form in the *first* Gym
 * was a wall that ended 52 of 90 simulated runs — and the other three are built to the same shape.
 *
 * Every team carries one off-type answer (§5.9.3): a Gym you can hard-counter with a single type is not a
 * fight, it is a type check. Brock's `body-press` is Fighting, Misty's `metal-claw` is Rock, Aster's
 * `confusion` is Psychic, Wren's `dig` is Ground.
 */
export const GYMS: GymDef[] = [
  {
    id: 'rock-gym-r1',
    region: 1,
    name: 'Leader Brock',
    sprite: 'brock',
    type: 'rock',
    badgeId: 'boulder-badge',
    // §2.5 — a Gym's backdrop is its own lane's biome at depth or at dusk, never a fifth unrelated room. The
    // lane has looked like this for four layers; arriving somewhere else would throw that away at the door.
    stage: 'damp-cave',
    line: 'My rock-hard willpower is evident even in my Pokémon!',
    telegraph: 'A wall that braces harder the more you hit it. Bring Water, Grass or Fighting.',
    // Tuned on the whole-run harness: a route team arrives around Lv 14 having evolved once, so the Region 1
    // climax is the line's mid-stage at a level premium, not its final form. Golem is a Region 3 problem.
    team: [
      { species: 'geodude', level: 14, phaseCount: 2 },
      { species: 'graveler', level: 16, phaseCount: 3 },
    ],
  },
  {
    id: 'water-gym-r1',
    region: 1,
    name: 'Leader Misty',
    sprite: 'misty',
    type: 'water',
    badgeId: 'cascade-badge',
    stage: 'sea',
    line: 'My policy is an all-out offensive with Water-type Pokémon!',
    telegraph: 'Taxes your AP and muddles your hand. Bring Grass or Electric, and cards you can afford.',
    // §5.9.3 forbids fielding a starter line: a Gym Leader should not hold a Pokémon the player may own.
    // That is why the Water Gym is Krabby and Kingler rather than Squirtle and Wartortle.
    team: [
      { species: 'krabby', level: 14, phaseCount: 2 },
      { species: 'kingler', level: 16, phaseCount: 3 },
    ],
  },
  {
    id: 'bug-gym-r1',
    region: 1,
    name: 'Leader Aster',
    sprite: 'bugsy',
    type: 'bug',
    badgeId: 'hive-badge',
    stage: 'forest',
    line: 'Bug Pokémon are tougher than you think. Let me show you.',
    telegraph: 'Floods you with Sleep and Confusion. Bring cures, Fire or Flying.',
    team: [
      { species: 'metapod', level: 14, phaseCount: 2 },
      { species: 'butterfree', level: 16, phaseCount: 3 },
    ],
  },
  {
    id: 'normal-gym-r1',
    region: 1,
    name: 'Leader Wren',
    sprite: 'whitney',
    type: 'normal',
    badgeId: 'plain-badge',
    stage: 'night-meadow',
    line: 'Nothing fancy. Just everything, all at once.',
    telegraph: 'No weakness to exploit and a Home Field that makes every hit land harder. Bring Fighting, or bring more HP.',
    team: [
      { species: 'pidgeotto', level: 14, phaseCount: 2 },
      { species: 'raticate', level: 16, phaseCount: 3 },
    ],
  },
];

/**
 * §5.9.3's power premium: the non-ace sits **4 levels above the Region's wild band** and the ace **6**. The
 * team levels in  are the catalogue's, tuned against a six-layer route; deriving them from the band
 * instead means a change to the route length cannot silently leave the climax four levels behind, which is
 * exactly what v0.5's jump from ten layers to twelve did on its first measurement.
 */
export function gymTeamFor(gym: GymDef): { species: string; level: number; phaseCount: 1 | 2 | 3; moves?: string[] }[] {
  const top = wildBandFor(ROUTE_LAYERS - 2, regionContent(gym.region - 1).wildBand)[1];
  return gym.team.map((m, i) => ({ ...m, level: top + (i === gym.team.length - 1 ? 6 : 4) }));
}

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
  biome: BiomeId;
  /** Weighted up inside the biome's pool; not exclusive, so the three-species offer never starves. */
  favours: string[];
  /** The one species in the lane that beats its own Gym. A late commit is a handicap, not a loss. */
  counter: string;
  trainers: string[];
}

export const LANE_THEME: Record<string, LaneTheme> = {
  rock: { biome: 'cave', favours: ['geodude', 'onix', 'diglett', 'zubat'], counter: 'machop', trainers: ['hiker'] },
  water: { biome: 'river', favours: ['magikarp', 'poliwag', 'psyduck', 'krabby'], counter: 'oddish', trainers: ['swimmer'] },
  bug: { biome: 'meadow', favours: ['caterpie', 'weedle', 'oddish'], counter: 'pidgey', trainers: ['bug-catcher'] },
  normal: { biome: 'meadow', favours: ['pidgey', 'rattata'], counter: 'machop', trainers: ['youngster', 'lass'] },
};

// ── Region 2 — Coastal Cliffs (v0.7.3) ──────────────────────────────────────────────────────────────────────

/**
 * §2.6.1 / §2.6.3 — Region 2's pools. The Sea is primary; the River, the Power Plant and the Cave are its
 * secondaries and the Meadow is rare. Region 1 species that appear here arrive at Region 2's band and evolve
 * after the catch, the same as a Region 2 basic (every basic evolves at 12, `catalogs/species-r1.md` §0).
 */
export const BIOMES_R2: Partial<Record<BiomeId, BiomePool>> = {
  sea: {
    id: 'sea', name: 'Sea', stage: 'sea',
    common: ['tentacool', 'shellder', 'horsea'],
    uncommon: ['staryu', 'seel'],
    rare: ['lapras'],
  },
  river: {
    id: 'river', name: 'River', stage: 'river',
    common: ['poliwag', 'horsea', 'magikarp'],
    uncommon: ['psyduck', 'krabby'],
    rare: ['lapras'],
  },
  'power-plant': {
    id: 'power-plant', name: 'Power Plant', stage: 'power-plant',
    common: ['voltorb', 'magnemite'],
    uncommon: ['pikachu'],
    rare: ['electabuzz'],
  },
  cave: {
    id: 'cave', name: 'Cave', stage: 'cave',
    common: ['koffing', 'zubat', 'geodude'],
    uncommon: ['machop', 'onix'],
    rare: ['lapras'],
  },
  meadow: {
    id: 'meadow', name: 'Meadow', stage: 'meadow',
    common: ['bellsprout', 'pidgey', 'rattata'],
    uncommon: ['growlithe', 'oddish'],
    rare: ['eevee'],
  },
};

/** §2.6.1 — the Sea is Region 2's primary; the Meadow is the rare one. */
export const REGION2_BIOME_WEIGHTS: { biome: BiomeId; weight: number }[] = [
  { biome: 'sea', weight: 5 },
  { biome: 'power-plant', weight: 3 },
  { biome: 'river', weight: 2 },
  { biome: 'cave', weight: 2 },
  { biome: 'meadow', weight: 1 },
];

/**
 * §2.7 — the Region 2 rosters (`catalogs/trainers.md` §3), two per archetype. Written in the forms their band
 * warrants (every Region 2 line evolves at 12) and walked through `evolvedAt` on top, so a roster level the band
 * lifts past a threshold still fields the right form. The Hex Maniac waits for Region 3, where its Ghosts are.
 */
export const TRAINERS_R2: TrainerRoster[] = [
  { id: 'youngster-r2-a', archetype: 'youngster', name: 'Youngster Calvin', sprite: 'youngster', line: 'I have been training since Pallet. Look how big they got!',
    team: [{ species: 'raticate', level: 15 }, { species: 'pidgeotto', level: 16 }] },
  { id: 'youngster-r2-b', archetype: 'youngster', name: 'Youngster Otis', sprite: 'youngster', line: 'Only one Pokémon. It is the only one I need.',
    team: [{ species: 'raichu', level: 17 }] },
  { id: 'lass-r2-a', archetype: 'lass', name: 'Lass Dana', sprite: 'lass', line: 'The sea breeze is lovely. So is a good Sleep Powder.',
    team: [{ species: 'gloom', level: 16 }, { species: 'starmie', level: 17 }] },
  { id: 'lass-r2-b', archetype: 'lass', name: 'Lass Mei', sprite: 'lass', line: 'Careful — mine sting.',
    team: [{ species: 'weepinbell', level: 16 }, { species: 'raichu', level: 17 }] },
  { id: 'hiker-r2-a', archetype: 'hiker', name: 'Hiker Bruno', sprite: 'hiker', line: 'These cliffs are softer than my Pokémon.',
    team: [{ species: 'graveler', level: 17 }, { species: 'machoke', level: 17 }] },
  { id: 'hiker-r2-b', archetype: 'hiker', name: 'Hiker Alan', sprite: 'hiker', line: 'The tide cannot move a mountain.',
    team: [{ species: 'onix', level: 17 }, { species: 'graveler', level: 18 }] },
  { id: 'swimmer-r2-a', archetype: 'swimmer', name: 'Swimmer Luis', sprite: 'swimmer', line: 'Out here the water bites back.',
    team: [{ species: 'dewgong', level: 16 }, { species: 'tentacruel', level: 17 }] },
  { id: 'swimmer-r2-b', archetype: 'swimmer', name: 'Swimmer Paula', sprite: 'swimmer', line: 'I race the Seadra to the point every morning.',
    team: [{ species: 'seadra', level: 16 }, { species: 'cloyster', level: 17 }] },
  { id: 'engineer-r2-a', archetype: 'engineer', name: 'Engineer Hugo', sprite: 'scientist', line: 'Give me two turns and I will show you a real current.',
    team: [{ species: 'magneton', level: 17 }, { species: 'electrode', level: 18 }] },
  { id: 'engineer-r2-b', archetype: 'engineer', name: 'Engineer Ines', sprite: 'scientist', line: 'The plant never sleeps. Neither do I.',
    team: [{ species: 'electrode', level: 17 }, { species: 'electabuzz', level: 18 }] },
  { id: 'rocket-grunt-r2-a', archetype: 'rocket-grunt', name: 'Rocket Grunt', sprite: 'rocketgrunt', line: 'Hand over anything rare and nobody gets poisoned.',
    team: [{ species: 'weezing', level: 18 }, { species: 'golbat', level: 18 }] },
  { id: 'rocket-grunt-r2-b', archetype: 'rocket-grunt', name: 'Rocket Grunt', sprite: 'rocketgrunt', line: 'You picked the wrong pier, kid.',
    team: [{ species: 'raticate', level: 17 }, { species: 'weezing', level: 18 }] },
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
    { species: 'machoke', level: 22, phaseCount: 2 },
    { species: 'hitmonchan', level: 23, phaseCount: 2 },
  ],
};

/**
 * §2.8.2 — Lapras, the Region 2 boss-wild (catalogs/elites.md §5): Sing and Ice Shard to control, Ice Beam and
 * Surf when it tires. Its learnset only reaches Ice Beam at 30, so the script is its kit, not its level's.
 */
export const ELITE_WILD_R2: EliteWildDef = {
  id: 'elite-wild-lapras',
  species: 'lapras',
  level: 24,
  phaseCount: 2,
  stage: 'sea',
  moves: ['sing', 'ice-shard', 'ice-beam', 'surf'],
  line: 'A song carries over the water. Something large is riding the swell toward you.',
};

/**
 * §5.9.2 — the Region 2 pool: Fire · Grass · Electric · Poison (`catalogs/gyms.md` §2). Same shape as Region 1:
 * slot 1 two-phase, the ace three-phase, levels from the band (§5.9.3), one off-type answer each.
 */
export const GYMS_R2: GymDef[] = [
  {
    id: 'fire-gym-r2', region: 2, name: 'Leader Blaine', sprite: 'blaine', type: 'fire', badgeId: 'volcano-badge',
    stage: 'volcano',
    line: 'Hah! I hope you brought Burn Heal. My Pokémon burn hotter than this whole coast.',
    telegraph: 'A burst race on a Home Field that makes every Fire hit land harder. Bring Water or Rock, or bring more HP.',
    team: [{ species: 'growlithe', level: 20, phaseCount: 2 }, { species: 'arcanine', level: 22, phaseCount: 3 }],
  },
  {
    id: 'grass-gym-r2', region: 2, name: 'Leader Erika', sprite: 'erika', type: 'grass', badgeId: 'rainbow-badge',
    stage: 'forest',
    line: 'Oh… I was dozing among the flowers. Shall we? I do not intend to lose.',
    telegraph: 'Floods your Lead with Sleep and Poison. Bring cures, Fire or Flying.',
    team: [{ species: 'weepinbell', level: 20, phaseCount: 2 }, { species: 'vileplume', level: 22, phaseCount: 3 }],
  },
  {
    id: 'electric-gym-r2', region: 2, name: 'Leader Surge', sprite: 'ltsurge', type: 'electric', badgeId: 'thunder-badge',
    stage: 'power-plant',
    line: 'Hey, kid! Electric Pokémon saved me in the war. They will shock you just the same!',
    telegraph: 'Taxes your AP and locks your Lead with Paralysis. Bring Ground, and cards you can afford.',
    team: [{ species: 'voltorb', level: 20, phaseCount: 2 }, { species: 'electrode', level: 22, phaseCount: 3 }],
  },
  {
    id: 'poison-gym-r2', region: 2, name: 'Leader Koga', sprite: 'koga', type: 'poison', badgeId: 'soul-badge',
    stage: 'dark-city',
    line: 'Fwahahaha! A ninja does not strike. He waits for the poison to do it.',
    telegraph: 'Poisons everything and waits you out. Bring cures, Psychic or Ground.',
    team: [{ species: 'koffing', level: 20, phaseCount: 2 }, { species: 'weezing', level: 22, phaseCount: 3 }],
  },
];

/**
 * §2.5 — Region 2's lanes. Each Gym's lane is its biome and its archetype: the Fire and Grass lanes walk the
 * coastal Meadow (Youngsters; Lasses), the Electric lane the Power Plant (Engineers), the Poison lane the Cave
 * (Rocket Grunts). Each carries one counter to its own Gym, as in Region 1.
 */
export const LANE_THEME_R2: Record<string, LaneTheme> = {
  fire: { biome: 'meadow', favours: ['growlithe', 'rattata', 'pidgey'], counter: 'horsea', trainers: ['youngster'] },
  grass: { biome: 'meadow', favours: ['bellsprout', 'oddish'], counter: 'growlithe', trainers: ['lass'] },
  electric: { biome: 'power-plant', favours: ['voltorb', 'magnemite', 'pikachu'], counter: 'geodude', trainers: ['engineer'] },
  poison: { biome: 'cave', favours: ['koffing', 'zubat'], counter: 'staryu', trainers: ['rocket-grunt'] },
};

// ── Region 3 — Volcanic Highlands (v0.7.4) ──────────────────────────────────────────────────────────────────

/**
 * §2.6.1 / §2.6.3 — Region 3's pools (`catalogs/biomes-regions.md` §2, `species-pool-r2-r3.md`). The Volcano
 * is primary; the Cave, the Sky and the rare Abandoned Tower are its secondaries. Every species here exists since
 * the Gen I pass, so the Region *places* lines rather than authoring them. The Legendaries the catalogue names as
 * Rares (Moltres, Articuno) stay out of every pool; a Pokémon the Region has no other home for takes the slot.
 *
 * The Cave is shared by two lanes — the Fighting lane's Machop and Mankey, the Ice lane's Seel and Shellder (the
 * Seafoam register) — the way Region 1's Meadow carries both its Bug and its Normal lane.
 */
export const BIOMES_R3: Partial<Record<BiomeId, BiomePool>> = {
  volcano: {
    id: 'volcano', name: 'Volcano Slope', stage: 'volcano',
    common: ['vulpix', 'ponyta', 'sandshrew'],
    uncommon: ['rhyhorn', 'growlithe'],
    rare: ['magmar'],
  },
  cave: {
    id: 'cave', name: 'Cave', stage: 'cave',
    common: ['zubat', 'geodude', 'machop', 'mankey', 'seel', 'shellder'],
    uncommon: ['abra', 'nidoran-f', 'jynx'],
    rare: ['aerodactyl'],
  },
  sky: {
    id: 'sky', name: 'Sky Cliffs', stage: 'sky-pillar',
    common: ['spearow', 'pidgey'],
    uncommon: ['doduo', 'farfetchd'],
    rare: ['scyther'],
  },
  tower: {
    id: 'tower', name: 'Abandoned Tower', stage: 'tower',
    common: ['gastly', 'drowzee'],
    uncommon: ['cubone', 'grimer'],
    rare: ['mr-mime'],
  },
};

/** §2.6.1 — the Volcano is Region 3's primary; the Abandoned Tower is the rare one. */
export const REGION3_BIOME_WEIGHTS: { biome: BiomeId; weight: number }[] = [
  { biome: 'volcano', weight: 5 },
  { biome: 'cave', weight: 3 },
  { biome: 'sky', weight: 2 },
  { biome: 'tower', weight: 1 },
];

/**
 * §2.7 — the Region 3 rosters (`catalogs/trainers.md` §4), two per archetype, written in their forms and walked
 * through `evolvedAt` like Region 2's. The Hex Maniacs are veiled (§2.7.1): each of their Pokémon hides its first
 * intent. Swimmers stay on for the Ice lane, whose cave is the Seafoam kind.
 */
export const TRAINERS_R3: TrainerRoster[] = [
  { id: 'ace-trainer-r3-a', archetype: 'ace-trainer', name: 'Ace Trainer Rhea', sprite: 'acetrainer', line: 'Two Pokémon, both at their best. That is all an Ace needs.',
    team: [{ species: 'pidgeot', level: 30 }, { species: 'arcanine', level: 32 }] },
  { id: 'ace-trainer-r3-b', archetype: 'ace-trainer', name: 'Ace Trainer Dario', sprite: 'acetrainer', line: 'Mind or muscle? I brought both.',
    team: [{ species: 'alakazam', level: 31 }, { species: 'machamp', level: 32 }] },
  { id: 'hex-maniac-r3-a', archetype: 'hex-maniac', name: 'Hex Maniac Vera', sprite: 'hexmaniac', line: 'You cannot see what they are planning. That is the point.', veiled: true,
    team: [{ species: 'hypno', level: 30 }, { species: 'gengar', level: 31 }] },
  { id: 'hex-maniac-r3-b', archetype: 'hex-maniac', name: 'Hex Maniac Mona', sprite: 'hexmaniac', line: 'The tower tells me your moves. It tells you nothing.', veiled: true,
    team: [{ species: 'mr-mime', level: 30 }, { species: 'slowbro', level: 31 }] },
  { id: 'rocket-grunt-r3-a', archetype: 'rocket-grunt', name: 'Rocket Grunt', sprite: 'rocketgrunt', line: 'The Boss wants this mountain. You are standing on it.',
    team: [{ species: 'weezing', level: 30 }, { species: 'arbok', level: 31 }] },
  { id: 'rocket-grunt-r3-b', archetype: 'rocket-grunt', name: 'Rocket Grunt', sprite: 'rocketgrunt', line: 'Team Rocket never loses twice. Well — never three times.',
    team: [{ species: 'golbat', level: 30 }, { species: 'muk', level: 31 }] },
  { id: 'engineer-r3-a', archetype: 'engineer', name: 'Engineer Otto', sprite: 'scientist', line: 'The geothermal plant runs on these two. So do I.',
    team: [{ species: 'electrode', level: 30 }, { species: 'magneton', level: 31 }] },
  { id: 'engineer-r3-b', archetype: 'engineer', name: 'Engineer Silvia', sprite: 'scientist', line: 'Porygon was built at Silph. I rebuilt it better.',
    team: [{ species: 'porygon', level: 30 }, { species: 'magneton', level: 31 }] },
  { id: 'hiker-r3-a', archetype: 'hiker', name: 'Hiker Ernesto', sprite: 'hiker', line: 'This mountain was here before you. So were we.',
    team: [{ species: 'rhyhorn', level: 31 }, { species: 'golem', level: 32 }] },
  { id: 'hiker-r3-b', archetype: 'hiker', name: 'Hiker Ivan', sprite: 'hiker', line: 'I carried Machamp up here. Then it carried me.',
    team: [{ species: 'onix', level: 30 }, { species: 'machamp', level: 32 }] },
  { id: 'swimmer-r3-a', archetype: 'swimmer', name: 'Swimmer Nerea', sprite: 'swimmer', line: 'The water under the ice is freezing. You get used to it.',
    team: [{ species: 'dewgong', level: 30 }, { species: 'seaking', level: 31 }] },
  { id: 'swimmer-r3-b', archetype: 'swimmer', name: 'Swimmer Marco', sprite: 'swimmer', line: 'Swim the ice caves long enough and nothing scares you.',
    team: [{ species: 'cloyster', level: 30 }, { species: 'starmie', level: 31 }] },
];

/**
 * §2.8.1 — the Region 3 Elite Trainer: Giovanni's lane (`catalogs/elites.md` §4). Of the three the catalogue
 * weighs for Region 3, the Rival waits for the counter-pick that gives him meaning and the Specialist's Dewgong
 * and Cloyster are Lorelei's own team; Giovanni can also lead the Ground Gym, and canon keeps both.
 */
export const ELITE_R3: EliteDef = {
  id: 'elite-giovanni-r3',
  name: 'Boss Giovanni',
  sprite: 'giovanni',
  line: 'So you are the one who keeps getting in Team Rocket’s way. I will end that here.',
  team: [
    { species: 'dugtrio', level: 32, phaseCount: 2 },
    { species: 'persian', level: 34, phaseCount: 2 },
  ],
};

/**
 * §2.8.2 — Aerodactyl, the Region 3 boss-wild (catalogs/elites.md §5): Agility and Ancient Power to set up, Sky
 * Drop and Rock Slide when it tires. The script is its kit, as Lapras's is.
 */
export const ELITE_WILD_R3: EliteWildDef = {
  id: 'elite-wild-aerodactyl',
  species: 'aerodactyl',
  level: 34,
  phaseCount: 2,
  stage: 'sky-pillar',
  moves: ['agility', 'ancient-power', 'sky-drop', 'rock-slide-m'],
  line: 'A shriek from the crags. Something ancient is circling overhead, and it has seen you.',
};

/**
 * §5.9.2 — the Region 3 pool: Psychic · Ground · Fighting · Ice (`catalogs/gyms.md` §3). Same shape as the other
 * two, one off-type answer each (§5.9.3): Alakazam's Shadow Ball and Machamp's Thunder Punch are scripted because
 * their learnsets at the Gym's level are all their own type; Rhydon's Megahorn and Dewgong's Surf are their own.
 */
export const GYMS_R3: GymDef[] = [
  {
    id: 'psychic-gym-r3', region: 3, name: 'Leader Sabrina', sprite: 'sabrina', type: 'psychic', badgeId: 'marsh-badge',
    stage: 'library',
    line: 'I foresaw your arrival. I also foresaw how this ends.',
    telegraph: 'Taxes your AP and locks your hand. Bring Bug or Ghost, and cards you can afford.',
    team: [
      { species: 'kadabra', level: 33, phaseCount: 2 },
      { species: 'alakazam', level: 35, phaseCount: 3, moves: ['psychic', 'psyshock', 'calm-mind', 'shadow-ball'] },
    ],
  },
  {
    id: 'ground-gym-r3', region: 3, name: 'Leader Giovanni', sprite: 'giovanni', type: 'ground', badgeId: 'earth-badge',
    stage: 'desert',
    line: 'This Gym is the last thing between you and the League. It does not move.',
    telegraph: 'A wall that braces harder the more you hit it. Bring Water, Grass or Ice.',
    team: [{ species: 'nidoqueen', level: 34, phaseCount: 2 }, { species: 'rhydon', level: 36, phaseCount: 3 }],
  },
  {
    id: 'fighting-gym-r3', region: 3, name: 'Leader Kiyo', sprite: 'kiyo', type: 'fighting', badgeId: 'knuckle-badge',
    stage: 'gym',
    line: 'A hundred days on this mountain, training. Show me your hundred.',
    telegraph: 'A burst race on a Home Field that makes every Fighting hit land harder. Bring Psychic or Flying, or more HP.',
    team: [
      { species: 'machoke', level: 34, phaseCount: 2 },
      { species: 'machamp', level: 36, phaseCount: 3, moves: ['cross-chop', 'dynamic-punch', 'close-combat', 'thunder-punch'] },
    ],
  },
  {
    id: 'ice-gym-r3', region: 3, name: 'Leader Lorelei', sprite: 'lorelei', type: 'ice', badgeId: 'glacier-badge',
    stage: 'ice-cave',
    line: 'Your Pokémon will freeze before they reach me. Let us see how long you last.',
    telegraph: 'Freezes your Lead and taxes your AP. Bring Fighting, Electric or Rock.',
    team: [{ species: 'dewgong', level: 34, phaseCount: 2 }, { species: 'cloyster', level: 36, phaseCount: 3 }],
  },
];

/**
 * §2.5 — Region 3's lanes: the Psychic lane climbs the Tower (Hex Maniacs), the Ground lane the Volcano (Rocket
 * Grunts, Giovanni's), the Fighting lane and the Ice lane share the Cave (Hikers; Swimmers). One counter each.
 */
export const LANE_THEME_R3: Record<string, LaneTheme> = {
  psychic: { biome: 'tower', favours: ['drowzee', 'gastly'], counter: 'scyther', trainers: ['hex-maniac'] },
  ground: { biome: 'volcano', favours: ['sandshrew', 'vulpix'], counter: 'exeggcute', trainers: ['rocket-grunt'] },
  fighting: { biome: 'cave', favours: ['machop', 'mankey'], counter: 'abra', trainers: ['hiker'] },
  ice: { biome: 'cave', favours: ['seel', 'shellder'], counter: 'machop', trainers: ['swimmer'] },
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
  /** A roster's species are walked through `evolvedAt` at its band-derived level (Regions 2 on). */
  evolveRosters: boolean;
}

export const REGIONS: readonly RegionContent[] = [
  {
    index: 0, name: 'Verdant Route', biomes: BIOMES, biomeWeights: REGION1_BIOME_WEIGHTS, wildBand: WILD_LEVEL_BAND, trunkStage: 'meadow',
    trainers: TRAINERS, elite: ELITE, eliteWild: ELITE_WILD, gyms: GYMS, laneThemes: LANE_THEME, levelOffset: 0, evolveRosters: false,
  },
  {
    index: 1, name: 'Coastal Cliffs', biomes: BIOMES_R2, biomeWeights: REGION2_BIOME_WEIGHTS, wildBand: [12, 20], trunkStage: 'river',
    trainers: TRAINERS_R2, elite: ELITE_R2, eliteWild: ELITE_WILD_R2, gyms: GYMS_R2, laneThemes: LANE_THEME_R2, levelOffset: 0, evolveRosters: true,
  },
  {
    index: 2, name: 'Volcanic Highlands', biomes: BIOMES_R3, biomeWeights: REGION3_BIOME_WEIGHTS, wildBand: [22, 30], trunkStage: 'volcano',
    trainers: TRAINERS_R3, elite: ELITE_R3, eliteWild: ELITE_WILD_R3, gyms: GYMS_R3, laneThemes: LANE_THEME_R3, levelOffset: 0, evolveRosters: true,
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
 * The enemy's first type picks the move. A type the games never gave a status move falls back to Supersonic,
 * which half the franchise learns.
 */
export const STATUS_ACCENT_FROM = 1;
export const STATUS_ACCENT_MOVES: Partial<Record<PokemonType, string>> = {
  fire: 'will-o-wisp',
  electric: 'thunder-wave',
  poison: 'poison-powder',
  grass: 'stun-spore',
  bug: 'powder-spread',
  psychic: 'hypnosis',
  ghost: 'confuse-ray',
};
export const STATUS_ACCENT_FALLBACK = 'supersonic';

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
 */
export interface StatTier {
  hp: number;
  attack: number;
}
export const REGION_STAT_TIER: readonly StatTier[] = [
  { hp: 1, attack: 1 },
  { hp: 1, attack: 1.6 },
  { hp: 1.15, attack: 1.95 },
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
  return { hp: top.hp + (top.hp - prev.hp) * steps, attack: top.attack + (top.attack - prev.attack) * steps };
}

export const RUN_START = {
  balls: 3,
  /** docs/design/catalogs/economy.md §1 — "start 3, +1 per Region": one more ball as each new Region begins. */
  ballsPerRegion: 1,
  /**
   * Canon does not fix the starting kit, so this is ours to tune against the harness. A consumable is a
   * per-combat roster, not ammunition (§3.5), so this is three Potions *per fight*, not three per run.
   */
  consumables: ['potion', 'potion', 'antidote', 'paralyze-heal'],
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

/** §7.3.1 — a relic from an ordinary Trainer. Elites and the Gym drop one outright. */
export const RELIC_DROP_CHANCE = 0.35;

/** §7.4.6 — "Trainer battles drop one 20 % of the time". Wild loot never contains a Held Item. */
export const HELD_ITEM_DROP_CHANCE = 0.2;

/** The three default starters (§8.5.1). */
export const STARTER_IDS = ['bulbasaur', 'charmander', 'squirtle'];

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
    for (const t of Object.values(r.laneThemes)) if (!r.biomes[t.biome]) throw new Error(`${r.name}: lane biome ${t.biome} has no pool`);
  }
  STARTER_IDS.forEach(check);
  for (const c of RUN_START.consumables) content.consumable(c);
}

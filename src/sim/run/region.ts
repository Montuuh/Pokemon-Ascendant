import type { ContentRegistry } from '../content/defs';
import type { PokemonType } from '../types';

// Region 1 content tables: biomes, wild pools, trainer rosters and the Gym (§2.6.1, §2.6.3, §2.7.1, §5.9).
// Rows mirror docs/design/catalogs/{biomes-regions,trainers,gyms}.md; ids are validated against the registry
// by `assertRegionContent`, so a typo here fails the content test rather than a playthrough.

export type BiomeId = 'meadow' | 'cave' | 'river';

export interface BiomePool {
  id: BiomeId;
  name: string;
  /** Stage backdrop id under public/art/stages. */
  stage: string;
  common: string[];
  uncommon: string[];
  rare: string[];
}

/** §2.6.3 — the Region 1 wild pools. A Wild node offers 2 Common + 1 Uncommon (§2.6.2). */
export const BIOMES: Record<BiomeId, BiomePool> = {
  meadow: {
    id: 'meadow', name: 'Meadow', stage: 'meadow',
    common: ['caterpie', 'weedle', 'pidgey', 'rattata'],
    uncommon: ['oddish'],
    rare: ['psyduck'],
  },
  cave: {
    id: 'cave', name: 'Cave', stage: 'cave',
    common: ['zubat', 'geodude', 'diglett'],
    uncommon: ['machop', 'onix'],
    rare: ['onix'],
  },
  river: {
    id: 'river', name: 'River', stage: 'river',
    common: ['magikarp', 'poliwag'],
    uncommon: ['psyduck'],
    rare: ['poliwag'],
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
export function wildBandFor(layer: number): [number, number] {
  const [lo, hi] = WILD_LEVEL_BAND;
  const t = Math.min(1, Math.max(0, layer) / (ROUTE_LAYERS - 2));
  const base = Math.round(lo + (hi - lo - 1) * t);
  return [base, base + 1];
}

/**
 * §2.7.3 — a trainer sits 1–2 levels above the wild band of its layer. The roster table keeps the team's
 * internal spread; the layer decides where that spread sits.
 */
export function trainerTeamFor(roster: TrainerRoster, layer: number): { species: string; level: number }[] {
  const base = wildBandFor(layer)[1] + 1;
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
export const ELITE = {
  id: 'elite-ace-trainer-r1',
  name: 'Ace Trainer Nadia',
  sprite: 'acetrainer',
  line: 'I only battle people who are going somewhere. Show me.',
  team: [
    { species: 'pidgeotto', level: 12, phaseCount: 2 as const },
    { species: 'ivysaur', level: 13, phaseCount: 2 as const },
  ],
};

/** §2.8.1 — the Elite sits two levels above the wild band of its layer. It is the run's hardest fight but one. */
export function eliteTeamFor(layer: number): { species: string; level: number }[] {
  const base = wildBandFor(layer)[1] + 2;
  const floor = Math.min(...ELITE.team.map((m) => m.level));
  return ELITE.team.map((m) => ({ species: m.species, level: base + (m.level - floor) }));
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
export const ELITE_WILD = {
  id: 'elite-wild-snorlax',
  species: 'snorlax',
  level: 15,
  /** §2.8.2 — boss-tier HP, two phases, no evolution: it is a wild, not an ace. */
  phaseCount: 2 as const,
  stage: 'meadow',
  line: 'Something enormous is asleep across the path. It has not noticed you yet.',
};

/** §2.8.2 — the Elite Wild sits with the Elite Trainer's premium: it is the other hardest fight but one. */
export function eliteWildTeamFor(layer: number): { species: string; level: number }[] {
  return [{ species: ELITE_WILD.species, level: wildBandFor(layer)[1] + 3 }];
}

export interface GymDef {
  id: string;
  name: string;
  sprite: string;
  type: PokemonType;
  /** §5.10 — the id of the Badge this Gym awards, in `content/data/badges.json`. */
  badgeId: string;
  stage: string;
  line: string;
  team: { species: string; level: number; phaseCount: 1 | 2 | 3 }[];
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
    name: 'Leader Wren',
    sprite: 'whitney',
    type: 'normal',
    badgeId: 'normal-badge',
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
export function gymTeamFor(gym: GymDef): { species: string; level: number; phaseCount: 1 | 2 | 3 }[] {
  const top = wildBandFor(ROUTE_LAYERS - 2)[1];
  return gym.team.map((m, i) => ({ ...m, level: top + (i === gym.team.length - 1 ? 6 : 4) }));
}

const GYM_BY_ID = new Map(GYMS.map((g) => [g.id, g]));
export const gymById = (id: string): GymDef => {
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

/** §2.6.4 / §7.2.5 — what a run starts with. */
export const RUN_START = {
  balls: 3,
  /**
   * Canon does not fix the starting kit, so this is ours to tune against the harness. A consumable is a
   * per-combat roster, not ammunition (§3.5), so this is three Potions *per fight*, not three per run.
   */
  consumables: ['potion', 'potion', 'antidote', 'paralyze-heal'],
  starterLevel: 5,
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
export const TRAINER_SPRITES = [...new Set([...TRAINERS.map((t) => t.sprite), ...GYMS.map((g) => g.sprite), ELITE.sprite])];

/** Fails loudly at load if a table above names content that does not exist. */
export function assertRegionContent(content: ContentRegistry): void {
  const check = (id: string) => content.species(id);
  for (const b of Object.values(BIOMES)) [...b.common, ...b.uncommon, ...b.rare].forEach(check);
  for (const t of TRAINERS) t.team.forEach((m) => check(m.species));
  for (const g of GYMS) g.team.forEach((m) => check(m.species));
  ELITE.team.forEach((m) => check(m.species));
  // §2.5 — a lane theme that names a species the Region cannot produce is a lane that silently falls back.
  for (const t of Object.values(LANE_THEME)) [...t.favours, t.counter].forEach(check);
  STARTER_IDS.forEach(check);
  for (const c of RUN_START.consumables) content.consumable(c);
}

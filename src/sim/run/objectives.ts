import type { ContentRegistry } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import { regionContent, wildBandFor } from './region';
import { supplyLabel } from './rewards';
import type { MapNode, NodeObjective, NodePreview, RegionMap } from './types';

// §5.6.5 — fights with another objective, the run's half: which nodes carry one, what the map promises, and what
// winning pays. The fight's half (the countdown, the getaway, the guard's escalation) is `combat/objective.ts`.

/** §5.6.5 — what knocking a runner out pays, on top of a won wild fight. */
export interface RunnerReward {
  /** The fight's XP, times this. */
  xpMultiplier?: number;
  /** Rare Candies for the Lead: one level each, with whatever the level brings (§2.11.6's). */
  candy?: number;
  /** Pay Day: a trainer's purse (§2.14's band), times this. */
  purse?: number;
}

export interface RunnerDef {
  id: string;
  /** Its form in each Region (null where it does not run). */
  forms: readonly (string | null)[];
  /** It gets away at the end of this turn. */
  turns: number;
  reward: RunnerReward;
}

/**
 * §5.6.5 — the flee race. About one Wild Area node in twelve is a runner in place of its pool's roll — never in
 * the first two columns, never two on a route; its level is the node's band top; it is never part of a pack.
 */
export const FLEE_RACE = {
  chance: 1 / 12,
  firstLayer: 2,
  runners: [
    { id: 'abra', forms: ['abra', 'kadabra', 'alakazam'], turns: 2, reward: { xpMultiplier: 2, candy: 1 } },
    { id: 'meowth', forms: ['meowth', 'meowth', 'persian'], turns: 3, reward: { purse: 4 } },
    { id: 'chansey', forms: [null, 'chansey', 'chansey'], turns: 3, reward: { xpMultiplier: 3 } },
  ] as readonly RunnerDef[],
} as const;

/** §5.6.5 — what a guarded find guards, besides the find itself: named on the map, the item rolled when it is won. */
export type HoldPrize = { kind: 'held-item' } | { kind: 'tm' } | { kind: 'relic'; rarity: 'uncommon' | 'rare' };

export interface GuardDef {
  id: string;
  region: number;
  /** The guard (or the pair, standing together), with its kit. */
  team: readonly { species: string; moves: readonly string[] }[];
  turns: number;
  /** The prize: the relic one time in `relicChance`, else `otherwise`. */
  relic: { chance: number; rarity: 'uncommon' | 'rare' };
  otherwise: 'held-item' | 'tm';
}

/**
 * §5.6.5 — the hold-out. A guarded find replaces about one find in eight, never in a column with no other choice.
 * A guard's level is its column's trainer band, its Attack the Region's tier ×1.2; it is not for catching.
 */
export const HOLD_OUT = {
  chance: 1 / 8,
  attackMultiplier: 1.2,
  /** "A Pokémon that will not be beaten in time": a guard stands on this much more HP than a wild one of its level. */
  hpMultiplier: 1.75,
  guards: [
    { id: 'primeape', region: 0, team: [{ species: 'primeape', moves: ['thrash', 'rage', 'karate-chop'] }], turns: 3, relic: { chance: 1 / 4, rarity: 'uncommon' }, otherwise: 'held-item' },
    {
      id: 'tauros',
      region: 1,
      team: [
        { species: 'tauros', moves: ['stomp', 'take-down', 'rage'] },
        { species: 'tauros', moves: ['stomp', 'take-down', 'rage'] },
      ],
      turns: 4,
      relic: { chance: 1 / 3, rarity: 'uncommon' },
      otherwise: 'tm',
    },
    { id: 'rhydon', region: 2, team: [{ species: 'rhydon', moves: ['horn-attack', 'stomp', 'horn-drill'] }], turns: 4, relic: { chance: 1 / 3, rarity: 'rare' }, otherwise: 'held-item' },
  ] as readonly GuardDef[],
} as const;

export const runnerById = (id: string): RunnerDef => FLEE_RACE.runners.find((r) => r.id === id) ?? FLEE_RACE.runners[0]!;
export const guardById = (id: string): GuardDef => HOLD_OUT.guards.find((g) => g.id === id) ?? HOLD_OUT.guards[0]!;
const guardFor = (regionIndex: number): GuardDef => HOLD_OUT.guards.find((g) => g.region === Math.min(regionIndex, HOLD_OUT.guards.length - 1)) ?? HOLD_OUT.guards[0]!;

/** §5.6.5 — the runner's reward, as the map and the fight's result say it. */
export function runnerRewardLine(r: RunnerReward): string {
  const parts = [
    ...(r.xpMultiplier ? [`XP ×${r.xpMultiplier}`] : []),
    ...(r.candy ? [r.candy === 1 ? 'a Rare Candy' : `${r.candy} Rare Candies`] : []),
    ...(r.purse ? [`Pay Day: ₽ ×${r.purse} a trainer's purse`] : []),
  ];
  return parts.join(' and ');
}

/** §5.6.5 — a guard's prize, as the map says it. */
export function holdPrizeLine(prize: HoldPrize): string {
  return prize.kind === 'relic' ? `a${prize.rarity === 'uncommon' ? 'n Uncommon' : ' Rare'} relic` : prize.kind === 'tm' ? 'a TM of a type your team carries' : 'a held item';
}

/**
 * §5.6.5 — the map's runners and guarded finds, placed once the route is built. Drawn from their own stream, seeded
 * off the map's RNG without spending it, so every other node of every map is exactly what it was before v0.9.18.
 */
export function placeObjectives(map: Pick<RegionMap, 'nodes' | 'entry'>, mapCursor: number, regionIndex: number, content: ContentRegistry): void {
  const rng = new GameRng(fmix32(mapCursor ^ fnv1a('ObjectiveRNG')));
  const nodes = Object.values(map.nodes).sort((a, b) => a.layer - b.layer || a.col - b.col);
  const region = regionContent(regionIndex);

  // The flee race: the first Wild Area past the opening that rolls it, and only that one.
  const runners = FLEE_RACE.runners.filter((r) => r.forms[Math.min(regionIndex, r.forms.length - 1)]);
  for (const node of nodes) {
    if (node.kind !== 'wild' || node.layer < FLEE_RACE.firstLayer || !runners.length) continue;
    if (!rng.chance(FLEE_RACE.chance)) continue;
    const runner = runners[rng.range(0, runners.length)]!;
    node.preview = runnerPreview(node, runner, regionIndex, content);
    break;
  }

  // The hold-out: any find that rolls it, where every way into it has another way on.
  const parents = (id: string) => nodes.filter((n) => n.next.includes(id));
  for (const node of nodes) {
    if (node.kind !== 'cache' || !node.preview.find) continue;
    const ways = node.layer === 0 ? [map.entry] : parents(node.id).map((p) => p.next);
    if (ways.length === 0 || ways.some((next) => next.length < 2)) continue;
    if (!rng.chance(HOLD_OUT.chance)) continue;
    const guard = guardFor(regionIndex);
    const prize: HoldPrize = rng.chance(guard.relic.chance) ? { kind: 'relic', rarity: guard.relic.rarity } : { kind: guard.otherwise };
    const level = wildBandFor(node.layer, region.wildBand)[1] + 1 + region.levelOffset;
    node.preview = guardPreview(node.preview, guard, level, prize, content);
  }
}

function runnerPreview(node: MapNode, runner: RunnerDef, regionIndex: number, content: ContentRegistry): NodePreview {
  const species = runner.forms[Math.min(regionIndex, runner.forms.length - 1)]!;
  const level = node.preview.levelBand[1];
  const name = content.species(species).name;
  const objective: NodeObjective = { kind: 'flee', runner: runner.id, turns: runner.turns };
  return {
    title: `Wild ${name}`,
    detail: `It won't stay long · knock it out first: ${runnerRewardLine(runner.reward)}`,
    speciesIds: [species],
    levelBand: [level, level],
    enemies: [{ species, level }],
    ...(node.preview.icon ? { icon: node.preview.icon } : {}),
    objective,
  };
}

function guardPreview(find: NodePreview, guard: GuardDef, level: number, prize: HoldPrize, content: ContentRegistry): NodePreview {
  const names = guard.team.length > 1 ? `${guard.team.length} ${content.species(guard.team[0]!.species).name}` : content.species(guard.team[0]!.species).name;
  const items = find.find!;
  const findLine = [
    ...(items.items.length ? [supplyLabel(items.items, (id) => content.consumable(id).name)] : []),
    ...(items.money ? [`${items.money} ₽`] : []),
  ].join(' and ');
  const objective: NodeObjective = { kind: 'hold', guard: guard.id, turns: guard.turns, prize };
  return {
    title: 'A guarded find',
    detail: `${names} ${guard.team.length > 1 ? 'stand' : 'stands'} over ${findLine || 'something'} and ${holdPrizeLine(prize)}`,
    speciesIds: guard.team.map((m) => m.species),
    levelBand: [level, level],
    enemies: guard.team.map((m) => ({ species: m.species, level })),
    icon: 'cache',
    find: { items: [...items.items], money: items.money },
    objective,
  };
}

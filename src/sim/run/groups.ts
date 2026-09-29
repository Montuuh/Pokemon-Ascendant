import type { ContentRegistry, EnemySetup, ScenarioDef, SupportRole } from '../content/defs';
import { allyGivable } from '../combat/intents';
import { activeMoves } from '../combat/stats';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import { regionContent, type BiomeId } from './region';
import type { MapNode, RunState } from './types';

// §5.6.3 — where the groups of §5.6 stand in a run. Every fight node decides, once and for good, whether it is a
// single fight, a pack, a pair of trainers, a Pokémon that calls for help, a boss with a support at its side or a
// Pokémon that acts twice — and the node's preview card says so before you commit (Pillar 1).
//
// The decision is a hash of the run's seed, the Region and the node's id, never a draw from the map's stream: the
// map is re-derived by replay (§10.8.6) and a new draw there would redraw every map ever saved.

/** §5.6.3 — how often each shape appears, per Region. The largest groups are Region 3's accent (§2.2). */
export interface GroupRates {
  /** A wild node is a pack: the wild Pokémon leads one companion from its biome… */
  wildPack: number;
  /** …or, this share of packs, two. */
  packOfThree: number;
  /** A lone wild Pokémon (not a pack) that can Call for Help: one companion waits (two in `callerHelpers`). */
  wildCaller: number;
  callerHelpers: 1 | 2;
  /** A trainer node with two or more Pokémon fights them side by side. */
  trainerPair: number;
  /** The Elite Trainer brings a support beside its team. */
  eliteSupport: boolean;
  /** The Gym Leader brings a support beside its team. */
  gymSupport: boolean;
  /** The Elite Wild acts twice (§5.6.1), at this share of its HP — a second action is priced like one. */
  eliteWildActsTwice: number | null;
}

/**
 * First values (2026-09-29), held to §2.2.1's curve by the run harness; the v0.8.6 balance pass tunes them.
 * Region 1 teaches the shapes, Region 2 makes them common and gives the Elite a support, Region 3 is the accent:
 * the largest packs, pairs by default, a support at every boss's side and an Elite Wild that acts twice.
 */
export const GROUP_RATES: readonly GroupRates[] = [
  { wildPack: 0.15, packOfThree: 0, wildCaller: 0.1, callerHelpers: 1, trainerPair: 0.25, eliteSupport: false, gymSupport: false, eliteWildActsTwice: null },
  { wildPack: 0.25, packOfThree: 0.25, wildCaller: 0.15, callerHelpers: 1, trainerPair: 0.35, eliteSupport: true, gymSupport: false, eliteWildActsTwice: null },
  { wildPack: 0.3, packOfThree: 0.3, wildCaller: 0.2, callerHelpers: 1, trainerPair: 0.4, eliteSupport: true, gymSupport: false, eliteWildActsTwice: 0.75 },
];

/** Levels a pack's companions, a caller's helpers and a boss's support stand below the Pokémon they serve. */
export const COMPANION_LEVEL_GAP = 1;
export const SUPPORT_LEVEL_GAP = 2;

export type GroupPlan =
  | { kind: 'single' }
  | { kind: 'pack'; size: 2 | 3 }
  | { kind: 'caller'; helpers: number }
  | { kind: 'pair' }
  | { kind: 'support' }
  | { kind: 'acts-twice' };

function rngFor(node: MapNode, run: RunState): GameRng {
  return new GameRng(fmix32((run.seed ^ fnv1a(`groups:${run.regionIndex}:${node.id}`)) >>> 0) || 1);
}

function ratesFor(run: RunState): GroupRates {
  return GROUP_RATES[Math.min(run.regionIndex, GROUP_RATES.length - 1)]!;
}

/** §5.6.3 — what shape this node's fight takes. Pure and stable: the preview and the fight ask the same question. */
export function groupPlanFor(node: MapNode, run: RunState): GroupPlan {
  const r = ratesFor(run);
  const rng = rngFor(node, run);
  switch (node.kind) {
    case 'wild': {
      const roll = rng.range01();
      if (roll < r.wildPack) return { kind: 'pack', size: rng.range01() < r.packOfThree ? 3 : 2 };
      if (roll < r.wildPack + r.wildCaller) return { kind: 'caller', helpers: r.callerHelpers };
      return { kind: 'single' };
    }
    case 'trainer': {
      const team = node.preview.enemies ?? [];
      return team.length >= 2 && rng.range01() < r.trainerPair ? { kind: 'pair' } : { kind: 'single' };
    }
    case 'elite':
      return r.eliteSupport ? { kind: 'support' } : { kind: 'single' };
    case 'gym':
      return r.gymSupport ? { kind: 'support' } : { kind: 'single' };
    case 'elite-wild':
      return r.eliteWildActsTwice !== null ? { kind: 'acts-twice' } : { kind: 'single' };
    default:
      return { kind: 'single' };
  }
}

/**
 * §5.6 — a support's role, read off what its kit can do: a heal it can hand over makes a Healer, a raise it can
 * hand over a Buffer, a status or a stat drop a Debuffer, anything else an Attacker.
 */
export function roleFromKit(moves: string[], content: ContentRegistry): SupportRole {
  const defs = moves.map((id) => content.move(id));
  if (defs.some((m) => allyGivable(m) && m.effects.some((e) => e.kind === 'heal'))) return 'healer';
  if (defs.some((m) => allyGivable(m) && m.effects.some((e) => e.kind === 'stage'))) return 'buffer';
  if (defs.some((m) => m.power <= 0 && m.effects.some((e) => (e.kind === 'status' && !e.self) || (e.kind === 'stage' && e.target === 'foe')))) return 'debuffer';
  return 'attacker';
}

/** A companion from the biome: one of its common species (another species first, if it has one), a little lower. */
function companion(pool: string[], lead: string, level: number, tier: EnemySetup['tier'], rng: GameRng, content: ContentRegistry): EnemySetup {
  const others = pool.filter((id) => id !== lead);
  const from = others.length ? others : pool.length ? pool : [lead];
  const species = from[rng.range(0, from.length)]!;
  const lv = Math.max(2, level - COMPANION_LEVEL_GAP);
  return { species, level: lv, tier, phaseCount: 1, role: roleFromKit(activeMoves(content, species, lv), content) };
}

/** A boss's support: from the Region's main biome, preferring one whose kit makes it a Healer or a Buffer. */
function bossSupport(run: RunState, level: number, rng: GameRng, content: ContentRegistry): EnemySetup {
  const region = regionContent(run.regionIndex);
  const biome = region.biomes[region.biomeWeights[0]!.biome as BiomeId];
  const pool = [...(biome?.common ?? []), ...(biome?.uncommon ?? [])];
  const lv = Math.max(2, level - SUPPORT_LEVEL_GAP);
  const helpful = pool.filter((id) => ['healer', 'buffer'].includes(roleFromKit(activeMoves(content, id, lv), content)));
  const from = helpful.length ? helpful : pool;
  const species = from[rng.range(0, from.length)] ?? 'pidgey';
  return { species, level: lv, tier: 'trainer', phaseCount: 1, role: roleFromKit(activeMoves(content, species, lv), content) };
}

/** §5.6.3 — turn a node's fight into its group, as `groupPlanFor` decided. A single fight comes back unchanged. */
export function applyGroups(scenario: ScenarioDef, node: MapNode, run: RunState, content: ContentRegistry): ScenarioDef {
  const plan = groupPlanFor(node, run);
  if (plan.kind === 'single') return scenario;
  // A second, independent stream for the *who*: the plan's own draws stay the same whatever the content says.
  const rng = new GameRng(fmix32((run.seed ^ fnv1a(`group-members:${run.regionIndex}:${node.id}`)) >>> 0) || 1);
  const region = regionContent(run.regionIndex);
  const lead = scenario.enemies[0]!;
  const biome = region.biomes[(node.preview.icon ?? '').replace('wild-', '') as BiomeId];
  const pool = biome?.common ?? [lead.species];
  switch (plan.kind) {
    case 'pack': {
      const rest = Array.from({ length: plan.size - 1 }, () => companion(pool, lead.species, lead.level, 'wild', rng, content));
      return { ...scenario, name: `${scenario.name} and its pack`, onField: plan.size, enemies: [lead, ...rest] };
    }
    case 'caller': {
      const kit = (lead.moves ?? activeMoves(content, lead.species, lead.level)).slice(0, 3);
      const helpers = Array.from({ length: plan.helpers }, () => companion(pool, '', lead.level, 'wild', rng, content));
      return { ...scenario, enemies: [{ ...lead, moves: [...kit, 'call-for-help'], helpers }, ...scenario.enemies.slice(1)] };
    }
    case 'pair': {
      // The roster's Pokémon fight side by side; the second (and a third, when it enters) takes the role its kit gives.
      const enemies = scenario.enemies.map((e, i) => (i === 0 ? e : { ...e, role: roleFromKit(e.moves ?? activeMoves(content, e.species, e.level), content) }));
      return { ...scenario, onField: 2, enemies };
    }
    case 'support': {
      const top = Math.max(...scenario.enemies.map((e) => e.level));
      const support = bossSupport(run, top, rng, content);
      // The first of the team leads with the support beside it; the rest wait to fill the place that falls free.
      return { ...scenario, onField: 2, enemies: [scenario.enemies[0]!, support, ...scenario.enemies.slice(1)] };
    }
    case 'acts-twice': {
      const share = ratesFor(run).eliteWildActsTwice ?? 1;
      return { ...scenario, enemies: scenario.enemies.map((e, i) => (i === 0 ? { ...e, acts: 2 as const, hpMultiplier: (e.hpMultiplier ?? 1) * share } : e)) };
    }
  }
}

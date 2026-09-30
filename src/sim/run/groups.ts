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
  /** A trainer node with two or more Pokémon fights them side by side… */
  trainerPair: number;
  /** …and, this share of those with three or more, three at once. */
  trainerTrio: number;
  /** The Elite Trainer and the Gym Leader send out two at a time (their teams are four and five, §5.6.3). */
  bossDouble: boolean;
  /** The Elite Wild acts twice (§5.6.1), at this share of its HP — a second action is priced like one. */
  eliteWildActsTwice: number | null;
}

/**
 * The user's call (2026-09-30): many more group fights. Packs on a third of Region 1's wild nodes and half of Region
 * 3's; trainers two at a time most of the time and three at once often; the Elite and the Gym always two at a time.
 * Held to §2.2.1's curve by the run harness; the balance pass tunes them.
 */
export const GROUP_RATES: readonly GroupRates[] = [
  { wildPack: 0.3, packOfThree: 0.15, wildCaller: 0.1, callerHelpers: 1, trainerPair: 0.5, trainerTrio: 0.25, bossDouble: true, eliteWildActsTwice: null },
  { wildPack: 0.4, packOfThree: 0.35, wildCaller: 0.15, callerHelpers: 1, trainerPair: 0.6, trainerTrio: 0.4, bossDouble: true, eliteWildActsTwice: null },
  { wildPack: 0.5, packOfThree: 0.5, wildCaller: 0.2, callerHelpers: 2, trainerPair: 0.7, trainerTrio: 0.5, bossDouble: true, eliteWildActsTwice: 0.75 },
];

/**
 * §5.6.2 — the species that always come ready to Call for Help, wild, whatever the node's shape: the ones the games
 * show in swarms and colonies. Their companions are more of their own kind.
 */
export const SOCIAL_CALLERS: readonly string[] = [
  'rattata', 'raticate', 'spearow', 'fearow', 'zubat', 'golbat', 'nidoran-f', 'nidorina', 'nidoran-m', 'nidorino',
  'mankey', 'primeape', 'diglett', 'dugtrio', 'magnemite', 'magneton', 'doduo', 'dodrio',
];

/**
 * §5.6.4 — the breather after a won group fight: this share of max HP back to every standing member of the Box's
 * Active Team for each enemy past the first that took the field, up to `cap`.
 */
export const GROUP_BREATHER = { perEnemy: 8, cap: 30 } as const;

/** Levels a pack's companions, a caller's helpers and a boss's support stand below the Pokémon they serve. */
export const COMPANION_LEVEL_GAP = 1;

export type GroupPlan =
  | { kind: 'single' }
  | { kind: 'pack'; size: 2 | 3 }
  | { kind: 'caller'; helpers: number }
  | { kind: 'pair' }
  | { kind: 'trio' }
  | { kind: 'double' }
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
      const three = rng.range01() < r.packOfThree;
      if (roll < r.wildPack) return { kind: 'pack', size: three ? 3 : 2 };
      // A social species calls whatever the roll says (§5.6.2); anyone else does on the table's share.
      if (SOCIAL_CALLERS.includes(node.preview.speciesIds[0] ?? '') || roll < r.wildPack + r.wildCaller) return { kind: 'caller', helpers: r.callerHelpers };
      return { kind: 'single' };
    }
    case 'trainer': {
      const team = node.preview.enemies ?? [];
      const pair = rng.range01() < r.trainerPair;
      const trio = rng.range01() < r.trainerTrio;
      if (team.length >= 3 && pair && trio) return { kind: 'trio' };
      return team.length >= 2 && pair ? { kind: 'pair' } : { kind: 'single' };
    }
    case 'elite':
    case 'gym':
      return r.bossDouble ? { kind: 'double' } : { kind: 'single' };
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
      const packed = { ...scenario, name: `${scenario.name} and its pack`, onField: plan.size, enemies: [lead, ...rest] };
      return SOCIAL_CALLERS.includes(lead.species) ? withCall(packed, [lead.species], ratesFor(run).callerHelpers, rng, content) : packed;
    }
    case 'caller': {
      // A social species calls its own kind; anyone else calls from its biome.
      const kin = SOCIAL_CALLERS.includes(lead.species) ? [lead.species] : pool;
      return withCall(scenario, kin, plan.helpers, rng, content);
    }
    case 'pair':
    case 'trio': {
      // The roster's Pokémon fight side by side; every one past the Lead takes the role its kit gives.
      const enemies = scenario.enemies.map((e, i) => (i === 0 ? e : { ...e, role: roleFromKit(e.moves ?? activeMoves(content, e.species, e.level), content) }));
      return { ...scenario, onField: plan.kind === 'trio' ? 3 : 2, enemies };
    }
    case 'double':
      // §5.6.3 — the Elite and the Gym Leader send out two at a time. Their Pokémon are the team, not supports: full
      // HP and no escalation, which through a five-Pokémon Gym would snowball (§5.6.3's measure).
      return { ...scenario, onField: 2 };
    case 'acts-twice': {
      const share = ratesFor(run).eliteWildActsTwice ?? 1;
      return { ...scenario, enemies: scenario.enemies.map((e, i) => (i === 0 ? { ...e, acts: 2 as const, hpMultiplier: (e.hpMultiplier ?? 1) * share } : e)) };
    }
  }
}

/** §5.6.2 — give a wild Lead Call for Help and `n` companions from `kin`, a level under it. */
function withCall(scenario: ScenarioDef, kin: string[], n: number, rng: GameRng, content: ContentRegistry): ScenarioDef {
  const [lead, ...rest] = scenario.enemies;
  if (!lead || (lead.moves ?? []).includes('call-for-help')) return scenario;
  const kit = (lead.moves ?? activeMoves(content, lead.species, lead.level)).slice(0, 3);
  const helpers = Array.from({ length: n }, () => companion(kin, '', lead.level, 'wild', rng, content));
  return { ...scenario, enemies: [{ ...lead, moves: [...kit, 'call-for-help'], helpers }, ...rest] };
}

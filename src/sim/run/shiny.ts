import type { ContentRegistry, ScenarioDef } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import type { MapNode, RunState } from './types';
import { BOND_TIER } from '../meta/bond';
import { isStarterLine } from './region';

// §5.14 — a Shiny is something you find. Every wild Pokémon that takes the field rolls for it, unannounced: the map
// never shows one, the fight's entrance does (the user, 2026-10-06: "wild, by surprise, and tied to the Bond"). The
// Bond is the tie — a line's Shiny Charm (tier 1) triples its wild odds and lets every other new copy roll too.
//
// The roll is a hash of the run's seed, the Region, the node and the enemy's place, never a draw from a stream: like
// the group plan (§5.6.3), adding it must not move a single later roll of a run that meets no shiny.

export const SHINY = {
  /** The base chance a wild Pokémon is shiny. Tuned on the harness to about one met every three to four runs. */
  chance: 1 / 40,
  /** §6.8.2 tier 1 — the line's Shiny Charm multiplies the chance of its wild Pokémon… */
  charmRank: BOND_TIER.shinyCharm,
  charmMultiplier: 3,
} as const;

/** §5.14 — the chance one wild Pokémon of this species is shiny, for this run's Bond ranks. */
export function shinyChance(run: Pick<RunState, 'perks'>, speciesId: string, content: ContentRegistry): number {
  const rank = run.perks?.bond?.[content.lineBase(speciesId)] ?? 0;
  return Math.min(1, SHINY.chance * (rank >= SHINY.charmRank ? SHINY.charmMultiplier : 1));
}

/**
 * §5.14 / §6.8.2 — a copy of a line that did not come out of the grass: the starter, a twin, a Safari catch, a trade.
 * Only the Shiny Charm makes it roll (at the charmed chance). A Soulbound line that was a starter already — a default
 * one or a Poké Mart one — is always shiny when it starts the run: the top rank's reward for lines that need no Bond to
 * be picked (the user, 2026-10-06). Every other Soulbound line earns the right to start a run, not the palette.
 * Hashed on the run's seed and `salt`, like the wild roll, so it moves no stream.
 */
export function copyIsShiny(run: Pick<RunState, 'seed' | 'perks'>, speciesId: string, salt: string, content: ContentRegistry): boolean {
  const rank = run.perks?.bond?.[content.lineBase(speciesId)] ?? 0;
  if (salt === 'starter' && rank >= BOND_TIER.soulbound && isStarterLine(content.lineBase(speciesId))) return true;
  if (rank < SHINY.charmRank) return false;
  const rng = new GameRng(fmix32((run.seed ^ fnv1a(`shiny-copy:${salt}`)) >>> 0) || 1);
  return rng.range01() < shinyChance(run, speciesId, content);
}

/** §5.14 — roll every wild Pokémon of a wild fight. Trainers', Elites' and Gyms' Pokémon are never shiny. */
export function applyShiny(scenario: ScenarioDef, node: MapNode, run: RunState, content: ContentRegistry): ScenarioDef {
  if (scenario.kind !== 'wild') return scenario;
  const rng = new GameRng(fmix32((run.seed ^ fnv1a(`shiny:${run.regionIndex}:${node.id}`)) >>> 0) || 1);
  const enemies = scenario.enemies.map((e) => (e.tier === 'wild' && rng.range01() < shinyChance(run, e.species, content) ? { ...e, shiny: true } : e));
  return enemies.some((e) => e.shiny) ? { ...scenario, enemies } : scenario;
}

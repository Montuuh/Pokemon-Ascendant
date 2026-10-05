import type { ContentRegistry, ScenarioDef } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import type { MapNode, RunState } from './types';

// §5.14 — a Shiny is something you find. Every wild Pokémon that takes the field rolls for it, unannounced: the map
// never shows one, the fight's entrance does (the user, 2026-10-06: "wild, by surprise, and tied to the Bond"). The
// Bond is the tie — a line's Shiny Charm (rank 2) and Soulbound (rank 5) raise the odds of meeting its shinies.
//
// The roll is a hash of the run's seed, the Region, the node and the enemy's place, never a draw from a stream: like
// the group plan (§5.6.3), adding it must not move a single later roll of a run that meets no shiny.

export const SHINY = {
  /** The base chance a wild Pokémon is shiny. Tuned on the harness to about one met every three to four runs. */
  chance: 1 / 40,
  /** §6.8.2 Trusted — the line's Shiny Charm multiplies the chance from this Bond rank… */
  charmRank: 2,
  charmMultiplier: 3,
  /** …and Soulbound multiplies it again. */
  soulboundRank: 5,
  soulboundMultiplier: 2,
} as const;

/** §5.14 — the chance one wild Pokémon of this species is shiny, for this run's Bond ranks. */
export function shinyChance(run: Pick<RunState, 'perks'>, speciesId: string, content: ContentRegistry): number {
  const rank = run.perks?.bond?.[content.lineBase(speciesId)] ?? 0;
  const charm = rank >= SHINY.charmRank ? SHINY.charmMultiplier : 1;
  const soul = rank >= SHINY.soulboundRank ? SHINY.soulboundMultiplier : 1;
  return Math.min(1, SHINY.chance * charm * soul);
}

/** §5.14 — roll every wild Pokémon of a wild fight. Trainers', Elites' and Gyms' Pokémon are never shiny. */
export function applyShiny(scenario: ScenarioDef, node: MapNode, run: RunState, content: ContentRegistry): ScenarioDef {
  if (scenario.kind !== 'wild') return scenario;
  const rng = new GameRng(fmix32((run.seed ^ fnv1a(`shiny:${run.regionIndex}:${node.id}`)) >>> 0) || 1);
  const enemies = scenario.enemies.map((e) => (e.tier === 'wild' && rng.range01() < shinyChance(run, e.species, content) ? { ...e, shiny: true } : e));
  return enemies.some((e) => e.shiny) ? { ...scenario, enemies } : scenario;
}

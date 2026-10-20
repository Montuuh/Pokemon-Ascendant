import type { ContentRegistry } from '../content/defs';
import { statAtLevel } from '../combat/stats';
import { typeMultiplier } from '../combat/typeChart';
import type { PokemonType } from '../types';
import { effectiveMax } from './run';
import type { PartyMon, RunState } from './types';

// §2.3 / §9.12 — the Team screen's reads (v0.9.26, the user, 2026-10-20: "improve the design of managing the Pokémon
// team, on the route and in the towns"). A Pokémon's sheet and its matchup against the Gyms ahead are the sim's to say,
// so the screen only draws them: its stats as a fight would field them, and how its moves and its types meet a type.

/** §6.2.3 — a Pokémon's four stats as its next fight fields them: its level, its path's lean, its Training boosts; HP its Trauma ceiling. */
export interface TeamStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export function teamStats(run: RunState, mon: PartyMon, content: ContentRegistry): TeamStats {
  const species = content.species(mon.speciesId);
  const at = (stat: 'attack' | 'defense' | 'speed') => statAtLevel(species, stat, mon.level, mon.archetype) + (mon.boosts?.[stat] ?? 0);
  return { hp: effectiveMax(run, mon, content), attack: at('attack'), defense: at('defense'), speed: at('speed') };
}

/**
 * §4.1.2 — how a Pokémon meets a type: the best of its active damaging moves against it (`attack`, 1 when it has none)
 * and that type's attacks against it (`defend`). The sheet's line against each Gym ahead (§2.5: plan in the trunk).
 */
export interface Matchup {
  type: PokemonType;
  attack: number;
  defend: number;
}

export function matchupAgainst(mon: PartyMon, type: PokemonType, content: ContentRegistry): Matchup {
  const species = content.species(mon.speciesId);
  const hits = mon.moveIds.map((id) => content.move(id)).filter((m) => m.power > 0);
  const attack = hits.length ? Math.max(...hits.map((m) => typeMultiplier(m.type, [type]))) : 1;
  return { type, attack, defend: typeMultiplier(type, species.types) };
}

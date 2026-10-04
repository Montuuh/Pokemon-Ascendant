import type { ContentRegistry, ScenarioDef } from '../content/defs';
import type { PokemonType } from '../types';
import { GYM, gymById, regionContent } from './region';
import type { MapNode, RunState } from './types';

// §2.6.1 / §4.3 — the ground a fight is on. Every Gym lays its own Battlefield over its lane (§4.3.14), so the ground
// you fight on is part of what a lane telegraphs (§2.5.0); a Gym Leader or an Elite also brings its Home Field. Fixed
// by the node, so the preview card can name it (Pillar 1).

type Battlefield = NonNullable<ScenarioDef['fields']>;

/**
 * §4.3.14 — each Gym's own Battlefield, by its type: the ground of its whole lane and of the Gym fight itself. Two
 * Gyms of one Region never share one, so the fork is also a choice of ground. Ground is Sun (Groudon's drought) rather
 * than a second Sandstorm, and Fighting keeps the storm its own types shrug off.
 */
export const GYM_FIELD: Readonly<Record<string, Battlefield>> = {
  rock: { hazard: 'sandstorm' },
  water: { weather: 'rain-dance' },
  bug: { hazard: 'sticky-web' },
  normal: { terrain: 'misty-terrain' },
  fire: { weather: 'sunny-day' },
  grass: { terrain: 'grassy-terrain' },
  electric: { terrain: 'electric-terrain' },
  poison: { hazard: 'toxic-spikes' },
  psychic: { terrain: 'psychic-terrain' },
  ground: { weather: 'sunny-day' },
  fighting: { hazard: 'sandstorm' },
  ice: { weather: 'hail' },
};

/** §4.3.14 — the Battlefield over a lane: its Gym's. */
export function laneField(run: RunState, lane: number): Battlefield {
  const id = run.map.gyms[lane];
  return id ? (GYM_FIELD[gymById(id).type] ?? {}) : {};
}

/** §2.11.3.1 Field Surveyor — the Battlefield a Lead of each type favours. */
const FAVOURED: Partial<Record<PokemonType, Battlefield>> = {
  fire: { weather: 'sunny-day' },
  water: { weather: 'rain-dance' },
  electric: { terrain: 'electric-terrain' },
  rock: { hazard: 'sandstorm' },
  ground: { hazard: 'sandstorm' },
  fighting: { hazard: 'sandstorm' },
  ice: { weather: 'hail' },
  grass: { terrain: 'grassy-terrain' },
  psychic: { terrain: 'psychic-terrain' },
};

/**
 * §2.6.1 / §4.3.5 — the fields a node's fight opens under. A biome's Battlefield stands past the fork, in every
 * Region (the lane telegraphs its Gym); a Gym Leader brings a Home Field of its type, an
 * Elite Trainer one of its lead Pokémon's type. The Elite Wild is a wild Pokémon and brings none.
 */
export function fieldsFor(node: MapNode, run: RunState, content: ContentRegistry): Battlefield {
  if (!['wild', 'trainer', 'elite', 'gym', 'elite-wild'].includes(node.kind)) return {};
  const out: Battlefield = {};
  // Past the fork only: the lane telegraphs its Gym, and the trunk — where you plan — stays open ground. Measured
  // (v0.8.4): the Battlefield across Region 3's trunk too cost it seven more points (41 → 34 %).
  if (node.lane !== undefined) Object.assign(out, laneField(run, node.lane));
  if (node.kind === 'gym') {
    const gym = node.lane !== undefined ? gymById(run.map.gyms[node.lane] ?? GYM.id) : GYM;
    out.home = gym.type as PokemonType;
  }
  if (node.kind === 'elite') {
    const lead = node.preview.enemies?.[0]?.species ?? regionContent(run.regionIndex).elite.team[0]?.species;
    if (lead) out.home = content.species(lead).types[0];
  }
  return out;
}

/**
 * §4.3 / §2.11.3.1 — the fields folded into a fight. Under Field Surveyor a wild fight opens under the Battlefield
 * its Lead favours instead of the biome's — you choose the ground by choosing who leads.
 */
export function applyFields(scenario: ScenarioDef, node: MapNode, run: RunState, content: ContentRegistry): ScenarioDef {
  let fields = fieldsFor(node, run, content);
  if (run.regionModifier && content.regionModifier(run.regionModifier).hook === 'battlefield-choice' && node.kind === 'wild') {
    const leadSpecies = scenario.player.team[scenario.player.leadIndex]?.species;
    const favoured = leadSpecies ? FAVOURED[content.species(leadSpecies).types[0]!] : undefined;
    if (favoured) fields = { ...favoured };
  }
  return Object.keys(fields).length ? { ...scenario, fields } : scenario;
}

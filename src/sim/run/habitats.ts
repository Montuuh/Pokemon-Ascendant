import type { ContentRegistry } from '../content/defs';
import type { PokemonType } from '../types';
import { nodesAhead } from './map';
import { regionContent, WILD_TIERS, type BiomeId, type WildTier } from './region';
import type { MapNode, RunState } from './types';
import { wildFor } from './wild';

// §2.6.1 — the route's habitats, read off the map for the player's decision (v0.9.120): which habitats the Wild Areas still
// ahead are, in which stretch — the shared trunk, or the lane toward each Gym — what lives there and which types lean
// on it. A view-model only: it reads the nodes' own previews through `wildFor` (so the §2.6.2.1 guard is counted in, as
// the card counts it) and decides nothing.

/** How many types name a habitat's lean: what it fields most, not a tally of every type it holds. */
export const HABITAT_LEAN = 3;

/** One habitat in one stretch of the route, with the Wild Areas of it that are still ahead. */
export interface HabitatEntry {
  biome: BiomeId;
  name: string;
  /** The Wild Areas of this habitat still on a route open from where the run stands, nearest column first. */
  nodes: string[];
  /** Its pool as this run meets it (`wildFor`), by rarity. */
  pool: Record<WildTier, string[]>;
  species: number;
  /** The types its pool fields most, commonest first. */
  lean: PokemonType[];
}

/** A stretch of the route: the shared trunk (`lane` null), or what a Gym's lane — and the track leaning toward it — draws from. */
export interface HabitatSection {
  lane: number | null;
  habitats: HabitatEntry[];
  /** The types the whole stretch's Wild Areas field most. */
  lean: PokemonType[];
}

/** The habitat a Wild Area is, from the id its preview's icon carries (`wild-<habitat>`); null for a runner or a pre-habitat save. */
export function habitatIdOf(node: MapNode, regionIndex: number): BiomeId | null {
  if (node.kind !== 'wild' || node.preview.objective?.kind === 'flee') return null;
  const id = node.preview.icon?.startsWith('wild-') ? (node.preview.icon.slice('wild-'.length) as BiomeId) : null;
  return id && regionContent(regionIndex).biomes[id] ? id : null;
}

/** The types a set of species fields most (every type of every species counted once each), commonest first; ties go to the first met. */
function leanOf(species: readonly string[], content: ContentRegistry): PokemonType[] {
  const tally = new Map<PokemonType, number>();
  for (const id of new Set(species)) for (const t of content.species(id).types) tally.set(t, (tally.get(t) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1]).slice(0, HABITAT_LEAN).map(([t]) => t);
}

/**
 * §2.6.1 — the Wild Areas still ahead, grouped by stretch and habitat: the trunk first, then each Gym's lane (a leaning
 * track of the Y is its Gym's, as its wilds are themed after it). A habitat with nothing left ahead is not listed, nor a
 * stretch with none, so after the fork the lane you left is gone from the list as it is from the map.
 */
export function routeHabitats(run: RunState, content: ContentRegistry): HabitatSection[] {
  const ahead = nodesAhead(run.map, run.position ?? null);
  const groups = new Map<number | null, Map<BiomeId, MapNode[]>>();
  for (const node of Object.values(run.map.nodes)) {
    const biome = habitatIdOf(node, run.regionIndex);
    if (!biome || !ahead.has(node.id) || run.visited.includes(node.id)) continue;
    const lane = node.lane ?? node.lean ?? null;
    const habitats = groups.get(lane) ?? new Map<BiomeId, MapNode[]>();
    habitats.set(biome, [...(habitats.get(biome) ?? []), node]);
    groups.set(lane, habitats);
  }
  const region = regionContent(run.regionIndex);
  const sections: HabitatSection[] = [];
  for (const lane of [null, 0, 1]) {
    const habitats = groups.get(lane);
    if (!habitats) continue;
    const entries: HabitatEntry[] = [...habitats].map(([biome, list]) => {
      const nodes = list.sort((a, b) => a.layer - b.layer || a.row - b.row);
      const wild = wildFor(nodes[0]!, run, content)!;
      const pool = { common: [...wild.pool.common], uncommon: [...wild.pool.uncommon], rare: [...wild.pool.rare] };
      const species = WILD_TIERS.flatMap((t) => pool[t]);
      return { biome, name: region.biomes[biome]!.name, nodes: nodes.map((n) => n.id), pool, species: new Set(species).size, lean: leanOf(species, content) };
    });
    entries.sort((a, b) => run.map.nodes[a.nodes[0]!]!.layer - run.map.nodes[b.nodes[0]!]!.layer || a.name.localeCompare(b.name));
    sections.push({ lane, habitats: entries, lean: leanOf(entries.flatMap((e) => WILD_TIERS.flatMap((t) => e.pool[t])), content) });
  }
  return sections;
}

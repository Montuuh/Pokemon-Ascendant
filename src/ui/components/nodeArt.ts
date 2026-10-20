import { getContent } from '@/content/registry';
import { battleSpriteUrl } from '@/content/schemas/species';
import { ALL_ELITES, ALL_TRAINERS, TRADER, VICTORY_ROAD, gymById, leagueMemberOf, regionContent, type BiomeId, type MapNode, type RegionMap } from '@/sim';
import { itemIcon, mysterySign, routeTile, summitSign, trainerSprite, type NodeArt } from '@/ui/art';
import { terrainOfNode, type TerrainId } from '@/ui/screens/map/terrain';
import { NODE_LABEL, NODE_TEXT, trainerClass } from '@/ui/strings';

// §9.3 — which picture a map node wears (v0.9.14). Read off the node's own preview, so the map shows exactly who and
// what the preview card will promise: the roster's own sprite, the Gym's own Leader, the find's own item.

/** Its animated Gen V battle sprite, cropped tight to the Pokémon: the same sprite the arena shows. */
const pokemonIcon = (speciesId: string) => battleSpriteUrl(getContent().species(speciesId).id, 'front');

/** The terrains whose tiles include tall grass (`public/art/route/<terrain>/tall.png`); a cave or a plant has none. */
const TALL_GRASS: ReadonlySet<TerrainId> = new Set(['route', 'coast', 'highland', 'meadow', 'forest', 'lake']);

/** §2.6.1 — a Wild Area's habitat, from the id its preview's icon carries (`wild-<habitat>`). */
function habitatOf(node: MapNode, map: RegionMap) {
  const id = node.preview.icon?.startsWith('wild-') ? (node.preview.icon.slice('wild-'.length) as BiomeId) : null;
  return id ? regionContent(map.regionIndex).biomes[id] : undefined;
}

/**
 * §9.3 — what a Wild Area's Pokémon peeks out of: the water for a habitat met in the water (the sea, the fishing spot, a
 * shore, a lake), its terrain's tall grass for one met in the grass, and open ground for a cave, a ridge or a plant.
 */
function coverOf(node: MapNode, map: RegionMap): { kind: 'grass' | 'water'; tile: string } | null {
  const cover = habitatOf(node, map)?.cover ?? 'grass';
  if (cover === 'water') return { kind: 'water', tile: routeTile('river', 'water-c') };
  if (cover === 'none') return null;
  const terrain = terrainOfNode(map, node);
  return TALL_GRASS.has(terrain) ? { kind: 'grass', tile: routeTile(terrain, 'tall') } : null;
}

/** §9.3 — a landmark's caption names who waits there, which its picture alone cannot: the Leader, the Elite. */
export function landmarkName(node: MapNode, map: RegionMap): string | null {
  if (node.kind === 'gym' && node.lane !== undefined) return gymById(map.gyms[node.lane]!).name.replace(/^Leader /, '');
  if (node.kind === 'elite') return node.preview.title;
  return null;
}

/**
 * §9.3 — the short name a node wears under its picture when the map's labels are on: a Wild Area's ground, a trainer's
 * class, a stop's name. Landmarks keep their own (`landmarkName`); a fight with another objective says so first.
 */
export function nodeLabel(node: MapNode, map: RegionMap): string {
  const landmark = landmarkName(node, map);
  if (landmark) return landmark;
  const p = node.preview;
  if (p.objective?.kind === 'hold') return NODE_TEXT.guarded;
  if (p.objective?.kind === 'flee') return NODE_TEXT.runner;
  switch (node.kind) {
    case 'wild':
      // The ground it is met on: its habitat's name.
      return habitatOf(node, map)?.name ?? NODE_LABEL.wild!;
    case 'trainer':
      return p.icon?.startsWith('trainer-') ? trainerClass(p.icon.slice('trainer-'.length)) : NODE_LABEL.trainer!;
    case 'elite-wild': {
      const face = p.enemies?.[0]?.species ?? p.speciesIds[0];
      return face ? getContent().species(face).name : NODE_LABEL['elite-wild']!;
    }
    default:
      return NODE_LABEL[node.kind] ?? node.kind;
  }
}

export function nodeArt(node: MapNode, map: RegionMap): NodeArt {
  const p = node.preview;
  switch (node.kind) {
    case 'trainer': {
      const roster = ALL_TRAINERS.find((t) => t.id === p.rosterId) ?? ALL_TRAINERS.find((t) => t.name === p.title);
      return { kind: 'trainer', src: trainerSprite(roster?.sprite ?? 'youngster') };
    }
    case 'elite': {
      const elite = ALL_ELITES.find((e) => e.name === p.title);
      return { kind: 'trainer', src: trainerSprite(elite?.sprite ?? 'acetrainer') };
    }
    case 'gym': {
      const id = node.lane !== undefined ? map.gyms[node.lane] : undefined;
      return { kind: 'trainer', src: trainerSprite(id ? gymById(id).sprite : 'brock') };
    }
    case 'aid':
      return { kind: 'trainer', src: trainerSprite('nurse') };
    case 'merchant':
      return { kind: 'trainer', src: trainerSprite('merchant') };
    // §2.9.6 — the roadside trader, a Poké Fan.
    case 'trader':
      return { kind: 'trainer', src: trainerSprite(TRADER.sprite) };
    // §2.12 — Victory Road: the Gauntlet's Ace Trainer, the Training Grounds' Black Belt, the Summit's peak.
    // §2.1.6 — a League door: its member.
    case 'league':
      return { kind: 'trainer', src: trainerSprite(leagueMemberOf(node)?.sprite ?? 'acetrainer') };
    case 'gauntlet':
      return { kind: 'trainer', src: trainerSprite(VICTORY_ROAD.gauntlet.sprite) };
    case 'training':
      return { kind: 'trainer', src: trainerSprite('blackbelt') };
    case 'summit':
      return { kind: 'sign', src: summitSign() };
    case 'wild': {
      // One of the Pokémon you will meet most often — a Common, picked by the node's id, so two nodes of one habitat
      // need not wear the same face — or the old preview's first species.
      const commons = p.wild?.pool.common ?? [];
      const face = commons.length ? commons[[...node.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % commons.length] : p.wild?.pool.uncommon[0] ?? p.speciesIds[0];
      if (!face) return { kind: 'sign', src: mysterySign() };
      // A runner (§5.6.5) stands on open ground whatever its habitat: an Abra is not met in the water.
      return { kind: 'pokemon', src: pokemonIcon(face), cover: p.objective?.kind === 'flee' ? null : coverOf(node, map) };
    }
    // §2.12.2 — the Apex: the Legendary, standing on its node.
    case 'apex':
    case 'elite-wild': {
      const face = p.enemies?.[0]?.species ?? p.speciesIds[0];
      return face ? { kind: 'pokemon', src: pokemonIcon(face), cover: null } : { kind: 'sign', src: mysterySign() };
    }
    case 'cache': {
      // §5.6.5 — a guarded find shows who stands over it.
      if (p.objective?.kind === 'hold' && p.speciesIds[0]) return { kind: 'pokemon', src: pokemonIcon(p.speciesIds[0]), cover: null };
      // §2.9.5 — an item ball since its reel (2026-10-20): the ball lying on the path, as the overworld draws it.
      if (p.reel) return { kind: 'item', src: itemIcon('poke-ball') };
      const item = p.find?.items[0];
      return { kind: 'item', src: itemIcon(item ?? 'poke-ball') };
    }
    case 'mystery':
    default:
      return { kind: 'sign', src: mysterySign() };
  }
}

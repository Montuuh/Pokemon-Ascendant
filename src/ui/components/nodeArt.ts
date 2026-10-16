import { getContent } from '@/content/registry';
import { battleSpriteUrl } from '@/content/schemas/species';
import { ALL_ELITES, ALL_TRAINERS, TRADER, VICTORY_ROAD, gymById, type MapNode, type RegionMap, leagueMemberOf } from '@/sim';
import { itemIcon, mysterySign, routeTile, summitSign, trainerSprite, type NodeArt } from '@/ui/art';
import { terrainOfNode, type TerrainId } from '@/ui/screens/map/terrain';

// §9.3 — which picture a map node wears (v0.9.14). Read off the node's own preview, so the map shows exactly who and
// what the preview card will promise: the roster's own sprite, the Gym's own Leader, the find's own item.

/** Its animated Gen V battle sprite, cropped tight to the Pokémon: the same sprite the arena shows. */
const pokemonIcon = (speciesId: string) => battleSpriteUrl(getContent().species(speciesId).id, 'front');

/** The Wild Areas of the sea and the river are met in the water; every other one in its terrain's own tall grass. */
const WATER_BIOMES = new Set(['wild-sea', 'wild-river']);
/** The terrains whose tiles include tall grass (`public/art/route/<terrain>/tall.png`); a cave or a plant has none. */
const TALL_GRASS: ReadonlySet<TerrainId> = new Set(['route', 'coast', 'highland', 'meadow', 'forest', 'lake']);

function coverOf(node: MapNode, map: RegionMap): { kind: 'grass' | 'water'; tile: string } | null {
  if (WATER_BIOMES.has(node.preview.icon ?? '')) return { kind: 'water', tile: routeTile('river', 'water-c') };
  const terrain = terrainOfNode(map, node);
  return TALL_GRASS.has(terrain) ? { kind: 'grass', tile: routeTile(terrain, 'tall') } : null;
}

/** §9.3 — a landmark's caption names who waits there, which its picture alone cannot: the Leader, the Elite. */
export function landmarkName(node: MapNode, map: RegionMap): string | null {
  if (node.kind === 'gym' && node.lane !== undefined) return gymById(map.gyms[node.lane]!).name.replace(/^Leader /, '');
  if (node.kind === 'elite') return node.preview.title;
  return null;
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
      // The Pokémon you will meet most often: the first Common of the pool, or the old preview's first species.
      const face = p.wild?.pool.common[0] ?? p.wild?.pool.uncommon[0] ?? p.speciesIds[0];
      if (!face) return { kind: 'sign', src: mysterySign() };
      return { kind: 'pokemon', src: pokemonIcon(face), cover: coverOf(node, map) };
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
      const item = p.find?.items[0];
      return { kind: 'item', src: itemIcon(item ?? 'poke-ball') };
    }
    case 'mystery':
    default:
      return { kind: 'sign', src: mysterySign() };
  }
}

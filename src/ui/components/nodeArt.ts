import { getContent } from '@/content/registry';
import { battleSpriteUrl } from '@/content/schemas/species';
import { ALL_ELITES, ALL_TRAINERS, TRADER, VICTORY_ROAD, gymById, leagueMemberOf, regionContent, type BiomeId, type MapNode, type RegionMap } from '@/sim';
import { habitatProp, itemIcon, mysterySign, summitSign, trainerSprite, type NodeArt } from '@/ui/art';
import { MAP_LABEL, MAP_TEXT, NODE_LABEL } from '@/ui/strings';

// §9.3 — which picture a map node wears (v0.9.14). Read off the node's own preview, so the map shows exactly who and
// what the preview card will promise: the roster's own sprite, the Gym's own Leader, the find's own item.

/** Its animated Gen V battle sprite, cropped tight to the Pokémon: the same sprite the arena shows. */
const pokemonIcon = (speciesId: string) => battleSpriteUrl(getContent().species(speciesId).id, 'front');

/** §9.3 — the habitats with no landmark: the plain route's tall grass is the grass every Wild Area stands in. */
const NO_LANDMARK: ReadonlySet<BiomeId> = new Set(['tall-grass']);
/** §9.3 — the habitats whose landmark lies flat on the ground: water, sand, flowers. */
const LOW_PROPS: ReadonlySet<BiomeId> = new Set(['meadow', 'river', 'shore', 'sea', 'swamp', 'lake']);

/** §2.6.1 — a Wild Area's habitat, from the id its preview's icon carries (`wild-<habitat>`), if this region has it. */
function habitatOf(node: MapNode, map: RegionMap): BiomeId | null {
  const id = node.preview.icon?.startsWith('wild-') ? (node.preview.icon.slice('wild-'.length) as BiomeId) : null;
  return id && regionContent(map.regionIndex).biomes[id] ? id : null;
}

/** §9.3 — a landmark's caption names who waits there, which its picture alone cannot: the Leader, the Elite. */
export function landmarkName(node: MapNode, map: RegionMap): string | null {
  if (node.kind === 'gym' && node.lane !== undefined) return gymById(map.gyms[node.lane]!).name.replace(/^Leader /, '');
  if (node.kind === 'elite') return node.preview.title;
  return null;
}

/** A node's kind in words — a guarded find is a fight, not an item ball (§5.6.5). For its bubble and its name read aloud. */
export const kindName = (node: MapNode): string => (node.preview.objective?.kind === 'hold' ? MAP_TEXT.guarded : NODE_LABEL[node.kind] ?? node.kind);
/** Whether a title already says the kind ("A guarded find", "Gym"): then the kind is not said again beside it. */
export const titleSays = (title: string, kind: string): boolean => title.toLowerCase().includes(kind.toLowerCase());

/**
 * §9.3 — the word a node wears under its picture when the map's labels are on: its kind, generic (the user, 2026-10-20) —
 * Wild, Trainer, Elite Trainer, Nurse… — and a Gym its Leader's name too (*Brock's Gym*). The habitat and the trainer's
 * class are the picture's and the bubble's to say.
 */
export function nodeLabel(node: MapNode, map: RegionMap): string {
  const leader = node.kind === 'gym' ? landmarkName(node, map) : null;
  if (leader) return MAP_TEXT.gym(leader);
  return MAP_LABEL[node.kind] ?? kindName(node);
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
      // §9.3 (the user, 2026-10-20) — every Wild Area's Pokémon in the one grass, and its habitat said by the landmark
      // behind it: the Pokémon Tower behind an Old Tower's Gastly, a cave's mouth behind a Zubat. A runner (§5.6.5) is
      // one named Pokémon, met wherever it bolts: no landmark, as the Elite Wild has none.
      const habitat = p.objective?.kind === 'flee' ? null : habitatOf(node, map);
      const prop = habitat && !NO_LANDMARK.has(habitat) ? { src: habitatProp(habitat), low: LOW_PROPS.has(habitat) } : null;
      return { kind: 'pokemon', src: pokemonIcon(face), grass: true, prop };
    }
    // §2.8.2 — the Elite Wild: the Pokémon itself, in the same grass; §2.12.2 — the Apex: the Legendary, on its node.
    case 'apex':
    case 'elite-wild': {
      const face = p.enemies?.[0]?.species ?? p.speciesIds[0];
      return face ? { kind: 'pokemon', src: pokemonIcon(face), grass: node.kind === 'elite-wild', prop: null } : { kind: 'sign', src: mysterySign() };
    }
    case 'cache': {
      // §5.6.5 — a guarded find shows who stands over it.
      if (p.objective?.kind === 'hold' && p.speciesIds[0]) return { kind: 'pokemon', src: pokemonIcon(p.speciesIds[0]), grass: false, prop: null };
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

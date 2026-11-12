import { asset } from '@/content/paths';
import { getContent } from '@/content/registry';
import { battleSpriteUrl, boxIconUrl, portraitUrl } from '@/content/schemas/species';
import type { Combatant } from '@/sim';

// The only place UI code turns a combatant into asset URLs.
export function portraitOf(c: Pick<Combatant, 'speciesId'>): string {
  const s = getContent().species(c.speciesId);
  return portraitUrl(s.dex, s.id);
}
export function iconOf(c: Pick<Combatant, 'speciesId'>): string {
  const s = getContent().species(c.speciesId);
  return boxIconUrl(s.dex, s.id);
}
/** D9 — authentic box sprites with transparent margins trimmed, without resampling by build-compact-icons.mjs. */
export function compactIconOf(speciesId: string, shiny = false): string {
  // §5.14 / D9 — the credited FRLG practice sprites include every shiny palette in a native 32px cell.
  // Box icons have no shiny siblings; reuse authentic art rather than recolouring the catalogue icon.
  if (shiny) return asset(`art/dojo/pokemon/${speciesId}-shiny.png`);
  const species = getContent().species(speciesId);
  return asset(`art/pokemon/compact/${String(species.dex).padStart(3, '0')}-${species.id}.png`);
}
export function spriteOf(c: Pick<Combatant, 'speciesId'>, side: 'front' | 'back', shiny = false, animated = true): string {
  return battleSpriteUrl(c.speciesId, side, shiny, animated);
}
export const itemIcon = (consumableId: string) => asset(`art/items/${consumableId}.png`);
/**
 * §9.2.3 (v0.9.15) — a move card's illustration: the effect itself, pixel art on the card's own window. A "+" move
 * (one made better, §6.3.5) wears its base move's picture.
 */
export const moveArt = (moveId: string) => asset(`art/moves/${moveId.replace(/(-plus)+$/, '')}.png`);
/**
 * §6.4.1 — a TM disc is coloured by its move's type in the real games, so the icon follows the move rather
 * than being one generic disc: every Gen I type has its own (v0.9.11). Normal is the plain disc.
 */
export function tmIcon(tmId: string): string {
  const type = getContent().move(getContent().tm(tmId).move).type;
  return asset(`art/items/tm${type === 'normal' ? '' : `-${type}`}.png`);
}
/**
 * §9.3 — what a map node looks like (v0.9.14, after Pokelike's map): the thing it is, not an emblem of it. A trainer
 * is its class's sprite; a Gym its Leader and the Elite its trainer; a Wild Area its habitat's landmark in the grass, its
 * pool's Pokémon going round at its sides; the
 * Elite Wild and a runner the Pokémon itself; the nurse and the merchant themselves; a find the item lying there; a
 * Mystery the overworld's "?".
 */
export type NodeArt =
  | { kind: 'trainer'; src: string }
  /** `grass`: it stands in the Wild Areas' one grass (`WILD_GRASS`). */
  | { kind: 'pokemon'; src: string; grass: boolean }
  /**
   * §9.3 — a Wild Area: its habitat's landmark, standing in the one grass (`low` for one that lies flat: a pond, a reef),
   * and its pool's battle sprites, which go round at its sides (`HabitatArt`).
   */
  | { kind: 'habitat'; src: string; low: boolean; pool: string[] }
  | { kind: 'item'; src: string }
  | { kind: 'sign'; src: string };
/** §9.3 — the tall grass every Wild Area stands in, whatever its habitat: Route 1's own tufts (`npm run art:habitats`). */
export const WILD_GRASS = asset('art/map/habitat/grass.png');
/** §9.3 — a habitat's landmark, a Wild Area's picture on the map (`npm run art:habitats`): the Pokémon Tower, a cave's mouth. */
export const habitatProp = (habitat: string) => asset(`art/map/habitat/${habitat}.png`);
export const stageBackdrop = (stage: string) => asset(`art/stages/${stage}.png`);
export const mysterySign = () => asset('art/icons/map/node-mystery-sign.svg');
/** §2.12.4 — the Summit's peak and pennant, on the Mystery sign's 16-px grid. */
export const summitSign = () => asset('art/icons/map/node-summit-sign.svg');
export const trainerSprite = (sprite: string) => asset(`art/trainers/${sprite}.png`);
/** §2.5 / §8.4.6 — a person as the overworld draws them (16×32, FRLG): on the route, and in the Hub lobby. */
export const mapPerson = (sprite: string) => asset(`art/map/people/${sprite}.png`);
/** The games' own pixel type label (32×12, FireRed/LeafGreen), fetched by `npm run art:types`. */
export const typeGlyph = (type: string) => asset(`art/icons/type/icon-type-${type}.png`);
export const statusGlyph = (status: string) => asset(`art/icons/status/icon-status-${status}.svg`);
export const statusEmblemGlyph = (status: string) => asset(`art/icons/status/icon-status-emblem-${status}.svg`);
export const intentGlyph = (kind: string) => asset(`art/icons/intent/icon-intent-${kind}.svg`);
export const medalGlyph = (tier: string) => asset(`art/icons/medal/icon-medal-${tier}.svg`);
export const trophyGlyph = (tier: string) => asset(`art/icons/trophy/icon-trophy-${tier}.svg`);
/**
 * §9 — an emblem on a disc, by id (`gym-rock`, `wild-cave`, `trainer-hiker`). The map draws its nodes as the things
 * themselves since v0.9.14 (`nodeArt`); the Gym emblems still mark a won Badge in a City and on the Legendary pick.
 */
export const nodeBadge = (id: string) => asset(`art/icons/map/node-${id}.png`);
/** §2.11 — a City's lobby background (`npm run art:gen`, then `install-art town`). */
export const townArt = (cityId: string) => asset(`art/towns/${cityId}.png`);
/** §2.11.6 — the Safari's FRLG tiles, tokens and entrance map (`npm run art:safari`). */
export const safariArt = (name: string) => asset(`art/safari/${name}.png`);
/** §2.5.4 — the route's FRLG tiles, one folder per terrain (`npm run art:route`). */
export const routeArt = (terrain: string, piece: string) => asset(`art/route/${terrain}/${piece}.png`);
/**
 * §2.11.5 / §2.11.6 — the Game Corner room before the switch, with the stairs open, and shut (`npm run art:rocket`),
 * and the two objects the map never drew: the roulette table and the locked hatch (`install-art pixel-sprite`).
 */
export const gameCornerArt = (name: 'room' | 'room-open' | 'room-shut' | 'roulette' | 'hatch') => asset(`art/game-corner/${name}.png`);
/** §2.11.2 — the Poké Mart and the Department Store's five floors, the real FRLG maps (`npm run art:mart`). */
export const martArt = (name: 'mart' | 'floor-1' | 'floor-2' | 'floor-3' | 'floor-4' | 'floor-5' | 'clerk') => asset(`art/mart/${name}.png`);
/** §2.8 — the nurse, the player and the healing machine the Pokémon Center's screens stand in their rooms (`npm run art:people`). */
export const hubArt = (name: 'nurse' | 'player' | 'heal-machine' | 'heal-ball') => asset(`art/hub/${name}.png`);
/** §8.4 — a place on the Road to the Plateau, or the Hall of Fame: the real FRLG room (`npm run art:hub`). */
export const hubRoom = (place: 'bedroom' | 'lab' | 'center' | 'plateau' | 'hall') => asset(`art/hub/${place}/room.png`);
/** §8.4.6 — the silhouette of a feature or a career prop the account has not earned, in that place's own floor tone. */
export const hubLock = (place: string, feature: string) => asset(`art/hub/${place}/${feature}-locked.png`);
/** §8.4.6 — a career prop (the Badge Case, the trophy, the award, the banner, the Ladder board), a later form, or a Badge's pip (`node scripts/build-hub-props.mjs`). */
export const hubProp = (name: string) => asset(`art/hub/props/${name}.png`);
/** §9.13.1 — the title's summit: the dawn vista, its two drifting cloud strips and its night side (`node scripts/build-title-art.mjs`). */
export const titleArt = (name: 'summit' | 'clouds-far' | 'clouds-near' | 'dusk') => asset(`art/title/${name}.png`);
/** §9.13.1 — a Pokémon of the title's party: its still back sprite on its shadow, its shape as an evolution's light, or that shape in white, the flash. */
export const titleForm = (speciesId: string, as: 'colour' | 'light' | 'flash' = 'colour') => asset(`art/title/forms/${speciesId}${as === 'colour' ? '' : `-${as}`}.png`);

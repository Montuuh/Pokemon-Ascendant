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
export function spriteOf(c: Pick<Combatant, 'speciesId'>, side: 'front' | 'back', shiny = false): string {
  return battleSpriteUrl(c.speciesId, side, shiny);
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
 * is its class's sprite; a Gym its Leader and the Elite its trainer; a Wild Area the Pokémon you will meet most,
 * peeking out of the grass (or the water); the Elite Wild the Pokémon itself; the nurse and the merchant themselves; a
 * find the item lying there; a Mystery the overworld's "?".
 */
export type NodeArt =
  | { kind: 'trainer'; src: string }
  /** `cover`: the tile it peeks out of — its lane's own tall grass, or the water — or nothing on bare ground. */
  | { kind: 'pokemon'; src: string; cover: { kind: 'grass' | 'water'; tile: string } | null }
  | { kind: 'item'; src: string }
  | { kind: 'sign'; src: string };
export const routeTile = (terrain: string, piece: string) => asset(`art/route/${terrain}/${piece}.png`);
export const stageBackdrop = (stage: string) => asset(`art/stages/${stage}.jpg`);
export const mysterySign = () => asset('art/icons/map/node-mystery-sign.svg');
/** §2.12.4 — the Summit's peak and pennant, on the Mystery sign's 16-px grid. */
export const summitSign = () => asset('art/icons/map/node-summit-sign.svg');
export const trainerSprite = (sprite: string) => asset(`art/trainers/${sprite}.png`);
/** The games' own pixel type label (32×12, FireRed/LeafGreen), fetched by `npm run art:types`. */
export const typeGlyph = (type: string) => asset(`art/icons/type/icon-type-${type}.png`);
export const statusGlyph = (status: string) => asset(`art/icons/status/icon-status-${status}.svg`);
export const intentGlyph = (kind: string) => asset(`art/icons/intent/icon-intent-${kind}.svg`);
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
/** §8.4 — the Trainer Hub: the Indigo Plateau's Pokémon Center lobby and the people in it (`npm run art:hub`). */
export const hubArt = (name: 'lobby' | 'nurse' | 'player') => asset(`art/hub/${name}.png`);
/** §2.11.6 — the Rocket Hideout's wall and floor, the Black Market's room (`npm run art:rocket`). */
export const blackMarketArt = (name: 'wall' | 'floor') => asset(`art/black-market/${name}.png`);

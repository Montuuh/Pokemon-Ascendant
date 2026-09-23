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
 * §6.4.1 — a TM disc is coloured by its move's type in the real games, so the icon follows the move rather
 * than being one generic disc. Anything we have no disc for falls back to the Normal one.
 */
const TM_DISCS = new Set(['fire', 'water', 'ground']);
export function tmIcon(tmId: string): string {
  const type = getContent().move(getContent().tm(tmId).move).type;
  return asset(`art/items/tm${TM_DISCS.has(type) ? `-${type}` : ''}.png`);
}
export const stageBackdrop = (stage: string) => asset(`art/stages/${stage}.jpg`);
export const trainerSprite = (sprite: string) => asset(`art/trainers/${sprite}.png`);
/** The games' own pixel type label (32×12, FireRed/LeafGreen), fetched by `npm run art:types`. */
export const typeGlyph = (type: string) => asset(`art/icons/type/icon-type-${type}.png`);
export const statusGlyph = (status: string) => asset(`art/icons/status/icon-status-${status}.svg`);
export const intentGlyph = (kind: string) => asset(`art/icons/intent/icon-intent-${kind}.svg`);
/** §9 — a map node's badge, by the preview's icon id (`wild-cave`, `trainer-hiker`, `gym-rock`) or its kind. */
export const nodeBadge = (id: string) => asset(`art/icons/map/node-${id}.png`);
export const menuVista = () => asset('art/ui/menu-vista.png');
/** §2.13 — each Region's route plate (Region 3's since v0.7.4). A Region without one borrows Region 1's. */
const PLATED_REGIONS = new Set([1, 2, 3]);
export const regionPlate = (n: number) => asset(`art/map/region-${PLATED_REGIONS.has(n) ? n : 1}.png`);
/** §2.11 — a City's lobby background (`npm run art:gen`, then `install-art town`). */
export const townArt = (cityId: string) => asset(`art/towns/${cityId}.png`);

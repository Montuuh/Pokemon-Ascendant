import type { HubFeature, HubPlace } from '@/sim';
import type { Box } from '@/ui/components/PixelRoom';
import layout from './places.json';
import badgeCase from './badge-case.json';

// §8.4 — the Trainer Hub's places as drawings: which piece of each room is which feature of the Hub, as boxes in
// that room's own pixels, and where the people the career brings come to stand. The numbers are not written here:
// `npm run art:hub` (scripts/lib/hub-places.mjs) draws the rooms and writes `places.json` from the same table, so a
// box cannot drift from the furniture it is.
//
// §8.4.6 — every feature has its place in every room (the Hall of Fame's stairs only at the Plateau). One the
// account has not earned is drawn as its silhouette (`lock`, where that picture goes); a Leader beaten comes to stand
// in the room and a Partner line walks it, as far as the room has floor for them.

export type HubSpot = Exclude<HubFeature, 'badges' | 'trophies' | 'dex' | 'banner' | 'ladder'>;

/** The career on the floor: sprites of their own, never doors. */
export const HUB_PROPS = ['badges', 'trophies', 'dex', 'banner', 'ladder'] as const;
export type HubProp = (typeof HUB_PROPS)[number];

export interface PlaceFeature {
  /** The furniture that is this feature; the first box wears its plate. */
  boxes: readonly Box[];
  /**
   * Where its silhouette is laid. Absent for a prop, whose silhouette fills its own box, and for a door the place
   * can neither hold locked nor see arrive (Viridian is reached after every door's rank).
   */
  lock?: Box;
}

export interface PlaceLayout {
  w: number;
  h: number;
  features: Partial<Record<HubFeature, PlaceFeature>>;
  /** The way back to the title: the bed, a doormat. */
  exit: Box;
  /** §8.14 — where beaten Leaders stand, in the order their Badges were won. */
  leaders: readonly Box[];
  /** §6.8.2 — where Partner lines walk, beside the player. */
  partners: readonly Box[];
}

export interface HallLayout {
  w: number;
  h: number;
  exit: Box;
  /** §8.15 — where the winning team stands, before the machine. */
  team: readonly Box[];
}

const all = layout as unknown as Record<HubPlace, PlaceLayout> & { hall: HallLayout };

export const PLACES: Record<HubPlace, PlaceLayout> = { bedroom: all.bedroom, lab: all.lab, center: all.center, plateau: all.plateau };
export const HALL: HallLayout = all.hall;

/** §8.14 — the Badge Case's sockets, in the prop's own pixels: where each Badge's pip lies once it is won (`scripts/build-hub-props.mjs`). */
export const BADGE_PIPS = badgeCase.pips as unknown as Record<string, Box>;
export const BADGE_CELL = badgeCase.cell as unknown as readonly [number, number];

/** Tab order: the way into a run first, then the room's doors in the order the road brings them. */
export const SPOT_ORDER: readonly HubSpot[] = ['run', 'card', 'pc', 'aide', 'guide', 'mart', 'kit', 'hall'];

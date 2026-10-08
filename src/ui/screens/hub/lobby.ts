import type { Box } from '@/ui/components/PixelRoom';

// §8.4 — the Trainer Hub as a place: the Indigo Plateau's Pokémon Center lobby as FireRed / LeafGreen drew it
// (`npm run art:hub`). This file owns only the drawing — which piece of the room is which door of the Hub, as boxes in
// the map's own pixels, and where the people the map has no room for stand. The art carries two transparent columns
// on its left, where the Archives' map is cut, so the Mart counter's outline is drawn whole.

export type HubSpot = 'mart' | 'card' | 'pc' | 'guide' | 'run';

export const LOBBY = { w: 402, h: 276 } as const;

/**
 * Each door of the Hub, as the furniture that is it. In the order Tab visits them, which is the picture's: the door
 * at the top first, then the Mart on the left, the nurse, the PC.
 */
export const LOBBY_SPOTS: Record<HubSpot, readonly Box[]> = {
  // The door to the Elite Four, between the statues: the way into a run.
  run: [[61, 8, 26, 24]],
  // The Poké Mart's counter, the clerk behind it.
  mart: [[2, 76, 32, 64]],
  // The nurse and her counter: she keeps the League's register — your Trainer Card.
  card: [[162, 140, 112, 50]],
  // The PC beside her counter.
  pc: [[274, 135, 17, 32]],
  // The table in the left-hand corner, with its stools: the Item Guide lies open on it (v0.9.9).
  guide: [[17, 157, 33, 33]],
};

/** The doormat: the way back out to the title menu. */
export const LOBBY_EXIT: Box = [174, 260, 25, 16];

/** Where the people stand, top-left in the map's pixels, with their sprites' sizes. */
export const LOBBY_PEOPLE = {
  clerk: [6, 82, 14, 20] as Box,
  nurse: [185, 142, 18, 28] as Box,
  player: [178, 232, 16, 20] as Box,
};

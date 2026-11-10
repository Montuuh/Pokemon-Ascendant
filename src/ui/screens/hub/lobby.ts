import type { Box } from '@/ui/components/PixelRoom';

// §8.4 — the Trainer Hub as a place: the Indigo Plateau's Pokémon Center lobby as FireRed / LeafGreen drew it
// (`npm run art:hub`). This file owns only the drawing — which piece of the room is which door of the Hub, as boxes in
// the map's own pixels, and where the people the map has no room for stand. The art carries two transparent columns
// on its left, where the Archives' map is cut, so the Mart counter's outline is drawn whole.
//
// §8.4.6 — the lobby fills: a door is there only once the rank has brought whoever keeps it, a Leader you
// have beaten comes to stand in the room, and a Partner line walks it. The room is the account's progress, drawn.

export type HubSpot = 'mart' | 'card' | 'pc' | 'guide' | 'run' | 'aide' | 'kit';

export const LOBBY = { w: 402, h: 276 } as const;

/**
 * Each door of the Hub, as the furniture that is it. In the order Tab visits them, which is the picture's: the door
 * at the top first, then the Mart on the left, the nurse, the PC, the aide's terminal and the Kit table.
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
  // The research terminal on the east wall, and Professor Oak's aide standing at it.
  aide: [[356, 138, 30, 34], [336, 160, 16, 30]],
  // The table by the east wall, where a trainer packs the Kit before the door.
  kit: [[289, 207, 38, 36]],
};

/** §8.4.6 — the Trainer Rank that brings each door to the room. A door not listed is there from the first day. */
export const SPOT_RANK: Partial<Record<HubSpot, number>> = { aide: 2, mart: 3, kit: 4 };

/** The doormat: the way back out to the title menu. */
export const LOBBY_EXIT: Box = [174, 260, 25, 16];

/** Where the people stand, top-left in the map's pixels, with their sprites' sizes. */
export const LOBBY_PEOPLE = {
  clerk: [6, 82, 14, 20] as Box,
  nurse: [185, 142, 18, 28] as Box,
  player: [178, 232, 16, 20] as Box,
  aide: [336, 158, 16, 32] as Box,
};

/**
 * §8.14 — where a beaten Leader comes to stand: twelve places on open floor, filled in the order the Badges were
 * won, so the room fills from the door inward.
 */
export const LEADER_SPOTS: readonly Box[] = [
  [104, 62, 16, 32], [44, 58, 16, 32], [112, 98, 16, 32], [66, 92, 16, 32],
  [70, 148, 16, 32], [132, 150, 16, 32], [100, 180, 16, 32], [140, 204, 16, 32],
  [84, 216, 16, 32], [206, 198, 16, 32], [238, 214, 16, 32], [300, 172, 16, 32],
];

/**
 * §6.8.2 — where Partner lines walk: four places round the player, on open floor — clear of the plant by the doormat
 * and of the Leaders' places above.
 */
export const PARTNER_SPOTS: readonly Box[] = [[198, 236, 16, 16], [158, 236, 16, 16], [218, 238, 16, 16], [160, 216, 16, 16]];

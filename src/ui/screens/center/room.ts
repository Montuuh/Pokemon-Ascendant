import type { Box } from '@/ui/components/PixelRoom';
import { asset } from '@/content/paths';

// A09 / D9 — PokemonCenter_1F recomposed from FRLG metatiles by scripts/build-rooms.mjs (center).
// All positions use the output's native pixel grid; the machine's top is one pixel below its metatiles.
export const CENTER_ROOM = { art: asset('art/center/room.png'), w: 304, h: 224, machine: [112, 17] } as const;
export const CENTER_SPOTS = {
  // The green rug, its two beds and Chansey at work.
  therapy: [[16, 80, 80, 64]],
  heal: [[136, 16, 40, 48]],
  pc: [[208, 8, 16, 56]],
  // §6.3.9 — the lounge table and its two stools, a Pikachu waiting: the grooming corner.
  groom: [[224, 80, 56, 48]],
} as const satisfies Record<string, readonly Box[]>;
export const CENTER_PEOPLE = {
  nurse: [143, 20, 18, 28],
  player: [144, 176, 16, 20],
} as const satisfies Record<string, Box>;
export const CENTER_EXIT: Box = [139, 206, 26, 18];

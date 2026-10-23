import type { Box } from '@/ui/components/PixelRoom';
import { asset } from '@/content/paths';

// A09 / D9 — the authored Center, assembled from FRLG tiles by scripts/build-center-art.mjs.
// All positions use the output's native pixel grid; the machine's top is one pixel below its source crop.
export const CENTER_ROOM = { art: asset('art/center/room.png'), w: 320, h: 224, machine: [112, 17] } as const;
export const CENTER_SPOTS = {
  daycare: [[32, 80, 80, 80]],
  therapy: [[168, 16, 40, 48]],
  pc: [[256, 48, 32, 40]],
} as const satisfies Record<string, readonly Box[]>;
export const CENTER_PEOPLE = {
  nurse: [176, 20, 18, 28],
  player: [152, 176, 16, 20],
} as const satisfies Record<string, Box>;
export const CENTER_EXIT: Box = [147, 206, 26, 18];

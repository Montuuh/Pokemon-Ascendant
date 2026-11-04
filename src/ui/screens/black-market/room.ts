import type { Box } from '@/ui/components/PixelRoom';

export type MarketCounter = 'trader' | 'fence' | 'gambler' | 'showcase';
export const MARKET_COUNTERS: readonly MarketCounter[] = ['trader', 'fence', 'gambler', 'showcase'];
/** The Hideout B1F office, cropped whole by scripts/build-black-market-art.mjs: every anchor is in its native pixels. */
export const MARKET_ROOM = { w: 272, h: 232 } as const;
export const MARKET_SPOTS: Record<MarketCounter, { person: Box; boxes: readonly Box[]; plate?: 'raised' }> = {
  // The crates and the orange shutters along the north-east wall; she stands beside her stock.
  trader: {
    person: [192, 40, 16, 32],
    boxes: [
      [208, 24, 64, 48],
      [192, 40, 16, 32],
    ],
  },
  // The desk with the terminal, at the foot of the office.
  fence: {
    person: [112, 112, 16, 32],
    boxes: [
      [48, 148, 96, 44],
      [112, 112, 16, 32],
    ],
  },
  // The den in the south-east nook, at the Game Corner's own table.
  gambler: {
    person: [216, 152, 16, 32],
    boxes: [
      [192, 184, 64, 30],
      [216, 152, 16, 32],
    ],
  },
  // The boss's desk under the north wall, beside the plant.
  showcase: {
    // The plate rides up into the desk: hung below it, it would sit on the Fence standing at the south desk.
    plate: 'raised',
    person: [64, 32, 16, 32],
    boxes: [
      [48, 68, 96, 44],
      [64, 32, 16, 32],
    ],
  },
};
export const MARKET_STAIRS: Box = [0, 8, 40, 64];

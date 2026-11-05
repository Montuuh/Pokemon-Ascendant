import type { Box } from '@/ui/components/PixelRoom';

export type MarketCounter = 'trader' | 'fence' | 'gambler' | 'showcase';
export const MARKET_COUNTERS: readonly MarketCounter[] = ['trader', 'fence', 'gambler', 'showcase'];
/** The Hideout office floor and the Executive's office, by scripts/build-black-market-art.mjs: anchors in its pixels. */
export const MARKET_ROOM = { w: 352, h: 264 } as const;
export const MARKET_SPOTS: Record<MarketCounter, { person: Box; boxes: readonly Box[] }> = {
  // The Warehouse's metal crates, racked on the north wall and stacked on the floor; she stands before her stock.
  trader: {
    person: [160, 56, 16, 32],
    boxes: [
      [144, 24, 64, 80],
      [160, 56, 16, 32],
    ],
  },
  // The desk with the terminal under the server cabinets.
  fence: {
    person: [64, 80, 16, 32],
    boxes: [
      [48, 104, 48, 60],
      [64, 80, 16, 32],
    ],
  },
  // The Game Corner's own table in the floor's south-west corner.
  gambler: {
    person: [16, 168, 16, 32],
    boxes: [
      [16, 200, 64, 30],
      [16, 168, 16, 32],
    ],
  },
  // The Executive's desk, in his own office between the Legendaries on show.
  showcase: {
    person: [288, 56, 16, 32],
    boxes: [
      [272, 88, 48, 48],
      [288, 56, 16, 32],
    ],
  },
};
export const MARKET_STAIRS: Box = [0, 8, 48, 64];

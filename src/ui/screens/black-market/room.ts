import type { Box } from '@/ui/components/PixelRoom';

export type MarketCounter = 'trader' | 'fence' | 'gambler' | 'showcase';
export const MARKET_COUNTERS: readonly MarketCounter[] = ['trader', 'fence', 'gambler', 'showcase'];
export const MARKET_ROOM = { w: 320, h: 256 } as const;
/** All anchors use the new room's native pixels, matching scripts/build-black-market-art.mjs. */
export const MARKET_SPOTS: Record<MarketCounter, { person: Box; boxes: readonly Box[] }> = {
  trader: {
    person: [72, 80, 16, 32],
    boxes: [
      [32, 112, 96, 48],
      [72, 80, 16, 32],
    ],
  },
  fence: {
    person: [240, 128, 16, 32],
    boxes: [
      [224, 160, 48, 32],
      [240, 128, 16, 32],
    ],
  },
  gambler: {
    person: [88, 176, 16, 32],
    boxes: [
      [64, 208, 64, 30],
      [88, 176, 16, 32],
    ],
  },
  showcase: {
    person: [240, 32, 16, 32],
    boxes: [
      [208, 64, 80, 48],
      [240, 32, 16, 32],
    ],
  },
};
export const MARKET_STAIRS: Box = [16, 24, 40, 48];

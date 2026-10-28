import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import sharp from 'sharp';

// B19 — an event's identifying prop is readable before its title: the item a choice names is in its vignette at
// the icon's own size (1×, never shrunk to a dot), and a random reward is never shown as a particular one.

const art = resolve(import.meta.dirname, '../../public/art');

async function pixels(path: string) {
  const { data, info } = await sharp(resolve(art, path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Share of the icon's opaque pixels found, within a small colour tolerance, at the best whole-pixel offset. */
async function bestMatch(scene: string, item: string) {
  const s = await pixels(`events/${scene}.png`);
  const i = await pixels(`items/${item}.png`);
  const opaque: number[] = [];
  for (let p = 0; p < i.width * i.height; p++) if (i.data[p * 4 + 3]! > 200) opaque.push(p);
  let best = 0;
  for (let oy = 0; oy <= s.height - i.height; oy++) {
    for (let ox = 0; ox <= s.width - i.width; ox++) {
      let hits = 0;
      for (const p of opaque) {
        const a = (oy + Math.floor(p / i.width)) * s.width + ox + (p % i.width);
        let near = true;
        for (let c = 0; c < 3 && near; c++) near = Math.abs(s.data[a * 4 + c]! - i.data[p * 4 + c]!) <= 24;
        if (near) hits++;
      }
      best = Math.max(best, hits / opaque.length);
      if (best === 1) return best;
    }
  }
  return best;
}

const SHOWN: Array<[scene: string, items: string[]]> = [
  ['slot-booth', ['tacticians-coin']],
  ['field-medic', ['super-potion', 'full-heal']],
  ['stone-cache', ['fire-stone', 'water-stone', 'thunder-stone']],
];

describe('EventArt_IdentifyingProp_DrawnAtItsOwnSize', () => {
  for (const [scene, items] of SHOWN)
    for (const item of items)
      it(`${scene} shows ${item} at 1×`, async () => {
        expect(await bestMatch(scene, item)).toBeGreaterThanOrEqual(0.9);
      }, 20_000);

  it('mysterious-stone shows no particular Evolution Item, because which one it is is rolled on taking it', async () => {
    for (const stone of ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone'])
      expect(await bestMatch('mysterious-stone', stone), stone).toBeLessThan(0.6);
  }, 60_000);
});

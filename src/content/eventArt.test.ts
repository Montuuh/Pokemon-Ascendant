import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import sharp from 'sharp';

// B19 — an event's identifying prop is readable before its title: the item a choice names is in its vignette at
// the icon's own size (1×, never shrunk to a dot), and a random reward is never shown as a particular one.

const art = resolve(import.meta.dirname, '../../public/art');

type Frame = [left: number, top: number, width: number, height: number];

/** An image's pixels, optionally one frame of a sheet whose opaque background is its top-left colour (palette zero). */
async function pixels(path: string, frame?: Frame) {
  let image = sharp(resolve(art, path)).ensureAlpha();
  if (frame) image = image.extract({ left: frame[0], top: frame[1], width: frame[2], height: frame[3] });
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  if (frame)
    for (let p = 0; p < info.width * info.height; p++)
      if ([0, 1, 2].every((c) => data[p * 4 + c] === data[c])) data[p * 4 + 3] = 0;
  return { data, width: info.width, height: info.height };
}

/** Share of the icon's opaque pixels found, within a small colour tolerance, at the best whole-pixel offset. */
async function bestMatch(scene: string, item: string, frame?: Frame) {
  const s = await pixels(`events/${scene}.png`);
  const i = await pixels(item.includes('/') ? item : `items/${item}.png`, frame);
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

// B19 follow-up — the scenes whose subject is a person or a thing, not an item: the shrine, the pen, the stone.
const SPRITES: Array<[scene: string, name: string, path: string, frame: Frame]> = [
  ['cursed-trinket', 'the shrine statue', 'events/sources/statue.png', [0, 0, 16, 32]],
  ['daycare-recovery', 'a Pokémon in the pen', 'events/sources/pikachu.png', [0, 0, 16, 16]],
  ['hot-spring', 'a bather in the pool', 'events/sources/springWoman.png', [0, 0, 16, 32]],
  ['roadside-trader', 'the salesman', 'events/sources/salesman.png', [0, 0, 16, 32]],
  ['lost-backpack', 'the question bubble over the pack', 'events/sources/question.png', [0, 0, 16, 16]],
  ['mysterious-stone', 'the glint of its hum', 'events/sources/glint.png', [16, 0, 16, 16]],
];

describe('EventArt_IdentifyingProp_DrawnAtItsOwnSize', () => {
  for (const [scene, name, path, frame] of SPRITES)
    it(`${scene} shows ${name}`, async () => {
      expect(await bestMatch(scene, path, frame)).toBeGreaterThanOrEqual(0.9);
    }, 20_000);

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

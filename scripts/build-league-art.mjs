// §2.12.4 / §2.1.6 — Indigo Ascent: native FRLG arrival and a newly composed five-door gallery.
// Run with node scripts/build-league-art.mjs. All inputs are retained locally; no AI or resampling.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/league');
await mkdir(resolve(out, 'sources'), { recursive: true });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sources = [];
const crops = [];
const outputs = [];
async function source(file, url, retained) {
  const bytes = await readFile(resolve(root, file));
  const meta = await sharp(bytes).metadata();
  if (retained) await writeFile(resolve(out, retained), bytes);
  sources.push({ file: retained ?? `../../../${file}`, url, sha256: sha(bytes), width: meta.width, height: meta.height });
  return { bytes, file: retained ?? `../../../${file}` };
}
const indigo = await source('docs/design/ui/mockups/league-arrival/indigo-source.png', 'https://archives.bulbagarden.net/wiki/File:Indigo_Plateau_FRLG.png', 'sources/indigo-frlg.png');
const hub = await source('public/art/hub/lobby.png', 'https://archives.bulbagarden.net/wiki/File:Indigo_Plateau_Center_FRLG.png');
const center = await source('public/art/center/source/center-frlg.png', 'https://archives.bulbagarden.net/wiki/File:Pok%C3%A9mon_Center_inside_FRLG.png');
const tree = await source('public/art/route/route/tree.png', 'https://archives.bulbagarden.net/wiki/File:Kanto_Route_1_FRLG.png');
const ground = await source('public/art/route/highland/ground.png', 'https://archives.bulbagarden.net/wiki/File:Mt_Ember_FRLG.png');
const player = await source('public/art/hub/player.png', 'https://archives.bulbagarden.net/wiki/File:Red_FRLG_OD.png');
async function crop(input, box) {
  crops.push({ source: input.file, box });
  return sharp(input.bytes).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }).png().toBuffer();
}
const facade = await crop(indigo, [96, 0, 176, 128]);
const approach = await crop(indigo, [160, 144, 48, 16]);
const leftCliff = await crop(indigo, [0, 192, 80, 48]);
const rightCliff = await crop(indigo, [304, 192, 80, 48]);
// Remove only the original floor palette around furniture; preserve every opaque object pixel.
const floorPixels = await sharp(center.bytes).extract({ left: 48, top: 64, width: 16, height: 16 }).removeAlpha().raw().toBuffer();
const floorKeys = new Set();
for (let i=0; i<floorPixels.length; i+=3) floorKeys.add(`${floorPixels[i]},${floorPixels[i+1]},${floorPixels[i+2]}`);
async function furniture(input, box) {
  const pixels = await crop(input, box);
  const { data, info } = await sharp(pixels).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i=0; i<data.length; i+=4) if (floorKeys.has(`${data[i]},${data[i+1]},${data[i+2]}`)) data[i+3] = 0;
  return sharp(data, { raw: info }).png().toBuffer();
}
const statue = await furniture(hub, [34, 16, 16, 32]);
const wall = await crop(hub, [46, 0, 16, 16]);
const door = await crop(hub, [62, 8, 24, 20]);
const stone = await crop(indigo, [176, 144, 16, 16]);
const plant = await furniture(center, [16, 12, 16, 32]);
const emblem = await furniture(center, [96, 80, 48, 48]);
async function scene(id, width, height, build) {
  const layers = [];
  const put = async (input, left, top) => {
    const meta = await sharp(input).metadata();
    const x = Math.max(0, left), y = Math.max(0, top);
    const w = Math.min(meta.width + left, width) - x;
    const h = Math.min(meta.height + top, height) - y;
    if (w <= 0 || h <= 0) return;
    const clipped = await sharp(input).extract({ left: x-left, top: y-top, width: w, height: h }).png().toBuffer();
    layers.push({ input: clipped, left: x, top: y });
  };
  const tile = async (input, x, y, w, h) => {
    const meta = await sharp(input).metadata();
    for (let yy = y; yy < y+h; yy += meta.height) for (let xx = x; xx < x+w; xx += meta.width) await put(input, xx, yy);
  };
  // Original pixel geometry in the FRLG room's warm runner palette, without gradients or filtering.
  const rect = async (x, y, w, h, background) => put(await sharp({ create: { width: w, height: h, channels: 4, background } }).png().toBuffer(), x, y);
  const runner = async (x, y, w, h) => {
    await rect(x, y, w, h, '#a85850');
    await rect(x+2, y, w-4, h, '#e0ac7c');
    await rect(x+4, y, w-8, h, '#c87868');
  };
  await build({ put, tile, rect, runner });
  const bytes = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png({ palette: true, colours: 256, dither: 0 }).toBuffer();
  await writeFile(resolve(out, `${id}.png`), bytes);
  outputs.push({ file: `${id}.png`, width, height, sha256: sha(bytes), bytes: bytes.length });
}
await scene('summit', 304, 240, async ({ put, tile }) => {
  await tile(ground.bytes, 0, 0, 304, 240);
  for (let y=0; y<240; y+=48) { await put(tree.bytes, 0, y); await put(tree.bytes, 272, y); }
  await put(facade, 64, 0);
  await tile(approach, 128, 128, 48, 112);
  await put(leftCliff, 0, 192); await put(rightCliff, 224, 192);
  await put(statue, 80, 144); await put(statue, 208, 144);
  await put(player.bytes, 148, 176);
});
const doors = [48,128,208,288,392];
await scene('gallery', 448, 224, async ({ put, tile, rect, runner }) => {
  // Stone paving, raised wall and long scarlet runner distinguish the League from the Hub's yellow lobby.
  await tile(stone, 0, 0, 448, 224);
  await tile(wall, 0, 0, 448, 16);
  await rect(0, 16, 448, 6, '#a08b60');
  await runner(0, 144, 448, 32);
  for (const x of doors) {
    await runner(x-16, 42, 32, 102);
    await put(door, x-12, 22);
    await put(statue, x-34, 32); await put(statue, x+18, 32);
  }
  // The Champion stands beyond a paired column line and a larger ceremonial emblem.
  await rect(344, 16, 4, 128, '#a08b60');
  await rect(350, 16, 2, 128, '#e0ac7c');
  await put(emblem, 368, 80);
  await put(plant, 8, 184); await put(plant, 424, 184);
});
await writeFile(resolve(out, 'manifest.json'), `${JSON.stringify({
  version: 1, build: 'node scripts/build-league-art.mjs',
  processing: { nativePixelGrid: true, resampling: 'none', palette: 256, dither: 0, furnitureKey: { source: center.file, box: [48,64,16,16], colours: [...floorKeys] }, authored: 'Floor plan, repeated authentic gates and statues, and flat runner / separator geometry. No AI generation.' },
  sources, crops, outputs, galleryDoors: doors.map((x) => ({ x, y: 32 })),
}, null, 2)}\n`);
console.log(`Built ${outputs.length} Indigo Ascent scenes with retained source and SHA-256 manifest.`);

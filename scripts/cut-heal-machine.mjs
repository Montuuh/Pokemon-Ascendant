// §9.9.3 — the Pokémon Center's healing machine, as FireRed / LeafGreen drew it: cut from the Indigo Plateau lobby the Hub
// already ships (`public/art/hub/lobby.png`, `npm run art:hub`). The wall and the counter round it are made transparent by a
// flood fill from the crop's edges through the room's own colours (never the machine's: its slate outline and screen, its
// whites and greys), and only the machine's own piece is kept — the largest connected one — so no stray of the counter
// or the plant beside it comes along. Its six lights are where a Poké Ball sits while the machine runs; the ball is the
// games' tiny tray ball, drawn here on the same 1-px grid.
//
// Usage: node scripts/cut-heal-machine.mjs

import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const LOBBY = resolve(ROOT, 'public/art/hub/lobby.png');
const OUT = resolve(ROOT, 'public/art/hub');

// The machine on the lobby map, in the map's own pixels: from its dome to the counter's edge in front of it.
const BOX = { left: 177, top: 143, width: 34, height: 29 };
// The room's colours: the wall and its trim, the counter and its edge, the cabinet beside it.
const ROOM = new Set([
  '224,136,96', '240,232,160', '128,128,136', '224,184,112', '248,128,112', '200,80,64',
  '224,216,152', '192,176,136', '208,200,152', '152,184,208', '168,144,64',
]);

const { data, info } = await sharp(LOBBY).extract(BOX).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = Buffer.from(data);
const W = info.width;
const H = info.height;
const at = (x, y) => (y * W + x) * 4;
const key = (x, y) => `${px[at(x, y)]},${px[at(x, y) + 1]},${px[at(x, y) + 2]}`;

// 1. The room, from the top and the sides in (the bottom edge is the machine's own base, whose red cross the counter's
// red would otherwise run into).
const seen = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push([x, 0]);
for (let y = 0; y < H; y++) stack.push([0, y], [W - 1, y]);
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H || seen[y * W + x]) continue;
  seen[y * W + x] = 1;
  if (!ROOM.has(key(x, y))) continue;
  px[at(x, y) + 3] = 0;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

// 2. Only the machine: the largest piece of what is left.
const label = new Int32Array(W * H).fill(-1);
const sizes = [];
for (let y0 = 0; y0 < H; y0++)
  for (let x0 = 0; x0 < W; x0++) {
    if (label[y0 * W + x0] !== -1 || px[at(x0, y0) + 3] === 0) continue;
    const id = sizes.length;
    let n = 0;
    const q = [[x0, y0]];
    label[y0 * W + x0] = id;
    while (q.length) {
      const [x, y] = q.pop();
      n++;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || label[ny * W + nx] !== -1 || px[at(nx, ny) + 3] === 0) continue;
        label[ny * W + nx] = id;
        q.push([nx, ny]);
      }
    }
    sizes.push(n);
  }
const keep = sizes.indexOf(Math.max(...sizes));
for (let i = 0; i < W * H; i++) if (label[i] !== keep) px[i * 4 + 3] = 0;

await sharp(px, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 0 }).png({ palette: true }).toFile(resolve(OUT, 'heal-machine.png'));
const meta = await sharp(resolve(OUT, 'heal-machine.png')).metadata();
console.log(`wrote public/art/hub/heal-machine.png (${meta.width}×${meta.height})`);

// The tray ball: 4 × 4, the games' palette — a slate outline, red over white.
const S = [30, 30, 46, 255];
const R = [232, 48, 48, 255];
const Wt = [248, 248, 248, 255];
const T = [0, 0, 0, 0];
const BALL = [
  [T, S, S, T],
  [S, R, R, S],
  [S, Wt, Wt, S],
  [T, S, S, T],
];
await sharp(Buffer.from(BALL.flat(2)), { raw: { width: 4, height: 4, channels: 4 } }).png().toFile(resolve(OUT, 'heal-ball.png'));
console.log('wrote public/art/hub/heal-ball.png (4×4)');

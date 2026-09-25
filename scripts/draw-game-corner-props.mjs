#!/usr/bin/env node
// §2.11.5 / §2.11.6 — the two objects the FRLG Game Corner map never drew, drawn pixel by pixel in its own terms:
// the roulette table (64 × 30) and the locked steel hatch over the Black Market's stairs (32 × 22).
//
// Generated art brought down to these sizes stayed soft — hundreds of colours, no outline, a betting grid of mush
// (the UI review of 2026-09-25). At 64 × 30 an object is a handful of shapes, so it is drawn as shapes: flat fills,
// a one-step highlight and shadow, and the games' 1-px dark outline, every colour snapped to the room's own palette
// so the props share the map's colours. The generated variants (`docs/art/prompts/game-corner-*.txt`) were the
// reference for what to draw.
//
// Usage: npm run art:props   → public/art/game-corner/{roulette,hatch}.png (native size; the CSS scales by whole pixels)
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/game-corner');

// The room's palette: every prop colour is snapped to its nearest match there.
const room = await sharp(resolve(OUT, 'room.png')).removeAlpha().raw().toBuffer();
const palette = [];
{
  const seen = new Set();
  for (let i = 0; i < room.length; i += 3) {
    const k = (room[i] << 16) | (room[i + 1] << 8) | room[i + 2];
    if (!seen.has(k)) {
      seen.add(k);
      palette.push([room[i], room[i + 1], room[i + 2]]);
    }
  }
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** A colour as the room would draw it. Reds and greens the room lacks keep their own hue (`exact`). */
const ink = (h, exact = false) => {
  const c = hex(h);
  if (exact) return c;
  let best = palette[0];
  let bd = Infinity;
  for (const p of palette) {
    const d = (p[0] - c[0]) ** 2 * 0.3 + (p[1] - c[1]) ** 2 * 0.59 + (p[2] - c[2]) ** 2 * 0.11;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return bd < 900 ? best : c;
};

function canvas(w, h) {
  const px = new Array(w * h).fill(null);
  return {
    w,
    h,
    set: (x, y, c) => {
      if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c;
    },
    get: (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? px[y * w + x] : null),
    /** The games' outline: every filled pixel on the edge of the shape turns to the outline colour. */
    outline(c) {
      const edge = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!px[y * w + x]) continue;
        if (!this.get(x - 1, y) || !this.get(x + 1, y) || !this.get(x, y - 1) || !this.get(x, y + 1)) edge.push([x, y]);
      }
      for (const [x, y] of edge) px[y * w + x] = c;
    },
    async save(name) {
      const buf = Buffer.alloc(w * h * 4);
      px.forEach((c, i) => {
        if (!c) return;
        buf[i * 4] = c[0];
        buf[i * 4 + 1] = c[1];
        buf[i * 4 + 2] = c[2];
        buf[i * 4 + 3] = 255;
      });
      await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(resolve(OUT, `${name}.png`));
      console.log(`public/art/game-corner/${name}.png  ${w}×${h}`);
    },
  };
}

/** Inside a rounded rectangle [x0, y0, x1, y1] with corner radius r (a pixel-art rounding: cut corners). */
const inRound = (x, y, [x0, y0, x1, y1], r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6;
};

// ── The roulette table ───────────────────────────────────────────────────────────────────────────────────────
{
  const W = 64;
  const H = 30;
  const c = canvas(W, H);
  const OUTLINE = ink('#3a2418');
  const RIM = ink('#9c5a2c');
  const RIM_LIGHT = ink('#c8803c');
  const RIM_DARK = ink('#6e3a1c');
  const FELT = ink('#2e8a3e', true);
  const FELT_DARK = ink('#23703a', true);
  const RED = ink('#c83c30', true);
  const BLACK = ink('#282830');
  const WHITE = ink('#f8f8f0');
  const GOLD = ink('#e8b030');
  const GOLD_LIGHT = ink('#f8e070');
  const body = [0, 0, W - 1, H - 2];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inRound(x, y, body, 6)) continue;
    const felt = inRound(x, y, [3, 3, W - 4, H - 5], 4);
    if (felt) c.set(x, y, y > H - 9 && x > 4 ? FELT_DARK : FELT);
    else c.set(x, y, y <= 2 ? RIM_LIGHT : y >= H - 5 ? RIM_DARK : RIM);
  }
  // The shadow under the table's front edge, as the map's furniture has.
  for (let x = 4; x < W - 4; x++) c.set(x, H - 1, OUTLINE);

  // The wheel: a wooden bowl, a ring of red and black pockets, a gold hub, and the ball.
  const [wx, wy] = [15, 13];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - wx, y - wy);
    if (d > 10.4) continue;
    if (d > 8.4) c.set(x, y, d > 9.6 ? RIM_DARK : RIM_LIGHT);
    else if (d > 5.2) {
      const a = (Math.atan2(y - wy, x - wx) + Math.PI) / (2 * Math.PI);
      c.set(x, y, Math.floor(a * 18) % 2 ? RED : BLACK);
    } else if (d > 4.2) c.set(x, y, RIM_DARK);
    else c.set(x, y, d < 1.6 || (x < wx && y < wy && d < 3) ? GOLD_LIGHT : GOLD);
  }
  c.set(wx + 3, wy - 6, WHITE);

  // The betting layout: a green zero, then three rows of red and black numbers in white lines.
  const gx = 31;
  const gy = 7;
  const cols = 6;
  const rows = 3;
  for (let y = gy; y <= gy + rows * 4; y++) for (let x = gx; x <= gx + 4 + cols * 4; x++) c.set(x, y, WHITE);
  for (let y = gy + 1; y < gy + rows * 4; y++) for (let x = gx + 1; x < gx + 4; x++) c.set(x, y, FELT_DARK);
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const colour = (r + k) % 2 ? BLACK : RED;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) c.set(gx + 5 + k * 4 + x, gy + 1 + r * 4 + y, colour);
  }
  // Two short stacks of chips on the felt.
  for (const [x, y, col] of [[28, 20, RED], [29, 19, GOLD], [52, 22, ink('#3870c8')], [53, 21, WHITE]]) {
    c.set(x, y, col);
    c.set(x + 1, y, col);
  }
  c.outline(OUTLINE);
  await c.save('roulette');
}

// ── The locked hatch ─────────────────────────────────────────────────────────────────────────────────────────
{
  const W = 32;
  const H = 22;
  const c = canvas(W, H);
  const OUTLINE = ink('#283040');
  const STEEL = ink('#8c98a8');
  const LIGHT = ink('#c0c8d8');
  const DARK = ink('#606c80');
  const TREAD = ink('#707c90');
  const GOLD = ink('#e8b030');
  const plate = [0, 2, W - 1, H - 2];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inRound(x, y, plate, 2)) continue;
    const frame = x <= 1 || x >= W - 2 || y <= 3 || y >= H - 3;
    c.set(x, y, frame ? (x <= 1 || y <= 3 ? LIGHT : DARK) : STEEL);
  }
  // The diamond tread pressed into the plate.
  for (let y = 5; y < H - 4; y++) for (let x = 3; x < W - 3; x++) if ((x + y * 2) % 6 === 0 && y % 3 === 0) {
    c.set(x, y, TREAD);
    c.set(x + 1, y + 1, LIGHT);
  }
  // Rivets in the frame's corners.
  for (const [x, y] of [[2, 4], [W - 3, 4], [2, H - 4], [W - 3, H - 4]]) c.set(x, y, LIGHT);
  // Two hinges on the top edge.
  for (const hx of [5, W - 9]) for (let y = 0; y < 4; y++) for (let x = hx; x < hx + 4; x++) c.set(x, y, y === 0 ? LIGHT : DARK);
  // The recessed handle.
  for (let x = 12; x < 20; x++) {
    c.set(x, 13, OUTLINE);
    c.set(x, 14, DARK);
  }
  // The padlock hanging on the front edge: shut, and gold.
  for (let y = H - 5; y < H; y++) for (let x = 14; x < 18; x++) c.set(x, y, y === H - 5 ? DARK : GOLD);
  c.outline(OUTLINE);
  c.set(15, H - 3, OUTLINE);
  await c.save('hatch');
}

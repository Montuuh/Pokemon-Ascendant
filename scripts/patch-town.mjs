#!/usr/bin/env node
// §2.11 — change one building on a town lobby without redrawing the town (v0.7.7: Pallet's Challenge Ring, Celadon's
// Pokémon Coliseum and the stairs taken away beside its Game Corner).
//
// A generated edit of the lobby never comes back pixel-identical, so it is never installed whole. Instead: fit it
// to the original's size, align it to the original inside each box, and paste back only the pixels that changed —
// a diff mask, closed and hole-filled — or the whole box (`rect`). Every pasted pixel is snapped to the colours
// the original already uses, so the patch is drawn in the town's own palette. Outside the boxes the result is
// byte-identical to the original; check it with a pixel diff against git before installing.
//
// Usage: node scripts/patch-town.mjs <orig.png> <edit.png> <out.png> <diff|rect> x y w h [x y w h …]
// Then install losslessly as an indexed PNG (sharp .png({ palette: true })), and re-measure the doors in towns.ts.
import sharp from 'sharp';
const [orig, gen, out, mode, ...nums] = process.argv.slice(2);
const rects = [];
for (let i = 0; i < nums.length; i += 4) rects.push(nums.slice(i, i + 4).map(Number));
(async () => {
  const om = await sharp(orig).metadata();
  const W = om.width, H = om.height;
  const O = await sharp(orig).removeAlpha().raw().toBuffer();
  const G = await sharp(gen).resize(W, H, { fit: 'fill', kernel: 'nearest' }).removeAlpha().raw().toBuffer();
  // The original's palette.
  const pal = new Map();
  for (let i = 0; i < O.length; i += 3) { const k = (O[i] << 16) | (O[i + 1] << 8) | O[i + 2]; pal.set(k, (pal.get(k) || 0) + 1); }
  const colours = [...pal.entries()].filter(([, n]) => n > 20).map(([k]) => [k >> 16, (k >> 8) & 255, k & 255]);
  const cache = new Map();
  const snap = (r, g, b) => {
    const k = (r << 16) | (g << 8) | b;
    if (cache.has(k)) return cache.get(k);
    let best = colours[0], bd = Infinity;
    for (const c of colours) { const d = (c[0] - r) ** 2 * 0.3 + (c[1] - g) ** 2 * 0.59 + (c[2] - b) ** 2 * 0.11; if (d < bd) { bd = d; best = c; } }
    cache.set(k, best);
    return best;
  };
  const R = Buffer.from(O);
  for (const [x, y, w, h] of rects) {
    // Local alignment.
    let best = { dx: 0, dy: 0, m: Infinity };
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      let s = 0, n = 0;
      for (let j = y; j < y + h; j += 3) for (let i = x; i < x + w; i += 3) {
        const a = (j * W + i) * 3, b = ((j + dy) * W + i + dx) * 3;
        s += Math.abs(O[a] - G[b]) + Math.abs(O[a + 1] - G[b + 1]) + Math.abs(O[a + 2] - G[b + 2]); n++;
      }
      if (s / n < best.m) best = { dx, dy, m: s / n };
    }
    console.log('rect', x, y, w, h, 'align', best.dx, best.dy, best.m.toFixed(1));
    const at = (i, j) => ((j + best.dy) * W + i + best.dx) * 3;
    let mask = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (mode === 'rect') { mask[j * w + i] = 1; continue; }
      const a = ((y + j) * W + x + i) * 3, b = at(x + i, y + j);
      const d = Math.abs(O[a] - G[b]) + Math.abs(O[a + 1] - G[b + 1]) + Math.abs(O[a + 2] - G[b + 2]);
      mask[j * w + i] = d > 110 ? 1 : 0;
    }
    if (mode === 'diff') {
      const morph = (m, r, dil) => {
        const o = new Uint8Array(w * h);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          let v = dil ? 0 : 1;
          for (let q = -r; q <= r && v === (dil ? 0 : 1); q++) for (let p = -r; p <= r; p++) {
            const ii = i + p, jj = j + q;
            const s = ii < 0 || jj < 0 || ii >= w || jj >= h ? 0 : m[jj * w + ii];
            if (dil && s) { v = 1; break; }
            if (!dil && !s) { v = 0; break; }
          }
          o[j * w + i] = v;
        }
        return o;
      };
      mask = morph(morph(mask, 9, true), 9, false); // close
      mask = morph(mask, 2, true); // a little margin so no fringe of the old art survives
      // Fill holes: flood the outside from the border; whatever is not outside is inside.
      const outside = new Uint8Array(w * h);
      const stack = [];
      for (let i = 0; i < w; i++) stack.push([i, 0], [i, h - 1]);
      for (let j = 0; j < h; j++) stack.push([0, j], [w - 1, j]);
      while (stack.length) {
        const [i, j] = stack.pop();
        if (i < 0 || j < 0 || i >= w || j >= h) continue;
        const k = j * w + i;
        if (outside[k] || mask[k]) continue;
        outside[k] = 1;
        stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
      }
      for (let k = 0; k < w * h; k++) mask[k] = outside[k] ? 0 : 1;
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!mask[j * w + i]) continue;
      const a = ((y + j) * W + x + i) * 3, b = at(x + i, y + j);
      const c = snap(G[b], G[b + 1], G[b + 2]);
      R[a] = c[0]; R[a + 1] = c[1]; R[a + 2] = c[2];
    }
  }
  await sharp(R, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
  console.log('palette', colours.length, '→', out);
})();

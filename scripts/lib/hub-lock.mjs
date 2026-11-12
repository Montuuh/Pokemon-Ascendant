// §8.4.6 — the silhouette of a Hub feature the account has not earned: its shape in one flat tone taken from the
// room's own floor, with a slate one-pixel rim and nothing inside. It reads as "something comes here" (the Pokédex's
// unmet cards), it recedes into the floor rather than competing with the doors that open, and it is never the colour
// of anything real in the room. Shared by the rooms (hub-places.mjs) and the career props (build-hub-props.mjs).

const SLATE = [58, 62, 84];
const mix = (a, b, t) => a.map((v, k) => Math.round(v * (1 - t) + b[k] * t));

/** The fill and the rim for a room whose floor is mostly `floor`: the floor a quarter of the way to slate, and most of the way. */
export const lockTones = (floor) => ({ fill: mix(floor, SLATE, 0.26), rim: mix(floor, SLATE, 0.72) });

/**
 * RGBA pixels of a `w × h` silhouette from a predicate that says which pixels belong to the shape.
 * A pixel on the shape's rim — beside one that is not in it, or on the picture's border — takes the rim colour.
 */
export function flatLock(w, h, inShape, { fill, rim }) {
  const out = Buffer.alloc(w * h * 4);
  const has = (x, y) => x >= 0 && x < w && y >= 0 && y < h && inShape(x, y);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!has(x, y)) continue;
      const edge = !has(x + 1, y) || !has(x - 1, y) || !has(x, y + 1) || !has(x, y - 1);
      out.set([...(edge ? rim : fill), 255], (y * w + x) * 4);
    }
  return out;
}

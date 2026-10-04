import { routeArt } from '@/ui/art';
import type { MapTerrain, TerrainCell, TerrainId } from './terrain';

// §2.5.4 / §9.3 — how each terrain is drawn: which of its FRLG tiles (`npm run art:route`) stand for open ground,
// the path, the scenery and the tall grass, and the drawing itself — passes over the terrain grid onto a canvas at
// the art's own 16 px a tile. The screen scales the canvas, pixelated, so a FRLG pixel stays a block.
//
// Three things make the joins look drawn rather than stamped:
//
//   · **Autotiles**, a quarter-tile at a time from a tile's neighbours (the way RPG Maker draws its ground): a sand
//     road with its grass fringe (`path-*`), and water with its rim (`water-*`).
//   · **Masked joins.** Where the art has no fringe of its own — a cave's sand road, the edge where a meadow becomes a
//     cave — the join is cut with Route 1's sand-road fringe used as a *mask*: the same rounded corners and wobbly
//     edges, filled with the two terrains' own tiles, outlined in the inner one's shade. So every terrain meets every
//     other with a FRLG-shaped edge, from nine fringe tiles.
//   · **Trees are objects.** The real tree sprite with its grass keyed out, planted on a two-tile grid with its crown
//     standing over the row above, in rows from the top down — so a wood has a crowned edge, as the games' woods do.

export const TILE = 16;

interface TerrainArt {
  /** Which terrain's folder the pieces are in: a terrain without its own cut borrows one and tints it. */
  art: TerrainId;
  /** A canvas filter over every tile of this terrain, for a terrain that borrows another's art. */
  filter?: string;
  /** Open ground, and a second look for one tile in eight. */
  grounds: string[];
  /** A detail on open ground beside the path, now and then (a flower). */
  deco?: string;
  /** The tall grass round a Wild node. */
  tall?: string;
  /** The path: one floor tile cut to the fringe mask, or a road with its own fringe (`path-*` autotile). */
  path: 'plain' | 'edged';
  /** An edged road whose art has no usable inner corners: those four are cut from its own floor with the fringe mask. */
  maskedInnerCorners?: boolean;
  /**
   * The scenery: trees (a sprite `w` tiles wide planted every `w` columns and two rows), single tiles (rocks, graves,
   * flowers), or water.
   */
  fill: { kind: 'trees'; w: number } | { kind: 'tiles'; pieces: readonly string[] } | { kind: 'water'; rock?: boolean };
}

const GRASS = { grounds: ['ground', 'ground-2'], deco: 'deco' };
const ROCKS = { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } as const;
const ART: Record<TerrainId, TerrainArt> = {
  route: { art: 'route', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'trees', w: 2 } },
  meadow: { art: 'meadow', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
  lake: { art: 'lake', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'water' } },
  forest: { art: 'forest', grounds: ['ground', 'ground-2'], tall: 'tall', path: 'edged', maskedInnerCorners: true, fill: { kind: 'trees', w: 3 } },
  cave: { art: 'cave', grounds: ['ground', 'ground-2'], path: 'plain', fill: ROCKS },
  coast: { art: 'coast', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'water', rock: true } },
  highland: { art: 'highland', ...GRASS, tall: 'tall', path: 'edged', fill: ROCKS },
  'ice-cave': { art: 'ice-cave', grounds: ['ground', 'ground-2'], path: 'plain', fill: ROCKS },
  plant: { art: 'plant', grounds: ['ground', 'ground-2'], path: 'plain', fill: ROCKS },
  volcano: { art: 'volcano', grounds: ['ground', 'ground-2'], path: 'plain', fill: ROCKS },
  tower: { art: 'tower', filter: 'saturate(0.8) brightness(0.96)', ...GRASS, path: 'plain', fill: ROCKS },
  // One terrain wears a neighbour's tiles under a tint: a scorched grassland is a route burnt brown. FRLG never drew one.
  scorched: { art: 'route', filter: 'sepia(0.75) saturate(1.7) hue-rotate(-28deg)', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'trees', w: 2 } },
  'dank-cave': { art: 'dank-cave', grounds: ['ground', 'ground-2'], path: 'plain', fill: ROCKS },
};

/** The river at the point of no return, and its bridges. */
const RIVER_PIECES = ['water-c', 'water-n', 'water-s', 'water-w', 'water-e', 'water-nw', 'water-ne', 'water-sw', 'water-se', 'water-inw', 'water-ine', 'water-isw', 'water-ise', 'bridge', 'bridge-n', 'bridge-s'];
const EDGE_SUFFIX = ['c', 'n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se', 'inw', 'ine', 'isw', 'ise'];
/** The fringe every masked join is cut with: Route 1's own sand road. */
const MASK_ART = 'route';

/** Every image a terrain grid needs, as `folder/piece`. */
export function piecesFor(terrain: MapTerrain): string[] {
  const used = new Set<TerrainId>();
  for (const row of terrain.cells) for (const c of row) used.add(c.t);
  const out = new Set<string>(EDGE_SUFFIX.map((s) => `${MASK_ART}/path-${s}`));
  for (const t of used) {
    const a = ART[t];
    for (const g of a.grounds) out.add(`${a.art}/${g}`);
    if (a.deco) out.add(`${a.art}/${a.deco}`);
    if (a.tall) out.add(`${a.art}/${a.tall}`);
    if (a.path === 'plain') out.add(`${a.art}/path`);
    else for (const s of EDGE_SUFFIX) out.add(`${a.art}/path-${s}`);
    if (a.fill.kind === 'trees') out.add(`${a.art}/tree`);
    if (a.fill.kind === 'tiles') for (const p of a.fill.pieces) out.add(`${a.art}/${p}`);
    if (a.fill.kind === 'water') for (const s of [...EDGE_SUFFIX, ...(a.fill.rock ? ['rock'] : [])]) out.add(`${a.art}/water-${s}`);
  }
  if (terrain.river) for (const p of RIVER_PIECES) out.add(`river/${p}`);
  return [...out];
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();
/** Load one piece; a piece that is missing resolves to null and is simply not drawn. */
function load(key: string): Promise<HTMLImageElement | null> {
  let p = cache.get(key);
  if (!p) {
    p = new Promise((done) => {
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => done(null);
      const [folder, piece] = key.split('/') as [string, string];
      img.src = routeArt(folder, piece);
    });
    cache.set(key, p);
  }
  return p;
}

export async function loadPieces(keys: string[]): Promise<Map<string, HTMLImageElement>> {
  const out = new Map<string, HTMLImageElement>();
  await Promise.all(keys.map(async (k) => {
    const img = await load(k);
    if (img) out.set(k, img);
  }));
  return out;
}

type Mask = (x: number, y: number) => boolean;
type Source = HTMLImageElement | HTMLCanvasElement;

const canvasOf = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/**
 * An autotile, a quarter at a time: each 8-px quarter of the tile looks at the two neighbours on its side and the
 * diagonal between them, and copies the same quarter of the piece that matches — centre, an edge, an outer corner,
 * or an inner corner where the diagonal alone is missing.
 */
function drawAuto(ctx: CanvasRenderingContext2D, img: (suffix: string) => Source | undefined, mask: Mask, x: number, y: number): void {
  const H = TILE / 2;
  for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const dx = qx ? 1 : -1;
    const dy = qy ? 1 : -1;
    const v = mask(x, y + dy);
    const h = mask(x + dx, y);
    const d = mask(x + dx, y + dy);
    const ns = qy ? 's' : 'n';
    const we = qx ? 'e' : 'w';
    const suffix = v && h ? (d ? 'c' : `i${ns}${we}`) : v ? we : h ? ns : `${ns}${we}`;
    const piece = img(suffix) ?? img('c');
    if (piece) ctx.drawImage(piece, qx * H, qy * H, H, H, x * TILE + qx * H, y * TILE + qy * H, H, H);
  }
}

/**
 * The painter: every image it draws is baked once — the tint applied, a masked join composed — and cached by key, so
 * a 140 × 28 map is a few hundred small canvases and a few thousand plain copies.
 */
class Painter {
  private baked = new Map<string, Source | undefined>();
  /** Per fringe suffix, which pixels of Route 1's sand-road tile are road (2), its outline (1), or verge (0). */
  private masks = new Map<string, Uint8Array>();

  constructor(private pieces: Map<string, HTMLImageElement>) {
    const sand = this.pixels(pieces.get(`${MASK_ART}/path-c`));
    const palette = new Set<number>();
    if (sand) for (let i = 0; i < sand.length; i += 4) palette.add((sand[i]! << 16) | (sand[i + 1]! << 8) | sand[i + 2]!);
    for (const s of EDGE_SUFFIX) {
      const px = this.pixels(pieces.get(`${MASK_ART}/path-${s}`));
      if (!px) continue;
      const m = new Uint8Array(TILE * TILE);
      for (let i = 0; i < m.length; i++) {
        const [r, g, b] = [px[i * 4]!, px[i * 4 + 1]!, px[i * 4 + 2]!];
        // Sand is road; anything greener than it is red is the grass verge; the rest is the tan line between them.
        m[i] = palette.has((r << 16) | (g << 8) | b) ? 2 : g > r ? 0 : 1;
      }
      this.masks.set(s, m);
    }
  }

  private pixels(img: HTMLImageElement | undefined): Uint8ClampedArray | null {
    if (!img) return null;
    const c = canvasOf(TILE, TILE);
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, TILE, TILE).data;
  }

  /** A terrain's piece with its tint baked in. */
  piece(t: TerrainId, name: string): Source | undefined {
    const a = ART[t];
    const key = `${t}:${name}`;
    if (!this.baked.has(key)) {
      const img = this.pieces.get(`${a.art}/${name}`);
      if (!img || !a.filter) this.baked.set(key, img);
      else {
        const c = canvasOf(img.width, img.height);
        const ctx = c.getContext('2d')!;
        ctx.filter = a.filter;
        ctx.drawImage(img, 0, 0);
        this.baked.set(key, c);
      }
    }
    return this.baked.get(key);
  }

  raw(key: string): Source | undefined {
    return this.pieces.get(key);
  }

  /**
   * A join cut with the fringe: `inside` where the fringe has road, `outside` where it has verge, and the inside
   * darkened along the line between them — the outline a FRLG edge always has.
   */
  joined(inside: Source | undefined, outside: Source | undefined, suffix: string, key: string): Source | undefined {
    const k = `join:${key}:${suffix}`;
    if (this.baked.has(k)) return this.baked.get(k);
    const mask = this.masks.get(suffix);
    if (!inside || !outside || !mask) {
      this.baked.set(k, inside);
      return inside;
    }
    const c = canvasOf(TILE, TILE);
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(inside, 0, 0, TILE, TILE, 0, 0, TILE, TILE);
    const a = ctx.getImageData(0, 0, TILE, TILE);
    ctx.clearRect(0, 0, TILE, TILE);
    ctx.drawImage(outside, 0, 0, TILE, TILE, 0, 0, TILE, TILE);
    const b = ctx.getImageData(0, 0, TILE, TILE);
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 0) continue;
      const shade = mask[i] === 1 ? 0.5 : 1;
      for (let ch = 0; ch < 3; ch++) b.data[i * 4 + ch] = Math.round(a.data[i * 4 + ch]! * shade);
      b.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(b, 0, 0);
    this.baked.set(k, c);
    return c;
  }
}

/** A tile's open ground, by its hash: under a road, the ground the road crosses (`g`), not the road's own. */
const groundOf = (P: Painter, c: TerrainCell) => {
  const t = c.g ?? c.t;
  const a = ART[t];
  return P.piece(t, a.grounds[c.n < 0.86 ? 0 : 1]!) ?? P.piece(t, a.grounds[0]!);
};
/** The terrain a tile's open ground belongs to. */
const groundTerrain = (c: TerrainCell): TerrainId => c.g ?? c.t;

/** §2.5.4 — paint the whole terrain onto a canvas (w × h tiles at 16 px). */
export function paintTerrain(canvas: HTMLCanvasElement, terrain: MapTerrain, pieces: Map<string, HTMLImageElement>): void {
  canvas.width = terrain.w * TILE;
  canvas.height = terrain.h * TILE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const P = new Painter(pieces);
  const at = (x: number, y: number): TerrainCell | undefined => terrain.cells[y]?.[x];
  // Off the edge of the map counts as more of the same, so nothing draws a rim along the border.
  const isPath: Mask = (x, y) => {
    const c = at(x, y);
    return !c || c.k === 'path' || c.k === 'bridge';
  };
  const draw = (img: Source | undefined, x: number, y: number) => {
    if (img) ctx.drawImage(img, x * TILE, y * TILE);
  };

  // Which terrain rounds over which where two meet: the road is underneath, the first lane over it, the second over
  // both — a lane's ground is the one that reaches into its neighbour.
  const rank = new Map<TerrainId, number>();
  for (let y = 0; y < terrain.h; y++) for (let x = 0; x < terrain.w; x++) if (!rank.has(groundTerrain(terrain.cells[y]![x]!))) rank.set(groundTerrain(terrain.cells[y]![x]!), rank.size);
  for (const t of Object.keys(ART) as TerrainId[]) if (!rank.has(t)) rank.set(t, rank.size);

  // 1 — ground, with a fringe wherever this terrain meets one beneath it.
  for (let y = 0; y < terrain.h; y++) {
    for (let x = 0; x < terrain.w; x++) {
      const c = at(x, y)!;
      if (c.k === 'river' || c.k === 'bridge') continue;
      const mine = rank.get(groundTerrain(c))!;
      let under: TerrainCell | undefined;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const o = at(x + dx, y + dy);
        if (o && o.k !== 'river' && o.k !== 'bridge' && rank.get(groundTerrain(o))! < mine && (!under || rank.get(groundTerrain(o))! < rank.get(groundTerrain(under))!)) under = o;
      }
      if (!under) {
        draw(groundOf(P, c), x, y);
        continue;
      }
      const ground = groundOf(P, c);
      const below = groundOf(P, { ...under, n: c.n });
      const inside: Mask = (mx, my) => {
        const o = at(mx, my);
        return !o || o.k === 'river' || o.k === 'bridge' || rank.get(groundTerrain(o))! >= mine;
      };
      drawAuto(ctx, (s) => P.joined(ground, below, s, `${groundTerrain(c)}/${groundTerrain(under)}/${c.n < 0.86 ? 0 : 1}`), inside, x, y);
    }
  }

  // 2 — paths: a road with its own fringe, or a floor cut to the fringe mask over the ground beside it.
  for (let y = 0; y < terrain.h; y++) {
    for (let x = 0; x < terrain.w; x++) {
      const c = at(x, y)!;
      if (c.k !== 'path') continue;
      const a = ART[c.t];
      const floor = P.piece(c.t, a.path === 'plain' ? 'path' : 'path-c');
      if (a.path === 'edged' && !c.g) drawAuto(ctx, (s) => (a.maskedInnerCorners && s.startsWith('i') ? P.joined(floor, groundOf(P, c), s, `${c.t}/inner`) : P.piece(c.t, `path-${s}`)), isPath, x, y);
      else drawAuto(ctx, (s) => P.joined(floor, groundOf(P, c), s, `${c.t}/path/${groundTerrain(c)}/${c.n < 0.86 ? 0 : 1}`), isPath, x, y);
    }
  }

  // Water is a body or nothing: a tile that no 2 × 2 of water contains is a puddle or a one-tile strip — drawn as rim
  // on rim — so it stays ground, and the bodies' rims are drawn against what is left.
  const wet = (x: number, y: number) => {
    const o = at(x, y);
    return !!o && o.k === 'fill' && ART[o.t].fill.kind === 'water';
  };
  const body = Array.from({ length: terrain.h }, () => new Uint8Array(terrain.w));
  for (let y = 0; y + 1 < terrain.h; y++)
    for (let x = 0; x + 1 < terrain.w; x++)
      if (wet(x, y) && wet(x + 1, y) && wet(x, y + 1) && wet(x + 1, y + 1)) body[y]![x] = body[y]![x + 1] = body[y + 1]![x] = body[y + 1]![x + 1] = 1;
  const isWater = (x: number, y: number) => !!body[y]?.[x];

  // 3 — tall grass, the odd flower by the road, single-tile scenery and water.
  for (let y = 0; y < terrain.h; y++) {
    for (let x = 0; x < terrain.w; x++) {
      const c = at(x, y)!;
      const a = ART[c.t];
      if (c.k === 'tall' && a.tall) draw(P.piece(c.t, a.tall), x, y);
      else if (c.k === 'ground' && a.deco && c.n > 0.95 && (isPath(x + 1, y) || isPath(x - 1, y) || isPath(x, y + 1) || isPath(x, y - 1))) draw(P.piece(c.t, a.deco), x, y);
      else if (c.k === 'fill' && a.fill.kind === 'tiles') draw(P.piece(c.t, a.fill.pieces[Math.min(a.fill.pieces.length - 1, Math.floor(c.m * a.fill.pieces.length))]!), x, y);
      else if (c.k === 'fill' && a.fill.kind === 'water') {
        const fill = a.fill;
        if (!isWater(x, y)) continue;
        // The rim reads the same mask the bodies were found with, so a body that ends where a puddle was dropped
        // still gets its edge.
        const water: Mask = (mx, my) => !at(mx, my) || (isWater(mx, my) && at(mx, my)!.t === c.t);
        drawAuto(ctx, (s) => P.piece(c.t, `water-${s}`), water, x, y);
        // A rock in open water now and then, where the terrain has one (the coast's).
        if (fill.rock && c.n > 0.93 && water(x - 1, y) && water(x + 1, y) && water(x, y - 1) && water(x, y + 1)) draw(P.piece(c.t, 'water-rock'), x, y);
      }
    }
  }

  // 4 — trees, top row first, so each crown stands over the trunk of the tree above it. A tree is planted where its
  // two-row plot is mostly scenery and none of it is road or tall grass; its crown reaches one row above the plot.
  for (let by = 0; by < terrain.h; by += 2) {
    for (let x = 0; x < terrain.w; x++) {
      const c = at(x, by)!;
      const a = ART[c.t];
      if (a.fill.kind !== 'trees') continue;
      const w = a.fill.w;
      if (x % w !== 0) continue;
      let filled = 0;
      let clear = true;
      for (let j = 0; j < 2; j++) for (let i = 0; i < w; i++) {
        const o = at(x + i, by + j);
        if (!o) continue;
        // The whole plot is this terrain's: a route tree does not take root in a cave.
        if ((o.k !== 'fill' && o.k !== 'ground') || o.t !== c.t) clear = false;
        else if (o.k === 'fill' && ART[o.t].fill.kind === 'trees') filled++;
      }
      if (!clear || filled < Math.ceil((w * 2 * 2) / 3)) continue;
      const tree = P.piece(c.t, 'tree');
      if (tree) ctx.drawImage(tree, x * TILE, (by + 2) * TILE - tree.height);
    }
  }

  // 5 — the river at the point of no return, and a bridge wherever a path crosses it.
  if (terrain.river) {
    const water: Mask = (x, y) => {
      const c = at(x, y);
      return !c || c.k === 'river' || c.k === 'bridge';
    };
    for (let y = 0; y < terrain.h; y++) {
      for (let x = terrain.river.x0; x < terrain.river.x1; x++) {
        const c = at(x, y)!;
        drawAuto(ctx, (s) => P.raw(`river/water-${s}`), water, x, y);
        if (c.k !== 'bridge') continue;
        const up = at(x, y - 1)?.k === 'bridge';
        const down = at(x, y + 1)?.k === 'bridge';
        draw(P.raw(!up ? 'river/bridge-n' : !down ? 'river/bridge-s' : 'river/bridge') ?? P.raw('river/bridge'), x, y);
      }
    }
  }
}

/** A piece's average colour, for the strip: the tile drawn into one pixel. */
function averageOf(img: Source | undefined): string | null {
  if (!img) return null;
  const c = canvasOf(1, 1);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, 1, 1);
  const [r, g, b, alpha] = ctx.getImageData(0, 0, 1, 1).data;
  return alpha ? `rgb(${r}, ${g}, ${b})` : null;
}

/**
 * §9.3 — the strip under the board: the whole route one pixel a tile, each tile the average colour of the piece it
 * is drawn with, so the strip is the same map in miniature — crisp blocks rather than a shrunk, smeared picture.
 */
export function paintStrip(canvas: HTMLCanvasElement, terrain: MapTerrain, pieces: Map<string, HTMLImageElement>): void {
  canvas.width = terrain.w;
  canvas.height = terrain.h;
  const ctx = canvas.getContext('2d')!;
  const P = new Painter(pieces);
  const memo = new Map<string, string | null>();
  const colour = (t: TerrainId, name: string) => {
    const key = `${t}:${name}`;
    if (!memo.has(key)) memo.set(key, averageOf(name.startsWith('river/') ? P.raw(name) : P.piece(t, name)));
    return memo.get(key) ?? null;
  };
  for (let y = 0; y < terrain.h; y++) {
    for (let x = 0; x < terrain.w; x++) {
      const c = terrain.cells[y]![x]!;
      const a = ART[c.t];
      const name = c.k === 'river' ? 'river/water-c'
        : c.k === 'bridge' ? 'river/bridge'
        : c.k === 'path' ? (a.path === 'plain' ? 'path' : 'path-c')
        : c.k === 'tall' ? (a.tall ?? a.grounds[0]!)
        : c.k === 'fill' ? (a.fill.kind === 'trees' ? 'tree' : a.fill.kind === 'water' ? 'water-c' : a.fill.pieces[0]!)
        : a.grounds[0]!;
      const fill = colour(c.t, name);
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

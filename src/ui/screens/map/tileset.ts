import { routeArt } from '@/ui/art';
import type { CellKind, MapTerrain, TerrainCell, TerrainId } from './terrain';

// §2.5.4 / §9.3 — how each terrain is drawn: which of its FRLG tiles (`npm run art:route`) stand for open ground,
// the path, the scenery and the tall grass, and the drawing itself — one pass over the terrain grid onto a canvas at
// the art's own 16 px a tile. The screen scales the canvas, pixelated, so a FRLG pixel stays a block.
//
// Two of the pieces are autotiles, drawn a quarter-tile at a time from a tile's neighbours (the way RPG Maker draws
// its ground): a sand road with its grass fringe (`path-*`), and water with its rim (`water-*`). That is what lets a
// road turn a corner or a pond take any shape with nine tiles and four inner corners.

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
  /** The path: one floor tile, or a road with its fringe (`path-*` autotile). */
  path: 'plain' | 'edged';
  /** The scenery: a block that tiles (a tree wall, a canopy), single tiles (rocks, graves, flowers), or water. */
  fill: { kind: 'block'; w: number; h: number } | { kind: 'tiles'; pieces: string[] } | { kind: 'water'; rock?: boolean };
}

const GRASS = { grounds: ['ground', 'ground-2'], deco: 'deco' };
const ART: Record<TerrainId, TerrainArt> = {
  route: { art: 'route', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'block', w: 2, h: 2 } },
  meadow: { art: 'meadow', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
  lake: { art: 'lake', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'water' } },
  forest: { art: 'forest', grounds: ['ground', 'ground-2'], tall: 'tall', path: 'edged', fill: { kind: 'block', w: 3, h: 2 } },
  cave: { art: 'cave', grounds: ['ground', 'ground-2'], path: 'plain', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
  coast: { art: 'coast', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'water', rock: true } },
  highland: { art: 'highland', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
  'ice-cave': { art: 'ice-cave', grounds: ['ground', 'ground-2'], path: 'plain', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
  plant: { art: 'plant', grounds: ['ground', 'ground-2'], path: 'plain', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
  volcano: { art: 'volcano', grounds: ['ground', 'ground-2'], path: 'plain', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
  tower: { art: 'tower', filter: 'saturate(0.8) brightness(0.96)', ...GRASS, path: 'plain', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
  // Two terrains wear a neighbour's tiles under a tint: a scorched grassland is a route burnt brown, and a dank cave
  // is a cave gone purple — §2.5.4's "pools gone purple".
  scorched: { art: 'route', filter: 'sepia(0.75) saturate(1.7) hue-rotate(-28deg)', ...GRASS, tall: 'tall', path: 'edged', fill: { kind: 'block', w: 2, h: 2 } },
  'dank-cave': { art: 'cave', filter: 'hue-rotate(235deg) saturate(1.4)', grounds: ['ground', 'ground-2'], path: 'plain', fill: { kind: 'tiles', pieces: ['fill', 'fill-2', 'fill-3'] } },
};

/** The river at the point of no return, and its bridges. */
const RIVER_PIECES = ['water-c', 'water-n', 'water-s', 'water-w', 'water-e', 'water-nw', 'water-ne', 'water-sw', 'water-se', 'bridge', 'bridge-n', 'bridge-s'];
const EDGE_SUFFIX = ['c', 'n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se', 'inw', 'ine', 'isw', 'ise'];

/** Every image a terrain grid needs, as `folder/piece`. */
export function piecesFor(terrain: MapTerrain): string[] {
  const used = new Set<TerrainId>();
  for (const row of terrain.cells) for (const c of row) used.add(c.t);
  const out = new Set<string>();
  for (const t of used) {
    const a = ART[t];
    for (const g of a.grounds) out.add(`${a.art}/${g}`);
    if (a.deco) out.add(`${a.art}/${a.deco}`);
    if (a.tall) out.add(`${a.art}/${a.tall}`);
    if (a.path === 'plain') out.add(`${a.art}/path`);
    else for (const s of EDGE_SUFFIX) out.add(`${a.art}/path-${s}`);
    if (a.fill.kind === 'block') out.add(`${a.art}/fill-block`);
    if (a.fill.kind === 'tiles') for (const p of a.fill.pieces) out.add(`${a.art}/${p}`);
    if (a.fill.kind === 'water') for (const s of [...EDGE_SUFFIX.slice(0, 9), ...(a.fill.rock ? ['rock'] : [])]) out.add(`${a.art}/water-${s}`);
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

/**
 * An autotile, a quarter at a time: each 8-px quarter of the tile looks at the two neighbours on its side and the
 * diagonal between them, and copies the same quarter of the piece that matches — centre, an edge, an outer corner,
 * or an inner corner where the diagonal alone is missing.
 */
function drawAuto(ctx: CanvasRenderingContext2D, img: (suffix: string) => HTMLImageElement | undefined, mask: Mask, x: number, y: number): void {
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

/** §2.5.4 — paint the whole terrain onto a canvas (w × h tiles at 16 px). */
export function paintTerrain(canvas: HTMLCanvasElement, terrain: MapTerrain, pieces: Map<string, HTMLImageElement>): void {
  canvas.width = terrain.w * TILE;
  canvas.height = terrain.h * TILE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const at = (x: number, y: number): TerrainCell | undefined => terrain.cells[y]?.[x];
  const is = (k: CellKind | CellKind[]) => (x: number, y: number) => {
    const c = at(x, y);
    // Off the edge of the map counts as more of the same, so a road or a pond does not draw a rim along the border.
    if (!c) return true;
    return Array.isArray(k) ? k.includes(c.k) : c.k === k;
  };
  const isPath = is(['path', 'bridge']);
  const piece = (key: string) => pieces.get(key);

  // One terrain at a time, so a tint is set once rather than once per tile.
  const byTerrain = new Map<TerrainId, [number, number][]>();
  for (let y = 0; y < terrain.h; y++) for (let x = 0; x < terrain.w; x++) {
    const c = terrain.cells[y]![x]!;
    if (c.k === 'river' || c.k === 'bridge') continue;
    byTerrain.set(c.t, [...(byTerrain.get(c.t) ?? []), [x, y]]);
  }
  for (const [t, cells] of byTerrain) {
    const a = ART[t];
    ctx.filter = a.filter ?? 'none';
    const p = (name: string) => piece(`${a.art}/${name}`);
    const blocksDrawn = new Set<string>();
    const sameFill: Mask = (x, y) => {
      const c = at(x, y);
      return !c || (c.k === 'fill' && c.t === t);
    };
    // Ground first, everywhere, so nothing drawn on top (a tree two tiles wide) is painted over by a neighbour's ground.
    for (const [x, y] of cells) {
      const c = terrain.cells[y]![x]!;
      const ground = p(a.grounds[c.n < 0.86 ? 0 : 1]!) ?? p(a.grounds[0]!);
      if (ground) ctx.drawImage(ground, x * TILE, y * TILE);
    }
    for (const [x, y] of cells) {
      const c = terrain.cells[y]![x]!;
      if (c.k === 'path') {
        if (a.path === 'plain') {
          const floor = p('path');
          if (floor) ctx.drawImage(floor, x * TILE, y * TILE);
        } else drawAuto(ctx, (s) => p(`path-${s}`), isPath, x, y);
      } else if (c.k === 'tall') {
        const tall = p(a.tall ?? '');
        if (tall) ctx.drawImage(tall, x * TILE, y * TILE);
      } else if (c.k === 'ground') {
        if (a.deco && c.n > 0.95 && (isPath(x + 1, y) || isPath(x - 1, y) || isPath(x, y + 1) || isPath(x, y - 1))) {
          const deco = p(a.deco);
          if (deco) ctx.drawImage(deco, x * TILE, y * TILE);
        }
      } else if (c.k === 'fill') {
        if (a.fill.kind === 'water') {
          drawAuto(ctx, (s) => p(`water-${s}`), sameFill, x, y);
          // A rock in open water now and then, where the terrain has one (the coast's).
          const rock = a.fill.rock ? p('water-rock') : undefined;
          if (rock && c.n > 0.93 && sameFill(x - 1, y) && sameFill(x + 1, y) && sameFill(x, y - 1) && sameFill(x, y + 1)) ctx.drawImage(rock, x * TILE, y * TILE);
        }
        else if (a.fill.kind === 'tiles') {
          const pick = p(a.fill.pieces[Math.floor(c.n * a.fill.pieces.length)]!);
          if (pick) ctx.drawImage(pick, x * TILE, y * TILE);
        } else {
          // A block (a tree wall, a canopy) is drawn whole where its whole footprint is scenery of this terrain,
          // aligned to the map's own grid so neighbouring blocks tile into one wood.
          const { w, h } = a.fill;
          const [bx, by] = [x - (x % w), y - (y % h)];
          const key = `${bx},${by}`;
          if (blocksDrawn.has(key)) continue;
          // Drawn where most of its footprint is scenery and none of it is path or tall grass: a wood with a clean edge
          // rather than a ragged one.
          let filled = 0;
          let clear = true;
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const b = at(bx + i, by + j);
            if (!b || b.t !== t || (b.k !== 'fill' && b.k !== 'ground')) clear = false;
            else if (b.k === 'fill') filled++;
          }
          const whole = clear && filled >= Math.ceil((w * h * 2) / 3);
          if (whole) {
            blocksDrawn.add(key);
            const block = p('fill-block');
            if (block) ctx.drawImage(block, bx * TILE, by * TILE);
          }
        }
      }
    }
  }
  ctx.filter = 'none';

  // §2.5.4 — the river at the point of no return, and a bridge wherever a path crosses it.
  if (terrain.river) {
    const water: Mask = (x, y) => {
      const c = at(x, y);
      return !c || c.k === 'river' || c.k === 'bridge';
    };
    for (let y = 0; y < terrain.h; y++) {
      for (let x = terrain.river.x0; x < terrain.river.x1; x++) {
        const c = at(x, y)!;
        drawAuto(ctx, (s) => piece(`river/water-${s}`), water, x, y);
        if (c.k !== 'bridge') continue;
        const up = at(x, y - 1)?.k === 'bridge';
        const down = at(x, y + 1)?.k === 'bridge';
        const plank = piece(!up ? 'river/bridge-n' : !down ? 'river/bridge-s' : 'river/bridge') ?? piece('river/bridge');
        if (plank) ctx.drawImage(plank, x * TILE, y * TILE);
      }
    }
  }
}

/** A piece's average colour, for the strip: the tile drawn into one pixel. */
function averageOf(img: HTMLImageElement | undefined): string | null {
  if (!img) return null;
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * §9.3 — the strip under the board: the whole route one pixel a tile, each tile the average colour of the piece it
 * is drawn with, so the strip is the same map in miniature — crisp blocks rather than a shrunk, smeared picture.
 */
export function paintStrip(canvas: HTMLCanvasElement, terrain: MapTerrain, pieces: Map<string, HTMLImageElement>): void {
  canvas.width = terrain.w;
  canvas.height = terrain.h;
  const ctx = canvas.getContext('2d')!;
  const memo = new Map<string, string | null>();
  const colour = (key: string) => {
    if (!memo.has(key)) memo.set(key, averageOf(pieces.get(key)));
    return memo.get(key) ?? null;
  };
  for (let y = 0; y < terrain.h; y++) {
    for (let x = 0; x < terrain.w; x++) {
      const c = terrain.cells[y]![x]!;
      const a = ART[c.t];
      const key = c.k === 'river' ? 'river/water-c'
        : c.k === 'bridge' ? 'river/bridge'
        : c.k === 'path' ? `${a.art}/${a.path === 'plain' ? 'path' : 'path-c'}`
        : c.k === 'tall' ? `${a.art}/${a.tall ?? a.grounds[0]}`
        : c.k === 'fill' ? `${a.art}/${a.fill.kind === 'block' ? 'fill-block' : a.fill.kind === 'water' ? 'water-c' : a.fill.pieces[0]}`
        : `${a.art}/${a.grounds[0]}`;
      const fill = colour(key);
      if (!fill) continue;
      ctx.filter = a.filter ?? 'none';
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.filter = 'none';
}

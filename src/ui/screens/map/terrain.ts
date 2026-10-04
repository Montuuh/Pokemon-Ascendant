import { gymById, type MapNode, type RegionMap } from '@/sim';

// §2.5.4 — the route's terrain: a pure function of the map that lays a tile grid under the nodes. It says *what*
// each tile is (the road, a path, the scenery between two routes, tall grass, the river at the point of no
// return) and *which terrain* it belongs to; `tileset.ts` says how each of those is drawn. The same map always
// paints the same terrain — every "random" choice here is a hash of the map's seed and the tile.
//
// The route runs left to right: a column of the map is COL_TILES tiles wide, a row of the map's grid ROW_TILES
// tiles tall. Paths are two tiles wide and turn at right angles, the way FireRed / LeafGreen draw a route: an
// edge leaves its node to the right, turns halfway to the next column, and walks into the next node level.

/** Tiles per map column (left to right) and per map row (top to bottom). */
export const COL_TILES = 7;
export const ROW_TILES = 2;
/** The scenery framing the route: tiles left and right of the first and last column, above and below the rows. */
export const MARGIN_X = 5;
export const MARGIN_Y = 3;
/** Where an edge turns: this many tiles right of the node it leaves. */
const TURN = 3;

/** §2.5.4 — the looks a stretch of route can have: a Region's road, or a Gym's terrain. */
export type TerrainId =
  | 'route' | 'coast' | 'highland'
  | 'meadow' | 'forest' | 'cave' | 'dank-cave' | 'ice-cave' | 'lake' | 'plant' | 'volcano' | 'scorched' | 'tower';

/** §2.13 — each Region's road: the trunk and the Y's middle track. */
export const ROAD: readonly TerrainId[] = ['route', 'coast', 'highland'];

/** §2.5.4 — a lane's terrain, by its Gym's type. */
export const TERRAIN_BY_TYPE: Readonly<Record<string, TerrainId>> = {
  rock: 'cave',
  fighting: 'cave',
  poison: 'dank-cave',
  ice: 'ice-cave',
  water: 'lake',
  electric: 'plant',
  ground: 'volcano',
  bug: 'forest',
  normal: 'meadow',
  grass: 'meadow',
  fire: 'scorched',
  psychic: 'tower',
};

/**
 * How much of a terrain's open ground is scenery (trees, rock, water…) once it is two tiles from any path. A cave
 * is mostly rock and a lake mostly water; a meadow is mostly open, which is what makes it a meadow.
 */
const FILL_DENSITY: Readonly<Record<TerrainId, number>> = {
  route: 0.5, coast: 0.55, highland: 0.5,
  meadow: 0.4, forest: 0.8, cave: 0.5, 'dank-cave': 0.5, 'ice-cave': 0.5, lake: 0.75, plant: 0.5, volcano: 0.5, scorched: 0.45, tower: 0.45,
};

/**
 * What a tile is. `ground` is open ground, `path` the route, `fill` scenery you cannot walk (the terrain decides
 * what: a tree, a rock, water), `tall` tall grass round a Wild node, `river` the point of no return's water and
 * `bridge` where a path crosses it.
 */
export type CellKind = 'ground' | 'path' | 'fill' | 'tall' | 'river' | 'bridge';

export interface TerrainCell {
  /** The terrain this tile is drawn in. */
  t: TerrainId;
  k: CellKind;
  /** A stable hash in [0, 1), for picking among a terrain's variants without a pattern showing. */
  n: number;
  /** Coarse noise in [0, 1): neighbours share it, so a clump of scenery is one kind (a flower bed, a rockfall). */
  m: number;
  /**
   * On a road tile: the terrain of the open ground under and beside it, where it differs from the road's own — a cave
   * road crossing a meadow is cut against the meadow, not against a cave floor that is not there.
   */
  g?: TerrainId;
}

/** §2.5.4 — a lane's stretch, for the weather drawn over it: tiles, inclusive-exclusive. */
export interface LaneZone {
  lane: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface MapTerrain {
  /** Size in tiles. */
  w: number;
  h: number;
  /** `cells[y][x]`. */
  cells: TerrainCell[][];
  /** Each node's centre, in tiles (a node sits on the corner where four path tiles meet). */
  at: Record<string, { x: number; y: number }>;
  /** Each edge's polyline, in tiles, keyed `from>to`. The screen draws the edge along it. */
  edges: Record<string, { x: number; y: number }[]>;
  /** The two lanes' stretches, past the point of no return. */
  lanes: LaneZone[];
  /** The point of no return's river, in tile columns, or null on a map without one. */
  river: { x0: number; x1: number } | null;
}

/** A stable hash of a tile and the map's seed, in [0, 1). */
export function cellHash(seed: number, x: number, y: number, salt = 0): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (x + 0x7f4a7c15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (y + 0x2c1b3c6d + salt * 0x1000193), 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2d) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Value noise: smooth blobs about `scale` tiles across, so scenery comes in clumps rather than salt and pepper. */
function blob(seed: number, x: number, y: number, scale: number, salt: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const [x0, y0] = [Math.floor(fx), Math.floor(fy)];
  const [tx, ty] = [fx - x0, fy - y0];
  const s = (t: number) => t * t * (3 - 2 * t);
  const v = (i: number, j: number) => cellHash(seed, x0 + i, y0 + j, salt);
  const a = v(0, 0) + (v(1, 0) - v(0, 0)) * s(tx);
  const b = v(0, 1) + (v(1, 1) - v(0, 1)) * s(tx);
  return a + (b - a) * s(ty);
}

/** A node's centre, in tiles. */
export const nodeTile = (node: Pick<MapNode, 'layer' | 'row'>) => ({
  x: MARGIN_X + node.layer * COL_TILES,
  y: MARGIN_Y + node.row * ROW_TILES + 1,
});

/** §2.5.4 — an edge as FireRed draws a route: out to the right, a turn halfway, and level into the next node. */
export function edgePolyline(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number }[] {
  if (a.y === b.y) return [a, b];
  const turn = a.x + TURN;
  return [a, { x: turn, y: a.y }, { x: turn, y: b.y }, b];
}

/** The terrain a node's own stretch wears: its lane's, its leaning track's, or the Region's road. */
export function terrainOfNode(map: RegionMap, node: MapNode): TerrainId {
  const side = node.lane ?? node.lean;
  if (side === undefined) return ROAD[Math.min(map.regionIndex, ROAD.length - 1)]!;
  return TERRAIN_BY_TYPE[gymById(map.gyms[side]!).type] ?? 'route';
}

/** §2.5.4 — paint a map. */
export function mapTerrain(map: RegionMap): MapTerrain {
  const nodes = Object.values(map.nodes);
  const w = MARGIN_X * 2 + (map.layers - 1) * COL_TILES;
  const h = MARGIN_Y * 2 + (map.rows - 1) * ROW_TILES + 2;
  const road = ROAD[Math.min(map.regionIndex, ROAD.length - 1)]!;
  const laneTerrain = map.gyms.map((id) => TERRAIN_BY_TYPE[gymById(id).type] ?? road);
  const seed = map.seed * 31 + map.regionIndex;

  const at: MapTerrain['at'] = {};
  for (const n of nodes) at[n.id] = nodeTile(n);

  // The paths: every edge as a two-tile-wide polyline. A segment from (x1, y) to (x2, y) covers the tiles either
  // side of its line, and its ends cover the node blocks.
  const path = Array.from({ length: h }, () => new Uint8Array(w));
  const mark = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < w && y < h) path[y]![x] = 1;
  };
  const edges: MapTerrain['edges'] = {};
  for (const n of nodes) {
    for (const id of n.next) {
      const line = edgePolyline(at[n.id]!, at[id]!);
      edges[`${n.id}>${id}`] = line;
      for (let i = 0; i + 1 < line.length; i++) {
        const [p, q] = [line[i]!, line[i + 1]!];
        for (let x = Math.min(p.x, q.x) - 1; x <= Math.max(p.x, q.x); x++)
          for (let y = Math.min(p.y, q.y) - 1; y <= Math.max(p.y, q.y); y++) mark(x, y);
      }
    }
    // A node is a 2 × 2 block of path even with no edge out of it (a Gym).
    const c = at[n.id]!;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]] as const) mark(c.x + dx, c.y + dy);
  }

  // How far each tile is from the nearest path tile (4-neighbour steps), so scenery keeps its distance.
  const dist = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (path[y]![x] ? 0 : Infinity)));
  const queue: [number, number][] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (path[y]![x]) queue.push([x, y]);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const [nx, ny] = [x + dx, y + dy];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || dist[ny]![nx] !== Infinity) continue;
      dist[ny]![nx] = dist[y]![x]! + 1;
      queue.push([nx, ny]);
    }
  }

  // Which terrain a tile is in. Before the Y it is the road. On the Y the outer thirds blend toward their Gyms'
  // terrains, column by column, in clumps; past the point of no return each lane's half is its Gym's outright.
  const yLayer = map.yLayer ?? map.forkLayer;
  const noReturn = map.forkLayer - 1;
  const xY = MARGIN_X + yLayer * COL_TILES - Math.floor(COL_TILES / 2);
  const xFork = MARGIN_X + noReturn * COL_TILES + TURN + 1;
  const colOf = (x: number) => Math.max(0, Math.min(map.layers - 1, Math.round((x - MARGIN_X) / COL_TILES)));
  const byLayer = new Map<number, MapNode[]>();
  for (const n of nodes) byLayer.set(n.layer, [...(byLayer.get(n.layer) ?? []), n].sort((a, b) => a.row - b.row));
  const tileY = (row: number) => MARGIN_Y + row * ROW_TILES + 1;
  /** The line between two groups of tracks in a column, in tiles: halfway between the last of one and the first of the other. */
  const split = (layer: number, above: (n: MapNode) => boolean, below: (n: MapNode) => boolean): number | null => {
    const col = byLayer.get(layer) ?? [];
    const up = col.filter(above);
    const down = col.filter(below);
    if (!up.length || !down.length) return null;
    return (tileY(up[up.length - 1]!.row) + tileY(down[0]!.row)) / 2;
  };
  /**
   * Which lane's terrain a tile wears, or null for the road. On the Y each outer third turns into its Gym's terrain
   * along one **frontier** — a line that wanders up and down the Y, so the change reads as a coast or a cave mouth you
   * walk into, not as a scatter of patches. Past the river each lane's half is its Gym's. `wobble` lets the line
   * between two stretches meander by a tile on open ground; a path keeps the straight line, so a road never changes
   * material under your feet halfway across.
   */
  const sideOf = (x: number, y: number, wobble: boolean): number | null => {
    if (x < xY) return null;
    const layer = colOf(x);
    const bend = wobble ? (blob(seed, x, 0, 5, 17) - 0.5) * 2.5 : 0;
    if (x >= xFork || layer > noReturn) {
      const line = split(Math.max(layer, noReturn + 1), (n) => n.lane === 0, (n) => n.lane === 1) ?? h / 2;
      return y < line + bend ? 0 : 1;
    }
    const top = split(layer, (n) => n.lean === 0, (n) => n.lean === undefined && n.lane === undefined);
    const bottom = split(layer, (n) => n.lean === undefined && n.lane === undefined, (n) => n.lean === 1);
    const frontier = (lane: number) => xY + (xFork - xY) * (0.1 + 0.55 * blob(seed, lane * 97, y, 4, 23));
    if (top !== null && y < top + bend) return x >= frontier(0) ? 0 : null;
    if (bottom !== null && y >= bottom + bend) return x >= frontier(1) ? 1 : null;
    return null;
  };

  // §2.5.4 — the point of no return's river: two tiles of water across the whole map, between the Y's last
  // column and the lanes, bridged wherever a path crosses it.
  const river = map.yLayer === undefined ? null : { x0: MARGIN_X + noReturn * COL_TILES + TURN + 1, x1: MARGIN_X + noReturn * COL_TILES + TURN + 3 };

  /** The terrain of the nearest node to a road tile: its column's, the row nearest it. */
  const roadTerrain = (x: number, y: number): TerrainId => {
    const col = byLayer.get(colOf(x)) ?? [];
    if (!col.length) return road;
    const near = col.reduce((best, n) => (Math.abs(tileY(n.row) - y) < Math.abs(tileY(best.row) - y) ? n : best), col[0]!);
    return terrainOfNode(map, near);
  };

  // Tall grass round every Wild node — the overworld's own telegraph for "Pokémon live here".
  const tall = Array.from({ length: h }, () => new Uint8Array(w));
  for (const n of nodes) {
    if (n.kind !== 'wild' && n.kind !== 'elite-wild') continue;
    const c = at[n.id]!;
    for (let dy = -3; dy <= 2; dy++) for (let dx = -2; dx <= 1; dx++) {
      const [x, y] = [c.x + dx, c.y + dy];
      if (x >= 0 && y >= 0 && x < w && y < h && !path[y]![x]) tall[y]![x] = 1;
    }
  }

  const cells: TerrainCell[][] = [];
  for (let y = 0; y < h; y++) {
    const row: TerrainCell[] = [];
    for (let x = 0; x < w; x++) {
      // A road wears the terrain of the node it runs from or to — whichever column is nearer — so its material changes
      // once, halfway between two nodes, never under your feet mid-stretch. Open ground follows the frontier.
      const side = sideOf(x, y, true);
      const open = side === null ? road : laneTerrain[side]!;
      const t = path[y]![x] ? roadTerrain(x, y) : open;
      const n = cellHash(seed, x, y);
      const inRiver = river !== null && x >= river.x0 && x < river.x1;
      let k: CellKind;
      if (inRiver) k = path[y]![x] ? 'bridge' : 'river';
      else if (path[y]![x]) k = 'path';
      else if (tall[y]![x]) k = 'tall';
      else {
        // Scenery two tiles off any path, in clumps; the margins are walled in, as a route's edges are.
        const edge = y < MARGIN_Y - 1 || y >= h - MARGIN_Y + 1 || x < 2 || x >= w - 2;
        const far = dist[y]![x]! >= 2;
        // Water comes in bodies, not puddles: its noise is coarser than a wood's or a rockfall's.
        const scale = t === 'lake' || t === 'coast' ? 5 : 3;
        k = edge || (far && blob(seed, x, y, scale, 11) < FILL_DENSITY[t]) ? 'fill' : 'ground';
      }
      row.push({ t, k, n, m: blob(seed, x, y, 3, 29), ...(k === 'path' && open !== t ? { g: open } : {}) });
    }
    cells.push(row);
  }

  // Scenery is a clump or nothing: a lone tree, rock or flower with no scenery beside it is noise, so it goes back to
  // open ground (the walled margins excepted).
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = cells[y]![x]!;
      if (c.k !== 'fill' || y < MARGIN_Y - 1 || y >= h - MARGIN_Y + 1) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => cells[y + dy!]![x + dx!]!.k === 'fill' && cells[y + dy!]![x + dx!]!.t === c.t).length;
      if (near < 2) c.k = 'ground';
    }
  }

  const lanes: LaneZone[] = [];
  if (map.forkLayer < map.layers) {
    const line = split(map.forkLayer, (n) => n.lane === 0, (n) => n.lane === 1) ?? h / 2;
    const x0 = river ? river.x1 : MARGIN_X + (map.forkLayer - 1) * COL_TILES + TURN;
    lanes.push({ lane: 0, x0, x1: w, y0: 0, y1: Math.round(line) }, { lane: 1, x0, x1: w, y0: Math.round(line), y1: h });
  }

  return { w, h, cells, at, edges, lanes, river };
}

import { gymById, type MapNode, type RegionMap } from '@/sim';

// §2.5.4 — the route's terrain: a pure function of the map that lays a tile grid under the nodes. It says *what*
// each tile is (open ground, a landmark's clearing of road, the scenery between two routes, tall grass, the frame and
// the ridge between the lanes, a building's front or a set piece) and *which terrain* it belongs to; `tileset.ts` says
// how each is drawn. The same map always paints the same terrain: every "random" choice is a hash of the seed and the tile.
//
// The route runs left to right: a column of the map is COL_TILES tiles wide, a row of the map's grid ROW_TILES tiles
// tall. An edge is a straight line from node to node (v0.9.14, after Pokelike's map), and the ground along it is kept
// clear of scenery.
//
// v0.9.107 (the route review, 2026-11-09) made the board a FireRed route. **One pixel density**: a tile is 16 px and a
// person 16 × 32, drawn at the same multiple — since v0.9.108 the map has seven rows and the board is about seventeen
// tiles tall, so that multiple is 2 at 720 p and 3 at 1080 p (`RouteView`). The route is **framed** top and bottom by its
// own scenery, the trunk changes biome in **chapters**, fights stand on a **clearing**, the Gym, the nurse and the merchant
// stand at the door of a **whole FRLG building** cut from Pewter City, **set pieces** cut from FRLG's routes (a house, a
// pond, a cottage) stand in the open ground, and every node stands on its grid point, so a track is a level road. The
// point of no return has no river: the lanes' ridge and the Gym-coloured lines into them say it.

/** Tiles per map column (left to right) and per map row (top to bottom). */
export const COL_TILES = 6;
export const ROW_TILES = 2;
/** Tiles left of the first column and right of the last (where the Gym's front stands). */
export const MARGIN_X = 5;
/** Tiles below the last row: its feet's row and the caption under them, over a row of the route's frame. */
export const MARGIN_BOTTOM = 2;
/** How far above its point each kind of picture reaches, in tiles: a person two, a habitat's landmark (drawn a step under
 *  the density, §9.3 — a cave's peak with the grass it stands in) three. A building, its height but its door's row. */
const REACH = { person: 2, habitat: 3, pokemon: 4 } as const;

/** §9.3 — how tall a node's picture stands above its point, in tiles. */
export const reachOf = (node: Pick<MapNode, 'kind'>) => {
  const building = buildingOf(node);
  return building ? BUILDINGS[building].h - 1 : node.kind === 'wild' ? REACH.habitat : node.kind === 'elite-wild' ? REACH.pokemon : REACH.person;
};

/** The margin above the first row, in tiles: enough for the tallest picture standing in the top rows, and one at least. */
export const topMargin = (map: Pick<RegionMap, 'nodes'>) =>
  Math.max(1, ...Object.values(map.nodes).map((n) => Math.ceil(reachOf(n) - (n.row * ROW_TILES + 1))));

/** The route's own height in tiles, before the frame grows to fill the board. */
export const naturalHeight = (map: Pick<RegionMap, 'nodes' | 'rows'>) => topMargin(map) + (map.rows - 1) * ROW_TILES + 1 + MARGIN_BOTTOM;

/** How far either side of an edge's line the ground is kept clear of scenery, in tiles. */
const CORRIDOR = 0.75;
/** Where the lanes part, in tiles right of the point of no return's column: their terrain and their ridge start here. */
const LANE_AT = 3;
/** The ridge between the two lanes: how far either side of the line between them it reaches, in tiles. */
const RIDGE = 1;

/** §2.5.4 — the looks a stretch of route can have: a Region's road, or a Gym's terrain. */
export type TerrainId =
  | 'route' | 'coast' | 'highland'
  | 'meadow' | 'forest' | 'cave' | 'dank-cave' | 'ice-cave' | 'lake' | 'plant' | 'volcano' | 'tower';

/**
 * §2.13 / §2.5.4 — each Region's road, in **chapters** (v0.9.107): the trunk opens in the first and changes into the second
 * past its middle stop, so the Region moves on as you walk it — Region 1's route into the edge of a wood, the coast up
 * onto the cliffs, the highland down to the lava. §2.12 Victory Road is a cave throughout.
 */
export const ROAD: readonly (readonly [TerrainId, TerrainId])[] = [
  ['route', 'forest'],
  ['coast', 'highland'],
  ['highland', 'volcano'],
  ['cave', 'cave'],
];
/** The Region's first chapter: its road where the route begins. */
export const roadOf = (regionIndex: number) => ROAD[Math.min(regionIndex, ROAD.length - 1)]!;

/** §2.5.4 — a lane's terrain, by its Gym's type. Every one is FireRed's own ground (v0.9.107: no tinted stand-ins). */
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
  fire: 'volcano',
  psychic: 'tower',
};

/**
 * How much of a terrain's open ground is scenery (trees, rock, water…) once it is off the routes' lines. A cave
 * is mostly rock and a lake mostly water; a meadow is mostly open, which is what makes it a meadow.
 */
const FILL_DENSITY: Readonly<Record<TerrainId, number>> = {
  route: 0.5, coast: 0.55, highland: 0.5,
  meadow: 0.4, forest: 0.8, cave: 0.5, 'dank-cave': 0.5, 'ice-cave': 0.5, lake: 0.75, plant: 0.5, volcano: 0.5, tower: 0.45,
};

/** §2.5.4 — the terrains whose open ground is FRLG's grass, where a set piece cut from a grass route stands at home. */
const GRASSY: ReadonlySet<TerrainId> = new Set(['route', 'meadow', 'forest', 'coast', 'highland', 'lake']);

/**
 * What a tile is. `ground` is open ground, `path` the route, `fill` scenery you cannot walk (the terrain decides
 * what: a tree, a rock, water), `tall` tall grass round a Wild node, `prop` ground under a building's front or a set piece.
 */
export type CellKind = 'ground' | 'path' | 'fill' | 'tall' | 'prop';

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
  /** §2.5.4 — the Gym whose ground this is (0 or 1: its lane, or its leaning track's blend over the Y), under its field. */
  s?: number;
}

/** §2.5.4 — a lane's stretch, where its field is named: tiles, inclusive-exclusive. */
export interface LaneZone {
  lane: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** §2.5.4 — the FRLG buildings a node stands at the door of (`map/props/<id>.png`), whole, their size in tiles. */
export const BUILDINGS = { gym: { w: 7, h: 5 }, center: { w: 5, h: 5 }, mart: { w: 4, h: 4 } } as const;
export type BuildingId = keyof typeof BUILDINGS;
/** §2.5.4 — the set pieces cut from FRLG's routes and towns (`map/props/<id>.png`), their size in tiles. */
export const SET_PIECES = { house: { w: 5, h: 4 }, pond: { w: 6, h: 4 }, flowers: { w: 6, h: 4 }, cottage: { w: 5, h: 5 } } as const;
export type SetPieceId = keyof typeof SET_PIECES;

export interface MapTerrain {
  /** Size in tiles. */
  w: number;
  h: number;
  /** `cells[y][x]`. */
  cells: TerrainCell[][];
  /** Each node's centre, in tiles (a node sits on the corner where four tiles meet). */
  at: Record<string, { x: number; y: number }>;
  /** Each edge's polyline, in tiles, keyed `from>to`. The screen draws the edge along it. */
  edges: Record<string, { x: number; y: number }[]>;
  /** The two lanes' stretches, past the point of no return: where each names its field. */
  lanes: LaneZone[];
  /** The rows of the frame: scenery from row 0 up to `top` (exclusive), and from `bottom` to the last row. */
  frame: { top: number; bottom: number };
  /** The buildings, each standing over its node's point (`x`, `y`: the node's point; the building's foot is a row lower). */
  buildings: { id: BuildingId; node: string; x: number; y: number }[];
  /** The set pieces, by their top-left tile. */
  pieces: { id: SetPieceId; x: number; y: number }[];
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

/** A node's grid point, in tiles, under a top margin of `top` tiles (`topMargin` of its map). */
export const nodeTile = (node: Pick<MapNode, 'layer' | 'row'>, top: number) => ({
  x: MARGIN_X + node.layer * COL_TILES,
  y: top + node.row * ROW_TILES + 1,
});

/** §2.5.4 — the stop column where the trunk's second chapter begins: its middle stop (column 5 or 6), or none. */
function chapterLayer(map: RegionMap): number | null {
  const stops = new Set(['aid', 'merchant', 'mystery', 'cache', 'trader']);
  const yLayer = map.yLayer ?? map.forkLayer;
  for (let layer = 4; layer < yLayer; layer++) {
    const col = Object.values(map.nodes).filter((n) => n.layer === layer);
    if (col.length && col.every((n) => stops.has(n.kind))) return layer;
  }
  return null;
}

/** The terrain a node's own stretch wears: its lane's, its leaning track's, or the Region's road in its chapter. */
export function terrainOfNode(map: RegionMap, node: MapNode): TerrainId {
  const side = node.lane ?? node.lean;
  const [first, second] = roadOf(map.regionIndex);
  if (side === undefined) {
    const at = chapterLayer(map);
    return at !== null && node.layer > at ? second : first;
  }
  return TERRAIN_BY_TYPE[gymById(map.gyms[side]!).type] ?? first;
}

/** §2.5.4 — the building a node stands at: the Gym its own, the nurse a Pokémon Center's, the merchant a Poké Mart's. */
export const buildingOf = (node: Pick<MapNode, 'kind'>): BuildingId | null =>
  node.kind === 'gym' ? 'gym' : node.kind === 'aid' ? 'center' : node.kind === 'merchant' ? 'mart' : null;

/** Points along a polyline every quarter tile, for whatever must follow a line (its corridor). */
function along(points: readonly { x: number; y: number }[], each: (x: number, y: number) => void): void {
  for (let s = 0; s + 1 < points.length; s++) {
    const [p, q] = [points[s]!, points[s + 1]!];
    const steps = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) * 4));
    for (let i = 0; i <= steps; i++) each(p.x + ((q.x - p.x) * i) / steps, p.y + ((q.y - p.y) * i) / steps);
  }
}

/**
 * §2.5.4 — paint a map. `tall` asks for a board at least that many tiles high: the screen fills its height with the
 * route's own frame rather than an empty band (the extra rows go to the frame, split over and under the route).
 */
export function mapTerrain(map: RegionMap, tall = 0): MapTerrain {
  const nodes = Object.values(map.nodes);
  const w = MARGIN_X * 2 + (map.layers - 1) * COL_TILES;
  const natural = naturalHeight(map);
  const extra = Math.max(0, tall - natural);
  const top = topMargin(map) + Math.floor(extra / 2);
  const h = natural + extra;
  const [roadA, roadB] = roadOf(map.regionIndex);
  const laneTerrain = map.gyms.map((id) => TERRAIN_BY_TYPE[gymById(id).type] ?? roadA);
  const seed = map.seed * 31 + map.regionIndex;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;

  const at: MapTerrain['at'] = {};
  // §9.3 — every node stands on its grid point (v0.9.108): a track that keeps its row is a level road, its stops evenly
  // along it, as a FRLG route's trainers stand. v0.9.107 stepped each a tile left or right; on seven rows nearly every
  // node has a neighbour close enough that the step had to be taken back, and the few left read as mistakes.
  for (const n of nodes) at[n.id] = nodeTile(n, top);

  // The edges: one straight line from node to node — a ledge's drop too, down across the column it skips, between that
  // column's tracks, through the ledge drawn across its middle.
  const edges: MapTerrain['edges'] = {};
  for (const n of nodes) for (const id of n.next) edges[`${n.id}>${id}`] = [at[n.id]!, at[id]!];

  // Kept ground: the corridor of every line, the node's own two tiles, and a clearing of road under the fights — the
  // Gym's six tiles, the Elite's four, a trainer's two — the way a route's trainers stand on its sand (§9.3's weights).
  const path = Array.from({ length: h }, () => new Uint8Array(w));
  const clear = Array.from({ length: h }, () => new Uint8Array(w));
  for (const n of nodes) {
    const c = at[n.id]!;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]] as const) if (inside(c.x + dx, c.y + dy)) clear[c.y + dy]![c.x + dx] = 1;
    const pad = n.kind === 'gym' ? 3 : n.kind === 'elite' ? 2 : n.kind === 'trainer' ? 1 : 0;
    for (let dx = -pad; dx < pad; dx++) for (const dy of [-1, 0]) if (inside(c.x + dx, c.y + dy)) path[c.y + dy]![c.x + dx] = 1;
  }
  for (const line of Object.values(edges)) {
    along(line, (lx, ly) => {
      for (let x = Math.floor(lx - CORRIDOR - 0.5); x <= Math.ceil(lx + CORRIDOR - 0.5); x++)
        for (let y = Math.floor(ly - CORRIDOR - 0.5); y <= Math.ceil(ly + CORRIDOR - 0.5); y++)
          if (inside(x, y) && Math.abs(x + 0.5 - lx) <= CORRIDOR + 0.5 && Math.abs(y + 0.5 - ly) <= CORRIDOR + 0.5) clear[y]![x] = 1;
    });
  }

  // §2.5.4 — the buildings: over the node's point, the door's foot a row under its feet, so the figure stands in the
  // doorway. Whole since v0.9.108 (the user: "parecen cortados"); the ground under them is theirs.
  const prop = Array.from({ length: h }, () => new Uint8Array(w));
  const buildings: MapTerrain['buildings'] = [];
  for (const n of nodes) {
    const id = buildingOf(n);
    if (!id) continue;
    const c = at[n.id]!;
    const { w: bw, h: bh } = BUILDINGS[id];
    const x0 = c.x - Math.floor(bw / 2);
    for (let y = c.y + 1 - bh; y <= c.y; y++) for (let x = x0; x < x0 + bw; x++) if (inside(x, y)) prop[y]![x] = 1;
    buildings.push({ id, node: n.id, x: c.x, y: c.y });
  }

  // How far each tile is from the nearest kept tile (4-neighbour steps), so scenery and set pieces keep their distance.
  const kept = (x: number, y: number) => path[y]![x] || clear[y]![x] || prop[y]![x];
  const dist = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (kept(x, y) ? 0 : Infinity)));
  const queue: [number, number][] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (kept(x, y)) queue.push([x, y]);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const [nx, ny] = [x + dx, y + dy];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || dist[ny]![nx] !== Infinity) continue;
      dist[ny]![nx] = dist[y]![x]! + 1;
      queue.push([nx, ny]);
    }
  }

  // Which terrain a tile is in. The trunk is the road in its chapters; on the Y the outer thirds blend toward their
  // Gyms' terrains; past the point of no return each lane's half is its Gym's outright.
  const yLayer = map.yLayer ?? map.forkLayer;
  const noReturn = map.forkLayer - 1;
  const xY = MARGIN_X + yLayer * COL_TILES - Math.floor(COL_TILES / 2);
  const xFork = MARGIN_X + noReturn * COL_TILES + LANE_AT;
  const colOf = (x: number) => Math.max(0, Math.min(map.layers - 1, Math.round((x - MARGIN_X) / COL_TILES)));
  const byLayer = new Map<number, MapNode[]>();
  for (const n of nodes) byLayer.set(n.layer, [...(byLayer.get(n.layer) ?? []), n].sort((a, b) => a.row - b.row));
  const tileY = (row: number) => top + row * ROW_TILES + 1;
  /** The line between two groups of tracks in a column, in tiles: halfway between the last of one and the first of the other. */
  const split = (layer: number, above: (n: MapNode) => boolean, below: (n: MapNode) => boolean): number | null => {
    const col = byLayer.get(layer) ?? [];
    const up = col.filter(above);
    const down = col.filter(below);
    if (!up.length || !down.length) return null;
    return (tileY(up[up.length - 1]!.row) + tileY(down[0]!.row)) / 2;
  };
  /** The line between the two lanes at a tile column, in tiles, before it bends. */
  const laneLine = (x: number) => split(Math.max(colOf(x), noReturn + 1), (n) => n.lane === 0, (n) => n.lane === 1) ?? h / 2;
  // §2.5.4 — the chapter's frontier: past the trunk's middle stop, wandering a tile or two as a wood's edge does.
  const chapter = chapterLayer(map);
  const xChapter = chapter === null ? Infinity : MARGIN_X + chapter * COL_TILES + Math.floor(COL_TILES / 2);
  const roadAt = (x: number, y: number) => (x >= xChapter + (blob(seed, 0, y, 4, 31) - 0.5) * 3 ? roadB : roadA);
  /**
   * Which lane's terrain a tile wears, or null for the road. On the Y each outer third turns into its Gym's terrain
   * along one **frontier** that wanders up and down the Y's first column, so the change reads as a coast or a cave mouth
   * you walk into, not as a scatter of patches — and every leaning track's fight stands on its Gym's ground, under its
   * field (v0.9.108). `wobble` lets the line between two stretches meander by a tile on open ground; a path keeps the
   * straight line, so a road never changes material under your feet halfway across.
   */
  const sideOf = (x: number, y: number, wobble: boolean): number | null => {
    // §2.12 — a map without Gyms (Victory Road) has no lanes: it is all road.
    if (!laneTerrain.length || x < xY) return null;
    const layer = colOf(x);
    // Under a tile either way: between two tracks four tiles apart it never reaches a node's own tile (v0.9.108).
    const bend = wobble ? (blob(seed, x, 0, 5, 17) - 0.5) * 2 : 0;
    if (x >= xFork || layer > noReturn) return y < laneLine(x) + bend ? 0 : 1;
    const up = split(layer, (n) => n.lean === 0, (n) => n.lean === undefined && n.lane === undefined);
    const down = split(layer, (n) => n.lean === undefined && n.lane === undefined, (n) => n.lean === 1);
    const frontier = (lane: number) => xY + COL_TILES * (0.25 + 0.75 * blob(seed, lane * 97, y, 4, 23));
    if (up !== null && y < up + bend) return x >= frontier(0) ? 0 : null;
    if (down !== null && y >= down + bend) return x >= frontier(1) ? 1 : null;
    return null;
  };

  /** The terrain of the nearest node to a road tile: its column's, the row nearest it. */
  const roadTerrain = (x: number, y: number) => {
    const col = byLayer.get(colOf(x)) ?? [];
    if (!col.length) return roadAt(x, y);
    const near = col.reduce((best, n) => (Math.abs(tileY(n.row) - y) < Math.abs(tileY(best.row) - y) ? n : best), col[0]!);
    return terrainOfNode(map, near);
  };

  // Tall grass round every Wild node — the overworld's own telegraph for "Pokémon live here".
  const tallGrass = Array.from({ length: h }, () => new Uint8Array(w));
  for (const n of nodes) {
    if (n.kind !== 'wild' && n.kind !== 'elite-wild') continue;
    const c = at[n.id]!;
    for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 1; dx++) {
      const [x, y] = [c.x + dx, c.y + dy];
      if (inside(x, y) && !kept(x, y)) tallGrass[y]![x] = 1;
    }
  }

  // §2.5.4 — the frame: a FRLG route is a strip walled along its top and bottom by its own scenery (Route 4's cliffs,
  // Viridian Forest's trees). Its top reaches down to where the first row's pictures begin; its bottom is the last two rows.
  const frame = { top: Math.max(2, top - 1), bottom: h - 2 };
  // §2.5.4 — the lanes' ridge: past the point of no return a band of scenery runs between the two lanes to the Gyms, bent
  // as their frontier is, so "they never meet again" is drawn rather than written. It leaves the mouth open.
  const ridgeFrom = xFork + 2;
  // Where two lanes run close, the tile on the line itself always holds it, however the band bends.
  const onRidge = (x: number, y: number) =>
    laneTerrain.length > 0 &&
    x >= ridgeFrom &&
    (Math.abs(y + 0.5 - laneLine(x)) <= 0.5 || Math.abs(y + 0.5 - (laneLine(x) + (blob(seed, x, 0, 5, 17) - 0.5) * 2)) <= RIDGE);

  const cells: TerrainCell[][] = [];
  for (let y = 0; y < h; y++) {
    const row: TerrainCell[] = [];
    for (let x = 0; x < w; x++) {
      const side = sideOf(x, y, true);
      const open = side === null ? roadAt(x, y) : laneTerrain[side]!;
      const t = path[y]![x] ? roadTerrain(x, y) : open;
      const n = cellHash(seed, x, y);
      let k: CellKind;
      if (path[y]![x]) k = 'path';
      else if (prop[y]![x]) k = 'prop';
      // The ridge stands even where a Wild Area's tall grass reaches into it: a lane's wall has no gap of grass.
      else if (onRidge(x, y) && !clear[y]![x]) k = 'fill';
      else if (tallGrass[y]![x]) k = 'tall';
      else {
        // Scenery off the routes' lines, in clumps; the frame and the lanes' ridge are walls of it, as a route's edges are.
        const wall = (y < frame.top || y >= frame.bottom || x < 2 || x >= w - 2 || onRidge(x, y)) && !clear[y]![x];
        const far = dist[y]![x]! >= 1;
        // Water comes in bodies, not puddles: its noise is coarser than a wood's or a rockfall's.
        const scale = t === 'lake' || t === 'coast' ? 5 : 3;
        k = wall || (far && blob(seed, x, y, scale, 11) < FILL_DENSITY[t]) ? 'fill' : 'ground';
      }
      row.push({ t, k, n, m: blob(seed, x, y, 3, 29), ...(k === 'path' && open !== t ? { g: open } : {}), ...(side !== null ? { s: side } : {}) });
    }
    cells.push(row);
  }

  // Scenery is a clump or nothing: a lone tree, rock or flower with no scenery beside it is noise, so it goes back to
  // open ground (the frame and the ridge excepted)…
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = cells[y]![x]!;
      if (c.k !== 'fill' || y < frame.top || y >= frame.bottom || onRidge(x, y)) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => cells[y + dy!]![x + dx!]!.k === 'fill' && cells[y + dy!]![x + dx!]!.t === c.t).length;
      if (near < 2) c.k = 'ground';
    }
  }
  // …and a hole is not a clearing: open ground with scenery on three sides or four closes up.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = cells[y]![x]!;
      if (c.k !== 'ground') continue;
      const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => cells[y + dy!]![x + dx!]!.k === 'fill' && cells[y + dy!]![x + dx!]!.t === c.t).length;
      if (around >= 3) c.k = 'fill';
    }
  }

  // §2.5.4 — the set pieces: a house, a pond, a cottage or a flower bed from FRLG's own routes and towns, where a stretch of grassy
  // open ground (or scenery to clear for it) holds one whole with a tile of room round it, off every line, at most one
  // in a column's width and never the same one twice running. They are what a FRLG route's eye rests on.
  const pieces: MapTerrain['pieces'] = [];
  const order = Object.keys(SET_PIECES) as SetPieceId[];
  let lastX = -Infinity;
  let lastId: SetPieceId | null = null;
  for (let x = 3; x < w - 3; x++) {
    if (x - lastX < COL_TILES * 2) continue;
    const pick = order[Math.floor(cellHash(seed, x, 0, 53) * order.length)]!;
    const id: SetPieceId = pick === lastId ? order[(order.indexOf(pick) + 1) % order.length]! : pick;
    const { w: pw, h: ph } = SET_PIECES[id];
    for (let y = frame.top; y + ph <= frame.bottom; y++) {
      let fits = true;
      for (let yy = y - 1; yy <= y + ph && fits; yy++)
        for (let xx = x - 1; xx <= x + pw && fits; xx++) {
          const c = cells[yy]?.[xx];
          if (!c || !GRASSY.has(c.t) || kept(xx, yy) || dist[yy]![xx]! < 1 || c.k === 'tall' || c.k === 'path' || c.k === 'prop' || onRidge(xx, yy)) fits = false;
        }
      if (!fits || cellHash(seed, x, y, 59) > 0.6) continue;
      for (let yy = y; yy < y + ph; yy++) for (let xx = x; xx < x + pw; xx++) cells[yy]![xx]!.k = 'prop';
      // A row of open ground under it, so no tree's crown in front reaches over its foot.
      for (let xx = x; xx < x + pw; xx++) if (cells[y + ph]?.[xx]?.k === 'fill') cells[y + ph]![xx]!.k = 'ground';
      pieces.push({ id, x, y });
      lastX = x;
      lastId = id;
      break;
    }
  }

  const lanes: LaneZone[] = [];
  if (map.forkLayer < map.layers) {
    const line = split(map.forkLayer, (n) => n.lane === 0, (n) => n.lane === 1) ?? h / 2;
    // Named where its Gym's ground starts (v0.9.108: on the Y), as its field is drawn over every tile of that ground (`s`).
    const from = (lane: number) => Math.min(ridgeFrom, ...cells.flatMap((row) => row.flatMap((c, x) => (c.s === lane ? [x] : []))));
    lanes.push({ lane: 0, x0: from(0), x1: w, y0: 0, y1: Math.round(line) }, { lane: 1, x0: from(1), x1: w, y0: Math.round(line), y1: h });
  }

  return { w, h, cells, at, edges, lanes, frame, buildings, pieces };
}

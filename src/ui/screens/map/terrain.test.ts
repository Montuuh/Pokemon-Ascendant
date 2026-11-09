import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { generateRegion, gymById, type RegionMap } from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';
import { mapTerrain, nodeTile, topMargin, TERRAIN_BY_TYPE, roadOf, COL_TILES, MARGIN_X, BUILDINGS, SET_PIECES, reachOf } from './terrain';
import { piecesFor } from './tileset';

// §2.5.4 — the route's terrain: a pure function of the map, so the same map always paints the same ground, every
// line the route draws runs over open ground, and every tile it asks for is a file on disk.

const content = buildRegistry();
const mapsOf = (region: number, n: number): RegionMap[] =>
  Array.from({ length: n }, (_, i) => generateRegion(new RngStreams(i + 1).get('MapRNG'), content, region, i + 1));
const maps = [0, 1, 2].flatMap((r) => mapsOf(r, 30));

describe('The route terrain — §2.5.4', () => {
  it('mapTerrain_SameMap_PaintsTheSameGround', () => {
    expect(mapTerrain(maps[0]!)).toEqual(mapTerrain(maps[0]!));
  });

  it('EveryEdge_IsAStraightLine_OverClearGround', () => {
    // §9.3 (v0.9.14) — an edge is one straight line between two node centres, and no scenery stands under it.
    for (const m of maps.slice(0, 20)) {
      const t = mapTerrain(m);
      for (const n of Object.values(m.nodes)) {
        for (const id of n.next) {
          const line = t.edges[`${n.id}>${id}`]!;
          expect(line, `${m.seed} ${n.id}>${id}`).toEqual([t.at[n.id], t.at[id]]);
          const [p, q] = [line[0]!, line[1]!];
          for (let i = 0; i <= 20; i++) {
            const [x, y] = [Math.floor(p.x + ((q.x - p.x) * i) / 20), Math.floor(p.y + ((q.y - p.y) * i) / 20)];
            expect(['fill', 'tall'], `${m.seed} ${n.id}>${id} at ${x},${y}`).not.toContain(t.cells[y]![x]!.k);
          }
        }
      }
    }
  });

  it('NodesStandOffTheirGridPoints_AndAColumnsNodesStayFiveTilesApart', () => {
    // §9.3 (v0.9.107) — a seeded step off the grid, so the columns stop reading as a table; never down so far that a
    // figure meets the caption of the node above it.
    let moved = 0;
    let total = 0;
    for (const m of maps) {
      const t = mapTerrain(m);
      const byLayer = new Map<number, number[]>();
      for (const n of Object.values(m.nodes)) {
        const [spot, grid] = [t.at[n.id]!, nodeTile(n, topMargin(m))];
        total++;
        if (spot.x !== grid.x || spot.y !== grid.y) moved++;
        expect(Math.abs(spot.x - grid.x), `${m.seed} ${n.id}`).toBeLessThanOrEqual(1);
        expect(spot.y - grid.y, `${m.seed} ${n.id}`).toBeGreaterThanOrEqual(0);
        if (n.kind === 'gym') expect(spot).toEqual(grid);
        byLayer.set(n.layer, [...(byLayer.get(n.layer) ?? []), spot.y]);
      }
      for (const ys of byLayer.values()) {
        const sorted = [...ys].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) expect(sorted[i]! - sorted[i - 1]!, `${m.seed}`).toBeGreaterThanOrEqual(3);
      }
    }
    // About half step off their point: the rest are held back where a step would crowd a neighbour.
    expect(moved / total).toBeGreaterThan(0.35);
  });

  it('EveryPictureAndBuildingStandsWhole_UnderTheBoardsTopEdge', () => {
    // v0.9.107 — the margin grows until the tallest picture in the top rows fits, and every building's front with it.
    for (const m of maps) {
      const t = mapTerrain(m);
      for (const n of Object.values(m.nodes)) expect(t.at[n.id]!.y - reachOf(n), `${m.seed} ${n.id}`).toBeGreaterThanOrEqual(0);
      for (const b of t.buildings) expect(b.y + 1 - BUILDINGS[b.id].h, `${m.seed} ${b.node}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('TheBoardFillsTheHeightItIsGiven_WithItsOwnFrame', () => {
    const m = maps[0]!;
    const natural = mapTerrain(m);
    const tall = mapTerrain(m, natural.h + 5);
    expect(tall.h).toBe(natural.h + 5);
    // The extra rows are frame: the route's nodes keep their spacing, two rows lower.
    const id = Object.keys(natural.at)[0]!;
    expect(tall.at[id]!.y - natural.at[id]!.y).toBe(2);
  });

  it('StopsStandAtABuildingsFront_AndSetPiecesStandOffEveryLine', () => {
    let pieces = 0;
    for (const m of maps.slice(0, 30)) {
      const t = mapTerrain(m);
      for (const n of Object.values(m.nodes).filter((x) => x.kind === 'aid' || x.kind === 'merchant' || x.kind === 'gym'))
        expect(t.buildings.some((b) => b.node === n.id), `${m.seed} ${n.id}`).toBe(true);
      for (const p of t.pieces) {
        pieces++;
        const { w, h } = SET_PIECES[p.id];
        for (const [key, line] of Object.entries(t.edges))
          for (let s = 0; s + 1 < line.length; s++)
            for (let i = 0; i <= 20; i++) {
              const x = line[s]!.x + ((line[s + 1]!.x - line[s]!.x) * i) / 20;
              const y = line[s]!.y + ((line[s + 1]!.y - line[s]!.y) * i) / 20;
              expect(x > p.x && x < p.x + w && y > p.y && y < p.y + h, `${m.seed} ${p.id} under ${key}`).toBe(false);
            }
      }
    }
    expect(pieces).toBeGreaterThan(30);
  });

  it('TheRouteIsFramed_TopAndBottom_ByItsScenery', () => {
    // §2.5.4 (v0.9.107) — a FRLG route is walled along its top and bottom; only a line or a node's ground breaks it.
    for (const m of maps.slice(0, 20)) {
      const t = mapTerrain(m);
      const rows = [...Array.from({ length: t.frame.top }, (_, y) => y), ...Array.from({ length: t.h - t.frame.bottom }, (_, i) => t.frame.bottom + i)];
      const cells = rows.flatMap((y) => t.cells[y]!);
      // Scenery, but for the top row's own ground and lines, and a building's front, which stand in it.
      const walled = cells.filter((c) => c.k === 'fill' || c.k === 'prop').length / cells.length;
      expect(walled, `${m.seed}`).toBeGreaterThan(0.7);
    }
  });

  it('TheLanesArePartedByARidge_AllTheWayToTheGyms', () => {
    // §2.5.4 (v0.9.107) — no river: between the two lanes, in every lane column, stands scenery.
    for (const m of maps) {
      const t = mapTerrain(m);
      for (let layer = m.forkLayer + 1; layer < m.layers; layer++) {
        const col = Object.values(m.nodes).filter((n) => n.layer === layer);
        const upper = col.filter((n) => n.lane === 0).map((n) => t.at[n.id]!.y);
        const lower = col.filter((n) => n.lane === 1).map((n) => t.at[n.id]!.y);
        if (!upper.length || !lower.length) continue;
        const x = MARGIN_X + layer * COL_TILES;
        const between = Array.from({ length: Math.min(...lower) - Math.max(...upper) - 1 }, (_, i) => Math.max(...upper) + 1 + i);
        // Scenery, or a building's front, which is as much a wall.
        expect(between.some((y) => t.cells[y]![x]!.k === 'fill' || t.cells[y]![x]!.k === 'prop'), `${m.seed} layer ${layer}`).toBe(true);
      }
    }
  });

  it('EachLaneWearsItsGymsTerrain_PastThePointOfNoReturn', () => {
    for (const m of maps) {
      const t = mapTerrain(m);
      const lastX = t.w - 3;
      for (const lane of [0, 1]) {
        const want = TERRAIN_BY_TYPE[gymById(m.gyms[lane]!).type];
        const gym = Object.values(m.nodes).find((n) => n.kind === 'gym' && n.lane === lane)!;
        expect(t.cells[nodeTile(gym, topMargin(m)).y]![lastX]!.t, `${m.seed} lane ${lane}`).toBe(want);
      }
      // …and the trunk is the Region's road.
      expect(t.cells[Math.floor(t.h / 2)]![3]!.t).toBe(roadOf(m.regionIndex)[0]);
    }
  });

  it('EveryTileAnyRouteAsksFor_IsAFileOnDisk', () => {
    const need = new Set(maps.flatMap((m) => piecesFor(mapTerrain(m))));
    for (const key of need) expect(existsSync(key.startsWith('props/') ? `public/art/map/${key}.png` : `public/art/route/${key}.png`), key).toBe(true);
  });

  it('AnOldTwelveLayerMap_StillPaints', () => {
    // A save from before v0.8.7 keeps its map (§2.5.2): no Y, its rows given by the migration.
    const m = maps[0]!;
    const old: RegionMap = { ...m, yLayer: undefined };
    const t = mapTerrain(old);
    expect(t.cells.length).toBe(t.h);
  });
});

describe('The route tiles on disk — §2.5.4', () => {
  // A wrong cut is the kind of bug no screenshot of one map catches (a sea rock cut a quarter-tile off its grid read as
  // a smudge on every coast): every piece is checked for its size and for where it may and may not be see-through.
  it('EveryPieceHasItsSize_GroundIsOpaque_ObjectsAreCutOut', async () => {
    const { default: sharp } = await import('sharp');
    const { readdirSync } = await import('node:fs');
    const objects = new Set(['tree', 'water-rock']);
    for (const terrain of readdirSync('public/art/route')) {
      for (const file of readdirSync(`public/art/route/${terrain}`)) {
        const name = file.replace('.png', '');
        const { data, info } = await sharp(`public/art/route/${terrain}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let clear = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) clear++;
        if (objects.has(name)) {
          expect(clear, `${terrain}/${name} should be cut out`).toBeGreaterThan(0);
          continue;
        }
        expect([info.width, info.height], `${terrain}/${name}`).toEqual([16, 16]);
        expect(clear, `${terrain}/${name} should be opaque`).toBe(0);
      }
    }
  });
});

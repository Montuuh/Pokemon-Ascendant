import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { generateRegion, gymById, type RegionMap } from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';
import { mapTerrain, nodeTile, TERRAIN_BY_TYPE, ROAD } from './terrain';
import { piecesFor } from './tileset';

// §2.5.4 — the route's terrain: a pure function of the map, so the same map always paints the same ground, every
// path the route draws is a path on the ground, and every tile it asks for is a file on disk.

const content = buildRegistry();
const mapsOf = (region: number, n: number): RegionMap[] =>
  Array.from({ length: n }, (_, i) => generateRegion(new RngStreams(i + 1).get('MapRNG'), content, region, i + 1));
const maps = [0, 1, 2].flatMap((r) => mapsOf(r, 30));

describe('The route terrain — §2.5.4', () => {
  it('mapTerrain_SameMap_PaintsTheSameGround', () => {
    expect(mapTerrain(maps[0]!)).toEqual(mapTerrain(maps[0]!));
  });

  it('EveryEdgeAndEveryNode_StandsOnPath', () => {
    for (const m of maps.slice(0, 20)) {
      const t = mapTerrain(m);
      const walkable = (x: number, y: number) => ['path', 'bridge'].includes(t.cells[y]![x]!.k);
      for (const n of Object.values(m.nodes)) {
        const c = nodeTile(n);
        for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) expect(walkable(c.x + dx!, c.y + dy!), `${m.seed} ${n.id}`).toBe(true);
        for (const id of n.next) {
          const line = t.edges[`${n.id}>${id}`]!;
          expect(line.length).toBeGreaterThanOrEqual(2);
          // Every corner of the polyline is on the road.
          for (const p of line) expect(walkable(p.x, p.y) || walkable(p.x - 1, p.y - 1), `${m.seed} ${n.id}>${id}`).toBe(true);
        }
      }
    }
  });

  it('TheRiverCrossesTheWholeMap_AndEveryPathOverItIsABridge', () => {
    for (const m of maps.slice(0, 20)) {
      const t = mapTerrain(m);
      expect(t.river, `${m.seed}`).not.toBeNull();
      for (let y = 0; y < t.h; y++) for (let x = t.river!.x0; x < t.river!.x1; x++) expect(['river', 'bridge']).toContain(t.cells[y]![x]!.k);
      const bridges = t.cells.flat().filter((c) => c.k === 'bridge').length;
      expect(bridges, `${m.seed} has no bridge`).toBeGreaterThan(0);
    }
  });

  it('EachLaneWearsItsGymsTerrain_PastTheRiver', () => {
    for (const m of maps) {
      const t = mapTerrain(m);
      const lastX = t.w - 3;
      for (const lane of [0, 1]) {
        const want = TERRAIN_BY_TYPE[gymById(m.gyms[lane]!).type];
        const gym = Object.values(m.nodes).find((n) => n.kind === 'gym' && n.lane === lane)!;
        expect(t.cells[nodeTile(gym).y]![lastX]!.t, `${m.seed} lane ${lane}`).toBe(want);
      }
      // …and the trunk is the Region's road.
      expect(t.cells[Math.floor(t.h / 2)]![3]!.t).toBe(ROAD[m.regionIndex]);
    }
  });

  it('EveryTileAnyRouteAsksFor_IsAFileOnDisk', () => {
    const need = new Set(maps.flatMap((m) => piecesFor(mapTerrain(m))));
    for (const key of need) expect(existsSync(`public/art/route/${key}.png`), key).toBe(true);
  });

  it('AnOldTwelveLayerMap_StillPaints_WithoutARiver', () => {
    // A save from before v0.8.7 keeps its map (§2.5.2): no Y, no river, its rows given by the migration.
    const m = maps[0]!;
    const old: RegionMap = { ...m, yLayer: undefined };
    const t = mapTerrain(old);
    expect(t.river).toBeNull();
    expect(t.cells.length).toBe(t.h);
  });
});

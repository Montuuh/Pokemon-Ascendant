import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { generateRegion, gymById, type RegionMap } from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';
import { mapTerrain, nodeTile, TERRAIN_BY_TYPE, ROAD } from './terrain';
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
          expect(line, `${m.seed} ${n.id}>${id}`).toEqual([nodeTile(n), nodeTile(m.nodes[id]!)]);
          const [p, q] = [line[0]!, line[1]!];
          for (let i = 0; i <= 20; i++) {
            const [x, y] = [Math.floor(p.x + ((q.x - p.x) * i) / 20), Math.floor(p.y + ((q.y - p.y) * i) / 20)];
            expect(['fill', 'tall'], `${m.seed} ${n.id}>${id} at ${x},${y}`).not.toContain(t.cells[y]![x]!.k);
          }
        }
      }
    }
  });

  it('TheRiverCrossesTheWholeMap_AndEveryLineOverItHasABridge', () => {
    for (const m of maps.slice(0, 20)) {
      const t = mapTerrain(m);
      expect(t.river, `${m.seed}`).not.toBeNull();
      const r = t.river!;
      for (let y = 0; y < t.h; y++) for (let x = r.x0; x < r.x1; x++) expect(['river', 'bridge']).toContain(t.cells[y]![x]!.k);
      for (const [key, line] of Object.entries(t.edges)) {
        const [p, q] = [line[0]!, line[line.length - 1]!];
        if (!(p.x < r.x0 && q.x >= r.x1)) continue;
        const y = Math.round(p.y + ((q.y - p.y) * ((r.x0 + r.x1) / 2 - p.x)) / (q.x - p.x));
        expect(t.cells[y]![r.x0]!.k, `${m.seed} ${key} has no bridge`).toBe('bridge');
      }
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

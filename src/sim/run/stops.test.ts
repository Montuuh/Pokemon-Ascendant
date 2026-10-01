import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, GROUND_FINDS, runReducer, type RunAction, type RunState } from '@/sim';
import { deserialiseRun, serialiseRun } from './save';

// v0.8.7 — the route's stops: §2.9.5 something on the ground, and the save that carries an older map (§10.8.3).

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const start = (seed = 7) => createRun('squirtle', seed, ctx);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

/** The first find on the map, made the one place the run can step next. */
function besideACache(seed = 7): { s: RunState; id: string } {
  const s = start(seed);
  const cache = Object.values(s.map.nodes).find((n) => n.kind === 'cache')!;
  return { s: produce(s, (d) => void (d.reachable = [cache.id])), id: cache.id };
}

describe('Something on the ground — §2.9.5', () => {
  it('PickingItUp_AddsTheFind_AndWalksOn_WithoutAScreen', () => {
    const { s: before, id } = besideACache();
    const find = before.map.nodes[id]!.preview.find!;
    let s = apply(before, { type: 'enter-node', nodeId: id });
    s = apply(s, { type: 'begin-combat' });
    expect(s.phase).toBe('map');
    expect(s.position).toBe(id);
    expect(s.reachable).toEqual(s.map.nodes[id]!.next);
    expect(s.consumables.length).toBe(before.consumables.length + find.items.length);
    expect(s.money).toBe(before.money + find.money);
    expect(s.lastFind).toEqual(find);
    // Said once as you leave, and gone when the next node is entered.
    s = apply(s, { type: 'enter-node', nodeId: s.reachable[0]! });
    expect(s.lastFind).toBeNull();
  });

  it('EveryFindIsSomethingTheBagKnows_AndRegionsGetRicher', () => {
    for (const table of GROUND_FINDS) {
      for (const f of table) {
        expect(f.items.length + f.money).toBeGreaterThan(0);
        for (const item of f.items) expect(() => content.consumable(item), item).not.toThrow();
      }
    }
    const cash = GROUND_FINDS.map((t) => Math.max(...t.map((f) => f.money)));
    expect(cash).toEqual([...cash].sort((a, b) => a - b));
  });

  it('NobodyNeedsToBeStanding_ToPickSomethingUp', () => {
    const { s: before, id } = besideACache();
    const fainted = produce(before, (d) => {
      for (const m of d.box) m.hp = 0;
    });
    const s = apply(apply(fainted, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
    expect(s.phase).toBe('map');
  });
});

describe('Save v18 — §10.8.3, §2.5', () => {
  it('AV17Save_KeepsItsTwelveLayerMap_AndGivesItsNodesRows', () => {
    const run = start();
    const old = JSON.parse(serialiseRun(run, 0));
    // Shape an old twelve-layer map: no rows, no row height, a trunk of four and lanes of two.
    const nodes: Record<string, Record<string, unknown>> = {};
    for (let layer = 0; layer < 12; layer++) {
      const width = layer === 11 ? 2 : layer >= 8 ? 4 : 4;
      for (let col = 0; col < width; col++) {
        const lane = layer === 11 ? col : layer >= 8 ? (col < 2 ? 0 : 1) : undefined;
        nodes[`n${layer}-${col}`] = { id: `n${layer}-${col}`, layer, col, kind: layer === 11 ? 'gym' : 'wild', next: [], preview: { title: '', detail: '', speciesIds: [], levelBand: [5, 6] }, ...(lane === undefined ? {} : { lane }) };
      }
    }
    old.run.map = { ...old.run.map, layers: 12, nodes, forkLayer: 8 };
    delete old.run.map.rows;
    delete old.run.map.yLayer;
    old.version = 17;
    old.checksum = JSON.parse(serialiseRun({ ...old.run }, 0)).checksum;
    const migrated = deserialiseRun(JSON.stringify(old), content);
    if (!migrated.ok) throw new Error(migrated.reason);
    const map = migrated.run.map;
    expect(map.rows).toBe(11);
    expect(map.layers).toBe(12);
    for (const n of Object.values(map.nodes)) {
      expect(n.row, n.id).toBeGreaterThanOrEqual(0);
      expect(n.row, n.id).toBeLessThan(11);
      if (n.lane === 0 && n.kind !== 'gym') expect(n.row, n.id).toBeLessThanOrEqual(4);
      if (n.lane === 1 && n.kind !== 'gym') expect(n.row, n.id).toBeGreaterThanOrEqual(6);
    }
  });
});

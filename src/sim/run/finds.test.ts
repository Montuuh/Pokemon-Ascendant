import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  arriveAtCity, createRun, defaultRunCtx, effectiveMax, generateRegion, newPartyMon, REEL_SHAPE, reelChances, runReducer,
  type MapNode, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';

// §2.9.5 — the item ball: a reel of seven prizes shown on the map, spun on the way in. §2.4.2 / §9.9.3 — the heal, recorded
// for the screen that shows it.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

/** A run standing at the map's first plain find (made reachable), walked into. */
function atFind(seed = 7, regionIndex = 0): { run: RunState; node: MapNode } {
  const run = structuredClone(createRun('squirtle', seed, ctx, regionIndex)) as RunState;
  const node = Object.values(run.map.nodes).find((n) => n.kind === 'cache' && n.preview.reel)!;
  run.reachable = [node.id];
  return { run: apply(apply(run, { type: 'enter-node', nodeId: node.id }), { type: 'begin-combat' }), node };
}

describe('The item ball — §2.9.5', () => {
  const maps = Array.from({ length: 60 }, (_, i) => generateRegion(new RngStreams(5000 + i).get('MapRNG'), content, i % 3, 5000 + i));

  it('EveryPlainFind_CarriesAReelOfSeven_ThreeTwoTwo_ARelicInTheRareRow', () => {
    let finds = 0;
    for (const map of maps)
      for (const node of Object.values(map.nodes)) {
        if (node.kind !== 'cache') continue;
        if (node.preview.objective) {
          // A guarded find keeps its own prize (§5.6.5).
          expect(node.preview.reel).toBeUndefined();
          continue;
        }
        finds++;
        const reel = node.preview.reel!;
        expect(reel).toHaveLength(7);
        for (const tier of ['common', 'uncommon', 'rare'] as const) expect(reel.filter((t) => t.tier === tier)).toHaveLength(REEL_SHAPE[tier]);
        expect(reel.some((t) => t.tier === 'rare' && t.prize.kind === 'relic')).toBe(true);
      }
    expect(finds).toBeGreaterThan(100);
  });

  it('ReelChances_SumToOne_EachRowItsShareSplitEvenly', () => {
    const reel = Object.values(maps[0]!.nodes).find((n) => n.preview.reel)!.preview.reel!;
    const c = reelChances(reel);
    expect(c.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(c[0]).toBeCloseTo(0.2, 9);
    expect(c[3]).toBeCloseTo(0.15, 9);
    expect(c[5]).toBeCloseTo(0.05, 9);
  });

  it('TheReel_IsTheMapsOwn_TheSameSeedTheSameReel', () => {
    const a = generateRegion(new RngStreams(77).get('MapRNG'), content, 0, 77);
    const b = generateRegion(new RngStreams(77).get('MapRNG'), content, 0, 77);
    for (const id of Object.keys(a.nodes)) expect(a.nodes[id]!.preview.reel).toEqual(b.nodes[id]!.preview.reel);
  });

  it('WalkingIn_SpinsTheReel_PutsThePrizeAway_AndHoldsTheScreenUntilYouWalkOn', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const before = structuredClone(createRun('squirtle', seed, ctx)) as RunState;
      const { run, node } = atFind(seed);
      expect(run.phase).toBe('find');
      const find = run.pendingFind!;
      const tile = find.tiles[find.won]!;
      expect(tile).toEqual(node.preview.reel![find.won]);
      const p = tile.prize;
      if (find.got.money !== undefined) expect(run.money).toBe(before.money + find.got.money);
      else if (find.got.relic) expect(run.relics).toContain(find.got.relic);
      else if (find.got.heldItem) expect(run.bag).toContain(find.got.heldItem);
      else if (p.kind === 'supply') expect(run.consumables.length).toBe(before.consumables.length + p.items.length);
      else if (p.kind === 'money') expect(run.money).toBe(before.money + p.amount);
      else if (p.kind === 'tm') expect(run.tms).toContain(p.id);
      else if (p.kind === 'stone') expect(run.stones).toContain(p.id);
      const on = apply(run, { type: 'leave-find' });
      expect(on.phase).toBe('map');
      expect(on.pendingFind).toBeNull();
      expect(on.visited).toContain(node.id);
    }
  });

  it('TheSpin_IsAHashOfTheRun_AReloadLandsOnTheSameTile', () => {
    const a = atFind(9).run.pendingFind!;
    const b = atFind(9).run.pendingFind!;
    expect(a).toEqual(b);
  });

  it('ARelicTile_NeverLandsOnARelicYouHold_WithNoneLeftItPaysMoney', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = structuredClone(createRun('squirtle', seed, ctx)) as RunState;
      // Every relic there is already held, and every tile of the reel a relic: the spin can only land on one.
      run.relics = content.allRelics().filter((r) => r.rarity !== 'legendary').map((r) => r.id);
      const n = Object.values(run.map.nodes).find((x) => x.kind === 'cache' && x.preview.reel)!;
      const relic = n.preview.reel!.find((x) => x.prize.kind === 'relic')!;
      n.preview.reel = n.preview.reel!.map((t) => ({ ...relic, tier: t.tier }));
      run.reachable = [n.id];
      const at = apply(apply(run, { type: 'enter-node', nodeId: n.id }), { type: 'begin-combat' });
      expect(at.pendingFind!.got.relic).toBeUndefined();
      expect(at.pendingFind!.got.money).toBeGreaterThan(0);
      expect(at.money).toBe(run.money + at.pendingFind!.got.money!);
    }
  });

  it('LeaveFind_OutsideAFind_IsRefused', () => {
    const run = createRun('squirtle', 5, ctx);
    expect(runReducer(run, { type: 'leave-find' }, ctx).rejected).toBe('wrong-phase');
  });
});

describe('The heal, recorded — §2.4.2, §9.9.3', () => {
  it('TheCenter_SaysEveryPokemonsHpBeforeAndAfter_AndWhoWasCured', () => {
    const run = produce(createRun('charmander', 7, ctx), (d) => {
      d.box.push(newPartyMon('pidgey', 10, content, 101), newPartyMon('rattata', 10, content, 102));
      d.box[0]!.hp = 3;
      d.box[1]!.hp = 0;
      d.box[2]!.status = { kind: 'poison', turnsLeft: null };
      arriveAtCity(d, ctx);
    });
    const at = apply(run, { type: 'enter-building', building: 'center' });
    const lines = at.lastHeal!;
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ from: 3, to: effectiveMax(at, at.box[0]!, content), cured: false });
    expect(lines[1]!.from).toBe(0);
    expect(lines[1]!.to).toBe(effectiveMax(at, at.box[1]!, content));
    expect(lines[2]!.cured).toBe(true);
    expect(apply(at, { type: 'leave-center' }).lastHeal).toBeNull();
  });

  it('TheCenter_HealsToTheTraumaCeiling_NeverLeavesHpAboveIt_§2.4.2', () => {
    const run = produce(createRun('charmander', 7, ctx), (d) => {
      d.box[0]!.traumaStacks = 3;
      d.box[0]!.hp = 999;
      arriveAtCity(d, ctx);
    });
    const at = apply(run, { type: 'enter-building', building: 'center' });
    expect(at.box[0]!.hp).toBe(effectiveMax(at, at.box[0]!, content));
    expect(at.lastHeal![0]!.to).toBe(at.box[0]!.hp);
  });

  it('TheFieldNurse_SaysWhatHerHalfHealGave', () => {
    const run = structuredClone(createRun('squirtle', 11, ctx)) as RunState;
    run.box[0]!.hp = 1;
    const id = run.reachable[0]!;
    run.map.nodes[id] = { ...run.map.nodes[id]!, kind: 'aid', preview: { ...run.map.nodes[id]!.preview, title: 'Field nurse' } } as MapNode;
    const at = apply(apply(run, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
    expect(at.phase).toBe('aid');
    const line = at.lastHeal![0]!;
    expect(line.from).toBe(1);
    expect(line.to).toBe(at.box[0]!.hp);
    expect(line.to).toBeGreaterThan(1);
    expect(apply(at, { type: 'leave-aid' }).lastHeal).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, generateRegion, mysteryEventOf, runReducer, stepOpen, type RegionMap, type RunState } from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';
import { GATES, partyClears } from './routeFeatures';
import { MYSTERY_EVENTS, STONE_CACHE } from './events';

// §2.5.5 / §2.10 — what a route holds besides its nodes (v0.9.107): the field moves' obstacles, the ledge, and every
// Mystery's place rolled with the map.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const maps: RegionMap[] = [0, 1, 2].flatMap((region) =>
  Array.from({ length: 80 }, (_, i) => generateRegion(new RngStreams(i + 1).get('MapRNG'), content, region, i + 1)),
);

describe('Obstacles — §2.5.5', () => {
  it('AnObstacle_IsNeverTheOnlyWayOn_NorTheCommitment_NorTheWayToAGymOrTheLastNurse', () => {
    let gated = 0;
    for (const m of maps) {
      for (const n of Object.values(m.nodes)) {
        for (const [to, kind] of Object.entries(n.gates ?? {})) {
          gated++;
          expect(Object.keys(GATES)).toContain(kind);
          expect(n.next, `${m.seed} ${n.id}`).toContain(to);
          expect(n.next.filter((id) => !n.gates?.[id]).length, `${m.seed} ${n.id} has an open way on`).toBeGreaterThan(0);
          const t = m.nodes[to]!;
          expect(t.kind === 'gym' || t.kind === 'aid', `${m.seed} ${n.id} → ${to}`).toBe(false);
          expect(n.lane === undefined && t.lane !== undefined, `${m.seed} ${n.id} → ${to} is the commitment`).toBe(false);
        }
      }
    }
    // A feature of most routes, not of every one.
    expect(gated / maps.length).toBeGreaterThan(0.5);
    expect(gated / maps.length).toBeLessThan(3);
  });

  it('StepOpen_ShutWithoutTheType_OpenWithIt', () => {
    const m = maps.find((x) => Object.values(x.nodes).some((n) => n.gates && Object.values(n.gates)[0] === 'surf'))!;
    const from = Object.values(m.nodes).find((n) => n.gates && Object.values(n.gates)[0] === 'surf')!;
    const to = Object.keys(from.gates!)[0]!;
    const base = createRun('bulbasaur', m.seed, ctx, m.regionIndex);
    const at = produce(base, (d) => {
      d.map = m as RunState['map'];
      d.position = from.id;
      d.reachable = [...from.next];
    });
    expect(partyClears(at, 'surf', content)).toBe(false);
    expect(stepOpen(at, to, content)).toBe(false);
    // The preview opens (what lies beyond is shown, Pillar 1); walking in is what the obstacle refuses.
    const looking = runReducer(at, { type: 'enter-node', nodeId: to }, ctx);
    expect(looking.rejected).toBeUndefined();
    expect(runReducer(looking.state, { type: 'begin-combat' }, ctx).rejected).toBe('gate-closed');
    // …and the open way beside it stays open.
    const open = from.next.find((id) => id !== to)!;
    expect(stepOpen(at, open, content)).toBe(true);
    const wet = produce(at, (d) => {
      d.box.push({ ...d.box[0]!, uid: 'squirtle-x', speciesId: 'squirtle' });
    });
    expect(stepOpen(wet, to, content)).toBe(true);
    const wading = runReducer(wet, { type: 'enter-node', nodeId: to }, ctx).state;
    expect(runReducer(wading, { type: 'begin-combat' }, ctx).rejected).toBeUndefined();
  });
});

describe('The ledge — §2.5.5', () => {
  it('ALedge_DropsTwoColumnsOn_ToTheTrackBelow_OverAFightColumn_InTheTrunk', () => {
    let ledges = 0;
    for (const m of maps) {
      const from = Object.values(m.nodes).filter((n) => n.ledge);
      expect(from.length, `${m.seed}`).toBeLessThanOrEqual(1);
      for (const n of from) {
        ledges++;
        const t = m.nodes[n.ledge!]!;
        expect(n.next).toContain(t.id);
        expect(t.layer).toBe(n.layer + 2);
        expect(t.row - n.row).toBeGreaterThanOrEqual(2);
        expect(t.row - n.row).toBeLessThanOrEqual(4);
        expect(t.lane).toBeUndefined();
        expect(t.lean).toBeUndefined();
        const between = Object.values(m.nodes).filter((x) => x.layer === n.layer + 1);
        expect(between.some((x) => x.kind === 'wild' || x.kind === 'trainer' || x.kind === 'elite'), `${m.seed} ${n.id} skips a stop column`).toBe(true);
      }
    }
    expect(ledges / maps.length).toBeGreaterThan(0.3);
  });
});

describe('Mystery places — §2.10', () => {
  it('EveryMystery_HoldsAnEventRolledWithTheMap_NoneTwiceOnAMap', () => {
    for (const m of maps) {
      const events = Object.values(m.nodes).filter((n) => n.kind === 'mystery').map((n) => n.preview.event);
      for (const e of events) expect(MYSTERY_EVENTS.map((x) => x.id), `${m.seed}`).toContain(e);
      if (events.length <= MYSTERY_EVENTS.length) expect(new Set(events).size, `${m.seed}`).toBe(events.length);
    }
  });

  it('EnteringAMystery_KeepsThePlaceTheMapShowed', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const fresh = createRun('squirtle', seed, ctx);
      const parent = Object.values(fresh.map.nodes).find((n) => n.next.some((x) => fresh.map.nodes[x]!.kind === 'mystery'));
      if (!parent) continue;
      const id = parent.next.find((x) => fresh.map.nodes[x]!.kind === 'mystery')!;
      // Stand the run on the Mystery's parent, as if the route to it had been walked.
      let s = produce(fresh, (d) => {
        d.position = parent.id;
        d.visited.push(parent.id);
        d.reachable = [...parent.next];
      });
      const promised = mysteryEventOf(s, s.map.nodes[id]!, content);
      expect(promised).toBe(s.map.nodes[id]!.preview.event);
      s = runReducer(s, { type: 'enter-node', nodeId: id }, ctx).state;
      s = runReducer(s, { type: 'begin-combat' }, ctx).state;
      expect(s.pendingEvent).toBe(promised);
      return;
    }
    throw new Error('no Mystery on 40 routes');
  });

  it('AnEeveeRun_ShowsTheStoneCache_UntilItIsOpened', () => {
    const s = createRun('eevee', 3, ctx);
    const mystery = Object.values(s.map.nodes).find((n) => n.kind === 'mystery')!;
    expect(mysteryEventOf(s, mystery, content)).toBe(STONE_CACHE);
    const opened = produce(s, (d) => {
      d.seenEvents.push(STONE_CACHE);
    });
    expect(mysteryEventOf(opened, mystery, content)).toBe(mystery.preview.event);
  });
});

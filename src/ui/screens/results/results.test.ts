import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, runReducer, xpToNext, type NodeKind, type RunAction, type RunState } from '@/sim';
import { monAt, RESULT_MS, resultMons, revealPlan, spoilsOf, xpSegments } from './results';

// §9.4.5 — the result screen's data: each bar from where the fight left it to where the reward put it, the spoils,
// and the reveal's order and stops.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

function won(kind: NodeKind, hp = 10, money = 0): RunState {
  let s = createRun('squirtle', 7, ctx);
  const id = s.reachable[0]!;
  s = produce(s, (d) => {
    d.map.nodes[id]!.kind = kind;
    d.money = money;
  });
  s = apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
  return apply(s, {
    type: 'finish-combat',
    report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp, status: null, fainted: false })), caught: null, ballsLeft: 0, turns: 3 },
  });
}

describe('The result screen — §9.4.5', () => {
  it('xpSegments_OneSegmentPerLevelCrossed', () => {
    expect(xpSegments({ level: 5, xp: 10 }, { level: 5, xp: 20 })).toEqual([{ level: 5, from: 10 / xpToNext(5), to: 20 / xpToNext(5) }]);
    const two = xpSegments({ level: 5, xp: 10 }, { level: 7, xp: 3 });
    expect(two.map((s) => s.level)).toEqual([5, 6, 7]);
    expect(two[0]!.to).toBe(1);
    expect(two[1]).toEqual({ level: 6, from: 0, to: 1 });
    expect(two[2]!.from).toBe(0);
  });

  it('resultMons_TheLeadFirst_WithItsXpFromWhereTheFightLeftIt', () => {
    const s = won('wild');
    const mons = resultMons(s, content);
    expect(mons[0]!.place).toBe('lead');
    expect(mons[0]!.mon.uid).toBe(s.lastFight!.formation[0]);
    expect(mons[0]!.hp.from).toBe(10);
    expect(mons[0]!.xp!.gain).toBe(s.pendingReward!.xpAwarded.find((a) => a.uid === mons[0]!.mon.uid)!.amount);
  });

  it('revealPlan_ALevelGained_StopsOnItsPanel_BeforeTheBarGoesOn', () => {
    const s = won('trainer');
    const mons = resultMons(s, content);
    const lead = mons[0]!;
    expect(lead.up).not.toBeNull(); // a Lv 5 starter levels from a trainer
    const plan = revealPlan(mons, spoilsOf(s).length);
    const level = plan.beats.find((b) => b.kind === 'level')!;
    const xps = plan.beats.filter((b) => b.kind === 'xp');
    // The bar into the new level comes after the panel.
    expect(xps.some((b) => b.at >= level.at + level.dur)).toBe(true);
    expect(level.dur).toBe(RESULT_MS.level);
    // A click stops at the panel's end.
    expect(plan.stops).toContain(level.at + level.dur);
    expect(plan.stops.at(-1)).toBe(plan.total);
  });

  it('monAt_BeforeTheReveal_TheFightsHp_AfterIt_TheRewardsLevel', () => {
    const s = won('trainer', 10);
    const mons = resultMons(s, content);
    const plan = revealPlan(mons, 0);
    const lead = mons[0]!;
    const start = monAt(lead, plan, 0);
    expect(start.level).toBe(s.lastFight!.before.find((b) => b.uid === lead.mon.uid)!.level);
    expect(start.panel).toBeNull();
    const end = monAt(lead, plan, plan.total);
    expect(end.level).toBe(lead.mon.level);
    expect(end.hp).toBe(lead.hp.to);
    expect(end.fill).toBeCloseTo(lead.mon.xp / xpToNext(lead.mon.level));
    const level = plan.beats.find((b) => b.kind === 'level')!;
    expect(monAt(lead, plan, level.at + 10).panel).not.toBeNull();
  });

  it('spoilsOf_ThePrizeMoneyAndTheItems_LikeItemsCounted', () => {
    const s = won('trainer', 10, 100);
    const spoils = spoilsOf(s);
    expect(spoils[0]).toEqual({ kind: 'money', amount: s.pendingReward!.money, wallet: s.money });
    const consumables = spoils.filter((x) => x.kind === 'item' && x.item === 'consumable');
    expect(consumables.reduce((a, x) => a + (x.kind === 'item' ? x.count : 0), 0)).toBe(s.pendingReward!.consumables.length);
  });

  it('spoilsOf_ARun_IsItsToll', () => {
    let s = createRun('squirtle', 7, ctx);
    const id = s.reachable[0]!;
    s = produce(s, (d) => {
      d.map.nodes[id]!.kind = 'wild';
      d.money = 500;
    });
    s = apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
    s = apply(s, { type: 'finish-combat', report: { outcome: 'escaped', team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: 0, turns: 1 } });
    expect(spoilsOf(s)).toEqual([{ kind: 'toll-money', amount: s.lastFight!.toll!.money, pct: 20 }]);
  });
});

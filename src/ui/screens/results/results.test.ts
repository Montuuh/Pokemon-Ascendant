import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, runReducer, xpToNext, type NodeKind, type RunAction, type RunState } from '@/sim';
import { HOLD_AT, levelSteps, monAt, RESULT_MS, resultMons, revealPlan, spoilsOf, xpSegments } from './results';

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

  it('revealPlan_SeveralLevels_OnePanelEach_AndAMoveHoldsTheClock_v0.9.80', () => {
    const s = won('trainer');
    const lead = resultMons(s, content)[0]!;
    const learn = content.lineLearnset(lead.mon.speciesId).find((l) => l.level >= 7)!;
    const from = learn.level - 2;
    const up = { uid: lead.mon.uid, from, to: from + 3, learned: [learn.move], activated: [] };
    const mon = { ...lead.mon, level: up.to };
    const steps = levelSteps(mon, up, content);
    // Three levels, three steps: the stats are each level's own, and the move sits on the level the learnset says.
    expect(steps.map((x) => x.to)).toEqual([from + 1, from + 2, from + 3]);
    expect(steps.map((x) => x.learned.length)).toEqual([0, 1, 0]);
    expect(steps[0]!.gains!.attack + steps[1]!.gains!.attack + steps[2]!.gains!.attack).toBe(steps[2]!.statsAt!.attack - (steps[0]!.statsAt!.attack - steps[0]!.gains!.attack));
    const many = { ...lead, mon, up, steps, xp: { gain: 500, segments: xpSegments({ level: from, xp: 0 }, { level: up.to, xp: 3 }) }, maxHpAt: { [from]: 20, [from + 1]: 23, [from + 2]: 26, [from + 3]: 30 } };
    const plan = revealPlan([many], 0);
    const levels = plan.beats.filter((b) => b.kind === 'level');
    expect(levels).toHaveLength(3);
    // Only the level that teaches stops the clock, near the end of its panel and before it folds.
    expect(plan.holds).toHaveLength(1);
    const taught = levels[1]!;
    expect(plan.holds[0]).toBe(taught.at + taught.dur * HOLD_AT);
    // The levels after the first that teach nothing take the shorter beat.
    expect(levels.map((b) => b.dur)).toEqual([RESULT_MS.level, RESULT_MS.level, RESULT_MS.levelNext]);
    expect(plan.stops).toContain(plan.holds[0]);
    // Each panel is up in its turn, and the Max HP the card reads rises with the level, not before it.
    expect(monAt(many, plan, 0).maxHp).toBe(20);
    expect(monAt(many, plan, taught.at + 10)).toMatchObject({ maxHp: 26, panel: { step: 1 } });
    expect(monAt(many, plan, levels[2]!.at + 10)).toMatchObject({ maxHp: 30, panel: { step: 2 } });
    expect(monAt(many, plan, plan.total).panel).toBeNull();
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

import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, FLEE_TOLL, runReducer, type NodeKind, type RunAction, type RunState } from '@/sim';
import { deserialiseRun, serialiseRun } from './save';

// §9.4.5 — the fight's record for its result screen (v0.9.30): where it was fought, against whom, the team as the fight
// left it — before the victory heal and the XP — the Badge a Gym pays, and what running cost.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

/** Into the first reachable node, dressed up as the kind of fight the test is about, with the fight begun. */
function into(kind: NodeKind, seed = 7, money = 0): RunState {
  let s = createRun('squirtle', seed, ctx);
  const id = s.reachable[0]!;
  s = produce(s, (d) => {
    d.map.nodes[id]!.kind = kind;
    d.money = money;
  });
  return apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
}

const finish = (s: RunState, outcome: 'victory' | 'escaped' | 'fled' | 'defeat', hp = 10) =>
  apply(s, {
    type: 'finish-combat',
    report: { outcome, team: s.activeUids.map((uid) => ({ uid, hp, status: null, fainted: hp <= 0 })), caught: null, ballsLeft: 0, turns: 3 },
  });

describe('The fight record — §9.4.5', () => {
  it('AWin_RecordsTheStageTheFoes_AndTheTeamBeforeTheHealAndTheXp', () => {
    const s = into('wild');
    const lead = s.box.find((m) => m.uid === s.activeUids[0])!;
    const after = finish(s, 'victory', 5);
    const rec = after.lastFight!;
    expect(rec.outcome).toBe('victory');
    expect(rec.kind).toBe('wild');
    expect(rec.stage).toBe(s.pendingScenario!.stage);
    expect(rec.trainer).toBeNull();
    expect(rec.foes.map((f) => f.speciesId)).toEqual(s.pendingScenario!.enemies.map((e) => e.species));
    const before = rec.before.find((b) => b.uid === lead.uid)!;
    // The fight's own HP, not the healed one: the result screen fills any heal (§5.6.4's breather, a relic's) on top.
    expect(before.hp).toBe(5);
    expect(after.box.find((m) => m.uid === lead.uid)!.hp).toBeGreaterThanOrEqual(5);
    // Level and XP before the award: the bar fills from here.
    expect(before.level).toBe(lead.level);
    expect(before.xp).toBe(lead.xp);
  });

  it('ATrainerFight_RecordsItsTrainer', () => {
    const s = into('trainer');
    const rec = finish(s, 'victory').lastFight!;
    expect(rec.trainer).toEqual(s.pendingScenario!.trainer);
    expect(rec.trainer).not.toBeNull();
  });

  it('AGymWin_RecordsTheBadgeItPays_BeforeTheNodeIsLeft', () => {
    const s = into('gym');
    const after = finish(s, 'victory');
    expect(after.lastFight!.badge).toBeTruthy();
    // The Badge itself is still awarded on leaving the node (§5.10), and it is the one recorded.
    expect(after.badges).not.toContain(after.lastFight!.badge);
    let left = apply(after, { type: 'claim-reward' });
    // A Gym's XP can carry a starter to its threshold: the Evolution screen comes first, then the node is left.
    while (left.phase === 'evolution') {
      const p = left.pendingEvolutions[0]!;
      left = apply(left, { type: 'choose-branch', uid: p.uid, branchId: p.branchIds[0]! });
    }
    expect(left.badges).toContain(after.lastFight!.badge);
  });

  it('Running_RecordsTheTollWithItsNumbers', () => {
    const s = into('wild', 7, 500);
    const lead = s.activeUids[0]!;
    const after = finish(s, 'escaped');
    const toll = after.lastFight!.toll!;
    expect(toll.money).toBe(Math.floor((500 * FLEE_TOLL.wild.moneyPct) / 100));
    expect(after.money).toBe(500 - toll.money);
    expect(toll.trauma).toEqual([lead]);
    expect(toll.lost).toBeNull();
  });

  it('ARunnerThatFled_AndADefeat_AreRecordedWithoutAToll', () => {
    expect(finish(into('wild'), 'fled').lastFight).toMatchObject({ outcome: 'fled' });
    expect(finish(into('wild'), 'fled').lastFight!.toll).toBeUndefined();
    expect(finish(into('wild'), 'defeat', 0).lastFight).toMatchObject({ outcome: 'defeat' });
  });

  it('TheRecord_SurvivesASaveAndLoad', () => {
    const after = finish(into('trainer'), 'victory');
    const back = deserialiseRun(serialiseRun(after, 0), content);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.run.lastFight).toEqual(after.lastFight);
  });
});

import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  ALL_GYMS, buildScenario, createRun, defaultRunCtx, effectiveMax, generateVictoryRoad, newPartyMon, runReducer, VICTORY_ROAD,
  type CombatOutcomeReport, type MapNode, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';
import { GameRng } from '@/sim/rng/gameRng';

// §2.12 — Victory Road: the third Gym won, the run climbs a small map of its own — Gauntlets, Training Grounds, the
// Summit — and a Perfect Clear can pay a Badge the run passed by.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const refusal = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;
const gymOf = (badge: string) => ALL_GYMS.find((g) => g.badgeId === badge)!.id;

/** A Region 3 run standing at its Legendary pick after the third Gym, with a team of three. */
function atTheLastGym(seed = 11): RunState {
  const run = structuredClone(createRun('squirtle', seed, ctx, 2)) as RunState;
  for (const id of ['golem', 'arcanine']) run.box.push(newPartyMon(id, 40, content, run.seed, `p-${id}`));
  run.activeUids = run.box.map((m) => m.uid);
  run.gymsOffered = [[gymOf('boulder-badge'), gymOf('cascade-badge')], [...run.map.gyms]];
  run.badges = ['boulder-badge'];
  run.phase = 'legendary';
  run.pendingLegendary = [];
  return run;
}
const onVictoryRoad = (seed = 11) => apply(atTheLastGym(seed), { type: 'pick-legendary', relicId: null });
/** Walk into the first reachable node of a kind, made one if the road has none in reach. */
function standOn(run: RunState, kind: MapNode['kind']): RunState {
  const s = structuredClone(run) as RunState;
  let id = s.reachable.find((n) => s.map.nodes[n]!.kind === kind);
  if (!id) {
    id = s.reachable[0]!;
    const make = Object.values(s.map.nodes).find((n) => n.kind === kind)!;
    s.map.nodes[id] = { ...s.map.nodes[id]!, kind, preview: structuredClone(make.preview) };
  }
  return apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
}
const report = (s: RunState, fainted = false): CombatOutcomeReport => ({
  outcome: 'victory', team: s.activeUids.map((uid, i) => ({ uid, hp: fainted && i === 0 ? 0 : 10, status: null, fainted: fainted && i === 0 })), caught: null, ballsLeft: 0, turns: 5,
});

describe('Victory Road, the map — §2.12', () => {
  const maps = Array.from({ length: 40 }, (_, i) => generateVictoryRoad(new RngStreams(500 + i).get('MapRNG'), content, 500 + i));

  it('FourColumnsOfThreeTracks_EveryPathReachesTheSummit_NoHealingOnTheWay', () => {
    for (const map of maps) {
      const nodes = Object.values(map.nodes);
      expect(nodes).toHaveLength(VICTORY_ROAD.columns * VICTORY_ROAD.rows.length + 1);
      expect(nodes.filter((n) => n.kind === 'summit')).toHaveLength(1);
      expect(nodes.some((n) => n.kind === 'aid' || n.kind === 'merchant')).toBe(false);
      // Every node leads on to the Summit.
      const summit = nodes.find((n) => n.kind === 'summit')!.id;
      const reaches = (id: string): boolean => id === summit || map.nodes[id]!.next.some(reaches);
      for (const n of nodes) expect(reaches(n.id), n.id).toBe(true);
    }
  });

  it('OneOrTwoGauntlets_OnDifferentTracks_InTheMiddle_AndOneOrTwoTrainingGrounds', () => {
    for (const map of maps) {
      const g = Object.values(map.nodes).filter((n) => n.kind === 'gauntlet');
      expect(g.length).toBeGreaterThanOrEqual(1);
      expect(g.length).toBeLessThanOrEqual(2);
      expect(new Set(g.map((n) => n.col)).size).toBe(g.length);
      for (const n of g) expect([1, 2]).toContain(n.layer);
      const t = Object.values(map.nodes).filter((n) => n.kind === 'training');
      expect(t.length).toBeGreaterThanOrEqual(1);
      expect(t.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('Victory Road, the run — §2.12', () => {
  it('TheThirdGymWon_ClimbsVictoryRoad_NotTheEnd', () => {
    const s = onVictoryRoad();
    expect(s.outcome).toBe('in-progress');
    expect(s.zone).toBe('victory-road');
    expect(s.phase).toBe('map');
    expect(s.map.regionIndex).toBe(VICTORY_ROAD.regionIndex);
    expect(s.reachable).toEqual(s.map.entry);
  });

  it('Gauntlet_AnEliteTierAceTrainer_TwoAtATime_EveryPokemonTwoPhase', () => {
    const s = onVictoryRoad();
    const node = Object.values(s.map.nodes).find((n) => n.kind === 'gauntlet')!;
    const sc = buildScenario(node, s, content, new GameRng(3))!;
    expect(sc.onField).toBe(2);
    expect(sc.enemies.length).toBe(VICTORY_ROAD.gauntlet.size);
    for (const e of sc.enemies) {
      expect(e.tier).toBe('elite');
      expect(e.phaseCount).toBe(2);
    }
    expect(sc.stage).toBe('cave');
  });

  it('Gauntlet_NoBreather_ARareRelicPick_AndAPerfectClearPaysABadgePassedBy', () => {
    const s = standOn(onVictoryRoad(), 'gauntlet');
    const hpBefore = s.box.map((m) => m.hp);
    const after = apply(s, { type: 'finish-combat', report: report(s) });
    // HP carried out is exactly the fight's: 10 each, no breather on top.
    for (const uid of s.activeUids) expect(after.box.find((m) => m.uid === uid)!.hp).toBe(10);
    expect(hpBefore.length).toBeGreaterThan(0);
    expect(after.pendingReward!.relicPick!.length).toBeGreaterThan(0);
    // Misty was offered beside Brock and never beaten: hers is the Perfect Clear's Badge.
    expect(after.badges).toContain('cascade-badge');
    expect(after.bonusBadge).toBe('cascade-badge');
  });

  it('Gauntlet_AFaint_NoBadge_AndOnlyOneBonusBadgeARun', () => {
    const s = standOn(onVictoryRoad(), 'gauntlet');
    expect(apply(s, { type: 'finish-combat', report: report(s, true) }).bonusBadge).toBeUndefined();
    const once = structuredClone(s) as RunState;
    once.bonusBadge = 'boulder-badge';
    expect(apply(once, { type: 'finish-combat', report: report(once) }).badges).toEqual(once.badges);
  });

  it('TrainingGrounds_OneUpgradeForOnePokemon_ThenTheRoad', () => {
    const base = standOn(onVictoryRoad(), 'training');
    expect(base.phase).toBe('training');
    const mon = base.box[0]!;
    // A stat, carried into every fight after.
    const stat = apply(base, { type: 'train', uid: mon.uid, upgrade: 'stat', stat: 'attack' });
    expect(stat.box[0]!.boosts?.attack).toBe(VICTORY_ROAD.statBoost.attack);
    expect(stat.phase).toBe('map');
    // A level.
    expect(apply(base, { type: 'train', uid: mon.uid, upgrade: 'level' }).box[0]!.level).toBe(mon.level + 1);
    // A move that has no stronger self is refused.
    expect(refusal(base, { type: 'train', uid: mon.uid, upgrade: 'move-upgrade', moveId: 'no-such-move' })).toBe('no-upgrade');
    // Walking on spends nothing.
    expect(apply(base, { type: 'leave-training' }).box).toEqual(base.box);
  });

  it('Summit_HealsTheWholeBox_OffersRelics_AndTheGateEndsTheRunWon', () => {
    const hurt = structuredClone(onVictoryRoad()) as RunState;
    for (const m of hurt.box) m.hp = 1;
    const s = standOn(hurt, 'summit');
    expect(s.phase).toBe('summit');
    for (const m of s.box) expect(m.hp).toBe(effectiveMax(s, m, content));
    expect(s.pendingSummit!.relics.length).toBeGreaterThan(0);
    const relic = s.pendingSummit!.relics[0]!;
    const after = apply(s, { type: 'enter-league', relicId: relic });
    expect(after.relics).toContain(relic);
    expect(after.outcome).toBe('victory');
  });
});

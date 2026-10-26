import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { completedRegions, createRun, defaultRunCtx, LEAGUE_MEMBERS, runReducer, type RunAction, type RunState } from '@/sim';

const ctx = defaultRunCtx(buildRegistry());
const apply = (run: RunState, action: RunAction): RunState => {
  const result = runReducer(run, action, ctx);
  expect(result.rejected).toBeUndefined();
  return result.state;
};
const fresh = (regionIndex: number) => structuredClone(createRun('squirtle', 11, ctx, regionIndex));

function fight(run: RunState, nodeId: string, outcome: 'victory' | 'defeat'): RunState {
  let next = apply(apply(run, { type: 'enter-node', nodeId }), { type: 'begin-combat' });
  next = apply(next, { type: 'finish-combat', report: {
    outcome, team: next.activeUids.map((uid) => ({ uid, hp: outcome === 'defeat' ? 0 : 20, status: null, fainted: outcome === 'defeat' })),
    caught: null, ballsLeft: 0, turns: 8,
  } });
  if (next.phase === 'reward') next = apply(next, { type: 'claim-reward' });
  for (let guard = 0; guard < 6 && next.phase === 'evolution'; guard++) {
    const pending = next.pendingEvolutions[0]!;
    next = apply(next, { type: 'choose-branch', uid: pending.uid, branchId: pending.branchIds[0]! });
  }
  return next;
}

function victoryRoad(): RunState {
  const run = fresh(2);
  run.phase = 'legendary';
  run.pendingLegendary = [];
  return apply(run, { type: 'pick-legendary', relicId: null });
}

describe('Completed regions — §2.1.3–§2.1.7', () => {
  for (const regionIndex of [0, 1, 2]) {
    it(`Defeat_Region${regionIndex + 1}Gym_DoesNotCountTheUnbeatenRegion`, () => {
      const run = fresh(regionIndex);
      const gym = Object.values(run.map.nodes).find((node) => node.kind === 'gym')!;
      run.reachable = [gym.id];
      const lost = fight(run, gym.id, 'defeat');
      expect(lost.outcome).toBe('defeat');
      expect(completedRegions(lost)).toBe(regionIndex);
    });
  }

  it('ThirdGym_LeavesForVictoryRoad_AllRegionsRemainClearedAfterDefeat', () => {
    const run = structuredClone(victoryRoad());
    expect(run.zone).toBe('victory-road');
    expect(run.regionIndex).toBe(2);
    expect(completedRegions(run)).toBe(3);
    const gauntlet = Object.values(run.map.nodes).find((node) => node.kind === 'gauntlet')!;
    run.reachable = [gauntlet.id];
    const lost = fight(run, gauntlet.id, 'defeat');
    expect(lost.outcome).toBe('defeat');
    expect(completedRegions(lost)).toBe(3);
  });

  it('League_EachDoorDefeatedAndChampionWon_AllThreeRegionsStayCleared', () => {
    const run = structuredClone(victoryRoad());
    const summit = Object.values(run.map.nodes).find((node) => node.kind === 'summit')!;
    run.reachable = [summit.id];
    let league = apply(apply(run, { type: 'enter-node', nodeId: summit.id }), { type: 'begin-combat' });
    league = apply(league, { type: 'enter-league', relicId: null });
    for (const member of LEAGUE_MEMBERS) {
      const nodeId = league.reachable[0]!;
      expect(league.map.nodes[nodeId]!.preview.rosterId).toBe(member.id);
      const lost = fight(league, nodeId, 'defeat');
      expect(lost.outcome).toBe('defeat');
      expect(completedRegions(lost)).toBe(3);
      league = fight(league, nodeId, 'victory');
      expect(completedRegions(league)).toBe(3);
    }
    expect(league.outcome).toBe('victory');
  });

  it('ClearedGym_CurrentRegionCountsWithoutCountingExtraBadges', () => {
    const run = fresh(1);
    const gym = Object.values(run.map.nodes).find((node) => node.kind === 'gym')!;
    run.badges = ['boulder-badge', 'cascade-badge', 'thunder-badge', 'marsh-badge'];
    run.position = gym.id;
    expect(completedRegions(run)).toBe(1);
    run.visited.push(gym.id);
    expect(completedRegions(run)).toBe(2);
  });

  it('LegacyVictory_WithoutZoneOrGymHistory_CountsTheFinalRegion', () => {
    const run = fresh(2);
    run.outcome = 'victory';
    run.phase = 'ended';
    expect(completedRegions(run)).toBe(3);
  });
});

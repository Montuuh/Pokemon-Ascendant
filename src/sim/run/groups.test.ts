import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { createCombat } from '../combat/setup';
import { DEFAULT_BATTLE_CONFIG } from '../combat/battleConfig';
import { GameRng } from '../rng/gameRng';
import { buildScenario } from './encounter';
import { GROUP_RATES, groupPlanFor, roleFromKit } from './groups';
import { createRun, defaultRunCtx } from './run';
import type { MapNode, RunState } from './types';

// §5.6.3 — where groups stand in a run: a stable plan per node, the shapes it builds, and how often each appears.

const ctx = defaultRunCtx(content);
const nodesOf = (run: RunState, kind: MapNode['kind']) => Object.values(run.map.nodes).filter((n) => n.kind === kind);

describe('Groups across the run — §5.6.3', () => {
  it('Plan_IsStable_SameNodeSameRun_SameShape_AndLeavesTheMapAlone', () => {
    const a = createRun('squirtle', 11, ctx);
    const b = createRun('squirtle', 11, ctx);
    expect(JSON.stringify(a.map)).toBe(JSON.stringify(b.map));
    for (const n of Object.values(a.map.nodes)) expect(groupPlanFor(n, a)).toEqual(groupPlanFor(n, b));
  });

  it('Rates_OverManyRuns_LandNearTheirTable', () => {
    let wild = 0, packs = 0, callers = 0, trainers = 0, pairs = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const run = createRun('squirtle', seed, ctx);
      for (const n of nodesOf(run, 'wild')) {
        wild += 1;
        const p = groupPlanFor(n, run);
        if (p.kind === 'pack') packs += 1;
        if (p.kind === 'caller') callers += 1;
      }
      for (const n of nodesOf(run, 'trainer')) {
        if ((n.preview.enemies ?? []).length < 2) continue;
        trainers += 1;
        if (groupPlanFor(n, run).kind === 'pair') pairs += 1;
      }
    }
    const r1 = GROUP_RATES[0]!;
    expect(packs / wild).toBeCloseTo(r1.wildPack, 1);
    expect(callers / wild).toBeCloseTo(r1.wildCaller, 1);
    if (trainers > 20) expect(pairs / trainers).toBeCloseTo(r1.trainerPair, 1);
  });

  it('Build_Pack_TheWildLeads_CompanionsFromItsBiome_Supports', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const run = createRun('squirtle', seed, ctx);
      const node = nodesOf(run, 'wild').find((n) => groupPlanFor(n, run).kind === 'pack');
      if (!node) continue;
      const plan = groupPlanFor(node, run);
      const sc = buildScenario(node, run, content, new GameRng(seed))!;
      expect(sc.onField).toBe(plan.kind === 'pack' ? plan.size : 0);
      expect(sc.enemies[0]!.species).toBe(node.preview.speciesIds[0]);
      expect(sc.enemies.slice(1).every((e) => e.role && e.level < sc.enemies[0]!.level)).toBe(true);
      // And it is a fight the combat sim can open.
      expect(createCombat(sc, { content, config: DEFAULT_BATTLE_CONFIG }).enemies).toHaveLength(sc.onField!);
      return;
    }
    throw new Error('no pack in 80 runs');
  });

  it('Build_Caller_CarriesCallForHelp_AndItsCompanion', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const run = createRun('squirtle', seed, ctx);
      const node = nodesOf(run, 'wild').find((n) => groupPlanFor(n, run).kind === 'caller');
      if (!node) continue;
      const lead = buildScenario(node, run, content, new GameRng(seed))!.enemies[0]!;
      expect(lead.moves).toContain('call-for-help');
      expect(lead.helpers?.length).toBe(GROUP_RATES[0]!.callerHelpers);
      return;
    }
    throw new Error('no caller in 80 runs');
  });

  it('Build_Region2Elite_BringsASupport_OnFieldTwo', () => {
    const run = createRun('squirtle', 5, ctx, 1);
    const node = nodesOf(run, 'elite')[0]!;
    expect(groupPlanFor(node, run).kind).toBe('support');
    const sc = buildScenario(node, run, content, new GameRng(5))!;
    expect(sc.onField).toBe(2);
    expect(sc.enemies[1]!.role).toBeDefined();
    // The support takes the Region's stat tier like everyone else (§2.2).
    expect(sc.enemies[1]!.attackMultiplier).toBeGreaterThan(1);
  });

  it('Build_Region3EliteWild_ActsTwice_AtLessHp', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const run = createRun('squirtle', seed, ctx, 2);
      const node = nodesOf(run, 'elite-wild')[0];
      if (!node) continue;
      const e = buildScenario(node, run, content, new GameRng(seed))!.enemies[0]!;
      expect(e.acts).toBe(2);
      expect(e.hpMultiplier).toBeLessThan(1.2);
      return;
    }
    throw new Error('no Elite Wild in 40 Region 3 runs');
  });

  it('Region1Gym_And_Elite_StaySingle', () => {
    const run = createRun('squirtle', 3, ctx);
    for (const n of [...nodesOf(run, 'gym'), ...nodesOf(run, 'elite')]) expect(groupPlanFor(n, run).kind).toBe('single');
  });

  it('RoleFromKit_HealMakesAHealer_StatusADebuffer_ElseAttacker', () => {
    expect(roleFromKit(['softboiled', 'pound'], content)).toBe('healer');
    expect(roleFromKit(['calm-mind', 'pound'], content)).toBe('buffer');
    expect(roleFromKit(['poison-powder', 'vine-whip'], content)).toBe('debuffer');
    expect(roleFromKit(['tackle', 'peck'], content)).toBe('attacker');
  });
});

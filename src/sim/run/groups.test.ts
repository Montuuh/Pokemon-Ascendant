import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { createCombat } from '../combat/setup';
import { DEFAULT_BATTLE_CONFIG } from '../combat/battleConfig';
import { GameRng } from '../rng/gameRng';
import { buildScenario } from './encounter';
import { GROUP_RATES, ROLE_SHARE, SOCIAL_CALLERS, groupPlanFor, roleFor } from './groups';
import { TEAM_SIZE } from './region';
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
        const k = groupPlanFor(n, run).kind;
        if (k === 'pair' || k === 'trio') pairs += 1;
      }
    }
    const r1 = GROUP_RATES[0]!;
    expect(packs / wild).toBeCloseTo(r1.wildPack, 1);
    // Callers: the table's share of the rest, plus every social species (§5.6.2) that did not roll a pack.
    expect(callers / wild).toBeGreaterThanOrEqual(r1.wildCaller - 0.05);
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

  it('Build_EliteAndGym_FightTwoAtATime_WithTheirWholeTeam', () => {
    for (const regionIndex of [0, 1, 2]) {
      const run = createRun('squirtle', 5, ctx, regionIndex);
      for (const kind of ['elite', 'gym'] as const) {
        const node = nodesOf(run, kind)[0]!;
        expect(groupPlanFor(node, run).kind).toBe('double');
        const sc = buildScenario(node, run, content, new GameRng(5))!;
        expect(sc.onField).toBe(2);
        expect(sc.enemies.length).toBeGreaterThanOrEqual(4);
        // Their Pokémon are the team, not supports: full HP, no role.
        expect(sc.enemies.every((e) => !e.role)).toBe(true);
      }
    }
  });

  it('SocialSpecies_AlwaysComesReadyToCall', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const run = createRun('squirtle', seed, ctx);
      const node = nodesOf(run, 'wild').find((n) => SOCIAL_CALLERS.includes(n.preview.speciesIds[0]!));
      if (!node) continue;
      const lead = buildScenario(node, run, content, new GameRng(seed))!.enemies[0]!;
      expect(lead.moves).toContain('call-for-help');
      expect(lead.helpers!.every((h) => h.species === lead.species)).toBe(true);
      return;
    }
    throw new Error('no social species led a wild node in 120 runs');
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

  it('Trainers_CarryTheirRegionsTeamSize', () => {
    const run = createRun('squirtle', 3, ctx);
    for (const n of nodesOf(run, 'trainer')) expect(n.preview.enemies!.length).toBeGreaterThanOrEqual(TEAM_SIZE.trainer[0]);
  });

  it('RoleFor_MostSupportsAttack_AQuarterDefend_AFifthBuff_§5.6', () => {
    // §5.6 (v0.8.6) — most supports hit; a quarter defend; a fifth buff, if their kit can.
    const rng = new GameRng(7);
    const n = 4000;
    const tally = { attacker: 0, defender: 0, buffer: 0 };
    for (let i = 0; i < n; i++) tally[roleFor(['calm-mind', 'pound'], rng, content)] += 1;
    expect(Math.abs(tally.defender / n - ROLE_SHARE.defender)).toBeLessThan(0.03);
    expect(Math.abs(tally.buffer / n - ROLE_SHARE.buffer)).toBeLessThan(0.03);
    expect(tally.attacker / n).toBeGreaterThan(0.5);
    // A kit with nothing to buff, lower or afflict never Buffs.
    for (let i = 0; i < 500; i++) expect(roleFor(['tackle', 'peck'], rng, content)).not.toBe('buffer');
  });
});

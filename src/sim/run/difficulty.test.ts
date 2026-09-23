import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  createRun, defaultRunCtx, evolvedAt, levelXpFactor, runReducer, statTierFor, DEFAULT_PROGRESSION,
  REGION_STAT_TIER, STATUS_ACCENT_FALLBACK, STATUS_ACCENT_MOVES,
  type RunAction, type RunState,
} from '@/sim';
import { PIDGEY, scenario, start } from '@/sim/testing/harness';

// §2.2, §2.2.1, §6.2.1 — how a later Region gets harder: the status accent, the enemy stat tier, enemies at the
// forms their levels warrant, and XP that stops a team running away from its Region's band.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

/** The first fight on offer in a Region, as the scenario the combat would be built from. */
function firstFight(regionIndex: number, modifiers: string[] = [], kind?: string) {
  let s = createRun('squirtle', 7, ctx, regionIndex, modifiers);
  const id = s.reachable.find((n) => (kind ? s.map.nodes[n]!.kind === kind : ['wild', 'trainer'].includes(s.map.nodes[n]!.kind)))!;
  s = apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
  return s.pendingScenario!;
}

const isStatusMove = (id: string) => {
  const m = content.move(id);
  return m.power === 0 && m.effects.some((fx) => fx.kind === 'status' && !fx.self);
};

describe('Enemies at the forms their levels warrant — §2.7.3', () => {
  it('EvolvedAt_WalksTheLine_AsFarAsTheLevelReaches', () => {
    expect(evolvedAt('caterpie', 5, content)).toBe('caterpie');
    expect(evolvedAt('caterpie', 8, content)).toBe('metapod');
    expect(evolvedAt('caterpie', 20, content)).toBe('butterfree');
    expect(evolvedAt('geodude', 11, content)).toBe('geodude');
    expect(evolvedAt('geodude', 29, content)).toBe('golem');
    expect(evolvedAt('magikarp', 17, content)).toBe('magikarp');
    expect(evolvedAt('magikarp', 18, content)).toBe('gyarados');
  });

  it('RegionOne_KeepsItsRosters_TheLaterRegionsEvolveThem', () => {
    const r1 = createRun('squirtle', 7, ctx, 0);
    const r2 = createRun('squirtle', 7, ctx, 1);
    // Region 1 is tuned as it stands: a Geodude in its trunk is still a Geodude, whatever its level.
    const r1Species = Object.values(r1.map.nodes).flatMap((n) => n.preview.speciesIds);
    expect(r1Species.some((id) => evolvedAt(id, 30, content) !== id), 'Region 1 fields basic forms').toBe(true);
    // Region 2's rosters are already at their forms, and the preview names what the fight will field.
    for (const n of Object.values(r2.map.nodes)) {
      for (const e of n.preview.enemies ?? []) expect(evolvedAt(e.species, e.level, content), `${n.id} ${e.species}@${e.level}`).toBe(e.species);
      if (n.kind === 'wild') for (const id of n.preview.speciesIds) expect(evolvedAt(id, n.preview.levelBand[0], content), `${n.id} ${id}`).toBe(id);
    }
  });

  it('TheGym_FightsTheSpeciesItsPreviewNamed', () => {
    let s = createRun('squirtle', 7, ctx, 1);
    const gym = Object.values(s.map.nodes).find((n) => n.kind === 'gym')!;
    s = { ...s, reachable: [gym.id] };
    s = apply(apply(s, { type: 'enter-node', nodeId: gym.id }), { type: 'begin-combat' });
    expect(s.pendingScenario!.enemies.map((e) => e.species)).toEqual(gym.preview.enemies!.map((e) => e.species));
  });
});

describe('The status accent — §2.2', () => {
  it('RegionOne_EnemiesKeepTheirOwnKits', () => {
    for (const e of firstFight(0).enemies) expect(e.moves).toBeUndefined();
  });

  it('FromRegionTwo_EveryEnemyCarriesAStatusMove', () => {
    for (const regionIndex of [1, 2]) {
      for (const e of firstFight(regionIndex).enemies) {
        expect(e.moves?.some(isStatusMove), `${e.species} in Region ${regionIndex + 1}`).toBe(true);
        const type = content.species(e.species).types[0]!;
        const kitHadOne = e.moves!.slice(0, -1).some(isStatusMove);
        if (!kitHadOne) expect(e.moves!.at(-1)).toBe(STATUS_ACCENT_MOVES[type] ?? STATUS_ACCENT_FALLBACK);
      }
    }
  });

  it('EveryAccentMove_IsAPureStatusMove_InTheContent', () => {
    for (const id of [...Object.values(STATUS_ACCENT_MOVES), STATUS_ACCENT_FALLBACK]) expect(isStatusMove(id!), id).toBe(true);
  });
});

describe('The enemy stat tier — §2.2.1', () => {
  it('RegionOne_IsTheBaseline_LaterRegionsScaleHpAndAttack', () => {
    for (const e of firstFight(0).enemies) {
      expect(e.hpMultiplier).toBeUndefined();
      expect(e.attackMultiplier).toBeUndefined();
    }
    // A multiplier of exactly 1 is not written onto the enemy at all, hence the `?? 1`.
    for (const e of firstFight(1).enemies) {
      expect(e.hpMultiplier ?? 1).toBeCloseTo(REGION_STAT_TIER[1]!.hp);
      expect(e.attackMultiplier ?? 1).toBeCloseTo(REGION_STAT_TIER[1]!.attack);
    }
    expect(REGION_STAT_TIER[1]!.attack).toBeGreaterThan(1);
  });

  it('GreaterThreats_BorrowsTheNextRegionsTier_AndExtrapolatesPastTheLast_§8.8', () => {
    for (const e of firstFight(0, ['greater-threats']).enemies) expect(e.attackMultiplier ?? 1).toBeCloseTo(REGION_STAT_TIER[1]!.attack);
    const top = REGION_STAT_TIER[2]!;
    const prev = REGION_STAT_TIER[1]!;
    expect(statTierFor(2, true).hp).toBeCloseTo(top.hp + (top.hp - prev.hp));
    expect(statTierFor(2, true).attack).toBeCloseTo(top.attack + (top.attack - prev.attack));
    expect(statTierFor(2, false)).toEqual(top);
  });

  it('TheAttackTier_ReachesTheCombatant', () => {
    const plain = start(scenario({ team: [{ species: 'squirtle', level: 10 }], enemies: [PIDGEY] }));
    const scaled = start(scenario({ team: [{ species: 'squirtle', level: 10 }], enemies: [{ ...PIDGEY, attackMultiplier: 1.5 }] }));
    expect(scaled.enemies[0]!.base.attack).toBe(Math.round(plain.enemies[0]!.base.attack * 1.5));
  });
});

describe('XP scales with the level gap — §6.2.1', () => {
  it('LevelXpFactor_IsOneAtParity_LessAbove_MoreBelow', () => {
    expect(levelXpFactor(20, 20)).toBeCloseTo(1);
    expect(levelXpFactor(20, 30)).toBeLessThan(0.75);
    expect(levelXpFactor(20, 15)).toBeGreaterThan(1.2);
    expect(levelXpFactor(20, 30, { ...DEFAULT_PROGRESSION, xpLevelExponent: 0 })).toBe(1);
  });

  it('AnOverLevelledTeam_LearnsLessFromTheSameFight', () => {
    const fight = (level: number) => {
      let s = createRun('squirtle', 7, ctx, 0);
      s = { ...s, box: s.box.map((m) => ({ ...m, level })) };
      s = apply(apply(s, { type: 'enter-node', nodeId: s.reachable.find((n) => s.map.nodes[n]!.kind === 'wild')! }), { type: 'begin-combat' });
      s = apply(s, { type: 'finish-combat', report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: s.balls, turns: 3 } });
      return s.pendingReward!.xpAwarded[0]!.amount;
    };
    expect(fight(20)).toBeLessThan(fight(6));
  });
});

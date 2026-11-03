import { describe, expect, it } from 'vitest';
import { ctx, dispatch, eventsOf, scenario, start, tweak } from '../testing/harness';
import { cancelPhaseOnFaint } from './phases';
import type { CombatState, EnemyCombatant } from './state';
import { ALL_GYMS } from '../run/region';
import { CHAMPION_SIGNATURE, LEAGUE_MEMBERS } from '../run/league';

const TEAM = [{ species: 'wartortle', level: 21 }, { species: 'ivysaur', level: 21 }, { species: 'charmeleon', level: 21 }];
const GOLEM = { species: 'golem', level: 21, tier: 'boss' as const, phaseCount: 3 as const, moves: ['rock-slide', 'earthquake', 'harden', 'tackle'], signature: { move: 'earthquake', response: 'A Flying or Levitating Lead.' } };
const MACHAMP = { species: 'machamp', level: 21, tier: 'boss' as const, phaseCount: 3 as const, moves: ['karate-chop', 'submission', 'seismic-toss', 'thunder-punch'], signature: { move: 'submission', response: 'Ghost immunity.' } };

const ace = (s: CombatState): EnemyCombatant => s.enemies[0]!;
/** HP set the way a hit sets it: the latch runs, as it does after every hit. */
const hurtTo = (s: CombatState, fraction: number) =>
  tweak(s, (d) => {
    const e = d.enemies[0]!;
    e.hp = Math.max(1, Math.floor(e.maxHp * fraction));
    const at = fraction <= ctx.config.bossPhase3HpThreshold && e.phaseCount >= 3 ? 3 : fraction <= ctx.config.bossPhase2HpThreshold ? 2 : 1;
    if (at > Math.max(e.phase, e.pendingPhase ?? 1)) e.pendingPhase = at as 2 | 3;
  });

describe('Phase commit — §5.8.3', () => {
  it('Latch_ThresholdCrossed_PendingUntilNextTurn_IntentUnchanged', () => {
    let s = start(scenario({ kind: 'boss', team: TEAM, enemies: [GOLEM] }));
    const declared = ace(s).intent;
    s = hurtTo(s, 0.45);
    expect(ace(s).phase).toBe(1);
    expect(ace(s).pendingPhase).toBe(2);
    expect(ace(s).intent).toEqual(declared);
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).phase).toBe(2);
    expect(ace(s).pendingPhase).toBeUndefined();
  });

  it('Heal_BeforeCommit_DoesNotCancelPendingPhase', () => {
    let s = hurtTo(start(scenario({ kind: 'boss', team: TEAM, enemies: [GOLEM] })), 0.45);
    s = tweak(s, (d) => {
      d.enemies[0]!.hp = d.enemies[0]!.maxHp;
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).phase).toBe(2);
  });

  it('Entrenchment_EnteredOnce_HealingNeverReverses', () => {
    let s = dispatch(hurtTo(start(scenario({ kind: 'boss', team: TEAM, enemies: [GOLEM] })), 0.45), { type: 'end-turn' });
    expect(ace(s).stages.defense).toBe(ctx.config.phase2EntrenchmentDefStages);
    s = tweak(s, (d) => {
      d.enemies[0]!.hp = d.enemies[0]!.maxHp;
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).phase).toBe(2);
    expect(ace(s).stages.defense).toBe(ctx.config.phase2EntrenchmentDefStages);
  });

  it('Skip_Phase1To3_OneEvent_Phase2EntryAppliedOnce', () => {
    const s = dispatch(hurtTo(start(scenario({ kind: 'boss', team: TEAM, enemies: [GOLEM] })), 0.1), { type: 'end-turn' });
    expect(ace(s).phase).toBe(3);
    expect(ace(s).stages.defense).toBe(ctx.config.phase2EntrenchmentDefStages);
    const events = eventsOf(s, 'phase');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ phase: 3, from: 1 });
  });

  it('Seed_EncounterBelowThreshold_CommitsBeforeFirstDraw', () => {
    const s = start(scenario({ kind: 'boss', team: TEAM, enemies: [{ ...GOLEM, hpPercent: 40 }] }));
    expect(ace(s).phase).toBe(2);
  });

  it('TempoTax_AppliesFromTheRefillAfterCommit', () => {
    const lapras = { species: 'lapras', level: 21, tier: 'boss' as const, phaseCount: 2 as const };
    let s = start(scenario({ kind: 'boss', team: TEAM, enemies: [lapras] }));
    expect(s.player.ap).toBe(ctx.config.baseApPerTurn);
    s = dispatch(hurtTo(s, 0.45), { type: 'end-turn' });
    expect(ace(s).phase).toBe(2);
    expect(s.player.ap).toBe(ctx.config.baseApPerTurn - ctx.config.phase2TempoApTax);
  });

  it('Phase3_NoLongerWipesEveryCooldown', () => {
    let s = hurtTo(start(scenario({ kind: 'boss', team: TEAM, enemies: [{ ...GOLEM, signature: undefined }] })), 0.1);
    s = tweak(s, (d) => {
      d.enemies[0]!.cooldowns['earthquake'] = 5;
      // This turn's action is not Earthquake, so nothing but the phase could clear its cooldown.
      d.enemies[0]!.intent = { kind: 'stall', moveId: null, targetSlot: null, hidden: false };
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).phase).toBe(3);
    expect(ace(s).cooldowns['earthquake']).toBeGreaterThan(0);
  });
});

describe('Signature — §5.8.3', () => {
  it('Signature_DeclaredOnce_CooldownWaived_VisibleUnderFog', () => {
    let s = start(scenario({ kind: 'boss', team: TEAM, enemies: [GOLEM], modifiers: ['dense-fog'] }));
    s = tweak(hurtTo(s, 0.1), (d) => {
      d.enemies[0]!.cooldowns['earthquake'] = 2;
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).intent).toMatchObject({ moveId: 'earthquake', signature: true, hidden: false });
    expect(ace(s).signature?.state).toBe('spent');
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).intent?.signature).toBeFalsy();
  });

  it('Signature_Paralysed_WaitsAndKeepsTheOpportunity', () => {
    let s = hurtTo(start(scenario({ kind: 'boss', team: TEAM, enemies: [MACHAMP] })), 0.1);
    s = tweak(s, (d) => {
      d.enemies[0]!.status = { kind: 'paralysis', appliedTurn: 0, turnsLeft: null };
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).intent?.signature).toBeFalsy();
    expect(ace(s).signature).toMatchObject({ state: 'ready', wait: 'paralysed' });
  });

  it('Signature_AlreadyAsleep_WaitsAndKeepsTheOpportunity', () => {
    let s = hurtTo(start(scenario({ kind: 'boss', team: TEAM, enemies: [MACHAMP] })), 0.1);
    s = tweak(s, (d) => {
      d.enemies[0]!.status = { kind: 'sleep', appliedTurn: 0, turnsLeft: 3 };
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).signature).toMatchObject({ state: 'ready', wait: 'asleep' });
  });

  it('Signature_IntoAnImmunity_WaitsForALegalTarget', () => {
    const ghosts = [{ species: 'haunter', level: 21 }, ...TEAM.slice(1)];
    let s = hurtTo(start(scenario({ kind: 'boss', team: ghosts, enemies: [MACHAMP] })), 0.1);
    s = dispatch(s, { type: 'end-turn' });
    expect(ace(s).signature).toMatchObject({ state: 'ready', wait: 'no-target' });
  });

  it('Faint_BeforeCommit_CancelsPendingAndSignature', () => {
    const s = hurtTo(start(scenario({ kind: 'boss', team: TEAM, enemies: [GOLEM] })), 0.1);
    const golem = structuredClone(ace(s));
    expect(golem.pendingPhase).toBe(3);
    // §5.8.3 — what onFaint runs for an enemy: nothing that had not begun survives the KO.
    cancelPhaseOnFaint(golem);
    expect(golem.pendingPhase).toBeUndefined();
    expect(golem.signature?.state).toBe('spent');
  });
});

describe('Authored signatures — §5.8.3 validation', () => {
  const aces = [
    ...ALL_GYMS.flatMap((g) => g.team.filter((m) => m.phaseCount === 3).map((m) => ({ where: g.id, ...m }))),
    ...LEAGUE_MEMBERS.filter((l) => l.id !== 'champion').flatMap((l) => l.team.filter((m) => m.phaseCount === 3).map((m) => ({ where: l.id, ...m }))),
    // The Champion's ace is the counter-pick to the run's starter: one profile per species it can be.
    ...Object.entries(CHAMPION_SIGNATURE).map(([species, signature]) => ({ where: 'champion', species, signature })),
  ];

  it('EveryThreePhaseAce_HasASignatureInItsKit_WithinTheAPCap', () => {
    expect(aces.length).toBeGreaterThan(10);
    for (const a of aces) {
      expect(a.signature, `${a.where} ${a.species}`).toBeDefined();
      const move = ctx.content.move(a.signature!.move);
      expect(move.power, `${a.where} ${a.signature!.move}`).toBeGreaterThan(0);
      expect(move.apCost, `${a.where} ${a.signature!.move}`).toBeLessThanOrEqual(ctx.config.baseApPerTurn);
      expect(a.signature!.response.length).toBeGreaterThan(10);
    }
  });

  it('AutoKitAce_KeepsItsSignatureInTheKit', () => {
    // Vileplume's Gym slot has no scripted kit: its learnset builds it, and the authored Petal Dance must stay in it.
    const s = start(scenario({ kind: 'boss', team: TEAM, enemies: [{ species: 'vileplume', level: 30, tier: 'boss', phaseCount: 3, signature: { move: 'petal-dance', response: 'Grass resistance.' } }] }));
    expect(ace(s).moveIds).toContain('petal-dance');
    expect(ace(s).moveIds).toHaveLength(4);
  });
});

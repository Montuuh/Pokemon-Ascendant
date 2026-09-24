import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, consumableCard, ctx, dispatch, eventsOf, handCard, reject, scenario, start, tweak, withConsumableHand, withHand } from '../testing/harness';
import { effectiveAttack, effectiveDefense } from './stats';
import { applyStatus, isImmuneToStatus } from './status';

const base = () => start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['antidote', 'full-heal', 'burn-heal', 'awakening'] }));

describe('Status conditions — §4.2', () => {
  it('Immunity_Table_PerType', () => {
    expect(isImmuneToStatus(['fire'], 'burn')).toBe(true);
    expect(isImmuneToStatus(['fire'], 'freeze')).toBe(true);
    expect(isImmuneToStatus(['ice'], 'freeze')).toBe(true);
    expect(isImmuneToStatus(['electric'], 'paralysis')).toBe(true);
    expect(isImmuneToStatus(['poison'], 'poison')).toBe(true);
    expect(isImmuneToStatus(['grass', 'poison'], 'poison')).toBe(true);
    expect(isImmuneToStatus(['water'], 'burn')).toBe(false);
  });

  it('ApplyStatus_Primary_ReplacesExisting_ConfusionCoexists', () => {
    const s = base();
    const c = structuredClone(s.player.team[1]!); // Squirtle
    expect(applyStatus(c, 'burn', 1, ctx.config)).toBe('applied');
    expect(applyStatus(c, 'paralysis', 1, ctx.config)).toBe('applied');
    expect(c.status?.kind).toBe('paralysis');
    expect(applyStatus(c, 'confusion', 1, ctx.config)).toBe('applied');
    expect(c.status?.kind).toBe('paralysis');
    expect(c.confusionTurns).toBe(3);
  });

  it('Burn_ReducesAttack25_Poison_ReducesDefense15_StageFirstThenStatus', () => {
    const s = base();
    const c = structuredClone(s.player.team[1]!);
    const atk = effectiveAttack(c, ctx.config);
    c.status = { kind: 'burn', appliedTurn: 0, turnsLeft: null };
    expect(effectiveAttack(c, ctx.config)).toBe(Math.floor(atk * 0.75));
    c.status = { kind: 'poison', appliedTurn: 0, turnsLeft: null };
    c.stages.defense = 2;
    expect(effectiveDefense(c, ctx.config)).toBe(Math.floor(c.base.defense * 1.2 * 0.85));
  });

  it('DoT_G7_AppliedTurnIsTelegraphOnly_TicksNextTurn', () => {
    // Poison applied "during" turn 1 → no tick at end of turn 1, tick at end of turn 2.
    let s = tweak(base(), (d) => {
      d.player.team[1]!.status = { kind: 'poison', appliedTurn: 1, turnsLeft: null };
    });
    const hp = s.player.team[1]!.hp;
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[1]!.hp).toBe(hp);
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[1]!.hp).toBe(hp - Math.max(1, Math.floor(s.player.team[1]!.maxHp / 16)));
    expect(eventsOf(s, 'damage').some((e) => (e as { cause: string }).cause === 'poison')).toBe(true);
  });

  it('Sleep_LastsOneTurn_ThenClears', () => {
    let s = tweak(base(), (d) => {
      d.player.team[0]!.status = { kind: 'sleep', appliedTurn: 1, turnsLeft: 1 };
    });
    s = dispatch(s, { type: 'end-turn' }); // end of turn 1: not active yet (applied this turn)
    expect(s.player.team[0]!.status?.kind).toBe('sleep');
    s = dispatch(s, { type: 'end-turn' }); // end of turn 2: expires
    expect(s.player.team[0]!.status).toBeNull();
  });

  it('Sleep_CannotLandOnASleepingOrFrozenPokemon_OtherStatusesStillReplaceIt', () => {
    // §4.2.2.4 — the playtest's sleep lock (2026-09-24): a sleeping Pokémon cannot be put back to sleep, and the
    // two silencing conditions do not chain into each other either.
    const s = base();
    const c = structuredClone(s.player.team[1]!);
    expect(applyStatus(c, 'sleep', 1, ctx.config)).toBe('applied');
    expect(applyStatus(c, 'sleep', 2, ctx.config)).toBe('already');
    expect(c.status?.appliedTurn).toBe(1);
    expect(applyStatus(c, 'freeze', 2, ctx.config)).toBe('already');
    expect(c.status?.kind).toBe('sleep');
    // Any other primary still replaces it, as §4.2 says: poisoning a sleeper wakes it into the poison.
    expect(applyStatus(c, 'poison', 2, ctx.config)).toBe('applied');
    expect(applyStatus(c, 'sleep', 3, ctx.config)).toBe('applied');
  });

  it('Paralysis_LastsThreeTurns', () => {
    let s = tweak(base(), (d) => {
      d.player.team[0]!.status = { kind: 'paralysis', appliedTurn: 0, turnsLeft: 3 };
    });
    for (let i = 0; i < 2; i++) s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[0]!.status?.kind).toBe('paralysis');
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[0]!.status).toBeNull();
  });

  it('Confusion_DiscardsOneSkillCardPerConfusedPokemon_ConsumablesImmune_FloorFour', () => {
    let s = tweak(base(), (d) => {
      for (const c of d.player.team) {
        c.confusionTurns = 3;
        c.confusionAppliedTurn = 1;
      }
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.hand).toHaveLength(2);
    expect(s.player.consumables.hand).toHaveLength(2);
    expect(eventsOf(s, 'confusion-discard')).toHaveLength(3);
    expect(s.player.team[0]!.confusionTurns).toBe(2);
  });

  it('Confusion_ExpiresAfterThreeDiscards', () => {
    let s = tweak(base(), (d) => {
      d.player.team[0]!.confusionTurns = 3;
      d.player.team[0]!.confusionAppliedTurn = 1;
    });
    for (let i = 0; i < 3; i++) s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[0]!.confusionTurns).toBe(0);
    expect(eventsOf(s, 'status-cleared').some((e) => (e as { status: string }).status === 'confusion')).toBe(true);
  });

  it('Freeze_FireDamageTimesOnePointFive', () => {
    let s = withHand(base(), ['ember']);
    const normal = s.enemies[0]!.hp;
    const p1 = dispatch(s, { type: 'play-card', cardId: handCard(s, 'ember').id });
    const dmgNormal = normal - p1.enemies[0]!.hp;
    s = tweak(s, (d) => {
      d.enemies[0]!.status = { kind: 'freeze', appliedTurn: 0, turnsLeft: 1 };
    });
    const p2 = dispatch(s, { type: 'play-card', cardId: handCard(s, 'ember').id });
    const dmgFrozen = normal - p2.enemies[0]!.hp;
    expect(dmgFrozen).toBeGreaterThan(dmgNormal);
  });

  it('StatusRider_ImmuneTarget_EmitsImmune', () => {
    // Ember's burn rider vs a Fire enemy: across seeds the rider must roll at least once and always be immune.
    let sawImmune = false;
    for (let seed = 1; seed < 40 && !sawImmune; seed++) {
      let t = start(scenario({ team: [{ species: 'charmander', level: 8 }], enemies: [{ species: 'charmander', level: 8, tier: 'wild', phaseCount: 1 }] }), seed);
      t = withHand(t, ['ember']);
      t = dispatch(t, { type: 'play-card', cardId: handCard(t, 'ember').id });
      sawImmune = eventsOf(t, 'status-immune').length > 0;
      expect(eventsOf(t, 'status-applied')).toHaveLength(0);
    }
    expect(sawImmune).toBe(true);
  });

  it('Consumable_Antidote_CuresPoison_FullHeal_CuresAll', () => {
    let s = tweak(base(), (d) => {
      d.player.team[0]!.status = { kind: 'poison', appliedTurn: 0, turnsLeft: null };
      d.player.team[0]!.confusionTurns = 2;
    });
    s = withConsumableHand(s, ['antidote', 'full-heal']);
    s = dispatch(s, { type: 'use-consumable', cardId: consumableCard(s, 'antidote').id, targetIndex: 0 });
    expect(s.player.team[0]!.status).toBeNull();
    expect(s.player.team[0]!.confusionTurns).toBe(2);
    s = dispatch(s, { type: 'use-consumable', cardId: consumableCard(s, 'full-heal').id, targetIndex: 0 });
    expect(s.player.team[0]!.confusionTurns).toBe(0);
    expect(s.player.consumables.used).toHaveLength(2);
  });

  it('Consumable_Ether_IsANetPlusOne_AndCapsAtMax_§7.2.4', () => {
    // §7.2.4 — it costs 1 AP and gives 2, so it is a net +1 and has to be played *before* the tank is empty.
    // The AP landed in v0.4; before that it was a free +2, which made a 4-AP ultimate a formality.
    let s = start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['ether', 'ether', 'ether'] }));
    s = withConsumableHand(s, ['ether', 'ether']);
    expect(s.player.ap).toBe(3);
    s = dispatch(s, { type: 'use-consumable', cardId: consumableCard(s, 'ether').id });
    expect(s.player.ap).toBe(4);
    s = dispatch(s, { type: 'use-consumable', cardId: consumableCard(s, 'ether').id });
    expect(s.player.ap).toBe(5);

    // And it still caps: from the maximum, the +2 is swallowed and only the cost is felt.
    let full = start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['ether'] }));
    full = tweak(withConsumableHand(full, ['ether']), (d) => { d.player.ap = ctx.config.maxApPerTurn; });
    full = dispatch(full, { type: 'use-consumable', cardId: consumableCard(full, 'ether').id });
    expect(full.player.ap).toBe(ctx.config.maxApPerTurn);
  });

  it('Consumable_Ether_IsUnplayableAtZeroAp_BecauseItCostsOne_§7.2.4', () => {
    // The corollary, and the thing that caught the balance harness out: at 0 AP an Ether is a brick.
    let s = start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['ether'] }));
    s = withConsumableHand(s, ['ether']);
    s = tweak(s, (d) => { d.player.ap = 0; });
    expect(reject(s, { type: 'use-consumable', cardId: consumableCard(s, 'ether').id })).toBe('not-enough-ap');
  });

  it('Consumables_UsedOnceAndNotRedrawn_UnusedReturnToPool', () => {
    let s = start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['potion', 'antidote'] }));
    s = withConsumableHand(s, ['potion', 'antidote']);
    s = dispatch(s, { type: 'use-consumable', cardId: consumableCard(s, 'potion').id, targetIndex: 0 });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.consumables.hand.map((c) => c.consumableId)).toEqual(['antidote']);
    expect(s.player.consumables.used).toHaveLength(1);
  });

  it('Regen_AquaRing_HealsForThreeTurns', () => {
    let s = start(scenario({ team: [{ species: 'blastoise', level: 30, hpPercent: 40, moves: ['aqua-ring', 'surf', 'water-gun', 'withdraw'] }], enemies: [{ species: 'caterpie', level: 3, tier: 'wild', phaseCount: 1 }] }));
    s = withHand(s, ['aqua-ring']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'aqua-ring').id });
    expect(s.player.team[0]!.regen?.turnsLeft).toBe(3);
    const before = s.player.team[0]!.hp;
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[0]!.hp).toBeGreaterThan(before - 5); // regen offsets the caterpie chip
    expect(eventsOf(s, 'heal').some((e) => (e as { cause: string }).cause === 'regen')).toBe(true);
  });
});

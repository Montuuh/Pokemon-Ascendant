import { describe, expect, it } from 'vitest';
import { PIDGEY, ctx, dispatch, eventsOf, handCard, leadOf, scenario, start, teamWithKit, tweak, withHand } from '../testing/harness';
import { abilityAttackMultiplier, abilityBlocksStatus, abilityDefenceMultiplier, abilityOnEnterLead, abilityRiposte, abilityTypeAbsorb } from './abilities';
import { breakdownFor } from './damageFlow';

// §6.5 — the six hooks v0.3 added. Each one is a simulation change rather than a content row, so each gets a
// test at the hook and, where the wiring is the interesting part, one through the reducer.

const withAbility = (species: string, abilityId: string, level = 16) =>
  start(
    scenario({
      team: [
        { species, level, abilityId },
        { species: 'squirtle', level: 12 },
        { species: 'bulbasaur', level: 12 },
      ],
      enemies: [PIDGEY],
    }),
  );

describe('Abilities — §6.5.2 (v0.3 hooks)', () => {
  it('Guts_BoostsAttackWhileStatused_AndCancelsBurnsPenalty_§6.5.2', () => {
    const s = withAbility('raticate', 'guts');
    const mon = structuredClone(leadOf(s));
    const move = ctx.content.move('tackle');
    expect(abilityAttackMultiplier(mon, move, ctx.content, ctx.config)).toBe(1);

    mon.status = { kind: 'poison', appliedTurn: 0, turnsLeft: null };
    expect(abilityAttackMultiplier(mon, move, ctx.content, ctx.config)).toBeCloseTo(1.3);

    // Burn normally costs 25 % Attack; Guts pays that back on top of its own boost.
    mon.status = { kind: 'burn', appliedTurn: 0, turnsLeft: null };
    expect(abilityAttackMultiplier(mon, move, ctx.content, ctx.config)).toBeCloseTo(1.3 / ctx.config.burnAttackMultiplier);
  });

  it('SolidRock_SoftensSuperEffectiveHitsOnly_§6.5.2', () => {
    const s = withAbility('graveler', 'solid-rock');
    const mon = leadOf(s);
    expect(abilityDefenceMultiplier(mon, 2, ctx.content)).toBe(0.75);
    expect(abilityDefenceMultiplier(mon, 1, ctx.content)).toBe(1);
    expect(abilityDefenceMultiplier(mon, 0.5, ctx.content)).toBe(1);
  });

  it('SolidRock_ReachesTheDamageNumber_NotJustTheHook', () => {
    const plain = withAbility('graveler', 'sturdy');
    const armoured = withAbility('graveler', 'solid-rock');
    const attacker = plain.enemies[0]!;
    const water = ctx.content.move('water-gun'); // ×4 into Rock/Ground
    const before = breakdownFor(attacker, leadOf(plain), water, false, ctx).final;
    const after = breakdownFor(attacker, leadOf(armoured), water, false, ctx).final;
    expect(after).toBeLessThan(before);
    // The multiplier lands before the single floor (§4.1.1), so the printed numbers can differ by one.
    expect(Math.abs(after - before * 0.75)).toBeLessThanOrEqual(1);
  });

  it('WaterAbsorb_HealsInsteadOfHurting_§6.5.2', () => {
    const s = withAbility('poliwhirl', 'water-absorb');
    const mon = leadOf(s);
    expect(abilityTypeAbsorb(mon, 'water', ctx.content)).toBe(Math.max(1, Math.floor(mon.maxHp * 0.2)));
    expect(abilityTypeAbsorb(mon, 'fire', ctx.content)).toBeNull();
  });

  it('WaterAbsorb_SwallowsTheCardWhole_NoDamageAndNoRider', () => {
    let s = start(scenario({ team: teamWithKit(['water-gun', 'tackle']), enemies: [PIDGEY] }));
    s = tweak(s, (d) => {
      d.enemies[0]!.abilityIds = ['water-absorb'];
      d.enemies[0]!.hp = Math.max(1, d.enemies[0]!.maxHp - 20);
    });
    s = withHand(s, ['water-gun']);
    const before = s.enemies[0]!.hp;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    expect(s.enemies[0]!.hp).toBeGreaterThan(before);
    expect(eventsOf(s, 'damage')).toHaveLength(0);
  });

  it('InnerFocus_BlocksItsOneStatus_AndNothingElse_§6.5.2', () => {
    const s = withAbility('golbat', 'inner-focus');
    const mon = leadOf(s);
    expect(abilityBlocksStatus(mon, 'confusion', ctx.content)).toBe(true);
    expect(abilityBlocksStatus(mon, 'sleep', ctx.content)).toBe(false);
  });

  it('InnerFocus_ReadsLikeATypeImmunityToThePlayer', () => {
    let s = start(scenario({ team: teamWithKit(['supersonic', 'water-gun']), enemies: [PIDGEY] }));
    s = tweak(s, (d) => {
      d.enemies[0]!.abilityIds = ['inner-focus'];
    });
    s = withHand(s, ['supersonic']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'supersonic').id });
    expect(s.enemies[0]!.confusionTurns).toBe(0);
    expect(eventsOf(s, 'status-immune')).toHaveLength(1);
  });

  it('PoisonPoint_AnswersAMeleeAttacker_ButNotARangedOne_§6.5.2', () => {
    const s = withAbility('beedrill', 'poison-point');
    const mon = leadOf(s);
    expect(abilityRiposte(mon, ctx.content.move('tackle'), ctx.content)).toEqual({ status: 'poison', chance: 0.3 });
    expect(abilityRiposte(mon, ctx.content.move('water-gun'), ctx.content)).toBeNull();
  });

  it('Riposte_LandsOnTheAttacker_AtFullChance', () => {
    let s = start(scenario({ team: teamWithKit(['tackle', 'water-gun']), enemies: [PIDGEY] }));
    s = tweak(s, (d) => {
      d.enemies[0]!.abilityIds = ['effect-spore'];
    });
    s = withHand(s, ['tackle']);
    // Run it enough times that a 30 % rider is overwhelmingly likely to land at least once.
    let poisoned = false;
    for (let seed = 0; seed < 25 && !poisoned; seed++) {
      let attempt = tweak(s, (d) => {
        d.rngCursor = seed;
      });
      attempt = dispatch(attempt, { type: 'play-card', cardId: handCard(attempt, 'tackle').id });
      if (leadOf(attempt).status?.kind === 'poison') poisoned = true;
    }
    expect(poisoned).toBe(true);
  });

  it('Intimidate_DropsEveryEnemyAttack_Steadfast_RaisesItsOwn_§6.5.3.5', () => {
    const intimidating = withAbility('gyarados', 'intimidate', 20);
    expect(abilityOnEnterLead(leadOf(intimidating), ctx.content)).toEqual([{ target: 'foe', stat: 'attack', stages: -1 }]);
    const steady = withAbility('machoke', 'steadfast');
    expect(abilityOnEnterLead(leadOf(steady), ctx.content)).toEqual([{ target: 'self', stat: 'attack', stages: 1 }]);
  });

  it('Intimidate_FiresOnAManualSwap_NotOnlyAtCombatStart', () => {
    let s = start(
      scenario({
        team: [
          { species: 'squirtle', level: 12 },
          { species: 'gyarados', level: 20, abilityId: 'intimidate' },
          { species: 'bulbasaur', level: 12 },
        ],
        enemies: [PIDGEY],
      }),
    );
    expect(s.enemies[0]!.stages.attack).toBe(0);
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    expect(s.enemies[0]!.stages.attack).toBe(-1);
  });
});

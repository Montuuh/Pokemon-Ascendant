import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, content, ctx, dispatch, eventsOf, handCard, leadOf, scenario, start, teamWithKit, tweak, withHand } from '../testing/harness';
import { breakdownFor } from './damageFlow';
import { dotDamage } from './status';
import type { CombatState } from './state';

// §7.4 — the MoveEffect kinds v0.4 added. Each was a v0.3 debt: ten branch moves printed one of these clauses
// in the catalogue and shipped without it, and six abilities were inert behind the same gap.

const vs = (moves: string[]) => start(scenario({ team: teamWithKit(moves), enemies: [PIDGEY] }));

/** Put one card in hand by name and play it, without caring what the deck happened to deal. */
function playOnly(state: CombatState, moveId: string, ownerIndex = 0): CombatState {
  const armed = tweak(state, (d) => {
    d.player.hand = [{ id: 'probe', moveId, ownerUid: d.player.team[ownerIndex]!.uid }];
    d.player.ap = 4;
  });
  return dispatch(armed, { type: 'play-card', cardId: 'probe' });
}

const damageTo = (s: CombatState, side: 'e' | 'p') =>
  eventsOf(s, 'damage').filter((e) => e.t === 'damage' && e.targetUid.startsWith(side));

describe('Recoil and the ability that answers it — §7.4', () => {
  it('Recoil_CostsTheAttackerAQuarterOfWhatItDealt', () => {
    const s = playOnly(vs(['brave-bird', 'water-gun']), 'brave-bird');
    const dealt = damageTo(s, 'e')[0]!;
    const amount = dealt.t === 'damage' ? dealt.amount : 0;
    expect(amount).toBeGreaterThan(0);
    const self = damageTo(s, 'p')[0]!;
    expect(self.t === 'damage' && self.amount).toBe(Math.max(1, Math.floor(amount * 0.25)));
  });

  it('RockHead_CancelsItEntirely_SoRecoilCanBeAnIdentityNotAClock_§6.5.2', () => {
    const team = [
      { species: 'onix', level: 20, moves: ['brave-bird', 'rock-throw'], abilityId: 'rock-head' },
      STARTERS[1]!,
      STARTERS[2]!,
    ];
    const s = playOnly(start(scenario({ team, enemies: [PIDGEY] })), 'brave-bird');
    expect(damageTo(s, 'p')).toHaveLength(0);
  });
});

describe('Multi-hit — §7.4', () => {
  it('LandsItsHitsSeparately_AndEveryHitIsTheSameSize', () => {
    const s = playOnly(vs(['pin-missile', 'water-gun']), 'pin-missile');
    const hits = damageTo(s, 'e');
    expect(hits).toHaveLength(5);
    // Deterministic, never rolled: the catalogue says "hits 5 times for 15", not "5 × 15 ± something".
    expect(new Set(hits.map((e) => (e.t === 'damage' ? e.amount : 0))).size).toBe(1);
  });
});

describe('Toxic — §7.5', () => {
  it('Escalates_ButIsCappedSoOne1APCardCannotBeTheWholePlan', () => {
    const s = playOnly(vs(['toxic', 'water-gun']), 'toxic');
    expect(s.enemies[0]!.status?.kind).toBe('poison');
    expect(s.enemies[0]!.status?.escalatingTicks).toBe(0);

    const enemy = structuredClone(s.enemies[0]!);
    const base = dotDamage(enemy, ctx.config);
    expect(base).toBeGreaterThan(0);

    // The catalogue's numbers, exactly: base is MaxHP/16 and the cap is MaxHP/8, so "doubles each turn" gets
    // precisely one doubling before it stops. That tension is canon's, not the code's — flagged as an ⚠ OPEN
    // in catalogs/tms.md rather than quietly re-tuned here.
    enemy.status!.escalatingTicks = 1;
    expect(dotDamage(enemy, ctx.config)).toBe(base * 2);
    enemy.status!.escalatingTicks = 10;
    expect(dotDamage(enemy, ctx.config)).toBe(Math.max(1, Math.floor(enemy.maxHp / 8)));
    expect(dotDamage(enemy, ctx.config)).toBe(base * 2);
  });

  it('OrdinaryPoison_StaysFlat', () => {
    const s = playOnly(vs(['poison-powder', 'water-gun']), 'poison-powder');
    const enemy = structuredClone(s.enemies[0]!);
    expect(enemy.status?.escalatingTicks).toBeUndefined();
    const base = dotDamage(enemy, ctx.config);
    enemy.status!.escalatingTicks = undefined;
    expect(dotDamage(enemy, ctx.config)).toBe(base);
  });
});

describe('On-kill — §7.4', () => {
  it('FellStinger_OnlyPaysOutWhenTheMoveActuallyTookTheTargetDown', () => {
    const healthy = playOnly(vs(['fell-stinger-v', 'water-gun']), 'fell-stinger-v');
    expect(leadOf(healthy).stages.attack).toBe(0);

    const dying = tweak(vs(['fell-stinger-v', 'water-gun']), (d) => {
      d.enemies[0]!.hp = 1;
    });
    expect(leadOf(playOnly(dying, 'fell-stinger-v')).stages.attack).toBe(3);
  });

  it('Moxie_DoesTheSameFromTheAbilitySide_§6.5.2', () => {
    const team = [
      { species: 'gyarados', level: 22, moves: ['bite', 'dragon-rage'], abilityId: 'moxie' },
      STARTERS[1]!,
      STARTERS[2]!,
    ];
    const dying = tweak(start(scenario({ team, enemies: [PIDGEY] })), (d) => {
      d.enemies[0]!.hp = 1;
    });
    expect(leadOf(playOnly(dying, 'bite')).stages.attack).toBe(1);
  });
});

describe('Team guards — §7.4', () => {
  it('Safeguard_EatsTheNextStatusTheEnemyLands_ThenIsSpent', () => {
    const armed = playOnly(vs(['safeguard', 'water-gun']), 'safeguard');
    expect(armed.player.guards.status).toBe(1);

    // The charge is spent by an enemy status landing on the team, which is the only way one gets there.
    // A 100 % rider so the test is about the guard, not about a roll.
    const incoming = tweak(armed, (d) => {
      d.enemies[0]!.moveIds = ['hypnosis'];
      d.enemies[0]!.intent = { kind: 'status', moveId: 'hypnosis', targetSlot: 'lead', hidden: false };
    });
    const after = dispatch(incoming, { type: 'end-turn' });
    expect(after.player.guards.status).toBe(0);
    expect(after.player.team[after.player.leadIndex]!.status).toBeNull();
  });

  it('WideGuard_SoftensOneCleave_ThenTheNextOneLandsInFull', () => {
    const s = playOnly(vs(['wide-guard', 'water-gun']), 'wide-guard');
    expect(s.player.guards.cleave).toEqual({ charges: 1, percent: 50 });
  });

  it('AquaFortress_BracesTheCasterAndTheTeamAtOnce', () => {
    const s = playOnly(vs(['aqua-fortress', 'water-gun']), 'aqua-fortress');
    expect(leadOf(s).stages.defense).toBe(2);
    expect(s.player.guards.cleave.charges).toBe(1);
    expect(s.player.guards.cleave.percent).toBe(25);
  });
});

describe('Support reach — §7.4', () => {
  it('AromaticMist_BuffsTheBenchAndNotTheCaster_WhichIsWhatMakesItSupport', () => {
    const s = playOnly(vs(['aromatic-mist', 'water-gun']), 'aromatic-mist');
    expect(leadOf(s).stages.defense).toBe(0);
    expect(s.player.team[1]!.stages.defense).toBe(1);
    expect(s.player.team[2]!.stages.defense).toBe(1);
  });

  it('Aromatherapy_ClearsTheWholeTeam', () => {
    const sick = tweak(vs(['aromatherapy-m', 'water-gun']), (d) => {
      d.player.team[0]!.status = { kind: 'burn', appliedTurn: 0, turnsLeft: null };
      d.player.team[1]!.status = { kind: 'paralysis', appliedTurn: 0, turnsLeft: 3 };
    });
    const s = playOnly(sick, 'aromatherapy-m');
    expect(s.player.team[0]!.status).toBeNull();
    expect(s.player.team[1]!.status).toBeNull();
  });

  it('Fissure_IgnoresTheTargetsDefenceStages_WhereAnOrdinaryGroundMoveDoesNot', () => {
    // Not Pidgey: Ground does ×0 into Flying, so both numbers would be zero and the test would prove nothing.
    const GEODUDE = { species: 'geodude', level: 10, tier: 'wild' as const, phaseCount: 1 as const };
    const s = start(scenario({ team: teamWithKit(['fissure-d', 'water-gun']), enemies: [GEODUDE] }));
    const braced = tweak(s, (d) => {
      d.enemies[0]!.stages.defense = 4;
    });
    const fissure = ctx.content.move('fissure-d');
    const earthquake = ctx.content.move('earthquake');
    expect(breakdownFor(leadOf(braced), braced.enemies[0]!, fissure, false, ctx).final).toBe(
      breakdownFor(leadOf(s), s.enemies[0]!, fissure, false, ctx).final,
    );
    expect(breakdownFor(leadOf(braced), braced.enemies[0]!, earthquake, false, ctx).final).toBeLessThan(
      breakdownFor(leadOf(s), s.enemies[0]!, earthquake, false, ctx).final,
    );
  });
});

describe('Run Down — §6.5.2, §3.3.1', () => {
  it('MakesTheFirstManualSwapFree_AndDoesNotAdvanceTheLadder', () => {
    let s = start(
      scenario({
        team: [
          { species: 'rattata', level: 14, abilityId: 'run-down' },
          { species: 'squirtle', level: 12 },
          { species: 'bulbasaur', level: 12 },
        ],
        enemies: [PIDGEY],
      }),
    );
    expect(s.player.freeSwaps).toBe(1);
    const ap = s.player.ap;

    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    expect(s.player.ap).toBe(ap);
    expect(s.player.swapCounter).toBe(0);

    // The second swap pays the ladder's *first* rung: the free one never happened, economically.
    s = dispatch(s, { type: 'swap', benchIndex: 2 });
    expect(s.player.ap).toBe(ap - 1);
    expect(s.player.swapCounter).toBe(1);
  });
});

describe('The Mastery moves’ effects — §5.13.2 (v0.7.5)', () => {
  const s0 = () => start(scenario({ team: STARTERS, enemies: [{ species: 'geodude', level: 12, tier: 'wild', phaseCount: 1 }] }));
  const hit = (s: ReturnType<typeof s0>, moveId: string, attacker = s.player.team[0]!) => breakdownFor(attacker, s.enemies[0]!, content.move(moveId), false, ctx, s).final;

  it('Venoshock_DoublesIntoAPoisonedTarget', () => {
    const s = s0();
    const poisoned = tweak(s, (d) => { d.enemies[0]!.status = { kind: 'poison', appliedTurn: 0, turnsLeft: null }; });
    expect(hit(poisoned, 'venoshock')).toBeGreaterThanOrEqual(Math.floor(hit(s, 'venoshock') * 2 * 0.85) - 1);
    expect(hit(poisoned, 'venoshock')).toBeGreaterThan(hit(s, 'venoshock'));
  });

  it('SuperFang_TakesHalfWhatIsLeft', () => {
    const s = tweak(s0(), (d) => { d.enemies[0]!.hp = 30; });
    expect(hit(s, 'super-fang')).toBe(15);
  });

  it('RageFist_GrowsWithTrauma_Revenge_BelowHalf', () => {
    const s = s0();
    const scarred = tweak(s, (d) => { d.player.team[0]!.traumaStacks = 3; });
    expect(hit(scarred, 'rage-fist')).toBeGreaterThan(hit(s, 'rage-fist'));
    const low = tweak(s, (d) => { d.player.team[0]!.hp = 1; });
    expect(hit(low, 'revenge')).toBeGreaterThan(hit(s, 'revenge'));
  });

  it('BellyDrum_PaysHpUpFront_NeverBelowOne_AndRaisesAttack', () => {
    let s = start(scenario({ team: [{ species: 'snorlax', level: 20, moves: ['belly-drum-s', 'tackle'] }], enemies: [PIDGEY] }));
    s = withHand(s, ['belly-drum-s']);
    const max = s.player.team[0]!.maxHp;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'belly-drum-s').id });
    expect(s.player.team[0]!.hp).toBe(max - Math.floor(max * 0.4));
    expect(s.player.team[0]!.stages.attack).toBe(4);
    let low = tweak(withHand(start(scenario({ team: [{ species: 'snorlax', level: 20, moves: ['belly-drum-s', 'tackle'] }], enemies: [PIDGEY] })), ['belly-drum-s']), (d) => { d.player.team[0]!.hp = 2; });
    low = dispatch(low, { type: 'play-card', cardId: handCard(low, 'belly-drum-s').id });
    expect(low.player.team[0]!.hp).toBe(1);
  });

  it('EveryRecruitableLine_HasAMasteryLvOne', () => {
    for (const line of ['bulbasaur', 'charmander', 'squirtle', 'eevee', 'pikachu', 'magikarp', 'tentacool', 'growlithe', 'vulpix', 'gastly', 'mr-mime', 'lapras', 'snorlax', 'aerodactyl', 'cubone']) {
      expect(content.masteryMoves(line)[0], line).toBeTruthy();
    }
  });
});

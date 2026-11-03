import { describe, expect, it } from 'vitest';
import type { EnemySetup } from '../content/defs';
import { ctx, dispatch, eventsOf, leadOf, reject, scenario, start, STARTERS, tweak } from '../testing/harness';
import { breakdownFor } from './damageFlow';
import { predictIntentDamage } from './intents';
import { apCostDetails } from './preview';
import type { CombatState } from './state';

// §3.11 — the move keywords. Each block is one keyword, on probe moves (the catalogue's rows land with v0.9.89's content).

/** A wall that hits the Lead with one move, so every intent is known and nothing dies by accident. */
const WALL = (moves: string[] = ['tackle']): EnemySetup => ({ species: 'snorlax', level: 42, tier: 'wild', phaseCount: 1, moves });

const fight = (leadMoves: string[], enemyMoves?: string[]) =>
  start(scenario({ team: [{ species: 'squirtle', level: 42, moves: leadMoves }, STARTERS[0]!, STARTERS[2]!], enemies: [WALL(enemyMoves)] }));

/** Put one card in hand by name and play it, without caring what the deck dealt. */
function play(state: CombatState, moveId: string, ownerIndex = 0, ap = 3): CombatState {
  const armed = tweak(state, (d) => {
    d.player.hand = [{ id: `probe-${moveId}`, moveId, ownerUid: d.player.team[ownerIndex]!.uid }];
    d.player.ap = ap;
  });
  return dispatch(armed, { type: 'play-card', cardId: `probe-${moveId}` });
}

const endTurn = (s: CombatState) => dispatch(s, { type: 'end-turn' });
const hitsOn = (s: CombatState, uid: string, fromSeq = 0) =>
  s.events.filter((e) => e.seq >= fromSeq && e.t === 'damage' && e.targetUid === uid && e.cause === 'move').map((e) => (e.t === 'damage' ? e.amount : 0));

describe('Protect — §3.11.2', () => {
  it('Protect_BlanksTheIntentAimedAtTheUser_AndTheForecastSaysSo', () => {
    let s = play(fight(['probe-protect', 'tackle']), 'probe-protect');
    const uid = leadOf(s).uid;
    expect(predictIntentDamage(s, s.enemies[0]!, ctx)).toBe(0);
    const seq = s.nextSeq;
    s = endTurn(s);
    expect(hitsOn(s, uid, seq).filter((n) => n > 0)).toHaveLength(0);
    expect(eventsOf(s, 'keyword').some((e) => e.t === 'keyword' && e.keyword === 'blocked')).toBe(true);
  });

  it('Protect_CannotGoUpTwoTurnsRunning', () => {
    const s = endTurn(play(fight(['probe-protect', 'tackle']), 'probe-protect'));
    const armed = tweak(s, (d) => {
      d.player.hand = [{ id: 'again', moveId: 'probe-protect', ownerUid: d.player.team[0]!.uid }];
    });
    expect(reject(armed, { type: 'play-card', cardId: 'again' })).toBe('protect-again');
  });

  it('EnemyProtect_IsUpWhenDeclared_SoYourSingleTargetCardSaysSo_§5.2.1', () => {
    // §5.3.1 — a hurt enemy is the one that raises its Protect.
    const s = start(scenario({ team: [{ species: 'squirtle', level: 42, moves: ['tackle', 'water-gun'] }, STARTERS[0]!, STARTERS[2]!], enemies: [{ ...WALL(['probe-protect', 'tackle']), hpPercent: 0.3 }] }));
    const e = s.enemies[0]!;
    expect(e.intent?.stance).toBe(true);
    expect(e.volatile?.protectTurn).toBe(s.turn);
    const armed = tweak(s, (d) => {
      d.player.hand = [{ id: 'hit', moveId: 'water-gun', ownerUid: d.player.team[0]!.uid }];
    });
    expect(reject(armed, { type: 'play-card', cardId: 'hit' })).toBe('target-protected');
  });
});

describe('Endure — §3.11.3', () => {
  it('Endure_LeavesTheUserAt1HP_FirstRungOfTheLadder', () => {
    let s = tweak(fight(['probe-endure', 'tackle']), (d) => {
      d.player.team[0]!.hp = 2;
    });
    s = endTurn(play(s, 'probe-endure'));
    expect(s.player.team[0]!.hp).toBe(1);
  });
});

describe('Guard — §3.11.4', () => {
  it('Guard_AbsorbsTheHitBeforeHP_ThenFallsAwayNextTurn', () => {
    const base = fight(['probe-guard', 'tackle']);
    const guarded = play(base, 'probe-guard');
    const guard = guarded.player.team[0]!.guard ?? 0;
    expect(guard).toBeGreaterThan(0);
    const hpBefore = guarded.player.team[0]!.hp;
    const after = endTurn(guarded);
    const raw = breakdownFor(base.enemies[0]!, base.player.team[0]!, ctx.content.move('tackle'), false, ctx, base).final;
    expect(hpBefore - after.player.team[0]!.hp).toBe(Math.max(0, raw - guard));
    expect(after.player.team[0]!.guard).toBeUndefined();
  });
});

describe('Substitute — §3.11.5', () => {
  it('Substitute_CostsAQuarter_SoaksTheHit_AndKeepsTheStatusOff', () => {
    const s0 = fight(['probe-substitute', 'tackle'], ['probe-sleep']);
    const max = s0.player.team[0]!.maxHp;
    const s = play(s0, 'probe-substitute');
    expect(s.player.team[0]!.substitute).toBe(Math.floor(max * 0.25));
    const after = endTurn(s);
    expect(after.player.team[0]!.status).toBeNull();
  });
});

describe('Side conditions — §3.11.6', () => {
  it('Reflect_CutsMeleeDamageIntoItsSide_ForThreeTurns', () => {
    const base = fight(['probe-reflect', 'tackle']);
    const before = breakdownFor(base.enemies[0]!, leadOf(base), ctx.content.move('tackle'), false, ctx, base).final;
    let s = play(base, 'probe-reflect');
    const during = breakdownFor(s.enemies[0]!, leadOf(s), ctx.content.move('tackle'), false, ctx, s).final;
    expect(during).toBeLessThan(before);
    expect(predictIntentDamage(s, s.enemies[0]!, ctx)).toBe(during);
    for (let i = 0; i < 3; i++) s = endTurn(s);
    expect(s.sides ?? []).toHaveLength(0);
  });

  it('Safeguard_KeepsTheFoesStatusOff', () => {
    const s = endTurn(play(fight(['probe-safeguard', 'tackle'], ['probe-sleep']), 'probe-safeguard'));
    expect(s.player.team[0]!.status).toBeNull();
  });
});

describe('Fields set by a move — §3.11.7 / §4.3.15', () => {
  it('RainDance_SetsRainForThreeTurns_ThenTheOpeningGroundReturns', () => {
    let s = play(fight(['probe-rain', 'tackle']), 'probe-rain');
    expect(s.fields.weather).toBe('rain-dance');
    for (let i = 0; i < 3; i++) s = endTurn(s);
    expect(s.fields.weather).toBeUndefined();
  });

  it('Thunder_CostsOneLessInTheRain', () => {
    const s = play(fight(['probe-rain', 'probe-thunder']), 'probe-rain');
    const owner = leadOf(s);
    expect(apCostDetails(s, ctx.content.move('probe-thunder'), owner, ctx).cost).toBe(2);
  });
});

describe('Recharge — §3.11.8', () => {
  it('Recharge_LocksTheUsersCardsAndPlace_ThroughItsNextTurnOnly', () => {
    let s = endTurn(play(fight(['probe-beam', 'tackle']), 'probe-beam'));
    const armed = tweak(s, (d) => {
      d.player.hand = [{ id: 'next', moveId: 'tackle', ownerUid: d.player.team[0]!.uid }];
    });
    expect(reject(armed, { type: 'play-card', cardId: 'next' })).toBe('recharging');
    s = endTurn(s);
    const free = tweak(s, (d) => {
      d.player.hand = [{ id: 'free', moveId: 'tackle', ownerUid: d.player.team[0]!.uid }];
    });
    expect(reject(free, { type: 'play-card', cardId: 'free' })).toBeNull();
  });

  it('EnemyRecharge_IsItsNextIntent', () => {
    const s = endTurn(fight(['tackle'], ['probe-beam']));
    expect(s.enemies[0]!.intent?.kind).toBe('incapacitated');
  });
});

describe('Rampage — §3.11.9', () => {
  it('Rampage_ReturnsFreeTwice_ThenConfuses', () => {
    let s = endTurn(play(fight(['probe-thrash', 'tackle']), 'probe-thrash'));
    const temp = s.player.hand.find((c) => c.temp);
    expect(temp?.moveId).toBe('probe-thrash');
    expect(apCostDetails(s, ctx.content.move('probe-thrash'), leadOf(s), ctx).cost).toBe(0);
    s = endTurn(s);
    expect(s.player.hand.some((c) => c.temp)).toBe(true);
    s = endTurn(s);
    expect(s.player.team[0]!.confusionTurns).toBeGreaterThan(0);
    expect(s.player.discard.some((c) => c.temp)).toBe(false);
  });
});

describe('Charge — §3.11.10', () => {
  it('SolarBeam_LandsAtTheStartOfTheNextTurn', () => {
    const s = play(fight(['probe-solar', 'tackle']), 'probe-solar');
    const e = s.enemies[0]!;
    expect(e.hp).toBe(e.maxHp);
    const next = endTurn(s);
    expect(next.enemies[0]!.hp).toBeLessThan(e.maxHp);
  });

  it('SolarBeam_NeedsNoChargeInTheSun', () => {
    const sunny = tweak(fight(['probe-solar', 'tackle']), (d) => {
      d.fields = { weather: 'sunny-day' };
    });
    const s = play(sunny, 'probe-solar');
    expect(s.enemies[0]!.hp).toBeLessThan(s.enemies[0]!.maxHp);
  });

  it('Fly_TheIntentAimedAtTheFlyerHitsNothing', () => {
    const s = play(fight(['probe-fly', 'tackle']), 'probe-fly');
    const uid = leadOf(s).uid;
    const seq = s.nextSeq;
    const next = endTurn(s);
    expect(hitsOn(next, uid, seq).filter((n) => n > 0)).toHaveLength(0);
    expect(next.enemies[0]!.hp).toBeLessThan(next.enemies[0]!.maxHp);
  });
});

describe('Counter — §3.11.11', () => {
  it('Counter_ReturnsAMeleeHit_HalfAgainAsHard', () => {
    const s = play(fight(['probe-counter', 'tackle']), 'probe-counter');
    const uid = leadOf(s).uid;
    const seq = s.nextSeq;
    const next = endTurn(s);
    const took = hitsOn(next, uid, seq)[0]!;
    const back = hitsOn(next, next.enemies[0]!.uid, seq)[0]!;
    expect(back).toBe(Math.max(1, Math.floor(took * 1.5)));
  });
});

describe('Overexert — §3.11.12', () => {
  it('Overexert_PlaysOnAPYouDoNotHave_AndNextTurnPays', () => {
    const s = play(fight(['probe-overexert', 'tackle']), 'probe-overexert', 0, 2);
    expect(s.player.apDebt).toBe(1);
    const next = endTurn(s);
    expect(next.player.ap).toBe(ctx.config.baseApPerTurn - 1);
  });
});

describe('Heals that read the slot and the field — §3.11.13', () => {
  it('Wish_HealsWhoeverStandsInThePlace_AtTheEndOfTheNextResolution', () => {
    let s = tweak(fight(['probe-wish', 'tackle']), (d) => {
      d.player.team[0]!.hp = 80;
    });
    const uid = s.player.team[0]!.uid;
    const healed = (x: CombatState) => eventsOf(x, 'heal').some((e) => e.t === 'heal' && e.targetUid === uid);
    s = endTurn(play(s, 'probe-wish'));
    expect(healed(s)).toBe(false);
    s = endTurn(s);
    expect(healed(s)).toBe(true);
  });

  it('Ingrain_RootsTheUser_ItCannotBeSwappedOut', () => {
    const s = play(fight(['probe-ingrain', 'tackle']), 'probe-ingrain');
    expect(reject(s, { type: 'swap', benchIndex: 1 })).toBe('lead-frozen');
  });
});

describe('PP — §3.11.1', () => {
  it('ThelastPP_ExhaustsTheCard_OutOfTheDeckForTheFight', () => {
    const s = play(tweak(fight(['probe-recover', 'tackle']), (d) => {
      d.player.team[0]!.hp = 10;
    }), 'probe-recover');
    expect(s.player.exhausted?.map((c) => c.moveId)).toEqual(['probe-recover']);
    expect(s.player.discard.some((c) => c.moveId === 'probe-recover')).toBe(false);
    const again = tweak(s, (d) => {
      d.player.hand = [{ id: 'copy', moveId: 'probe-recover', ownerUid: d.player.team[0]!.uid }];
    });
    expect(reject(again, { type: 'play-card', cardId: 'copy' })).toBe('no-pp');
  });
});

describe('Baton Pass — §3.11.14', () => {
  it('BatonPass_HandsTheStagesToTheNewLead', () => {
    const s = play(fight(['probe-baton', 'tackle']), 'probe-baton');
    expect(leadOf(s).stages.attack).toBe(2);
    expect(s.player.team[0]!.stages.attack).toBe(0);
  });
});

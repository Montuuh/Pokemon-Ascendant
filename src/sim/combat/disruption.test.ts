import { describe, expect, it } from 'vitest';
import type { EnemySetup } from '../content/defs';
import { ctx, dispatch, eventsOf, leadOf, reject, scenario, start, tweak } from '../testing/harness';
import { breakdownFor } from './damageFlow';
import { asLeadDamage, forecastTurn } from './forecast';
import { chooseIntent, predictIntentDamage, scoreIntent } from './intents';
import type { CombatState, Intent } from './state';
import { GameRng } from '../rng/gameRng';

// §5.2.3 — the utility that hurts, and §5.5.2's finishers. Each block is one effect, on the game's own moves.

/** A wall that knows the moves named, so every intent is known and nothing dies by accident. */
const WALL = (moves: string[], extra: Partial<EnemySetup> = {}): EnemySetup => ({ species: 'snorlax', level: 42, tier: 'wild', phaseCount: 1, moves, ...extra });

const fight = (leadMoves: string[], enemyMoves: string[] = ['growl'], enemy: Partial<EnemySetup> = {}) =>
  start(
    scenario({
      team: [
        { species: 'squirtle', level: 42, moves: leadMoves },
        { species: 'charmander', level: 42, moves: ['scratch'] },
        { species: 'pidgey', level: 42, moves: ['gust'] },
      ],
      enemies: [WALL(enemyMoves, enemy)],
    }),
  );

/** The enemy's declared intent, set by hand: what it will do at this turn's Resolution. */
const intends = (s: CombatState, intent: Intent, at = 0) => tweak(s, (d) => void (d.enemies[at]!.intent = intent));
const aims = (kind: Intent['kind'], moveId: string, targetSlot: Intent['targetSlot'] = 'lead'): Intent => ({ kind, moveId, targetSlot, hidden: false });

/** Put one card in hand by name and play it, without caring what the deck dealt. */
function play(state: CombatState, moveId: string, ownerIndex = 0, ap = 3): CombatState {
  const armed = tweak(state, (d) => {
    d.player.hand = [{ id: `probe-${moveId}`, moveId, ownerUid: d.player.team[ownerIndex]!.uid }];
    d.player.ap = ap;
  });
  return dispatch(armed, { type: 'play-card', cardId: `probe-${moveId}` });
}
const holding = (s: CombatState, moveId: string, ownerIndex = 0) =>
  tweak(s, (d) => {
    d.player.hand = [{ id: `held-${moveId}`, moveId, ownerUid: d.player.team[ownerIndex]!.uid }];
    d.player.ap = 3;
  });
const endTurn = (s: CombatState) => dispatch(s, { type: 'end-turn' });
const quiet = (s: CombatState) => intends(s, { kind: 'stall', moveId: null, targetSlot: null, hidden: false });

describe('Taunt — §5.2.3', () => {
  it('EnemyTaunt_LocksYourLeadsCardsThatDoNoDamage_NextTurn', () => {
    const s = endTurn(intends(fight(['growl', 'tackle'], ['taunt', 'tackle']), aims('disrupt', 'taunt')));
    expect(reject(holding(s, 'growl'), { type: 'play-card', cardId: 'held-growl' })).toBe('taunted');
    expect(reject(holding(s, 'tackle'), { type: 'play-card', cardId: 'held-tackle' })).toBeNull();
  });

  it('YourTaunt_BreaksTheSetUpItDeclared_AndNextTurnItOnlyAttacks', () => {
    let s = intends(fight(['taunt', 'tackle'], ['growl', 'tackle']), aims('debuff', 'growl'));
    s = endTurn(play(s, 'taunt'));
    expect(s.events.some((e) => e.t === 'enemy-action' && e.fizzled && e.intent.moveId === 'growl')).toBe(true);
    expect(leadOf(s).stages.attack).toBe(0);
    expect(s.enemies[0]!.intent?.moveId).toBe('tackle');
  });

  it('YourTaunt_StrikesOutTheSetUpItStops_SoItsChipIsTheOutcome', () => {
    const s = play(intends(fight(['taunt', 'tackle'], ['growl', 'tackle']), aims('debuff', 'growl')), 'taunt');
    expect(s.enemies[0]!.intent?.broken).toBe(true);
  });
});

describe('Disable — §5.2.3', () => {
  it('EnemyDisable_LocksYourStrongestCard', () => {
    const s = endTurn(intends(fight(['tackle', 'water-gun'], ['disable']), aims('disrupt', 'disable')));
    expect(s.player.disabled?.moveId).toBe('water-gun');
    expect(reject(holding(s, 'water-gun'), { type: 'play-card', cardId: 'held-water-gun' })).toBe('disabled');
  });

  it('YourDisable_FizzlesTheMoveItDeclared', () => {
    let s = intends(fight(['disable', 'tackle'], ['tackle', 'growl']), aims('attack', 'tackle'));
    const uid = leadOf(s).uid;
    const seq = s.nextSeq;
    s = endTurn(play(s, 'disable'));
    expect(s.events.filter((e) => e.seq >= seq && e.t === 'damage' && e.targetUid === uid && e.cause === 'move')).toHaveLength(0);
    expect(s.enemies[0]!.intent?.moveId).not.toBe('tackle');
  });
});

describe('Roar and Whirlwind — §5.2.3', () => {
  it('EnemyRoar_DragsYourLeadOut_AndTheMostHurtOfYourBenchIsDraggedIn', () => {
    let s = fight(['tackle'], ['roar']);
    s = tweak(s, (d) => void (d.player.team[2]!.hp = Math.floor(d.player.team[2]!.maxHp / 3)));
    const hurt = s.player.team[2]!.uid;
    s = endTurn(intends(s, aims('disrupt', 'roar')));
    expect(leadOf(s).uid).toBe(hurt);
    expect(eventsOf(s, 'swap').some((e) => e.t === 'swap' && e.kind === 'forced')).toBe(true);
  });

  it('YourRoar_BlowsTheFoesBuildUpAway', () => {
    let s = tweak(fight(['roar']), (d) => void (d.enemies[0]!.stages.attack = 3));
    s = play(s, 'roar');
    expect(s.enemies[0]!.stages.attack).toBe(0);
  });
});

describe('Mean Look — §5.2.3', () => {
  it('EnemyMeanLook_YourLeadCannotBeSwappedByHand', () => {
    const s = endTurn(intends(fight(['tackle'], ['mean-look']), aims('disrupt', 'mean-look')));
    expect(reject(s, { type: 'swap', benchIndex: 1 })).toBe('lead-trapped');
  });
});

describe('Yawn — §5.2.3', () => {
  it('Yawn_YourLeadFallsAsleepAtTheEndOfNextTurn_IfItStaysIn', () => {
    let s = endTurn(intends(fight(['tackle'], ['yawn']), aims('disrupt', 'yawn')));
    expect(leadOf(s).status).toBeNull();
    expect(leadOf(s).volatile?.drowsyTurn).toBe(s.turn);
    s = endTurn(quiet(s));
    expect(s.player.team[0]!.status?.kind).toBe('sleep');
  });

  it('Yawn_ASwapShakesItOff', () => {
    let s = endTurn(intends(fight(['tackle'], ['yawn']), aims('disrupt', 'yawn')));
    s = dispatch(tweak(s, (d) => void (d.player.ap = 3)), { type: 'swap', benchIndex: 1 });
    s = endTurn(quiet(s));
    expect(s.player.team[0]!.status).toBeNull();
    expect(s.player.team[0]!.volatile?.drowsyTurn).toBeUndefined();
  });
});

describe('Perish Song — §5.2.3', () => {
  it('PerishSong_StrikesBothLeadsAfterThreeMoreTurns', () => {
    let s = endTurn(intends(fight(['tackle'], ['perish-song']), aims('disrupt', 'perish-song', null)));
    expect(s.perish?.turnsLeft).toBe(3);
    const mine = leadOf(s);
    const theirs = s.enemies[0]!;
    s = endTurn(quiet(endTurn(quiet(s))));
    expect(s.perish?.turnsLeft).toBe(1);
    s = endTurn(quiet(s));
    expect(s.perish).toBeUndefined();
    expect(s.player.team[0]!.hp).toBe(mine.hp - Math.floor(mine.maxHp * ctx.config.disruption.perishPercent));
    expect(s.enemies[0]!.hp).toBe(theirs.hp - Math.floor(theirs.maxHp * ctx.config.disruption.perishPercent));
  });

  it('PerishSong_TheOneThatLeftBeforeTheLastNoteIsSpared', () => {
    let s = endTurn(intends(fight(['tackle'], ['perish-song']), aims('disrupt', 'perish-song', null)));
    const before = s.player.team[0]!.hp;
    s = endTurn(quiet(endTurn(quiet(s))));
    s = dispatch(tweak(s, (d) => void (d.player.ap = 3)), { type: 'swap', benchIndex: 1 });
    s = endTurn(quiet(s));
    expect(s.player.team[0]!.hp).toBe(before);
    expect(leadOf(s).hp).toBeLessThan(leadOf(s).maxHp);
  });
});

describe('Leech Seed and Curse — §5.2.3', () => {
  it('LeechSeed_DrainsYourLeadAndHealsTheirs_UntilItLeaves', () => {
    let s = fight(['tackle'], ['leech-seed'], { hpPercent: 0.5 });
    const enemyHp = s.enemies[0]!.hp;
    const lead = leadOf(s);
    s = endTurn(intends(s, aims('disrupt', 'leech-seed')));
    const sap = Math.floor(lead.maxHp * 0.125);
    expect(s.player.team[0]!.hp).toBe(lead.hp - sap);
    expect(s.enemies[0]!.hp).toBe(enemyHp + sap);
    s = dispatch(tweak(s, (d) => void (d.player.ap = 3)), { type: 'swap', benchIndex: 1 });
    const left = s.player.team[0]!.hp;
    s = endTurn(quiet(s));
    expect(s.player.team[0]!.hp).toBe(left);
    expect(s.player.team[0]!.volatile?.seeded).toBeUndefined();
  });

  it('Curse_CostsTheCasterHalf_AndTakesAQuarterOfYourLeadEachTurn', () => {
    let s = fight(['tackle'], ['curse']);
    const caster = s.enemies[0]!;
    const lead = leadOf(s);
    s = endTurn(intends(s, aims('disrupt', 'curse')));
    expect(s.enemies[0]!.hp).toBe(caster.hp - Math.floor(caster.maxHp * 0.5));
    expect(s.player.team[0]!.hp).toBe(lead.hp - Math.floor(lead.maxHp * 0.25));
  });

  it('YourLeechSeed_SapsTheirLead_AndFeedsYours', () => {
    let s = tweak(play(quiet(fight(['leech-seed'])), 'leech-seed'), (d) => void (d.player.team[0]!.hp = 1));
    const foe = s.enemies[0]!;
    expect(foe.volatile?.seeded?.bySide).toBe('player');
    s = endTurn(s);
    const sap = Math.floor(foe.maxHp * 0.125);
    expect(s.enemies[0]!.hp).toBe(foe.hp - sap);
    expect(s.player.team[0]!.hp).toBe(Math.min(1 + sap, leadOf(s).maxHp));
  });

  it('LeechSeed_OnAGrassType_DoesNotTakeHold', () => {
    const s = play(quiet(fight(['leech-seed'], ['growl'], { species: 'bulbasaur' })), 'leech-seed');
    expect(s.enemies[0]!.volatile?.seeded).toBeUndefined();
  });

  it('LeechSeedPlus_IsTheSameSeed_ForNoAP', () => {
    const s = play(quiet(fight(['leech-seed-plus'])), 'leech-seed-plus', 0, 0);
    expect(s.enemies[0]!.volatile?.seeded).toMatchObject({ percent: 0.125, heal: true, bySide: 'player' });
  });

  it('AI_NeverSeedsAGrassType', () => {
    const s = start(scenario({ team: [{ species: 'bulbasaur', level: 42, moves: ['tackle'] }, { species: 'charmander', level: 42 }], enemies: [WALL(['leech-seed'])] }));
    expect(scoreIntent(s, s.enemies[0]!, { intent: aims('disrupt', 'leech-seed'), move: ctx.content.move('leech-seed') }, ctx)).toBe(0);
  });
});

describe('Spikes and Stealth Rock — §5.2.3', () => {
  it('Spikes_HurtWhoeverStepsIntoYourLead_ButNotAFlyer', () => {
    let s = endTurn(intends(fight(['tackle'], ['spikes']), aims('disrupt', 'spikes', null)));
    expect(s.sides?.some((x) => x.id === 'spikes' && x.side === 'player')).toBe(true);
    const fire = s.player.team[1]!;
    s = dispatch(tweak(s, (d) => void (d.player.ap = 3)), { type: 'swap', benchIndex: 1 });
    expect(leadOf(s).hp).toBe(fire.hp - Math.floor(fire.maxHp * ctx.config.disruption.hazardPercent));
    const bird = s.player.team[2]!;
    s = dispatch(tweak(s, (d) => void ((d.player.ap = 3), (d.player.freeSwaps = 1))), { type: 'swap', benchIndex: 2 });
    expect(leadOf(s).hp).toBe(bird.hp);
  });

  it('StealthRock_ScalesByRocksEffectivenessOnWhoeverStepsIn', () => {
    let s = endTurn(intends(fight(['tackle'], ['stealth-rock']), aims('disrupt', 'stealth-rock', null)));
    const fire = s.player.team[1]!;
    s = dispatch(tweak(s, (d) => void (d.player.ap = 3)), { type: 'swap', benchIndex: 1 });
    expect(leadOf(s).hp).toBe(fire.hp - Math.floor(fire.maxHp * ctx.config.disruption.hazardPercent * 2));
  });

  it('ASwapsNumber_CountsTheHazardsOnTheWayIn', () => {
    const s = endTurn(intends(fight(['tackle'], ['stealth-rock']), aims('disrupt', 'stealth-rock', null)));
    const fire = s.player.team[1]!;
    const rocks = Math.floor(fire.maxHp * ctx.config.disruption.hazardPercent * 2);
    const hit = asLeadDamage(s, ctx, 1)!;
    expect(hit.entry).toEqual([{ id: 'stealth-rock', amount: rocks }]);
    expect(hit.amount).toBeGreaterThanOrEqual(rocks);
  });

  it('ARoarOntoRocksLaidThisTurn_IsInItsForecast_OnWhoeverItDragsIn', () => {
    // Stealth Rock first, then Roar, in one turn: the forecast plays them in order and puts the rocks' hit on the Roar.
    const s0 = fight(['tackle'], ['stealth-rock', 'roar'], { acts: 2, phaseCount: 3, tier: 'boss' });
    const s = tweak(s0, (d) => {
      d.enemies[0]!.intent = aims('disrupt', 'stealth-rock', null);
      d.enemies[0]!.second = aims('disrupt', 'roar');
      d.player.team[2]!.hp = Math.floor(d.player.team[2]!.maxHp / 3);
    });
    const dragged = s.player.team[2]!;
    const hits = forecastTurn(s, ctx).byAction[`${s.enemies[0]!.uid}#1`]!.hits;
    // Pidgey is Flying: Stealth Rock ×2 on it.
    expect(hits.find((h) => h.targetUid === dragged.uid)?.amount).toBe(Math.floor(dragged.maxHp * ctx.config.disruption.hazardPercent * 2));
  });

  it('Spikes_StayForTheFight_AndAreLaidOnce', () => {
    let s = endTurn(intends(fight(['tackle'], ['spikes']), aims('disrupt', 'spikes', null)));
    for (let i = 0; i < 4; i++) s = endTurn(quiet(s));
    expect(s.sides?.filter((x) => x.id === 'spikes')).toHaveLength(1);
    expect(scoreIntent(s, s.enemies[0]!, { intent: aims('disrupt', 'spikes', null), move: ctx.content.move('spikes') }, ctx)).toBe(0);
  });

  it('YourSpikes_HurtTheNextFoeThatStepsUpToLead', () => {
    let s = start(
      scenario({
        kind: 'trainer',
        team: [{ species: 'squirtle', level: 42, moves: ['spikes', 'tackle'] }, { species: 'charmander', level: 42 }],
        enemies: [WALL(['growl'], { species: 'rattata', level: 5 }), WALL(['growl'])],
        trainer: { name: 'Test', sprite: 'youngster' },
      }),
    );
    s = play(s, 'spikes');
    s = tweak(s, (d) => void (d.enemies[0]!.hp = 1));
    s = play(s, 'tackle', 0, 2);
    const next = s.enemies[0]!;
    expect(next.speciesId).toBe('snorlax');
    expect(next.hp).toBe(next.maxHp - Math.floor(next.maxHp * ctx.config.disruption.hazardPercent));
  });
});

describe('Knock Off — §5.2.3', () => {
  it('KnockOff_HitsHarderWhileItHolds_AndStripsItForTheFight', () => {
    let s = tweak(fight(['tackle'], ['knock-off']), (d) => void (d.player.team[0]!.heldItemId = 'leftovers'));
    const knock = ctx.content.move('knock-off');
    const armed = breakdownFor(s.enemies[0]!, leadOf(s), knock, false, ctx, s).final;
    const bare = breakdownFor(s.enemies[0]!, { ...leadOf(s), heldItemId: null }, knock, false, ctx, s).final;
    expect(armed).toBeGreaterThan(bare * 1.4);
    s = endTurn(intends(s, aims('attack', 'knock-off')));
    expect(s.player.team[0]!.heldItemId).toBeNull();
  });
});

describe('Haze — §5.2.3', () => {
  it('Haze_WashesEveryStageAway_OnBothSides', () => {
    let s = tweak(fight(['tackle'], ['haze']), (d) => {
      d.player.team[0]!.stages.attack = 2;
      d.enemies[0]!.stages.defense = -1;
    });
    s = endTurn(intends(s, aims('disrupt', 'haze', null)));
    expect(s.player.team[0]!.stages.attack).toBe(0);
    expect(s.enemies[0]!.stages.defense).toBe(0);
  });

  it('AI_HazesOnlyWhenYouHaveMoreToLose', () => {
    const s = fight(['tackle'], ['haze']);
    const haze = { intent: aims('disrupt', 'haze', null), move: ctx.content.move('haze') };
    expect(scoreIntent(s, s.enemies[0]!, haze, ctx)).toBe(0);
    const built = tweak(s, (d) => void (d.player.team[0]!.stages.attack = 4));
    expect(scoreIntent(built, built.enemies[0]!, haze, ctx)).toBeGreaterThan(0);
  });
});

describe('Helping Hand — §5.2.3', () => {
  it('EnemyHelpingHand_IsUpWhenDeclared_AndTheLeadsIntentCarriesIt', () => {
    const group = (support: string[]) =>
      start(scenario({ team: [{ species: 'squirtle', level: 42, moves: ['tackle'] }, { species: 'charmander', level: 42 }], enemies: [WALL(['tackle']), WALL(support, { species: 'clefairy' })], onField: 2 }));
    const helped = group(['helping-hand']);
    const alone = group(['growl']);
    expect(helped.enemies[1]!.intent?.stance).toBe(true);
    expect(helped.enemies[0]!.volatile?.helped?.turn).toBe(helped.turn);
    expect(predictIntentDamage(helped, helped.enemies[0]!, ctx)).toBeGreaterThan(predictIntentDamage(alone, alone.enemies[0]!, ctx)! * 1.4);
  });
});

describe('Team debuffs — §5.2.3', () => {
  it('Growl_LowersEveryStandingPokemonOfYourSide', () => {
    const s = endTurn(intends(fight(['tackle'], ['growl']), aims('debuff', 'growl')));
    expect(s.player.team.map((m) => m.stages.attack)).toEqual([-1, -1, -1]);
  });

  it('YourGrowl_LowersEveryFoe', () => {
    const s = start(scenario({ team: [{ species: 'squirtle', level: 42, moves: ['growl'] }, { species: 'charmander', level: 42 }], enemies: [WALL(['tackle']), WALL(['tackle'])], onField: 2 }));
    expect(play(s, 'growl').enemies.map((e) => e.stages.attack)).toEqual([-1, -1]);
  });

  it('TailWhip_IsWorthLessTheFurtherDownYouAre_AndNothingAtThree', () => {
    const s = fight(['tackle'], ['tail-whip']);
    const whip = { intent: aims('debuff', 'tail-whip'), move: ctx.content.move('tail-whip') };
    const at = (down: number) => {
      const t = tweak(s, (d) => d.player.team.forEach((m) => void (m.stages.defense = -down)));
      return scoreIntent(t, t.enemies[0]!, whip, ctx);
    };
    expect(at(0)).toBeGreaterThan(at(1));
    expect(at(1)).toBeGreaterThan(at(2));
    expect(at(3)).toBe(0);
  });
});

describe('Finishers — §5.5.2', () => {
  it('DreamEater_IsWorthItOnlyOnASleeper', () => {
    const s = fight(['tackle'], ['dream-eater']);
    const eater = ctx.content.move('dream-eater');
    const awake = breakdownFor(s.enemies[0]!, leadOf(s), eater, false, ctx, s).final;
    const asleep = breakdownFor(s.enemies[0]!, { ...leadOf(s), status: { kind: 'sleep', turnsLeft: 2, appliedTurn: 1 } }, eater, false, ctx, s).final;
    expect(asleep / awake).toBeGreaterThan(2);
  });

  it('Revenge_DoublesForAFoeYouHitThisTurn_AndTheIntentShowsIt', () => {
    let s = fight(['tackle'], ['revenge']);
    s = intends(s, aims('attack', 'revenge'));
    const calm = predictIntentDamage(s, s.enemies[0]!, ctx);
    s = play(s, 'tackle');
    expect(predictIntentDamage(s, s.enemies[0]!, ctx)).toBeGreaterThan(calm! * 1.8);
  });

  it('AI_PrefersTheFinisherWhenItsConditionHolds', () => {
    const s = tweak(fight(['tackle'], ['wake-up-slap', 'tackle']), (d) => void (d.player.team[0]!.status = { kind: 'sleep', turnsLeft: 2, appliedTurn: 1 }));
    const slap = scoreIntent(s, s.enemies[0]!, { intent: aims('attack', 'wake-up-slap'), move: ctx.content.move('wake-up-slap') }, ctx);
    const tackle = scoreIntent(s, s.enemies[0]!, { intent: aims('attack', 'tackle'), move: ctx.content.move('tackle') }, ctx);
    expect(slap).toBeGreaterThan(tackle * 1.5);
  });
});

describe('The AI reads the disruption — §5.3.2', () => {
  it('AI_NeverTauntsALeadWithNothingToShut', () => {
    const s = fight(['tackle', 'water-gun'], ['taunt']);
    expect(scoreIntent(s, s.enemies[0]!, { intent: aims('disrupt', 'taunt'), move: ctx.content.move('taunt') }, ctx)).toBe(0);
  });

  it('ATauntedEnemy_ChoosesOnlyAttacks', () => {
    const s = tweak(fight(['tackle'], ['growl', 'tackle']), (d) => void ((d.enemies[0]!.volatile ??= {}).tauntUntil = d.turn));
    const rng = new GameRng(7);
    for (let i = 0; i < 10; i++) expect(chooseIntent(s, s.enemies[0]!, ctx, rng)?.moveId).toBe('tackle');
  });
});

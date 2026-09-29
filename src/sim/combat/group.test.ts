import { describe, expect, it } from 'vitest';
import type { EnemySetup } from '../content/defs';
import { ctx, dispatch, eventsOf, handCard, reject, scenario, start, startFixture, tweak, withConsumableHand, withHand, consumableCard } from '../testing/harness';
import { forecastTurn } from './forecast';
import { classifyMove, predictIntentDamage, scoreIntent } from './intents';
import { cardPlayability } from './preview';
import { resolutionOrder } from './slots';
import { statAtLevel } from './stats';

// §5.6 — fights against a group: the formation, reach, area cards, the group's AI, and the honest intent.

const RATTATA: EnemySetup = { species: 'rattata', level: 8, tier: 'wild', phaseCount: 1 };
const SUPPORT: EnemySetup = { species: 'pidgey', level: 7, tier: 'wild', phaseCount: 1, role: 'attacker' };
const KIT = ['tackle', 'water-gun', 'surf', 'withdraw'];
// Only the kit's owner carries a Tackle, so the Melee card in hand is always the Lead's.
const TEAM = [{ species: 'squirtle', level: 12, moves: KIT }, { species: 'charmander', level: 8 }];

function group(extra: Partial<Parameters<typeof scenario>[0]> = {}) {
  return start(scenario({ team: TEAM, enemies: [RATTATA, SUPPORT, { ...SUPPORT, species: 'spearow' }], onField: 3, balls: 2, ...extra }));
}

describe('Multi-enemy fights — §5.6', () => {
  it('Setup_OnField3_ThreeStandTogether_SupportsEnterAtTheirShare', () => {
    const s = group();
    expect(s.enemies).toHaveLength(3);
    expect(s.enemyQueue).toHaveLength(0);
    // A support enters with supportHpMultiplier of its pool; the Lead with all of it.
    const full = statAtLevel(ctx.content.species('pidgey'), 'hp', 7);
    expect(s.enemies[1]!.maxHp).toBe(Math.round(full * ctx.config.supportHpMultiplier));
    expect(s.enemies[0]!.maxHp).toBe(statAtLevel(ctx.content.species('rattata'), 'hp', 8));
    // All three declared an intent in the same Intent phase.
    expect(s.enemies.every((e) => e.intent !== null)).toBe(true);
  });

  it('Setup_OnFieldDefault_StillOneAtATime', () => {
    const s = start(scenario({ team: TEAM, enemies: [RATTATA, SUPPORT] }));
    expect(s.enemies).toHaveLength(1);
    expect(s.enemyQueue).toHaveLength(1);
  });

  it('Reach_MeleeCard_OnlyTheLead_RangedReachesASupport', () => {
    const s = withHand(group(), ['tackle', 'water-gun']);
    const support = s.enemies[1]!.uid;
    const tackle = handCard(s, 'tackle').id;
    const gun = handCard(s, 'water-gun').id;
    expect(cardPlayability(s, tackle, ctx, support)!.reason).toBe('out-of-reach');
    expect(reject(s, { type: 'play-card', cardId: tackle, targetUid: support })).toBe('out-of-reach');
    expect(cardPlayability(s, tackle, ctx)!.targets.map((t) => t.reachable)).toEqual([true, false, false]);
    expect(cardPlayability(s, gun, ctx)!.targets.map((t) => t.reachable)).toEqual([true, true, true]);

    const after = dispatch(s, { type: 'play-card', cardId: gun, targetUid: support });
    const hit = eventsOf(after, 'damage').at(-1)!;
    expect(hit.t === 'damage' && hit.targetUid).toBe(support);
  });

  it('Area_CardHitsEveryEnemy_EachWithItsOwnNumber_TheOnesThePreviewPrinted', () => {
    const s = withHand(tweak(group(), (d) => { d.player.ap = 3; }), ['surf']);
    const card = handCard(s, 'surf').id;
    const play = cardPlayability(s, card, ctx)!;
    expect(play.hitsAll).toBe(true);
    const printed = Object.fromEntries(play.targets.map((t) => [t.uid, t.damage!.final]));
    const after = dispatch(s, { type: 'play-card', cardId: card });
    const hits = eventsOf(after, 'damage').filter((e) => e.t === 'damage' && e.sourceUid === 'p0');
    expect(hits).toHaveLength(3);
    for (const h of hits) if (h.t === 'damage') expect(h.amount).toBe(Math.min(printed[h.targetUid]!, s.enemies.find((e) => e.uid === h.targetUid)!.hp));
  });

  it('Resolution_SupportsFirst_InSlotOrder_TheLeadLast', () => {
    const s = group();
    expect(resolutionOrder(s).map((e) => e.uid)).toEqual(['e1', 'e2', 'e0']);
    const after = dispatch(s, { type: 'end-turn' });
    const actors = eventsOf(after, 'enemy-action').map((e) => (e.t === 'enemy-action' ? e.enemyUid : ''));
    expect(actors.slice(0, 3)).toEqual(['e1', 'e2', 'e0']);
  });

  it('Faint_OfTheLead_PromotesTheStrongestSupport_AndTheFightGoesOn', () => {
    const s = tweak(group(), (d) => {
      d.enemies[0]!.hp = 1;
      d.enemies[1]!.hp = 3;
    });
    const hand = withHand(s, ['tackle']);
    const after = dispatch(hand, { type: 'play-card', cardId: handCard(hand, 'tackle').id });
    expect(after.outcome).toBe('in-progress');
    expect(after.enemies).toHaveLength(2);
    // Spearow (e2, untouched) had more HP than the Pidgey (e1, at 3): it steps up.
    expect(after.enemies[0]!.uid).toBe('e2');
    expect(after.log.some((l) => l.text.includes('steps up to lead'))).toBe(true);
  });

  it('Faint_WithAQueue_TheNextFillsTheFreePlace', () => {
    const s = start(scenario({ team: TEAM, enemies: [RATTATA, SUPPORT, { ...RATTATA, species: 'spearow' }], onField: 2 }));
    expect(s.enemyQueue).toHaveLength(1);
    const low = withHand(tweak(s, (d) => { d.enemies[0]!.hp = 1; }), ['tackle']);
    const after = dispatch(low, { type: 'play-card', cardId: handCard(low, 'tackle').id });
    expect(after.enemies.map((e) => e.speciesId).sort()).toEqual(['pidgey', 'spearow']);
    // The fresh arrival counts for the promotion: whoever has the most HP leads.
    expect(after.enemies[0]!.hp).toBeGreaterThanOrEqual(after.enemies[1]!.hp);
    expect(after.enemies[1]!.intent).not.toBeNull();
  });

  it('Victory_OnlyWhenEveryEnemyIsDown', () => {
    const s = withHand(tweak(group(), (d) => { for (const e of d.enemies) e.hp = 1; d.player.ap = 3; }), ['surf']);
    const after = dispatch(s, { type: 'play-card', cardId: handCard(s, 'surf').id });
    expect(after.outcome).toBe('victory');
  });

  it('Catch_OneOfThePack_EndsTheFight_TheRestScatter', () => {
    const s = withConsumableHand(tweak(group({ consumables: ['poke-ball'] }), (d) => { d.enemies[2]!.hp = 1; }), ['poke-ball']);
    const target = s.enemies[2]!;
    // Throw at a support until a roll lands; every throw is at the one named.
    let state = s;
    for (let seed = 0; seed < 40 && state.outcome !== 'caught'; seed++) {
      const tried = tweak(s, (d) => { d.rngCursor = 1000 + seed; });
      state = dispatch(tried, { type: 'use-consumable', cardId: consumableCard(tried, 'poke-ball').id, targetUid: target.uid });
    }
    expect(state.outcome).toBe('caught');
    expect(state.defeatedEnemies.at(-1)!.uid).toBe(target.uid);
    expect(state.defeatedEnemies).toHaveLength(3);
    expect(state.enemies).toHaveLength(0);
  });

  it('Escalation_ASupportThatLingers_GrowsFierce_TheLeadNever', () => {
    let s = tweak(group(), (d) => { for (const m of d.player.team) { m.hp = 999; m.maxHp = 999; } });
    for (let t = 0; t < ctx.config.supportEscalateFromTurn - 1; t++) s = dispatch(s, { type: 'end-turn' });
    const support = s.enemies.find((e) => e.uid === 'e1')!;
    expect(support.stages.attack).toBeGreaterThanOrEqual(ctx.config.supportEscalateStages);
    expect(s.enemies.find((e) => e.uid === 'e0')!.stages.attack).toBe(0);
  });
});

describe('The group AI — §5.6', () => {
  it('Healer_AimsItsHeal_AtTheEnemyLead_AndHealsIt', () => {
    let s = startFixture('group-hiker-healer');
    s = tweak(s, (d) => { d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp * 0.3); });
    const healer = s.enemies[1]!;
    const move = ctx.content.move('moonlight');
    const intent = classifyMove(s, healer, move, ctx)!;
    expect(intent.kind).toBe('stall');
    expect(intent.targetEnemyUid).toBe(s.enemies[0]!.uid);
    // The Clefairy is at full HP; its heal is still worth playing, because the Lead is not.
    expect(scoreIntent(s, healer, { intent, move }, ctx)).toBeGreaterThan(0);
    const hurt = s.enemies[0]!.hp;
    const forced = tweak(s, (d) => { d.enemies[1]!.intent = { ...intent }; });
    const after = dispatch(forced, { type: 'end-turn' });
    const heal = eventsOf(after, 'heal').find((e) => e.t === 'heal' && e.targetUid === s.enemies[0]!.uid);
    expect(heal).toBeDefined();
    expect(after.enemies.find((e) => e.uid === 'e0')!.hp).toBeGreaterThan(hurt - 50);
  });

  it('Buffer_RaisesTheLead_NotItself', () => {
    const s = startFixture('group-elite-buffer');
    const clefairy = s.enemies[1]!;
    const intent = classifyMove(s, clefairy, ctx.content.move('calm-mind'), ctx)!;
    const forced = tweak(s, (d) => { d.enemies[1]!.intent = { ...intent }; d.enemies[0]!.intent = { kind: 'incapacitated', moveId: null, targetSlot: null, hidden: false }; });
    const after = dispatch(forced, { type: 'end-turn' });
    expect(after.enemies.find((e) => e.uid === 'e0')!.stages.attack).toBeGreaterThan(0);
    expect(after.enemies.find((e) => e.uid === 'e1')!.stages.attack).toBe(0);
  });

  it('Debuffer_NeverDoublesAStatus_TheGroupAlreadyPlans', () => {
    const s = tweak(startFixture('group-trainer-pair'), (d) => { for (const e of d.enemies) e.intent = null; });
    const bell = s.enemies[1]!;
    const move = ctx.content.move('poison-powder');
    const intent = classifyMove(s, bell, move, ctx)!;
    expect(scoreIntent(s, bell, { intent, move }, ctx)).toBeGreaterThan(0);
    // The Lead already means to put a status on that slot this turn: the support finds something else to do.
    const planned = tweak(s, (d) => { d.enemies[0]!.intent = { kind: 'status', moveId: 'stun-spore', targetSlot: intent.targetSlot, hidden: false }; });
    expect(scoreIntent(planned, planned.enemies[1]!, { intent, move }, ctx)).toBe(0);
  });
});

describe('The honest intent — §9.2.5', () => {
  it('Forecast_IsTheHit_EveryIntentOnEveryTarget', () => {
    for (const id of ['group-wild-flock', 'group-trainer-pair', 'group-hiker-healer', 'group-elite-buffer', 'group-call-for-help', 'wild-acts-twice', 'wild-basic', 'trainer-2enemy', 'status-showcase', 'wild-boss-3phase']) {
      for (let seed = 1; seed <= 6; seed++) {
        const s = startFixture(id, seed);
        const f = forecastTurn(s, ctx);
        const after = dispatch(s, { type: 'end-turn' });
        const landed = new Map<string, number>();
        for (const e of after.events.slice(s.events.length)) {
          if (e.t !== 'damage' || !e.sourceUid?.startsWith('e') || !e.targetUid.startsWith('p')) continue;
          const k = `${e.sourceUid}>${e.targetUid}`;
          landed.set(k, (landed.get(k) ?? 0) + e.amount);
        }
        const printed = new Map<string, number>();
        for (const ef of Object.values(f.byEnemy)) for (const h of ef.hits) printed.set(`${ef.enemyUid}>${h.targetUid}`, h.amount);
        // A random rider can move a later hit; none of these openers carries one that changes damage.
        expect(Object.fromEntries(printed), `${id}#${seed}`).toEqual(Object.fromEntries(landed));
      }
    }
  });

  it('PredictIntentDamage_ReadsTheForecast_NotTheBareFormula', () => {
    // A Barrier-style flat reduction lives after the formula; the old predictor left it out.
    const s = startFixture('wild-basic');
    const e = s.enemies[0]!;
    const f = forecastTurn(s, ctx);
    const lead = s.player.team[s.player.leadIndex]!;
    expect(predictIntentDamage(s, e, ctx)).toBe(f.byEnemy[e.uid]?.hits.find((h) => h.targetUid === lead.uid)?.amount ?? 0);
  });
});

describe('Acting twice — §5.6.1', () => {
  it('Declare_ActsTwice_TwoIntents_TwoDifferentMoves', () => {
    const s = startFixture('wild-acts-twice');
    const r = s.enemies[0]!;
    expect(r.intent).not.toBeNull();
    expect(r.second).not.toBeNull();
    expect(r.second!.moveId).not.toBe(r.intent!.moveId);
  });

  it('Resolve_ActsTwice_BothActionsLand_FirstThenSecond', () => {
    const s = tweak(startFixture('wild-acts-twice'), (d) => { for (const m of d.player.team) { m.hp = 999; m.maxHp = 999; } });
    const first = s.enemies[0]!.intent!.moveId;
    const second = s.enemies[0]!.second!.moveId;
    const after = dispatch(s, { type: 'end-turn' });
    const acted = after.events.slice(s.events.length).filter((e) => e.t === 'enemy-action').map((e) => (e.t === 'enemy-action' ? e.intent.moveId : null));
    expect(acted.slice(0, 2)).toEqual([first, second]);
  });

  it('Incapacitated_ActsTwice_NeitherAction', () => {
    let s = startFixture('wild-acts-twice');
    s = tweak(s, (d) => { d.enemies[0]!.status = { kind: 'sleep', appliedTurn: 0, turnsLeft: 2 }; });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.enemies[0]!.intent!.kind).toBe('incapacitated');
    expect(s.enemies[0]!.second).toBeNull();
  });
});

describe('Calling for help — §5.6.2', () => {
  const callNow = (id = 'group-call-for-help') => {
    const s = startFixture(id);
    const caller = s.enemies[0]!;
    const intent = classifyMove(s, caller, ctx.content.move('call-for-help'), ctx)!;
    return tweak(s, (d) => { d.enemies[0]!.intent = { ...intent }; for (const m of d.player.team) { m.hp = 999; m.maxHp = 999; } });
  };

  it('Classify_CallForHelp_IsASummon_ScoredHighestAlone', () => {
    const s = startFixture('group-call-for-help');
    const caller = s.enemies[0]!;
    const move = ctx.content.move('call-for-help');
    const intent = classifyMove(s, caller, move, ctx)!;
    expect(intent.kind).toBe('summon');
    const alone = scoreIntent(s, caller, { intent, move }, ctx);
    expect(alone).toBe(ctx.config.defaultUtilityWeight * ctx.config.summonAloneMultiplier);
    // Nobody left to answer: the call is worth nothing.
    const empty = tweak(s, (d) => { d.enemies[0]!.helpers = []; });
    expect(scoreIntent(empty, empty.enemies[0]!, { intent, move }, ctx)).toBe(0);
  });

  it('Resolve_Call_TheNextCompanionJoins_AsASupport_AndDeclaresNextTurn', () => {
    const s = callNow();
    expect(s.enemies).toHaveLength(1);
    const after = dispatch(s, { type: 'end-turn' });
    expect(after.enemies).toHaveLength(2);
    const joined = after.enemies[1]!;
    expect(joined.speciesId).toBe('nidoran-f');
    expect(joined.role).toBe('debuffer');
    expect(after.enemies[0]!.helpers).toHaveLength(1);
    expect(after.onField).toBe(2);
    expect(eventsOf(after, 'enemy-enter').some((e) => e.t === 'enemy-enter' && e.called)).toBe(true);
    // The Intent phase after the call telegraphs the newcomer's first action before it acts.
    expect(joined.intent).not.toBeNull();
  });

  it('Call_FieldFull_NobodyComes', () => {
    const s = tweak(callNow('group-wild-flock'), (d) => {
      d.enemies[0]!.helpers = [{ species: 'pidgey', level: 5, tier: 'wild', phaseCount: 1 }];
    });
    const intent = classifyMove(s, s.enemies[0]!, ctx.content.move('call-for-help'), ctx)!;
    expect(scoreIntent(s, s.enemies[0]!, { intent, move: ctx.content.move('call-for-help') }, ctx)).toBe(0);
  });

  it('Faint_OfTheCaller_ACalledCompanionStepsUp', () => {
    let s = dispatch(callNow(), { type: 'end-turn' });
    s = withHand(tweak(s, (d) => { d.enemies[0]!.hp = 1; d.player.ap = 3; }), ['scratch']);
    const after = dispatch(s, { type: 'play-card', cardId: handCard(s, 'scratch').id });
    expect(after.outcome).toBe('in-progress');
    expect(after.enemies[0]!.speciesId).toBe('nidoran-f');
  });
});

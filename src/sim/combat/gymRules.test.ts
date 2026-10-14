import { describe, expect, it } from 'vitest';
import type { EnemySetup } from '../content/defs';
import { ctx, dispatch, eventsOf, handCard, leadOf, reject, scenario, start, teamWithKit, tweak, withHand } from '../testing/harness';
import { breakdownFor } from './damageFlow';
import { cardPlayability } from './preview';
import { ruleDamageMultiplier, turnsUntil } from './gymRules';

// §5.9.5 — the Leader's rule. Every Gym Leader fights under one rule of its own, and every number the player reads
// already holds it.

const g = ctx.config.gymRules;
const ACE: EnemySetup = { species: 'golem', level: 20, tier: 'boss', phaseCount: 1 };
const PAD: EnemySetup = { species: 'geodude', level: 14, tier: 'boss', phaseCount: 1 };
const gym = (rule: NonNullable<Parameters<typeof scenario>[0]['gymRule']>, opts: { moves?: string[]; enemies?: EnemySetup[]; onField?: 1 | 2 } = {}) =>
  start(
    scenario({
      kind: 'boss',
      gymRule: rule,
      team: teamWithKit(opts.moves ?? ['water-gun', 'bubble', 'tackle', 'tail-whip'], 'wartortle', 20),
      enemies: opts.enemies ?? [ACE],
      ...(opts.onField ? { onField: opts.onField } : {}),
    }),
  );

describe('The Leader rule — §5.9.5', () => {
  it('RuleState_NoGym_NoRule', () => {
    const s = start(scenario({ kind: 'wild', team: teamWithKit(['water-gun']), enemies: [ACE] }));
    expect(s.gymRule).toBeUndefined();
  });

  it('RockSolid_BigHit_CappedAtAQuarterOfMaxHp', () => {
    let s = gym('rock-solid', { moves: ['hydro-pump', 'water-gun', 'tackle', 'tail-whip'] });
    s = tweak(s, (d) => void (d.player.team[0]!.base.attack = 400));
    const owner = leadOf(s);
    const foe = s.enemies[0]!;
    const bd = breakdownFor(owner, foe, ctx.content.move('hydro-pump'), false, ctx, s);
    expect(bd.final).toBe(Math.floor(foe.maxHp * g.rockSolidCap));
  });

  it('RockSolid_PlayerSide_NeverCapped', () => {
    const s = gym('rock-solid');
    const foe = s.enemies[0]!;
    const bd = breakdownFor(foe, leadOf(s), ctx.content.move('rock-slide'), false, ctx, s);
    const plain = breakdownFor(foe, leadOf(s), ctx.content.move('rock-slide'), false, ctx);
    expect(bd.final).toBe(plain.final);
  });

  it('Riptide_EverySecondTurn_LeadTradesWithBenchOne', () => {
    let s = gym('riptide');
    const first = leadOf(s).uid;
    s = dispatch(s, { type: 'end-turn' });
    expect(leadOf(s).uid).toBe(first); // turn 1: the tide waits
    s = dispatch(s, { type: 'end-turn' });
    expect(leadOf(s).uid).not.toBe(first); // turn 2: it turns
    const tide = eventsOf(s, 'swap').at(-1)!;
    expect(tide.t === 'swap' && tide.kind).toBe('forced');
    expect(s.player.totalManualSwaps).toBe(0);
  });

  it('Riptide_TurnsUntil_CountsDownToTheEvenTurn', () => {
    expect(turnsUntil({ turn: 1 }, 2)).toBe(2);
    expect(turnsUntil({ turn: 2 }, 2)).toBe(1);
    expect(turnsUntil({ turn: 1 }, 3)).toBe(3);
    expect(turnsUntil({ turn: 3 }, 3)).toBe(1);
  });

  it('Swarm_PerWaitingPokemon_LiftsTheLeadersHits', () => {
    const s = gym('swarm', { enemies: [ACE, PAD, PAD, PAD], onField: 2 });
    const foe = s.enemies[0]!;
    expect(ruleDamageMultiplier(s, foe, leadOf(s), ctx.content.move('tackle'), ctx.config)).toBeCloseTo(1 + 2 * g.swarmPerWaiting);
    expect(ruleDamageMultiplier(s, leadOf(s), foe, ctx.content.move('tackle'), ctx.config)).toBe(1);
  });

  it('Rollout_SameLeadTurnAfterTurn_GrowsAndSwapResets', () => {
    let s = gym('rollout');
    const foe = () => s.enemies[0]!;
    const mul = () => ruleDamageMultiplier(s, foe(), leadOf(s), ctx.content.move('tackle'), ctx.config);
    expect(mul()).toBe(1);
    s = dispatch(s, { type: 'end-turn' });
    expect(mul()).toBeCloseTo(1 + g.rolloutPerTurn);
    s = dispatch(s, { type: 'end-turn' });
    expect(mul()).toBeCloseTo(1 + 2 * g.rolloutPerTurn);
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    expect(mul()).toBe(1); // a new Lead: the roll starts over, and the intent's number with it
  });

  it('Meltdown_HitLands_TargetDefenceDownToTheFloor', () => {
    let s = gym('meltdown', { enemies: [{ species: 'arcanine', level: 20, tier: 'boss', phaseCount: 1, moves: ['ember'] }] });
    s = dispatch(s, { type: 'end-turn' });
    const hit = s.player.team.find((m) => s.events.some((e) => e.t === 'damage' && e.targetUid === m.uid && e.amount > 0));
    expect(hit!.stages.defense).toBe(-1);
    s = tweak(s, (d) => void (d.player.team.find((m) => m.uid === hit!.uid)!.stages.defense = g.meltdownFloor));
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team.every((m) => m.stages.defense >= g.meltdownFloor)).toBe(true);
  });

  it('Bloom_UntouchedPokemon_RestoresAShareAtTurnEnd', () => {
    let s = gym('bloom', { enemies: [{ ...ACE, moves: ['harden'] }] });
    s = tweak(s, (d) => void (d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp / 2)));
    const before = s.enemies[0]!.hp;
    s = dispatch(s, { type: 'end-turn' });
    expect(s.enemies[0]!.hp).toBe(before + Math.floor(s.enemies[0]!.maxHp * g.bloomHeal));
  });

  it('Bloom_HurtThisTurn_NoBloom', () => {
    let s = withHand(gym('bloom', { enemies: [{ ...ACE, moves: ['harden'] }] }), ['water-gun']);
    s = tweak(s, (d) => void (d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp / 2)));
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    const afterHit = s.enemies[0]!.hp;
    s = dispatch(s, { type: 'end-turn' });
    expect(s.enemies[0]!.hp).toBe(afterHit);
  });

  it('Overcharge_FirstCardOfAnOverchargedTurn_CostsOneMore', () => {
    let s = withHand(gym('overcharge'), ['water-gun', 'bubble']);
    const wg = ctx.content.move('water-gun').apCost;
    expect(cardPlayability(s, handCard(s, 'water-gun').id, ctx)!.apCost).toBe(wg); // turn 1: not yet
    s = withHand(dispatch(s, { type: 'end-turn' }), ['water-gun', 'bubble']);
    expect(turnsUntil(s, g.overchargeEvery)).toBe(1);
    expect(cardPlayability(s, handCard(s, 'water-gun').id, ctx)!.apCost).toBe(wg + g.overchargeAp);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    expect(cardPlayability(s, handCard(s, 'bubble').id, ctx)!.apCost).toBe(ctx.content.move('bubble').apCost);
  });

  it('Toxic_PoisonFromTheLeader_IsBadlyPoisoned', () => {
    let s = gym('toxic', { enemies: [{ species: 'weezing', level: 20, tier: 'boss', phaseCount: 1, moves: ['probe-poison'] }] });
    s = dispatch(s, { type: 'end-turn' });
    const poisoned = s.player.team.find((m) => m.status?.kind === 'poison');
    expect(poisoned?.status?.escalatingTicks).toBe(0);
  });

  it('MindLock_StrongestAttack_SealedAndRejected', () => {
    let s = withHand(gym('mind-lock', { moves: ['hydro-pump', 'water-gun', 'tackle', 'tail-whip'] }), ['water-gun', 'hydro-pump', 'tail-whip']);
    // The seal is set at the draw; a forced hand stands in for one, so seal it the way the turn would.
    s = dispatch(s, { type: 'end-turn' });
    const sealed = s.ruleState?.sealedCardId;
    expect(sealed).toBeDefined();
    const card = s.player.hand.find((c) => c.id === sealed)!;
    const strongest = Math.max(...s.player.hand.map((c) => ctx.content.move(c.moveId).power));
    expect(ctx.content.move(card.moveId).power).toBe(strongest);
    expect(reject(s, { type: 'play-card', cardId: card.id })).toBe('sealed');
  });

  it('Tremor_EveryThirdTurn_GroundedLoseAShare', () => {
    let s = gym('tremor', { enemies: [{ ...ACE, moves: ['harden'] }] });
    s = dispatch(s, { type: 'end-turn' });
    s = dispatch(s, { type: 'end-turn' });
    expect(eventsOf(s, 'damage').some((e) => e.t === 'damage' && e.cause === 'tremor')).toBe(false);
    s = dispatch(s, { type: 'end-turn' });
    const quakes = eventsOf(s, 'damage').filter((e) => e.t === 'damage' && e.cause === 'tremor');
    expect(quakes.length).toBe(s.player.team.length);
  });

  it('CloseQuarters_RangedHalved_MeleeLifted', () => {
    const s = gym('close-quarters');
    const foe = s.enemies[0]!;
    const ranged = ctx.content.move('water-gun');
    const melee = ctx.content.move('tackle');
    expect(ranged.range).toBe('ranged');
    expect(melee.range).toBe('melee');
    expect(ruleDamageMultiplier(s, leadOf(s), foe, ranged, ctx.config)).toBe(g.closeQuartersRanged);
    expect(ruleDamageMultiplier(s, leadOf(s), foe, melee, ctx.config)).toBe(g.closeQuartersMelee);
    expect(ruleDamageMultiplier(s, foe, leadOf(s), melee, ctx.config)).toBe(1);
  });

  it('IceArmour_EachIntentPhase_LeadShielded_FireShatters', () => {
    let s = gym('ice-armour', { moves: ['ember', 'water-gun', 'tackle', 'tail-whip'] });
    const shield = Math.floor(s.enemies[0]!.maxHp * g.iceArmour);
    expect(s.enemies[0]!.shield).toBe(shield);
    s = withHand(s, ['ember']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'ember').id });
    expect(s.enemies[0]!.shield).toBe(0);
  });
});

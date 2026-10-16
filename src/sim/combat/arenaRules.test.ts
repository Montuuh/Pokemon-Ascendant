import { describe, expect, it } from 'vitest';
import type { EnemySetup, ScenarioDef } from '../content/defs';
import { ctx, dispatch, eventsOf, handCard, leadOf, scenario, start, teamWithKit, tweak, withHand } from '../testing/harness';
import { arenaBlocksStatus, arenaCounter, arenaDamageMultiplier, barrierUp, METRONOME_FIELDS } from './arenaRules';
import { breakdownFor, changeStage } from './damageFlow';
import { classifyMove } from './intents';
import { battlefields } from './fields';

// §2.12.2.1 — a Legendary's arena rule. One each, for the whole fight, the Legendary's and never the player's.

const a = ctx.config.arenaRules;
const legendary = (species: string, moves?: string[]): EnemySetup => ({ species, level: 40, tier: 'boss', phaseCount: 2, ...(moves ? { moves } : {}) });
const arena = (rule: NonNullable<ScenarioDef['arenaRule']>, enemy: EnemySetup, extra: Partial<ScenarioDef> = {}) =>
  start({
    ...scenario({ kind: 'wild', team: teamWithKit(['water-gun', 'ice-beam', 'tail-whip', 'tackle'], 'wartortle', 40), enemies: [enemy] }),
    arenaRule: rule,
    ...extra,
  });

describe('The arena rule — §2.12.2.1', () => {
  it('ArenaRule_RidesInWithItsArena_AndOnlyThere', () => {
    expect(start(scenario({ kind: 'wild', team: teamWithKit(['water-gun']), enemies: [legendary('articuno')] })).arenaRule).toBeUndefined();
    expect(arena('mist', legendary('articuno')).arenaRule).toBe('mist');
  });

  it('Mist_TheLegendarysStats_CannotBeLowered_YoursStillCan', () => {
    let s = arena('mist', legendary('articuno'));
    s = tweak(s, (d) => {
      changeStage(d, d.enemies[0]!, 'defense', -1);
      changeStage(d, d.enemies[0]!, 'attack', 1);
      changeStage(d, d.player.team[0]!, 'speed', -1);
    });
    expect(s.enemies[0]!.stages.defense).toBe(0);
    expect(s.enemies[0]!.stages.attack).toBe(1);
    expect(s.player.team[0]!.stages.speed).toBe(-1);
  });

  it('Mist_TheLegendary_IsNeverFrozen_OtherStatusesStillLand', () => {
    const s = arena('mist', legendary('mewtwo'));
    expect(arenaBlocksStatus(s, s.enemies[0]!, 'freeze')).toBe(true);
    expect(arenaBlocksStatus(s, s.enemies[0]!, 'paralysis')).toBe(false);
    expect(arenaBlocksStatus(s, leadOf(s), 'freeze')).toBe(false);
  });

  it('Thundercloud_FromPhaseTwo_ItsThunderIsACleave', () => {
    let s = arena('thundercloud', legendary('zapdos', ['thunder', 'drill-peck', 'thunder-shock', 'agility']));
    const thunder = ctx.content.move('thunder');
    expect(classifyMove(s, s.enemies[0]!, thunder, ctx)?.kind).toBe('attack');
    s = tweak(s, (d) => void (d.enemies[0]!.phase = 2));
    expect(classifyMove(s, s.enemies[0]!, thunder, ctx)?.kind).toBe('cleave');
    // Its other moves keep their reach.
    expect(classifyMove(s, s.enemies[0]!, ctx.content.move('drill-peck'), ctx)?.kind).toBe('attack');
  });

  it('Rekindle_TheFirstTimeItFallsToItsShare_ItRisesOnce', () => {
    let s = arena('rekindle', legendary('moltres'));
    // Stood where one Water Gun takes it just under its share.
    const hit = breakdownFor(leadOf(s), s.enemies[0]!, ctx.content.move('water-gun'), false, ctx, s).final;
    s = tweak(s, (d) => {
      const m = d.enemies[0]!;
      m.hp = Math.floor(m.maxHp * a.rekindleAt) + hit - 1;
      m.status = { kind: 'burn', appliedTurn: 0, turnsLeft: 3 };
    });
    const before = s.enemies[0]!.hp;
    s = withHand(s, ['water-gun']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    const m = s.enemies[0]!;
    expect(m.hp).toBeGreaterThan(before - hit);
    expect(m.status).toBeNull();
    expect(s.ruleState?.rekindled).toBe(true);
    expect(arenaCounter(s, ctx.config)).toEqual({ kind: 'rekindle', spent: true });
    // Once: falling there again, it does not rise.
    s = tweak(s, (d) => void (d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp * a.rekindleAt)));
    const low = s.enemies[0]!.hp;
    s = withHand(s, ['water-gun']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    expect(s.enemies[0]!.hp).toBeLessThan(low);
  });

  it('Barrier_EveryThirdTurn_HalvesWhatTheLegendaryTakes_AndTheNumberSaysSo', () => {
    let s = arena('barrier', legendary('mewtwo'));
    const tackle = ctx.content.move('tackle');
    expect(barrierUp(s, ctx.config)).toBe(false);
    const plain = breakdownFor(leadOf(s), s.enemies[0]!, tackle, false, ctx, s).final;
    s = dispatch(dispatch(s, { type: 'end-turn' }), { type: 'end-turn' });
    expect(s.turn).toBe(a.barrierEvery);
    expect(barrierUp(s, ctx.config)).toBe(true);
    expect(arenaDamageMultiplier(s, s.enemies[0]!, ctx.config)).toBe(a.barrierTaken);
    expect(breakdownFor(leadOf(s), s.enemies[0]!, tackle, false, ctx, s).final).toBeLessThan(plain);
    // Never on your side.
    expect(arenaDamageMultiplier(s, leadOf(s), ctx.config)).toBe(1);
  });

  it('Playful_ItBecomesTheTypeOfTheMoveThatHitIt', () => {
    let s = arena('playful', legendary('mew'));
    s = withHand(s, ['water-gun']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    expect(s.enemies[0]!.types).toEqual(['water']);
    expect(arenaCounter(s, ctx.config)).toEqual({ kind: 'type', type: 'water' });
    expect(eventsOf(s, 'type-change')).toHaveLength(1);
  });

  it('Metronome_OpensUnderAField_AndRedrawsItEveryTurn_ShownATurnAhead', () => {
    let s = arena('playful', legendary('mew'), { metronome: true });
    expect(battlefields(s.fields)).toHaveLength(1);
    const next = s.ruleState!.metronomeNext!;
    expect(METRONOME_FIELDS).toContain(next);
    s = dispatch(s, { type: 'end-turn' });
    expect(battlefields(s.fields)).toEqual([next]);
    expect(METRONOME_FIELDS).toContain(s.ruleState!.metronomeNext!);
  });
});

import { describe, expect, it } from 'vitest';
import type { EnemySetup } from '../content/defs';
import { ctx, dispatch, leadOf, scenario, start, tweak } from '../testing/harness';
import type { CombatState } from './state';

// §5.5.2 — telegraphed combos: a set-up declared with its finisher shown as next turn's plan, broken by a quarter of its
// HP or a super-effective hit in between; in one turn for a Pokémon that acts twice.

const DREAMER = (extra: Partial<EnemySetup> = {}): EnemySetup => ({
  species: 'butterfree', level: 30, tier: 'boss', phaseCount: 1, moves: ['sleep-powder', 'dream-eater', 'gust', 'harden'], combo: ['sleep-powder', 'dream-eater'], ...extra,
});
const fight = (enemy: EnemySetup) =>
  start(scenario({ team: [{ species: 'squirtle', level: 30, moves: ['tackle', 'water-gun'] }, { species: 'charmander', level: 30, moves: ['ember'] }], enemies: [enemy] }));
const endTurn = (s: CombatState) => dispatch(s, { type: 'end-turn' });
function play(state: CombatState, moveId: string): CombatState {
  const armed = tweak(state, (d) => {
    d.player.hand = [{ id: `probe-${moveId}`, moveId, ownerUid: d.player.team[0]!.uid }];
    d.player.ap = 3;
  });
  return dispatch(armed, { type: 'play-card', cardId: `probe-${moveId}` });
}

describe('Telegraphed combos — §5.5.2', () => {
  it('Combo_DeclaresItsSetUp_AndShowsItsFinisherAsNextTurnsPlan', () => {
    const s = fight(DREAMER());
    const e = s.enemies[0]!;
    expect(e.intent?.moveId).toBe('sleep-powder');
    expect(e.next?.intent.moveId).toBe('dream-eater');
    expect(e.next?.combo).toBe(true);
  });

  it('Combo_PlaysItsFinisherNextTurn_OnTheSleeperItMade', () => {
    const s = endTurn(fight(DREAMER()));
    expect(leadOf(s).status?.kind).toBe('sleep');
    expect(s.enemies[0]!.intent?.moveId).toBe('dream-eater');
  });

  it('Combo_AQuarterOfItsHpInYourTurn_BreaksTheFinisher', () => {
    let s = tweak(fight(DREAMER()), (d) => void (d.enemies[0]!.stagger = Math.ceil(d.enemies[0]!.maxHp * ctx.config.comboBreakShare) - 1));
    s = play(s, 'tackle');
    expect(s.enemies[0]!.next).toBeNull();
    expect(s.events.some((e) => e.t === 'combo-break')).toBe(true);
    s = endTurn(s);
    expect(s.enemies[0]!.intent?.moveId).not.toBe('dream-eater');
  });

  it('Combo_ASuperEffectiveHit_BreaksItToo', () => {
    // A Water hit on a Fire-type finisher's user: Charmeleon's Sunny Day → Flamethrower.
    const s0 = fight({ species: 'charmeleon', level: 30, tier: 'boss', phaseCount: 1, moves: ['sunny-day', 'flamethrower', 'scratch', 'growl'], combo: ['sunny-day', 'flamethrower'] });
    expect(s0.enemies[0]!.next?.combo).toBe(true);
    const s = play(s0, 'water-gun');
    expect(s.enemies[0]!.next).toBeNull();
  });

  it('Combo_RestsAfterItRuns_SoTheBossIsNotOnlyItsCombo', () => {
    let s = endTurn(fight(DREAMER()));
    expect(s.enemies[0]!.comboRestUntil).toBeGreaterThan(s.turn);
    s = endTurn(s);
    expect(s.enemies[0]!.next?.combo).toBeUndefined();
  });

  it('Combo_InOneTurn_ForAPokemonThatActsTwice', () => {
    const s = fight(DREAMER({ acts: 2, phaseCount: 3 }));
    const e = s.enemies[0]!;
    expect(e.intent?.moveId).toBe('sleep-powder');
    expect(e.second?.moveId).toBe('dream-eater');
    expect(e.next ?? null).toBeNull();
  });

  it('Combo_NotOpened_WhenItsSetUpWouldDoNothing', () => {
    const s = start(scenario({ team: [{ species: 'squirtle', level: 30, moves: ['tackle'], status: 'poison' }, { species: 'charmander', level: 30 }], enemies: [DREAMER()] }));
    expect(s.enemies[0]!.intent?.moveId).not.toBe('sleep-powder');
    expect(s.enemies[0]!.next ?? null).toBeNull();
  });
});

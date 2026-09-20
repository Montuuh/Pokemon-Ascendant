import { describe, expect, it } from 'vitest';
import { GameRng } from '../rng/gameRng';
import { RngStreams } from '../rng/rngStreams';
import { PIDGEY, STARTERS, ctx, dispatch, eventsOf, scenario, start, tweak } from '../testing/harness';
import { chooseIntent, classifyMove, predictIntentDamage, scoreIntent } from './intents';
import { slotOccupant } from './slots';

const GEODUDE = { species: 'geodude', level: 10, tier: 'wild' as const, phaseCount: 1 as const };

describe('Enemy AI — §5', () => {
  it('Classify_DamagingMove_AttacksLead_UtilityKinds', () => {
    const s = start(scenario({ team: STARTERS, enemies: [PIDGEY] }));
    const e = s.enemies[0]!;
    expect(classifyMove(s, e, ctx.content.move('gust'), ctx)!.kind).toBe('attack');
    expect(classifyMove(s, e, ctx.content.move('sand-attack'), ctx)!.kind).toBe('debuff');
    expect(classifyMove(s, e, ctx.content.move('roost'), ctx)!.kind).toBe('stall');
    expect(classifyMove(s, e, ctx.content.move('defense-curl'), ctx)!.kind).toBe('buff');
    expect(classifyMove(s, e, ctx.content.move('powder-spread'), ctx)!.kind).toBe('status');
    expect(classifyMove(s, e, ctx.content.move('earthquake'), ctx)!.kind).toBe('cleave');
    expect(classifyMove(s, e, ctx.content.move('tailwind'), ctx)).toBeNull();
  });

  it('Score_NeverAttacksIntoImmunity', () => {
    // Geodude's Magnitude (ground) vs a Pidgey lead (flying) → 0.
    const s = start(scenario({ team: [{ species: 'pidgey', level: 8 }, { species: 'squirtle', level: 8 }], enemies: [GEODUDE] }));
    const e = s.enemies[0]!;
    const move = ctx.content.move('magnitude');
    const intent = classifyMove(s, e, move, ctx)!;
    expect(scoreIntent(s, e, { intent, move }, ctx)).toBe(0);
  });

  it('Score_SuperEffective_DoublesWeight_LowTargetHp_Doubles', () => {
    const s = start(scenario({ team: [{ species: 'charmander', level: 8 }], enemies: [GEODUDE] }));
    const e = s.enemies[0]!;
    const move = ctx.content.move('rock-throw');
    const intent = classifyMove(s, e, move, ctx)!;
    const base = scoreIntent(s, e, { intent, move }, ctx);
    expect(base).toBe(45 * 2); // rock vs fire ×2
    const low = tweak(s, (d) => {
      d.player.team[0]!.hp = 1;
    });
    expect(scoreIntent(low, low.enemies[0]!, { intent, move }, ctx)).toBe(45 * 2 * 2);
  });

  it('Score_StatusOnAlreadyStatusedOrImmune_Zero', () => {
    const s = start(scenario({ team: [{ species: 'charmander', level: 8 }], enemies: [{ species: 'butterfree', level: 12, tier: 'wild', phaseCount: 1 }] }));
    const e = s.enemies[0]!;
    const move = ctx.content.move('powder-spread');
    const intent = classifyMove(s, e, move, ctx)!;
    expect(scoreIntent(s, e, { intent, move }, ctx)).toBeGreaterThan(0);
    const asleep = tweak(s, (d) => {
      d.player.team[0]!.status = { kind: 'burn', appliedTurn: 0, turnsLeft: null };
    });
    expect(scoreIntent(asleep, asleep.enemies[0]!, { intent, move }, ctx)).toBe(0);
  });

  it('Score_CooldownGate_ZeroWhileCooling', () => {
    const s = start(scenario({ team: STARTERS, enemies: [{ species: 'golem', level: 15, tier: 'wild', phaseCount: 1 }] }));
    const e = s.enemies[0]!;
    const move = ctx.content.move('stone-edge');
    const intent = classifyMove(s, e, move, ctx)!;
    expect(scoreIntent(s, e, { intent, move }, ctx)).toBeGreaterThan(0);
    const cooling = tweak(s, (d) => {
      d.enemies[0]!.cooldowns['stone-edge'] = 2;
    });
    expect(scoreIntent(cooling, cooling.enemies[0]!, { intent, move }, ctx)).toBe(0);
  });

  it('Score_ParalysedEnemy_CannotAffordThreeAPMoves', () => {
    const s = tweak(start(scenario({ team: STARTERS, enemies: [{ species: 'golem', level: 15, tier: 'wild', phaseCount: 1 }] })), (d) => {
      d.enemies[0]!.status = { kind: 'paralysis', appliedTurn: 0, turnsLeft: 3 };
    });
    const e = s.enemies[0]!;
    const eq = ctx.content.move('earthquake');
    expect(scoreIntent(s, e, { intent: classifyMove(s, e, eq, ctx)!, move: eq }, ctx)).toBe(0);
    const bp = ctx.content.move('body-press');
    expect(scoreIntent(s, e, { intent: classifyMove(s, e, bp, ctx)!, move: bp }, ctx)).toBeGreaterThan(0);
  });

  it('Choose_PicksTopScore_WhenFloorDisabled_FloorPicksOnlyLegalAlternatives', () => {
    const s = start(scenario({ team: [{ species: 'charmander', level: 8 }], enemies: [{ ...GEODUDE, moves: ['magnitude', 'rock-throw', 'tackle', 'defense-curl'] }] }));
    // Scores vs a Fire lead: Magnitude 50×2 = 100 (top), Rock Throw 45×2 = 90, Tackle 40, Defense Curl 50×1.5 = 75.
    const noFloor = { ...ctx, config: { ...ctx.config, randomnessFloorChance: 0 } };
    expect(chooseIntent(s, s.enemies[0]!, noFloor, new GameRng(3))!.moveId).toBe('magnitude');
    const picks = new Set<string>();
    // Raw small seeds give xorshift32 tiny first outputs; real combats seed through RngStreams (FNV-mixed).
    for (let seed = 1; seed <= 80; seed++) picks.add(chooseIntent(s, s.enemies[0]!, ctx, new RngStreams(seed).get('CombatRNG'))!.moveId!);
    expect(picks.has('magnitude')).toBe(true);
    expect(picks.size).toBeGreaterThan(1); // the 12.5 % floor fires sometimes
    for (const p of picks) expect(['magnitude', 'rock-throw', 'tackle', 'defense-curl']).toContain(p);
  });

  it('Intent_TargetsSlotNotPokemon_SwapChangesWhoIsHit', () => {
    let s = start(scenario({ team: STARTERS, enemies: [PIDGEY] }));
    const intent = s.enemies[0]!.intent!;
    expect(intent.targetSlot).toBe('lead');
    s = dispatch(s, { type: 'swap', benchIndex: 1 }); // Squirtle to Lead
    const squirtleHp = s.player.team[1]!.hp;
    const charHp = s.player.team[0]!.hp;
    s = dispatch(s, { type: 'end-turn' });
    if (intent.kind === 'attack') {
      expect(s.player.team[1]!.hp).toBeLessThan(squirtleHp);
      expect(s.player.team[0]!.hp).toBe(charHp);
    }
  });

  it('PredictedDamage_RecomputedForCurrentOccupant', () => {
    let s = start(scenario({ team: [{ species: 'charmander', level: 8 }, { species: 'squirtle', level: 8 }], enemies: [GEODUDE] }));
    s = tweak(s, (d) => {
      d.enemies[0]!.intent = { kind: 'attack', moveId: 'rock-throw', targetSlot: 'lead', hidden: false };
    });
    const vsChar = predictIntentDamage(s, s.enemies[0]!, ctx)!;
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    const vsSquirtle = predictIntentDamage(s, s.enemies[0]!, ctx)!;
    expect(vsChar).toBeGreaterThan(vsSquirtle); // rock ×2 on fire, ×1 on water and higher Def
  });

  it('Backstrike_TargetsBenchSlot_FizzlesIfEmpty_NoRedirect', () => {
    const GRAVELER = { species: 'graveler', level: 12, tier: 'wild' as const, phaseCount: 1 as const };
    let s = start(scenario({ team: [{ species: 'squirtle', level: 10 }, { species: 'charmander', level: 10 }], enemies: [GRAVELER] }));
    s = tweak(s, (d) => {
      d.enemies[0]!.intent = { kind: 'backstrike', moveId: 'rock-blast', targetSlot: 'bench1', hidden: false };
    });
    const occupant = slotOccupant(s, 'bench1')!;
    expect(occupant.speciesId).toBe('charmander');
    // Empty the slot: faint the bench occupant.
    const empty = tweak(s, (d) => {
      d.player.team[1]!.hp = 0;
    });
    const leadHp = empty.player.team[0]!.hp;
    const after = dispatch(empty, { type: 'end-turn' });
    expect(after.player.team[0]!.hp).toBe(leadHp);
    const action = eventsOf(after, 'enemy-action').at(-1) as { fizzled: boolean };
    expect(action.fizzled).toBe(true);
  });

  it('Cleave_HitsEveryOccupiedSlot_NeverFizzles', () => {
    let s = start(scenario({ team: STARTERS, enemies: [{ species: 'golem', level: 12, tier: 'wild', phaseCount: 1 }] }));
    s = tweak(s, (d) => {
      d.enemies[0]!.intent = { kind: 'cleave', moveId: 'earthquake', targetSlot: null, hidden: false };
      d.player.team[2]!.hp = 0; // one bench fainted → 2 targets
    });
    const hp = s.player.team.map((c) => c.hp);
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[0]!.hp).toBeLessThan(hp[0]!);
    expect(s.player.team[1]!.hp).toBeLessThan(hp[1]!);
    expect(eventsOf(s, 'damage').filter((e) => (e as { cause: string }).cause === 'move')).toHaveLength(2);
  });

  it('Incapacitated_SleepingEnemy_SkipsItsTurn', () => {
    let s = tweak(start(scenario({ team: STARTERS, enemies: [PIDGEY] })), (d) => {
      d.enemies[0]!.status = { kind: 'sleep', appliedTurn: 1, turnsLeft: 1 };
    });
    s = dispatch(s, { type: 'end-turn' }); // turn 2 intent should be "incapacitated"
    expect(s.enemies[0]!.intent?.kind).toBe('incapacitated');
    const hp = s.player.team.map((c) => c.hp);
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team.map((c) => c.hp)).toEqual(hp);
  });

  it('HiddenIntent_BossFirstIntentHidden_UntilWitnessed', () => {
    let s = start(scenario({ kind: 'boss', team: STARTERS, enemies: [{ species: 'geodude', level: 10, tier: 'boss', phaseCount: 2 }] }));
    expect(s.enemies[0]!.intent!.hidden).toBe(true);
    s = dispatch(s, { type: 'end-turn' });
    expect(s.enemies[0]!.witnessed).toBe(true);
    expect(s.enemies[0]!.intent!.hidden).toBe(false);
  });

  it('HiddenIntent_KeenEyeReveals', () => {
    const s = start(scenario({ kind: 'boss', team: [{ species: 'pidgeotto', level: 12 }], enemies: [{ species: 'geodude', level: 10, tier: 'boss', phaseCount: 2 }] }));
    expect(s.enemies[0]!.intent!.hidden).toBe(false);
  });
});

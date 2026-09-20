import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  AVAILABLE_MODIFIERS, DEFAULT_BATTLE_CONFIG, MODIFIERS, battleConfigFor, boxCapacity, buildScenario,
  createRun, defaultRunCtx, effectiveMax, hasModifier, modifierValue, modifierXpMultiplier, nodesInLayer,
  runReducer, type RunAction, type RunState,
} from '@/sim';
import { createCombat } from '@/sim/combat/setup';
import { effectiveMaxHp } from '@/sim/combat/stats';

// §8.8 — difficulty modifiers. Each one either changes a number the sim reads or a rule it follows, and the
// point of this file is that the change *arrives*: a modifier wired into the picker and not into the sim is
// an XP premium charged for nothing, which is the one thing §8.8 must never be.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const start = (modifiers: string[] = [], seed = 7) => createRun('squirtle', seed, ctx, 0, modifiers);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

describe('Difficulty modifiers — §8.8', () => {
  it('EveryRow_IsEitherSelectable_OrSaysWhyNot_§7.7', () => {
    for (const m of MODIFIERS) {
      expect(m.xpMultiplier, `${m.id} must cost something`).toBeGreaterThan(1);
      if (!m.available) expect(m.pending, `${m.id} is locked but does not say why`).toBeTruthy();
      // A player-facing string is a player-facing string: no section numbers in any of them.
      for (const s of [m.effect, m.pending, m.partial].filter(Boolean) as string[]) {
        expect(s, `${m.id} leaks a section reference into the UI`).not.toMatch(/§\d/);
      }
    }
    expect(AVAILABLE_MODIFIERS.length).toBeGreaterThanOrEqual(7);
  });

  it('BaselineIsTheFloor_NoModifierMakesTheRunEasier_§8.8.4', () => {
    expect(modifierXpMultiplier([])).toBe(1);
    // Every multiplier is > 1, so there is no way to select your way below the baseline.
    for (const m of MODIFIERS) expect(modifierXpMultiplier([m.id])).toBeGreaterThanOrEqual(1);
  });

  it('AnUnavailableModifier_IsInertEvenIfASaveNamesIt', () => {
    // A save from a later build, or a hand-edited one, must not switch on a rule the sim cannot honour.
    expect(hasModifier(['one-path'], 'one-path')).toBe(false);
    expect(modifierXpMultiplier(['one-path'])).toBe(1);
    expect(modifierValue(['greater-threats'], 'greater-threats', 'anything', 42)).toBe(42);
  });

  it('BoxSqueeze_ShrinksTheBox_§8.8', () => {
    expect(boxCapacity(start())).toBe(6);
    expect(boxCapacity(start(['box-squeeze']))).toBe(4);
  });

  it('TraumaSurge_ReachesBothLayers_TheRunAndTheFight_§8.2.1', () => {
    // The run layer: a Pokémon with three stacks is smaller under the modifier than without it.
    const plain = start();
    const harsh = start(['trauma-surge']);
    const mon = { ...plain.box[0]!, traumaStacks: 3 };
    expect(effectiveMax(harsh, mon, content)).toBeLessThan(effectiveMax(plain, mon, content));

    // The combat layer, which is the half that was written and not wired: `battleConfigFor` has to be what
    // the ctx carries into the fight, or Trauma Surge is a picker row that charges 1.20× for nothing.
    const cfg = battleConfigFor(['trauma-surge']);
    expect(cfg).not.toBe(DEFAULT_BATTLE_CONFIG);
    expect(effectiveMaxHp(100, 3, cfg)).toBeLessThan(effectiveMaxHp(100, 3, DEFAULT_BATTLE_CONFIG));
    // And no modifier means the base object straight back, so a golden master is unmoved.
    expect(battleConfigFor([])).toBe(DEFAULT_BATTLE_CONFIG);
  });

  it('IronWill_ScalesWildHpOnly_§8.8', () => {
    const harsh = start(['iron-will']);
    const wild = Object.values(harsh.map.nodes).find((n) => n.kind === 'wild')!;
    const trainer = Object.values(harsh.map.nodes).find((n) => n.kind === 'trainer')!;
    const rng = { range01: () => 0.5, chance: () => false, cursor: 1 } as never;

    const wildScenario = buildScenario(wild, harsh, content, rng)!;
    expect(wildScenario.enemies[0]!.hpMultiplier).toBe(1.2);
    // A trainer's Pidgey is the same Pidgey: Iron Will is a *wild* modifier.
    const trainerScenario = buildScenario(trainer, harsh, content, rng)!;
    for (const e of trainerScenario.enemies) expect(e.hpMultiplier).toBeUndefined();
  });

  it('MastersChallenge_PromotesBossPhases_ButNeverPastThree', () => {
    const harsh = start(['masters-challenge']);
    const gym = nodesInLayer(harsh.map, harsh.map.layers - 1)[0]!;
    const rng = { range01: () => 0.5, chance: () => false, cursor: 1 } as never;
    const scenario = buildScenario(gym, harsh, content, rng)!;
    // Geodude 2 → 3; Graveler is already a three-phase ace and stays there, which is what the card says.
    expect(scenario.enemies.map((e) => e.phaseCount)).toEqual([3, 3]);
  });

  it('DenseFog_HidesTheFirstIntentOfAnOrdinaryEnemy_§5.5', () => {
    const build = (modifiers: string[]) => {
      let s = start(modifiers, 11);
      const wild = s.reachable.find((id) => s.map.nodes[id]!.kind === 'wild');
      if (!wild) return null;
      s = apply(apply(s, { type: 'enter-node', nodeId: wild }), { type: 'begin-combat' });
      return createCombat(s.pendingScenario!, { content, config: battleConfigFor(modifiers) }, 3);
    };
    const clear = build([]);
    const fogged = build(['dense-fog']);
    if (!clear || !fogged) return; // this seed offered no wild node from layer 0

    expect(clear.enemies[0]!.intent?.hidden).toBe(false);
    expect(fogged.enemies[0]!.intent?.hidden).toBe(true);
  });

  it('NoRefunds_TakesAPlayedConsumableOffTheShelf_§8.8', () => {
    const report = (spent: string[]) => ({
      outcome: 'victory' as const,
      team: [] as never[],
      caught: null,
      ballsLeft: 3,
      spentConsumables: spent,
      turns: 4,
    });
    for (const modifiers of [[], ['no-refunds']]) {
      let s = start(modifiers, 7);
      const before = [...s.consumables];
      const node = s.reachable.find((id) => s.map.nodes[id]!.kind !== 'center')!;
      s = apply(apply(s, { type: 'enter-node', nodeId: node }), { type: 'begin-combat' });
      if (s.phase !== 'combat') continue;
      s = apply(s, { type: 'finish-combat', report: { ...report(['potion']), team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })) } });

      const expected = modifiers.length ? before.length - 1 : before.length;
      expect(s.consumables, `no-refunds=${!!modifiers.length}`).toHaveLength(expected);
    }
  });
});

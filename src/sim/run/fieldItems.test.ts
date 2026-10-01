import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, effectiveMax, runReducer, type RunAction, type RunState } from '@/sim';
import { usableInField } from './fieldItems';

// §7.2.1 — consumables used from the bag between nodes (v0.8.6).

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const withBag = (ids: string[], tweak: (d: RunState) => void = () => {}) =>
  produce(createRun('squirtle', 7, ctx), (d) => {
    d.consumables = [...ids];
    tweak(d);
  });

describe('Bag items out of a fight — §7.2.1', () => {
  it('APotion_HealsABoxPokemon_AndIsSpent', () => {
    let s = withBag(['potion'], (d) => {
      d.box[0]!.hp = 10;
    });
    const uid = s.box[0]!.uid;
    s = apply(s, { type: 'use-item', consumableId: 'potion', uid });
    expect(s.box[0]!.hp).toBe(Math.min(effectiveMax(s, s.box[0]!, content), 30));
    expect(s.consumables).toEqual([]);
  });

  it('ACure_ClearsItsStatus_AFullHeal_ClearsAnyAndConfusion', () => {
    let s = withBag(['antidote', 'full-heal', 'burn-heal'], (d) => {
      d.box[0]!.status = { kind: 'poison', turnsLeft: null };
    });
    const uid = s.box[0]!.uid;
    expect(reject(s, { type: 'use-item', consumableId: 'burn-heal', uid })).toBe('nothing-to-cure');
    s = apply(s, { type: 'use-item', consumableId: 'antidote', uid });
    expect(s.box[0]!.status).toBeNull();
    s = produce(s, (d) => {
      d.box[0]!.status = { kind: 'burn', turnsLeft: null };
      d.box[0]!.confusionTurns = 2;
    });
    s = apply(s, { type: 'use-item', consumableId: 'full-heal', uid });
    expect(s.box[0]!.status).toBeNull();
    expect(s.box[0]!.confusionTurns).toBe(0);
  });

  it('ARevive_StandsAFaintedPokemonUp_AndAPotionCannot', () => {
    let s = withBag(['potion', 'revive'], (d) => {
      d.box[0]!.hp = 0;
    });
    const uid = s.box[0]!.uid;
    expect(reject(s, { type: 'use-item', consumableId: 'potion', uid })).toBe('fainted');
    s = apply(s, { type: 'use-item', consumableId: 'revive', uid });
    expect(s.box[0]!.hp).toBe(Math.floor(effectiveMax(s, s.box[0]!, content) / 2));
  });

  it('AnItemThatDoesNothing_IsRefused_AndFightOnlyItemsAreNeverUsable', () => {
    const s = withBag(['potion', 'ether', 'poke-ball']);
    const uid = s.box[0]!.uid;
    expect(reject(s, { type: 'use-item', consumableId: 'potion', uid })).toBe('full-hp');
    expect(reject(s, { type: 'use-item', consumableId: 'ether', uid })).toBe('not-a-field-item');
    expect(reject(s, { type: 'use-item', consumableId: 'hyper-potion', uid })).toBe('no-such-item');
    for (const id of ['ether', 'x-attack', 'defog', 'poke-ball']) expect(usableInField(id, content), id).toBe(false);
    for (const id of ['potion', 'max-potion', 'revive', 'antidote', 'full-heal']) expect(usableInField(id, content), id).toBe(true);
  });

  it('OnlyBetweenNodesAndInTown_NeverInAFight', () => {
    let s = withBag(['potion'], (d) => {
      d.box[0]!.hp = 10;
    });
    s = apply(s, { type: 'enter-node', nodeId: s.reachable[0]! });
    s = apply(s, { type: 'begin-combat' });
    if (s.phase === 'combat') expect(reject(s, { type: 'use-item', consumableId: 'potion', uid: s.box[0]!.uid })).toBe('wrong-phase');
  });
});

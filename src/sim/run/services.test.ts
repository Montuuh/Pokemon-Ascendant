import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  applyBranch, rememberedMoves, arriveAtCity, createRun, defaultRunCtx, dojoPrice, eggMovesFor, newPartyMon, PRICES, runReducer,
  type RunAction, type RunState,
} from '@/sim';

// §2.11.1 — the Center's PC Box, and §2.9.4.2 — the Dojo's egg moves: the last doors of v0.7.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;

/** A run standing in the City after `regionIndex`, a Box of `extra` more Pokémon beside the starter, all active. */
const inCity = (regionIndex = 0, money = 5000, extra = 2): RunState =>
  produce({ ...createRun('charmander', 7, ctx, regionIndex), money }, (d) => {
    const others = ['pidgey', 'rattata', 'oddish'].slice(0, extra).map((id, i) => newPartyMon(id, 10, content, 100 + i));
    d.box.push(...others);
    d.activeUids = d.box.slice(0, 3).map((m) => m.uid);
    arriveAtCity(d, ctx);
  });
const at = (s: RunState, building: 'center' | 'dojo' | 'ring') => apply(s, { type: 'enter-building', building });


describe('The PC Box — §2.11.1', () => {
  it('ChoosesTheTeamAndTheLead_InsideTheCenter', () => {
    let s = at(inCity(), 'center');
    const [a, b] = [s.box[1]!.uid, s.box[2]!.uid];
    s = apply(s, { type: 'set-active', uids: [a, b] });
    s = apply(s, { type: 'set-lead', uid: b });
    expect(s.activeUids).toEqual([b, a]);
  });
});

describe('The Dojo remembers — §2.9.4 (v0.9.10)', () => {
  it('RememberedMoves_TheLinesOldMoves_ThatThePoolLost', () => {
    const mon = newPartyMon('mankey', 12, content, 1);
    applyBranch(mon, 'primeape-vanguard', content);
    // The vanguard path turned Low Kick into Submission and Karate Chop into its +: the Dojo can teach both back.
    expect(rememberedMoves(mon, content)).toEqual(expect.arrayContaining(['low-kick', 'karate-chop']));
    for (const m of rememberedMoves(mon, content)) expect(mon.pool).not.toContain(m);
  });
});

describe('Egg moves — §2.9.4.2', () => {
  it('AreTheLines_SoldToAnyStage_AtTheirOwnPrice', () => {
    const s = at(inCity(), 'dojo');
    const charmander = s.box[0]!;
    const eggs = eggMovesFor(charmander, content);
    expect(eggs).toEqual(content.species('charmander').eggMoves);
    // An evolved stage buys what its base would: the list is the line's, not the stage's.
    expect(eggMovesFor({ ...charmander, speciesId: 'charizard' }, content)).toEqual(eggs);
    const after = apply(s, { type: 'teach-egg-move', uid: charmander.uid, moveId: eggs[0]! });
    expect(after.box[0]!.pool).toContain(eggs[0]);
    expect(after.money).toBe(s.money - dojoPrice(s, content, 'egg'));
    expect(dojoPrice(s, content, 'egg')).toBe(PRICES.dojoEgg);
    expect(reject(after, { type: 'teach-egg-move', uid: charmander.uid, moveId: eggs[0]! })).toBe('already-known');
  });

  it('CostMoreInTheCity_AndOnlySellTheLinesOwn', () => {
    const town = at(inCity(0), 'dojo');
    const city = at(inCity(1), 'dojo');
    expect(dojoPrice(city, content, 'egg')).toBeGreaterThan(dojoPrice(town, content, 'egg'));
    expect(reject(town, { type: 'teach-egg-move', uid: town.box[0]!.uid, moveId: 'tackle' })).toBe('not-an-egg-move');
    expect(reject(inCity(), { type: 'teach-egg-move', uid: town.box[0]!.uid, moveId: eggMovesFor(town.box[0]!, content)[0]! })).toBe('wrong-phase');
  });
});

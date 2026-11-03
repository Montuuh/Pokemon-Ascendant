import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { applyBranch, createRun, defaultRunCtx, forgottenMoves, grantXp, knownMoves, newPartyMon, runReducer, xpToNext, type RunAction, type RunState } from '@/sim';

// §6.9.1 — the tracks: a learned move takes the slot of the one it replaces, in the pool and the active 4. §6.9.2 — the
// Move Reminder gives a replaced move back, free, between nodes.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected;
const apply = (s: RunState, a: RunAction) => {
  const r = runReducer(s, a, ctx);
  expect(r.rejected, a.type).toBeUndefined();
  return r.state;
};

/** A Charmeleon one XP short of Lv 28, where Fire Fang takes Scratch's slot — the Specialist's path, which kept Scratch. */
const charmeleonAt27 = () => {
  const mon = newPartyMon('charmeleon', 27, content, 7, 'c');
  mon.pool = ['scratch', 'ember-plus', 'smokescreen', 'fire-spin', 'dragon-rage'];
  mon.moveIds = ['scratch', 'ember-plus', 'fire-spin', 'dragon-rage'];
  mon.xp = xpToNext(27) - 1;
  return mon;
};

describe('Tracks — §6.9.1', () => {
  it('LevelUp_ATrackRow_TakesItsSlot_InThePoolAndTheActiveFour', () => {
    const mon = charmeleonAt27();
    const at = mon.pool.indexOf('scratch');
    const up = grantXp(mon, 1, content)!;
    expect(up.upgraded).toEqual([{ from: 'scratch', to: 'fire-fang' }]);
    expect(up.learned).not.toContain('fire-fang');
    expect(mon.pool[at]).toBe('fire-fang');
    expect(mon.pool).not.toContain('scratch');
    expect(mon.moveIds[0]).toBe('fire-fang');
  });

  it('AMetPokemon_HoldsTheTrackAtItsLevel_NotEveryStepBeside', () => {
    // Fire Spin (22) → Flamethrower (42): a Charizard met at 45 holds Flamethrower, not Fire Spin beside it; at 40, Fire Spin.
    expect(knownMoves(content, 'charizard', 45)).toContain('flamethrower');
    expect(knownMoves(content, 'charizard', 45)).not.toContain('fire-spin');
    expect(knownMoves(content, 'charizard', 40)).toContain('fire-spin');
    expect(knownMoves(content, 'charizard', 40)).not.toContain('flamethrower');
  });

  it('ABranchUpgrade_OfATrackedSlot_ArrivesBesideIt', () => {
    // Sandshrew's Dig took Scratch's slot at 14; the Vanguard branch upgrades Scratch into Slash, and Dig stays.
    const mon = newPartyMon('sandshrew', 21, content, 7, 's');
    expect(mon.pool).toContain('dig');
    expect(mon.pool).not.toContain('scratch');
    applyBranch(mon, 'sandslash-vanguard', content);
    expect(mon.pool).toContain('dig');
    expect(mon.pool).toContain('slash');
  });
});

describe('The Move Reminder — §6.9.2', () => {
  const withMon = () => produce(createRun('squirtle', 7, ctx), (d) => {
    const mon = charmeleonAt27();
    grantXp(mon, 1, content);
    d.box.push(mon);
  });

  it('RemindMove_GivesAReplacedMoveBack_FreeBetweenNodes_AndOnlyThat', () => {
    const s = withMon();
    const mon = s.box.find((m) => m.uid === 'c')!;
    expect(forgottenMoves(mon.pool, mon.speciesId, mon.level, content)).toContain('scratch');
    const after = apply(s, { type: 'remind-move', uid: 'c', moveId: 'scratch' });
    expect(after.box.find((m) => m.uid === 'c')!.pool).toContain('scratch');
    expect(after.money).toBe(s.money);
    expect(forgottenMoves(after.box.find((m) => m.uid === 'c')!.pool, mon.speciesId, mon.level, content)).not.toContain('scratch');
    expect(reject(after, { type: 'remind-move', uid: 'c', moveId: 'scratch' })).toBe('not-forgotten');
    expect(reject(s, { type: 'remind-move', uid: 'c', moveId: 'hyper-beam' })).toBe('not-forgotten');
    expect(reject(produce(s, (d) => { d.phase = 'combat'; }), { type: 'remind-move', uid: 'c', moveId: 'scratch' })).toBe('wrong-phase');
  });
});

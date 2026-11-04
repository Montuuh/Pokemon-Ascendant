import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  arriveAtCity, createRun, DEFAULT_PROGRESSION, defaultRunCtx, deserialiseRun, evolveItemsForBox, friendshipScale, maxHpOf, newPartyMon,
  readyBranches, rollShopStock, runReducer, serialiseRun, xpToNext, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';

// §6.3.7–§6.3.9 — how a Pokémon evolves besides its level: a stone, a held item it levels up with, Friendship; what the
// shops guarantee; and the v23 save that carries a run across to the real levels.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const f = DEFAULT_PROGRESSION.friendship;
const apply = (state: RunState, action: RunAction): RunState => {
  const result = runReducer(state, action, ctx);
  expect(result.rejected, action.type).toBeUndefined();
  return result.state;
};
const reject = (state: RunState, action: RunAction) => runReducer(state, action, ctx).rejected;
const inCenter = (money = 1000) => apply(produce(createRun('squirtle', 7, ctx), (d) => { d.money = money; arriveAtCity(d, ctx); }), { type: 'enter-building', building: 'center' });

describe('Grooming — §6.3.9', () => {
  it('Groom_GivesFriendship_ForItsPrice_OnceEachAVisit', () => {
    const s = inCenter();
    const uid = s.box[0]!.uid;
    const after = apply(s, { type: 'groom', uid });
    expect(after.box[0]!.friendship).toBe(f.start + f.groom);
    expect(after.money).toBe(s.money - f.groomPrice);
    expect(reject(after, { type: 'groom', uid })).toBe('already-groomed');
    expect(reject(inCenter(f.groomPrice - 1), { type: 'groom', uid })).toBe('cannot-afford');
    expect(reject(produce(s, (d) => { d.box[0]!.friendship = f.max; }), { type: 'groom', uid })).toBe('already-groomed');
    expect(reject(produce(s, (d) => { d.phase = 'map'; }), { type: 'groom', uid })).toBe('wrong-phase');
  });

  it('SootheBell_DoublesEveryGain', () => {
    const s = produce(inCenter(), (d) => { d.relics.push('soothe-bell'); });
    expect(friendshipScale(s, content)).toBe(2);
    expect(apply(s, { type: 'groom', uid: s.box[0]!.uid }).box[0]!.friendship).toBe(f.start + 2 * f.groom);
  });
});

describe('Guaranteed access — §6.3.7, §6.3.8', () => {
  it('AMerchant_AlwaysCarriesWhatAnEvolutionInTheBoxWaitsOn', () => {
    // A Kadabra waits on a Twisted Spoon; a Lv 11 Vulpix on a Fire Stone. Every merchant carries one of the two.
    const run = produce(createRun('squirtle', 7, ctx), (d) => {
      d.box.push(newPartyMon('kadabra', 20, content, 7, 'k'), newPartyMon('vulpix', 11, content, 7, 'v'));
    });
    expect(evolveItemsForBox(run, content)).toEqual(['twisted-spoon']);
    for (let seed = 1; seed <= 24; seed++) {
      const stock = rollShopStock(new RngStreams(seed).get('EncounterRNG'), content, run, 'merchant');
      expect(stock.slots.some((s) => s.id === 'twisted-spoon' || s.id === 'fire-stone'), `seed ${seed}`).toBe(true);
      const city = rollShopStock(new RngStreams(seed).get('EncounterRNG'), content, run, 'city');
      expect(city.slots.some((s) => s.id === 'twisted-spoon'), `city seed ${seed}`).toBe(true);
    }
    // Carried — in the bag or held — it is not offered again.
    const holding = produce(run, (d) => { d.bag.push('twisted-spoon'); });
    expect(evolveItemsForBox(holding, content)).toEqual([]);
  });
});

describe('The v23 save — §6.2.4, §10.8.3', () => {
  /** A save as v22 wrote it: the old scale, no Friendship, a Metal Coat in the stones. */
  const v22 = (edit: (run: RunState & Record<string, unknown>) => void): string => {
    const run = produce(createRun('squirtle', 7, ctx), (d) => {
      d.box[0]!.level = 12;
      d.box[0]!.xp = 22; // half of the old curve's 12 + 4 × 11 = 56 … to Lv 13
    });
    const old = JSON.parse(serialiseRun(run, 0)) as { version: number; checksum: number; run: RunState & Record<string, unknown> };
    old.version = 22;
    old.run.version = 22;
    for (const m of old.run.box) delete (m as Partial<typeof m>).friendship;
    edit(old.run);
    old.checksum = (JSON.parse(serialiseRun(old.run, 0)) as { checksum: number }).checksum;
    return JSON.stringify(old);
  };

  it('Levels_MoveToTheRealScale_AndKeepTheirProgress', () => {
    const loaded = deserialiseRun(v22(() => {}), content);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const mon = loaded.run.box[0]!;
    expect(mon.level).toBe(16);
    expect(mon.xp).toBe(Math.round((22 / 56) * xpToNext(16)));
    expect(mon.friendship).toBe(f.start);
    // The map's promised levels moved with it.
    const wild = Object.values(loaded.run.map.nodes).find((n) => n.kind === 'wild')!;
    expect(wild.preview.levelBand[0]).toBeGreaterThanOrEqual(5);
  });

  it('AMetalCoat_InTheStones_GoesToTheBag', () => {
    const loaded = deserialiseRun(v22((run) => { run.stones = ['metal-coat', 'fire-stone']; }), content);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.run.stones).toEqual(['fire-stone']);
    expect(loaded.run.bag).toContain('metal-coat');
  });

  it('AScreenTheOldThresholdsOpened_KeepsItsPromise', () => {
    // A Pidgey at the old 12 stood at its threshold; at 16 it is below its real 18, and the screen still evolves it.
    const loaded = deserialiseRun(v22((run) => {
      run.box[0] = { ...newPartyMon('pidgey', 12, content, 7, 'p'), friendship: undefined } as unknown as RunState['box'][number];
      run.activeUids = ['p'];
      run.phase = 'evolution';
      run.pendingEvolutions = [{ uid: 'p', from: 'pidgey', branchIds: content.species('pidgey').branches.map((b) => b.id) }];
    }), content);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(readyBranches(loaded.run.box[0]!, content)).toEqual([]);
    expect(loaded.run.pendingEvolutions[0]!.forced).toBe(true);
    const done = apply(loaded.run, { type: 'choose-branch', uid: 'p', branchId: loaded.run.pendingEvolutions[0]!.branchIds[0]! });
    expect(done.box[0]!.speciesId).toBe('pidgeotto');
  });
});

describe('The v25 save — §6.2.3, §10.8.3', () => {
  it('ACarriedHp_KeepsItsShareOfTheBar_UnderTheSeriesFormula', () => {
    const run = produce(createRun('squirtle', 7, ctx), (d) => {
      d.box[0]!.level = 20;
    });
    const old = JSON.parse(serialiseRun(run, 0)) as { version: number; checksum: number; run: RunState };
    old.version = 24;
    old.run.version = 24;
    // v24's max HP for a Lv 20 Squirtle (base 44): (44 × 1.475 + 14) × 0.5 = 39.45 → 39; it carried half of it.
    old.run.box[0]!.hp = 20;
    old.checksum = (JSON.parse(serialiseRun(old.run, 0)) as { checksum: number }).checksum;
    const loaded = deserialiseRun(JSON.stringify(old), content);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const mon = loaded.run.box[0]!;
    const max = maxHpOf(mon, content);
    expect(max).toBe(51); // (2·44 + 15)·20/100 + 20 + 10 = 50.6
    expect(mon.hp).toBe(Math.round((20 / 39) * max));
  });
});

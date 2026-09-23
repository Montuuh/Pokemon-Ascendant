import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  activeSetups, arriveAtCity, createRun, defaultRunCtx, dojoPrice, GYMS, LAYERS, nodesInLayer, PRICES,
  REGIONS, rerollPrice, wildBandFor, rollShopStock, runReducer, sellPrice, xpToNext,
  type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';

// §2.1.4, §2.11 — the seam between Regions, and the City that sits in it.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const start = (seed = 7, starter = 'squirtle') => createRun(starter, seed, ctx);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;

/** Answer whatever stands between a node and the map, the way a player who takes the first option would. */
function drain(s: RunState): RunState {
  for (let guard = 0; guard < 10; guard++) {
    if (s.phase === 'evolution') s = apply(s, { type: 'choose-branch', uid: s.pendingEvolutions[0]!.uid, branchId: s.pendingEvolutions[0]!.branchIds[0]! });
    else if (s.phase === 'legendary') s = apply(s, { type: 'pick-legendary', relicId: s.pendingLegendary![0]! });
    else if (s.phase === 'shop') s = apply(s, { type: 'leave-shop' });
    else if (s.phase === 'aid') s = apply(s, { type: 'leave-aid' });
    else if (s.phase === 'event') s = apply(apply(s, { type: 'choose-event', option: 0 }), { type: 'leave-event' });
    else if (s.phase === 'swap-or-skip') s = apply(s, { type: 'resolve-recruit', releaseUid: null });
    else break;
  }
  return s;
}

/** Walk a Region to its Gym on the first edge every time, winning every fight untouched. */
function clearRegion(s: RunState): RunState {
  for (let layer = 0; layer < LAYERS && s.phase === 'map'; layer++) {
    s = apply(apply(s, { type: 'enter-node', nodeId: s.reachable[0]! }), { type: 'begin-combat' });
    if (s.phase === 'combat') {
      s = apply(s, {
        type: 'finish-combat',
        report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: s.balls, turns: 3 },
      });
      s = apply(s, { type: 'claim-reward' });
    }
    s = drain(s);
  }
  return s;
}

/** Stand a run in a City without walking there — the dev hook's shortcut, used where the walk proves nothing. */
const inCity = (s: RunState, regionIndex = 0): RunState =>
  produce({ ...s, regionIndex }, (d) => arriveAtCity(d, ctx));

describe('The seam — §2.1.4', () => {
  it('FirstGym_ArrivesInPalletTown_WithTheLobbyRolledOnce', () => {
    const s = clearRegion(start());
    expect(s.phase).toBe('city');
    expect(s.city?.id).toBe('pallet-town');
    // §2.1.4.1 — Region 1's modifier expired with Region 1; the gate offers the next one.
    expect(s.regionModifier).toBeNull();
    expect(s.city!.reflection).toHaveLength(3);
    expect(new Set(s.city!.reflection).size).toBe(3);
    expect(s.city!.shop.slots.length).toBeGreaterThan(0);
  });

  it('TheGate_StartsRegionTwo_ShiftedUp_WithoutTheBeatenGym_§2.1', () => {
    let s = clearRegion(start());
    const firstMap = s.map;
    const balls = s.balls;
    const pick = s.city!.reflection[1]!;
    s = apply(s, { type: 'depart-city', modifierId: pick });

    expect(s.phase).toBe('map');
    expect(s.regionIndex).toBe(1);
    expect(s.city).toBeNull();
    expect(s.regionModifier).toBe(pick);
    expect(s.position).toBeNull();
    expect(s.visited).toEqual([]);
    expect(s.reachable).toEqual(s.map.entry);
    // economy.md §1 — one more Poké Ball as each Region begins.
    expect(s.balls).toBe(balls + 1);
    // §2.1 placeholder — the Gym whose Badge the run holds is not drawn again.
    const beaten = GYMS.filter((g) => s.badges.includes(g.badgeId)).map((g) => g.id);
    for (const id of beaten) expect(s.map.gyms).not.toContain(id);
    // …and every fight sits on Region 2's own band (§2.6.5), not Region 1's.
    const band = (m: RunState['map'], l: number) => nodesInLayer(m, l).find((n) => n.kind === 'wild')?.preview.levelBand;
    expect(band(firstMap, 0)).toEqual(wildBandFor(0, REGIONS[0]!.wildBand));
    const after = band(s.map, 0);
    if (after) expect(after).toEqual(wildBandFor(0, REGIONS[1]!.wildBand));
  });

  it('TheGym_FightsAtTheShiftedLevels_TheMapPromised_§5.9.3', () => {
    let s = clearRegion(start());
    s = apply(s, { type: 'depart-city', modifierId: s.city!.reflection[0]! });
    const gym = nodesInLayer(s.map, LAYERS - 1)[0]!;
    // Stand next to the Gym and walk in: the scenario's levels are the preview's, offset and all.
    s = { ...s, reachable: [gym.id] };
    s = apply(apply(s, { type: 'enter-node', nodeId: gym.id }), { type: 'begin-combat' });
    expect(s.pendingScenario!.enemies.map((e) => e.level)).toEqual(gym.preview.enemies!.map((e) => e.level));
  });

  it('TheGate_OnlyTakesAModifierItOffered', () => {
    const s = clearRegion(start());
    const other = content.allRegionModifiers().find((m) => !s.city!.reflection.includes(m.id))!;
    expect(reject(s, { type: 'depart-city', modifierId: other.id })).toBe('not-offered');
  });

  it('SecondGym_ArrivesInCeladon_ThirdGym_WinsTheRun_§2.1', () => {
    let s = clearRegion(start());
    s = clearRegion(apply(s, { type: 'depart-city', modifierId: s.city!.reflection[0]! }));
    expect(s.city?.id).toBe('celadon-city');
    s = clearRegion(apply(s, { type: 'depart-city', modifierId: s.city!.reflection[0]! }));
    expect(s.outcome).toBe('victory');
    expect(s.phase).toBe('ended');
    expect(new Set(s.badges).size).toBe(3);
  });

  it('Save_RoundTripsARunStandingInACity', async () => {
    const { serialiseRun, deserialiseRun } = await import('@/sim');
    const s = inCity(start());
    const back = deserialiseRun(serialiseRun(s), content);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.run.city).toEqual(s.city);
  });
});

describe('The City lobby — §2.11.0', () => {
  it('Doors_OnlyOpenInACity', () => {
    expect(reject(start(), { type: 'enter-building', building: 'center' })).toBe('not-in-city');
    expect(reject(start(), { type: 'depart-city', modifierId: 'x' })).toBe('not-in-city');
  });

  it('TheCenter_HealsAndCuresOnTheWayIn_ThenLeadsBackToTheLobby_§2.9.1', () => {
    let s = inCity(start());
    s = { ...s, box: s.box.map((m) => ({ ...m, hp: 1, status: { kind: 'poison' as const, turnsLeft: null } })) };
    s = apply(s, { type: 'enter-building', building: 'center' });
    expect(s.phase).toBe('center');
    expect(s.box.every((m) => m.status === null)).toBe(true);
    expect(s.box.every((m) => m.hp > 1)).toBe(true);
    s = apply(s, { type: 'leave-center' });
    expect(s.phase).toBe('city');
    // An open door: in again as often as you like.
    expect(reject(s, { type: 'enter-building', building: 'center' })).toBeNull();
  });

  it('TheMart_KeepsWhatItSold_AcrossVisits_§2.11.0', () => {
    let s = inCity(start());
    s = { ...s, money: 10_000 };
    s = apply(s, { type: 'enter-building', building: 'mart' });
    expect(s.phase).toBe('shop');
    const index = s.pendingShop!.slots.findIndex((x) => x.kind === 'consumable');
    s = apply(s, { type: 'buy', index });
    s = apply(s, { type: 'leave-shop' });
    expect(s.phase).toBe('city');
    s = apply(s, { type: 'enter-building', building: 'mart' });
    expect(s.pendingShop!.slots[index]!.sold).toBe(true);
  });

  it('TheMart_ReRollsToCityStock_UpToThreeTimes_§2.9.3', () => {
    let s = inCity(start());
    s = { ...s, money: 10_000 };
    s = apply(s, { type: 'enter-building', building: 'mart' });
    for (let i = 0; i < 3; i++) s = apply(s, { type: 'reroll-shop' });
    expect(reject(s, { type: 'reroll-shop' })).not.toBeNull();
    // Still a City shelf: Poké Balls on the counter at the City price.
    const ball = s.pendingShop!.slots.find((x) => x.kind === 'ball');
    expect(ball?.price).toBe(Math.round(PRICES.ball * PRICES.cityMarkup));
  });

  it('Sell_TradesAHeldItemFor30Percent_OnlyAtACityShop_§2.11.2.4', () => {
    const item = content.allHeldItems()[0]!.id;
    let s = inCity(start());
    s = { ...s, bag: [item] };
    s = apply(s, { type: 'enter-building', building: 'mart' });
    const before = s.money;
    s = apply(s, { type: 'sell-item', itemId: item });
    expect(s.money).toBe(before + sellPrice());
    expect(s.bag).toEqual([]);
    expect(reject(s, { type: 'sell-item', itemId: item })).toBe('no-such-item');

    // The merchant does not buy.
    const merchant = { ...start(), bag: [item], phase: 'shop' as const, pendingShop: { slots: [], rerolls: 0, maxRerolls: 1 } };
    expect(reject(merchant, { type: 'sell-item', itemId: item })).toBe('not-in-city');
  });

  it('SalveCache_StocksATraumaSalve_InTheFirstCityOnly_§8.4.2', () => {
    const cached = { ...start(), perks: { ...start().perks, salveCache: true } };
    expect(inCity(cached, 0).city!.shop.slots.some((x) => x.id === 'trauma-salve')).toBe(true);
    // The shelf keeps its shape: the Salve takes a slot, it does not add one.
    expect(inCity(cached, 0).city!.shop.slots.length).toBe(inCity(start(), 0).city!.shop.slots.length);
    // Celadon is not the first City.
    const celadon = inCity(cached, 1).city!.shop.slots.filter((x) => x.id === 'trauma-salve');
    const plain = inCity(start(), 1).city!.shop.slots.filter((x) => x.id === 'trauma-salve');
    expect(celadon.length).toBe(plain.length);
  });

  it('TheDojo_ChargesTheTownPriceInPallet_AndMoreInCeladon_§2.9.4', () => {
    const pallet = inCity(start(), 0);
    const celadon = inCity(start(), 1);
    expect(celadon.city!.id).toBe('celadon-city');
    expect(dojoPrice(pallet, content, 'move')).toBe(PRICES.dojoMove);
    expect(dojoPrice(celadon, content, 'move')).toBe(Math.round(PRICES.dojoMove * 1.3));
    expect(dojoPrice(celadon, content, 'ability')).toBe(Math.round(PRICES.dojoAbility * 1.3));
  });
});

describe('The route services — §2.9', () => {
  it('TheMerchant_SellsFourSlots_BallsByThree_AndOneReRoll_§2.9.2', () => {
    for (const seed of [1, 7, 42, 999]) {
      const run = start(seed);
      const stock = rollShopStock(new RngStreams(seed).get('EncounterRNG'), content, run, 'merchant');
      expect(stock.slots.length, `seed ${seed}`).toBeLessThanOrEqual(4);
      const ball = stock.slots.find((x) => x.kind === 'ball')!;
      expect(ball.qty).toBe(PRICES.merchantBalls.qty);
      expect(ball.price).toBe(PRICES.merchantBalls.price);
      expect(rerollPrice(stock)).toBe(PRICES.rerolls[0]);
      expect(rerollPrice({ ...stock, rerolls: 1 })).toBeNull();
    }
  });

  it('TheMerchant_BallSlot_BuysThreeBalls', () => {
    let s = start();
    const stock = rollShopStock(new RngStreams(7).get('EncounterRNG'), content, s, 'merchant');
    s = { ...s, money: 10_000, phase: 'shop', pendingShop: stock };
    const before = s.balls;
    s = apply(s, { type: 'buy', index: stock.slots.findIndex((x) => x.kind === 'ball') });
    expect(s.balls).toBe(before + PRICES.merchantBalls.qty);
  });

  it('EveryRoute_HasOneMerchant_AndThreeMysteries_§2.5.1', () => {
    for (const seed of [1, 7, 42, 999, 20260919]) {
      const s = start(seed);
      const nodes = Object.values(s.map.nodes);
      expect(nodes.filter((n) => n.kind === 'merchant'), `seed ${seed}`).toHaveLength(1);
      expect(nodes.filter((n) => n.kind === 'mystery'), `seed ${seed}`).toHaveLength(3);
    }
  });
});

describe('Statuses carry between fights — §4.2.7.1', () => {
  const firstFight = (s: RunState): RunState => {
    const id = s.reachable.find((n) => s.map.nodes[n]!.kind === 'wild' || s.map.nodes[n]!.kind === 'trainer')!;
    return apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
  };

  it('ATimedStatus_KeepsWhatIsLeftOfItsClock_IntoTheNextFight', () => {
    let s = firstFight(start());
    const uid = s.activeUids[0]!;
    s = apply(s, {
      type: 'finish-combat',
      report: { outcome: 'victory', team: [{ uid, hp: 10, status: { kind: 'sleep', turnsLeft: 1 }, confusionTurns: 2, fainted: false }], caught: null, ballsLeft: s.balls, turns: 3 },
    });
    s = drain(apply(s, { type: 'claim-reward' }));
    const mon = s.box.find((m) => m.uid === uid)!;
    expect(mon.status).toMatchObject({ kind: 'sleep', turnsLeft: 1 });
    expect(mon.confusionTurns).toBe(2);
    // And the next fight is seeded with it — the clock has not moved between fights.
    const setup = activeSetups(s, content).find((x) => x.uid === uid)!;
    expect(setup.status).toBe('sleep');
    expect(setup.statusTurnsLeft).toBe(1);
    expect(setup.confusionTurns).toBe(2);
  });

  it('Fainting_ClearsTheStatus', () => {
    let s = firstFight(start());
    const uid = s.activeUids[0]!;
    s = apply(s, {
      type: 'finish-combat',
      report: { outcome: 'victory', team: [{ uid, hp: 0, status: { kind: 'burn', turnsLeft: null }, fainted: true }], caught: null, ballsLeft: s.balls, turns: 3 },
    });
    expect(s.box.find((m) => m.uid === uid)!.status).toBeNull();
  });

  it('EvolvingIntoAnImmuneType_ClearsTheStatus_§4.2.7.1', () => {
    // Eevee → Flareon: a burned Eevee that becomes a Fire type is no longer burned.
    let s = start(7, 'eevee');
    s.box[0]!.level = 11;
    s.box[0]!.xp = xpToNext(11) - 1;
    s = firstFight(s);
    const uid = s.activeUids[0]!;
    s = apply(s, {
      type: 'finish-combat',
      report: { outcome: 'victory', team: [{ uid, hp: 10, status: { kind: 'burn', turnsLeft: null }, fainted: false }], caught: null, ballsLeft: s.balls, turns: 3 },
    });
    s = apply(s, { type: 'claim-reward' });
    expect(s.phase).toBe('evolution');
    s = apply(s, { type: 'choose-branch', uid, branchId: 'eevee-vanguard' });
    const mon = s.box.find((m) => m.uid === uid)!;
    expect(mon.speciesId).toBe('flareon');
    expect(mon.status).toBeNull();
  });
});

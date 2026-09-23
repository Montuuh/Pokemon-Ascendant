import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  activeMoves, arriveAtCity, CASINO, CITIES, casinoExpectedValue, createRun, defaultRunCtx, deserialiseRun, evolvedAt, PRICES,
  floorRestockable, RING, rarePickOpen, runReducer, serialiseRun, tutorListFor, STORE_FLOORS,
  type CombatOutcomeReport, type RunAction, type RunState,
} from '@/sim';

// v0.7.2 — the city: the Challenge Ring (§2.9.4.1), the Game Corner (§2.11.5), the Department Store's floors
// (§2.11.2) and the city Dojo's wider list (§2.9.4).

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;

/** Stand a fresh run in the City after `regionIndex`, with money to spend. */
const inCity = (regionIndex = 0, money = 5000, seed = 7): RunState =>
  produce({ ...createRun('squirtle', seed, ctx, regionIndex), money }, (d) => arriveAtCity(d, ctx));

const report = (s: RunState, outcome: CombatOutcomeReport['outcome'], hp = 10): CombatOutcomeReport => ({
  outcome,
  team: s.activeUids.map((uid) => ({ uid, hp: outcome === 'defeat' ? 0 : hp, status: null, fainted: outcome === 'defeat' })),
  caught: null,
  ballsLeft: s.balls,
  turns: 5,
});

/** Into the Dojo and onto the ladder. */
const onLadder = (s: RunState) => apply(apply(s, { type: 'enter-building', building: 'dojo' }), { type: 'enter-ring' });

describe('The Challenge Ring — §2.9.4.1', () => {
  it('IsRolledOnArrival_TwoRungsInTheTown_ThreeInTheCity', () => {
    expect(inCity(0).city!.ring!.rungs).toHaveLength(2);
    expect(inCity(1).city!.ring!.rungs).toHaveLength(3);
    // The prizes are the canon's: money below, a Rare relic 1-of-3 at the top.
    expect(inCity(0).city!.ring!.rungs.map((r) => r.prize)).toEqual(CITIES['pallet-town'].ring.prizes);
    expect(inCity(1).city!.ring!.rungs.at(-1)!.prize).toEqual({ relicPick: true });
  });

  it('EachRung_StandsAboveTheGym_AndTheNextAboveThat_AtItsEvolvedForms', () => {
    const s = inCity(0);
    const gym = Object.values(s.map.nodes).find((n) => n.kind === 'gym')!;
    const gymLevel = Math.max(...gym.preview.enemies!.map((e) => e.level));
    const { firstOffset, stepOffset, teamSize } = CITIES['pallet-town'].ring;
    s.city!.ring!.rungs.forEach((rung, i) => {
      expect(rung.team).toHaveLength(teamSize);
      expect(Math.min(...rung.team.map((m) => m.level))).toBe(gymLevel + firstOffset + stepOffset * i);
      for (const m of rung.team) expect(evolvedAt(m.species, m.level, content)).toBe(m.species);
    });
  });

  it('Entering_PaysTheFee_FromInsideTheDojo_OncePerVisit', () => {
    const s = inCity(0, 1000);
    expect(reject(s, { type: 'enter-ring' })).toBe('wrong-phase');
    const inDojo = apply(s, { type: 'enter-building', building: 'dojo' });
    expect(reject({ ...inDojo, money: 10 }, { type: 'enter-ring' })).toBe('cannot-afford');
    const on = apply(inDojo, { type: 'enter-ring' });
    expect(on.phase).toBe('ring');
    expect(on.money).toBe(1000 - CITIES['pallet-town'].ring.fee);
    // Once per visit: cashing out shuts it.
    // …and walks back into the Dojo the Ring is inside.
    const out = apply(on, { type: 'ring-cash-out' });
    expect(out.phase).toBe('dojo');
    expect(reject(out, { type: 'enter-ring' })).toBe('ring-closed');
  });

  it('ARungIsAnEliteFight_AtTheRegionsTier', () => {
    let s = onLadder(inCity(1));
    s = apply(s, { type: 'ring-fight' });
    expect(s.phase).toBe('combat');
    const sc = s.pendingScenario!;
    expect(sc.player.balls).toBe(0);
    for (const e of sc.enemies) {
      expect(e.tier).toBe('elite');
      expect(e.phaseCount).toBe(RING.phaseCount);
      // Celadon is Region 2's City: its Ring fights at Region 2's tier and carries Region 2's accent.
      expect(e.attackMultiplier).toBeGreaterThan(1);
      const kit = e.moves ?? activeMoves(content, e.species, e.level);
      expect(kit.some((id) => content.move(id).power === 0 && content.move(id).effects.some((fx) => fx.kind === 'status' && !fx.self)), e.species).toBe(true);
    }
  });

  it('WinningARung_BanksItsPrize_AndCashingOutPaysIt', () => {
    let s = onLadder(inCity(0, 1000));
    const before = s.money;
    s = apply(s, { type: 'ring-fight' });
    s = apply(s, { type: 'finish-combat', report: report(s, 'victory') });
    expect(s.phase).toBe('ring');
    expect(s.city!.ring!.banked).toBe(300);
    expect(s.money).toBe(before);
    s = apply(s, { type: 'ring-cash-out' });
    expect(s.money).toBe(before + 300);
    expect(s.city!.ring!.done).toBe(true);
  });

  it('LosingARung_LosesTheLadder_NotTheRun', () => {
    let s = onLadder(inCity(0, 1000));
    s = apply(s, { type: 'ring-fight' });
    s = apply(s, { type: 'finish-combat', report: report(s, 'victory') });
    s = apply(s, { type: 'ring-fight' });
    s = apply(s, { type: 'finish-combat', report: report(s, 'defeat') });
    expect(s.outcome).toBe('in-progress');
    expect(s.phase).toBe('dojo');
    expect(s.city!.ring!.banked).toBe(0);
    expect(s.city!.ring!.done).toBe(true);
    // The fallen keep their Trauma.
    expect(s.box.some((m) => m.traumaStacks > 0)).toBe(true);
  });

  it('NothingHealsBetweenRungs', () => {
    let s = onLadder(inCity(0, 1000));
    s = apply(s, { type: 'ring-fight' });
    s = apply(s, { type: 'finish-combat', report: report(s, 'victory', 3) });
    expect(s.box.find((m) => m.uid === s.activeUids[0])!.hp).toBe(3);
  });

  it('TheTopRung_OpensARareOneOfThree_ThenPaysOut', () => {
    let s = onLadder(inCity(0, 1000));
    const before = s.money;
    for (let i = 0; i < 2; i++) {
      s = apply(s, { type: 'ring-fight' });
      s = apply(s, { type: 'finish-combat', report: report(s, 'victory') });
    }
    expect(s.phase).toBe('relic-pick');
    const pick = s.city!.ring!.pick!;
    expect(pick).toHaveLength(RING.pickCount);
    for (const id of pick) expect(content.relic(id).rarity).toBe('rare');
    expect(reject(s, { type: 'ring-pick', relicId: 'not-a-relic' })).toBe('not-offered');
    s = apply(s, { type: 'ring-pick', relicId: pick[0]! });
    expect(s.relics).toContain(pick[0]);
    expect(s.money).toBe(before + 300);
    expect(s.phase).toBe('dojo');
  });

  it('TheTopRung_OnAnAccountWithNoRaresOpen_StillHoldsThree_FromTheRarityBelow', () => {
    // §8.6.2 — a fresh account's pool is Tier 1 and the Legendaries; every Rare is Tier 2 or 3.
    const fresh = content.allRelics().filter((r) => (r.tier ?? 1) === 1 || r.rarity === 'legendary').map((r) => r.id);
    let s = onLadder(produce(inCity(0, 1000), (d) => { d.perks.relicPool = fresh; }));
    for (let i = 0; i < 2; i++) {
      s = apply(s, { type: 'ring-fight' });
      s = apply(s, { type: 'finish-combat', report: report(s, 'victory') });
    }
    expect(s.phase).toBe('relic-pick');
    const pick = s.city!.ring!.pick!;
    expect(pick).toHaveLength(RING.pickCount);
    expect(new Set(pick).size).toBe(RING.pickCount);
    for (const id of pick) expect(fresh).toContain(id);
    for (const id of pick) expect(content.relic(id).rarity).not.toBe('legendary');
    // …and the screens are told so before the climb, so the ladder never promises a Rare it cannot pay.
    expect(rarePickOpen(content, [], fresh, RING.pickCount)).toBe(false);
    expect(rarePickOpen(content, [], null, RING.pickCount)).toBe(true);
  });

  it('ACityWithARingInIt_SavesAndLoads', () => {
    const s = onLadder(inCity(1));
    const back = deserialiseRun(serialiseRun(s), content);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.run.city!.ring).toEqual(s.city!.ring);
  });
});

describe('The Game Corner — §2.11.5', () => {
  const inCorner = (money = 5000, seed = 7) => apply(inCity(1, money, seed), { type: 'enter-building', building: 'game-corner' });

  it('IsCeladonsOnly', () => {
    expect(reject(inCity(0), { type: 'enter-building', building: 'game-corner' })).toBe('building-closed');
    expect(inCorner().phase).toBe('game-corner');
  });

  it('BothMachines_LoseInTheLongRun_AtThePrintedValues', () => {
    expect(casinoExpectedValue('wheel')).toBeCloseTo(0.96);
    expect(casinoExpectedValue('slots')).toBeCloseTo(0.94);
    // The wheel's rim is the table: 66 / 24 / 8 / 2 %.
    const count = (m: number) => CASINO.wheel.segments.filter((x) => x === m).length / CASINO.wheel.segments.length;
    expect([count(0), count(2), count(4), count(8)]).toEqual([0.66, 0.24, 0.08, 0.02]);
  });

  it('TheWheel_TakesAStakeOnTheTablesSteps_AndPaysWhatItsSegmentSays', () => {
    const s = inCorner(1000);
    expect(reject(s, { type: 'spin-wheel', stake: 5 })).toBe('bad-stake');
    expect(reject(s, { type: 'spin-wheel', stake: 15 })).toBe('bad-stake');
    expect(reject(s, { type: 'spin-wheel', stake: CASINO.wheel.maxStake + 10 })).toBe('bad-stake');
    expect(reject({ ...s, money: 50 }, { type: 'spin-wheel', stake: 100 })).toBe('cannot-afford');
    const after = apply(s, { type: 'spin-wheel', stake: 100 });
    const r = after.city!.casino.wheel!;
    expect(r.machine).toBe('wheel');
    expect(r.multiplier).toBe(CASINO.wheel.segments[r.face as number]);
    expect(after.money).toBe(1000 - 100 + r.payout);
  });

  it('TheSlots_ShowThreeOfAKind_ExactlyWhenTheyPay', () => {
    let s = inCorner(100_000);
    let paid = 0;
    for (let i = 0; i < 400; i++) {
      s = apply(s, { type: 'pull-slots' });
      const r = s.city!.casino.slots!;
      const faces = r.face as string[];
      const triple = faces[0] === faces[1] && faces[1] === faces[2];
      expect(triple, `pull ${i}: ×${r.multiplier} ${faces.join(' ')}`).toBe(r.multiplier > 0);
      if (r.multiplier) expect(faces[0]).toBe(CASINO.slots.faces[r.multiplier]);
      paid += r.payout;
    }
    // Over 400 pulls the house is ahead, as the table promises (0.94 expected; a long lucky streak is possible
    // but a ×50 run that flips it would need several jackpots).
    expect(paid).toBeLessThan(400 * CASINO.slots.stake * 1.5);
  });

  it('AReload_ShowsTheSameNextResult', () => {
    const s = inCorner(1000);
    const reloaded = deserialiseRun(serialiseRun(s), content);
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    const a = apply(s, { type: 'spin-wheel', stake: 50 }).city!.casino.wheel;
    const b = apply(reloaded.run, { type: 'spin-wheel', stake: 50 }).city!.casino.wheel;
    expect(b).toEqual(a);
  });

  it('APullNeverMovesAFightsRolls_ItsOwnStream', () => {
    const s = inCorner(1000);
    const pulled = apply(s, { type: 'pull-slots' });
    expect(pulled.cursors.EncounterRNG).toBe(s.cursors.EncounterRNG);
    expect(pulled.cursors.LootRNG).toBe(s.cursors.LootRNG);
  });
});

describe('The Department Store — §2.11.2', () => {
  it('StocksEveryFloor_EachSlotMarked_AtTheCityPrice', () => {
    const shop = inCity(1).city!.shop;
    for (const floor of STORE_FLOORS) expect(shop.slots.filter((x) => x.floor === floor).length, floor).toBeGreaterThan(0);
    expect(shop.slots.every((x) => x.floor)).toBe(true);
    // Far more stock than a Mart.
    expect(shop.slots.length).toBeGreaterThan(inCity(0).city!.shop.slots.length + 6);
    const ball = shop.slots.find((x) => x.kind === 'ball')!;
    expect(ball.price).toBe(Math.round(PRICES.ball * PRICES.cityMarkup));
  });

  it('AReRoll_RestocksOneFloor_AndLeavesTheOthers', () => {
    let s = apply(inCity(1), { type: 'enter-building', building: 'mart' });
    const before = s.pendingShop!.slots.filter((x) => x.floor !== 'relics').map((x) => x.id);
    s = apply(s, { type: 'reroll-shop', floor: 'relics' });
    expect(s.pendingShop!.slots.filter((x) => x.floor !== 'relics').map((x) => x.id)).toEqual(before);
    expect(s.pendingShop!.rerolls).toBe(1);
  });

  it('AFloorWithNothingElseToDraw_IsNotChargedForTheSameShelf', () => {
    let s = apply(inCity(1), { type: 'enter-building', building: 'mart' });
    // The Box already knows every TM move but the ones on the shelf: the TMs floor has nothing new to show.
    const shown = s.pendingShop!.slots.filter((x) => x.floor === 'tms').map((x) => content.tm(x.id).move);
    const others = content.allTms().map((tm) => tm.move).filter((m) => !shown.includes(m));
    s = { ...s, box: s.box.map((m) => ({ ...m, pool: [...m.pool, ...others] })) };
    expect(floorRestockable(s, 'tms', content)).toBe(false);
    expect(reject(s, { type: 'reroll-shop', floor: 'tms' })).toBe('nothing-to-restock');
    expect(floorRestockable(s, 'consumables', content)).toBe(true);
  });
});

describe('The city Dojo — §2.9.4', () => {
  it('SellsEveryReachedStagesTutorMoves_TheTownOnlyTheCurrents', () => {
    const evolved = (s: RunState) => ({ ...s, box: s.box.map((m) => ({ ...m, speciesId: 'wartortle' })) });
    const town = evolved(inCity(0));
    const city = evolved(inCity(1));
    const mon = (s: RunState) => s.box[0]!;
    expect(tutorListFor(town, mon(town), content)).toEqual(content.species('wartortle').tutorMoves);
    const wide = tutorListFor(city, mon(city), content);
    for (const m of content.species('squirtle').tutorMoves) expect(wide).toContain(m);
    for (const m of content.species('wartortle').tutorMoves) expect(wide).toContain(m);
  });
});

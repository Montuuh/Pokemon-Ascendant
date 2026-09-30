import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  createRun, defaultRunCtx, FIGHT_SUPPLIES, gymRelicOffer, PRICES, RELIC_PREMIUM, RELIC_REWARD, rollFightSupplies, rollMixedOffer,
  rollShopStock, runReducer, slotPrice, SUPPLY_TABLE, type NodeKind, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';
import { MYSTERY_EVENTS, RELIC_EVENT_WEIGHT, rollEvent } from './events';
import { deserialiseRun, serialiseRun } from './save';

// v0.8.6 — consumables that are spent and relics that are scarce: §3.5, §2.7.2, §2.8.1, §2.6.2, §7.3.1, §7.3.7,
// §2.9.2, §2.11.2.2–3, §2.10.4.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const start = (seed = 7) => createRun('squirtle', seed, ctx);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

/** Win the first reachable node, dressed up as the kind of fight the test is about. */
function winAs(kind: NodeKind, seed = 7): RunState {
  let s = start(seed);
  const id = s.reachable[0]!;
  s = produce(s, (d) => {
    d.map.nodes[id]!.kind = kind;
  });
  s = apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
  return apply(s, {
    type: 'finish-combat',
    report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: 0, turns: 3 },
  });
}

describe('Fight supplies — §2.7.2, §2.6.2', () => {
  it('ATrainer_AlwaysDropsSupplies_AndTheyAreInTheBag', () => {
    for (const seed of [1, 7, 42, 999, 2026]) {
      const before = start(seed).consumables.length;
      const s = winAs('trainer', seed);
      const got = s.pendingReward!.consumables;
      expect(got.length, `seed ${seed}`).toBeGreaterThanOrEqual(FIGHT_SUPPLIES.trainer.count[0]);
      expect(got.length).toBeLessThanOrEqual(FIGHT_SUPPLIES.trainer.count[1]);
      expect(s.consumables).toHaveLength(before + got.length);
    }
  });

  it('TheRegionsTable_DrawsOnlyWhatItLists', () => {
    for (let region = 0; region < SUPPLY_TABLE.length; region++) {
      const listed = new Set(SUPPLY_TABLE[region]!.map(([id]) => id));
      const rng = new RngStreams(region + 1).get('LootRNG');
      for (let i = 0; i < 50; i++) {
        for (const id of rollFightSupplies(rng, content, 'trainer', region, false).consumables) expect(listed.has(id), id).toBe(true);
      }
    }
  });

  it('AWildNode_SometimesLeavesPokeBalls', () => {
    const rng = new RngStreams(3).get('LootRNG');
    let withBalls = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) if (rollFightSupplies(rng, content, 'wild', 0, false).balls > 0) withBalls++;
    expect(withBalls / n).toBeGreaterThan(FIGHT_SUPPLIES.wild.balls.chance - 0.05);
    expect(withBalls / n).toBeLessThan(FIGHT_SUPPLIES.wild.balls.chance + 0.05);
  });

  it('TheEliteAndTheGym_AddAPrize', () => {
    const rng = new RngStreams(5).get('LootRNG');
    for (const kind of ['elite', 'gym'] as const) {
      const got = rollFightSupplies(rng, content, kind, 1, false).consumables;
      expect(got.length).toBe(FIGHT_SUPPLIES[kind].count[1] + 1);
    }
  });
});

describe('Relics are scarce — §7.3.1, §2.8.1, §7.3.7', () => {
  it('ATrainer_DropsOnlyACommon_AndRarely', () => {
    let drops = 0;
    const seeds = Array.from({ length: 120 }, (_, i) => i + 1);
    for (const seed of seeds) {
      const relic = winAs('trainer', seed).pendingReward!.relic;
      if (!relic) continue;
      drops++;
      expect(content.relic(relic).rarity).toBe('common');
    }
    expect(drops / seeds.length).toBeLessThan(RELIC_REWARD.trainerChance + 0.1);
  });

  it('TheEliteTrainer_OffersAPick_TwoUncommonsAndARare_TakenOnTheRewardScreen', () => {
    const s = winAs('elite');
    const pick = s.pendingReward!.relicPick!;
    expect(pick).toHaveLength(3);
    expect(pick.map((id) => content.relic(id).rarity).sort()).toEqual(['rare', 'uncommon', 'uncommon']);
    expect(s.relics).toEqual([]);
    // Only what is on the table can be taken.
    expect(runReducer(s, { type: 'claim-reward', relicId: 'not-a-relic' }, ctx).rejected).toBe('not-offered');
    const taken = apply(s, { type: 'claim-reward', relicId: pick[2]! });
    expect(taken.relics).toEqual([pick[2]]);
    // Leaving all three is allowed.
    expect(apply(s, { type: 'claim-reward' }).relics).toEqual([]);
  });

  it('AnAccountWithNoRareOpen_GetsAnUncommonInTheRaresPlace_§8.6.2', () => {
    const pool = content.allRelics().filter((r) => r.rarity !== 'rare').map((r) => r.id);
    const rng = new RngStreams(13).get('LootRNG');
    const pick = rollMixedOffer(rng, content, [], RELIC_REWARD.elitePick, pool);
    expect(pick.map((id) => content.relic(id).rarity)).toEqual(['uncommon', 'uncommon', 'uncommon']);
  });

  it('TheGym_OffersRaresInRegion1_LegendariesAfter', () => {
    const rng = new RngStreams(11).get('LootRNG');
    expect(gymRelicOffer(rng, content, [], 0).map((id) => content.relic(id).rarity)).toEqual(['rare', 'rare', 'rare']);
    expect(gymRelicOffer(rng, content, [], 1).map((id) => content.relic(id).rarity)).toEqual(['legendary', 'legendary', 'legendary']);
  });

  it('TheGymFight_DropsNoRelicOfItsOwn', () => {
    expect(winAs('gym').pendingReward!.relic).toBeNull();
  });
});

describe('Shops — §2.9.2, §2.11.2.2, §2.11.2.3', () => {
  it('TheMerchant_SellsPotionsInABundleOfThree', () => {
    let s = start();
    const stock = rollShopStock(new RngStreams(7).get('EncounterRNG'), content, s, 'merchant');
    const at = stock.slots.findIndex((x) => x.kind === 'consumable' && x.id === 'potion');
    expect(stock.slots[at]!.qty).toBe(3);
    expect(stock.slots[at]!.price).toBe(Math.round((PRICES.consumableTier[1]! * 3 * PRICES.bundle.discount) / 5) * 5);
    s = { ...s, money: 10_000, phase: 'shop', pendingShop: stock };
    const before = s.consumables.filter((id) => id === 'potion').length;
    s = apply(s, { type: 'buy', index: at });
    expect(s.consumables.filter((id) => id === 'potion')).toHaveLength(before + 3);
  });

  it('EveryRelicBought_MakesTheNextOneDearer', () => {
    const base = { kind: 'relic' as const, price: 200 };
    expect(slotPrice({ relicsBought: 0 }, base)).toBe(200);
    expect(slotPrice({ relicsBought: 1 }, base)).toBe(Math.round((200 * (1 + RELIC_PREMIUM)) / 5) * 5);
    expect(slotPrice({ relicsBought: 4 }, base)).toBe(400);
    // Only relics carry it.
    expect(slotPrice({ relicsBought: 4 }, { kind: 'consumable', price: 200 })).toBe(200);
  });

  it('BuyingARelic_ChargesThePremium_AndRaisesIt', () => {
    let s = start();
    const stock = rollShopStock(new RngStreams(7).get('EncounterRNG'), content, s, 'city');
    const relics = stock.slots.map((x, i) => ({ x, i })).filter(({ x }) => x.kind === 'relic');
    expect(relics.length).toBe(2);
    s = { ...s, money: 10_000, phase: 'shop', pendingShop: stock };
    s = apply(s, { type: 'buy', index: relics[0]!.i });
    expect(s.relicsBought).toBe(1);
    const second = relics[1]!;
    const money = s.money;
    s = apply(s, { type: 'buy', index: second.i });
    expect(money - s.money).toBe(Math.round((second.x.price * (1 + RELIC_PREMIUM)) / 5) * 5);
  });
});

describe('Mystery Events — §2.10.4', () => {
  it('TheRelicEvents_AreDrawnRarely', () => {
    const relicEvents = MYSTERY_EVENTS.filter((e) => e.weight === RELIC_EVENT_WEIGHT).map((e) => e.id);
    expect(relicEvents.length).toBeGreaterThan(0);
    const rng = new RngStreams(9).get('MysteryRNG');
    let hits = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (relicEvents.includes(rollEvent(rng, []))) hits++;
    const total = MYSTERY_EVENTS.reduce((a, e) => a + (e.weight ?? 1), 0);
    const expected = (relicEvents.length * RELIC_EVENT_WEIGHT) / total;
    expect(Math.abs(hits / n - expected)).toBeLessThan(0.03);
  });
});

describe('Save v16 — §10.8.3', () => {
  it('AV15Save_RenamesNoRefunds_AndStartsThePremiumAtZero', () => {
    const old = JSON.parse(serialiseRun({ ...start(), modifiers: ['no-refunds'] }, 0));
    delete old.run.relicsBought;
    old.version = 15;
    old.checksum = JSON.parse(serialiseRun({ ...old.run }, 0)).checksum;
    const migrated = deserialiseRun(JSON.stringify(old), content);
    if (!migrated.ok) throw new Error(migrated.reason);
    expect(migrated.run.modifiers).toEqual(['lean-pack']);
    expect(migrated.run.relicsBought).toBe(0);
  });

});

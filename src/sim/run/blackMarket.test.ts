import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  arriveAtCity, BIOMES, BIOMES_R2, BIOMES_R3, BLACK_MARKET, boxCapacity, candyPrice, createRun, defaultRunCtx, deserialiseRun, fencePrice,
  LEGENDARY_CAP, newPartyMon, SHOWCASE_CAP, relicValue, runReducer, SAFARI, serialiseRun, wagerChance, xpToNext,
  type RunAction, type RunState,
} from '@/sim';

// §2.11.6 — Team Rocket's Black Market beneath the Celadon Game Corner: found behind the poster, four counters,
// and a door that closes behind you.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;

/**
 * A run standing in the City after `regionIndex`, its Box filled to `boxSize` at `level`, with money to spend. As a
 * real Box would be, nobody stands at a threshold unevolved: the starter wears the form its level warrants, and the
 * rest are lines that do not evolve.
 */
const inCity = (regionIndex = 1, { money = 5000, seed = 7, boxSize = 5, level = 24, relics = [] as string[] } = {}): RunState =>
  produce({ ...createRun('squirtle', seed, ctx, regionIndex), money }, (d) => {
    d.relics = [...relics];
    const extra = ['tauros', 'kangaskhan', 'farfetchd', 'lapras', 'snorlax', 'scyther'];
    d.box[0]!.level = level;
    d.box[0]!.speciesId = level >= 26 ? 'blastoise' : level >= 12 ? 'wartortle' : 'squirtle';
    for (let i = 1; i < boxSize; i++) d.box.push(newPartyMon(extra[i - 1]!, level, content, seed + i));
    d.activeUids = d.box.slice(0, 3).map((m) => m.uid);
    arriveAtCity(d, ctx);
  });
const inCorner = (s: RunState) => apply(s, { type: 'enter-building', building: 'game-corner' });
const downstairs = (s: RunState) => apply(apply(inCorner(s), { type: 'push-switch' }), { type: 'enter-black-market' });

const rares = () => content.allRelics().filter((r) => r.rarity === 'rare').map((r) => r.id);
const ofRarity = (rarity: string) => content.allRelics().filter((r) => r.rarity === rarity && !r.pending).map((r) => r.id);

describe('Finding it — §2.11.6', () => {
  it('IsCeladonsOnly_ASecretInsideTheGameCorner_NotABuilding', () => {
    expect(inCity(0).city!.blackMarket).toBeNull();
    expect(inCity(1).city!.blackMarket).not.toBeNull();
    expect(reject(inCity(1), { type: 'enter-black-market' })).toBe('wrong-phase');
  });

  it('TheStairs_OpenOnlyBehindThePostersSwitch', () => {
    const corner = inCorner(inCity());
    expect(reject(corner, { type: 'enter-black-market' })).toBe('market-closed');
    const found = apply(corner, { type: 'push-switch' });
    expect(found.city!.blackMarket!.found).toBe(true);
    expect(reject(found, { type: 'push-switch' })).toBe('market-closed');
    // The stairs stay open when you step out of the Game Corner and back in.
    const back = inCorner(apply(found, { type: 'leave-game-corner' }));
    const below = apply(back, { type: 'enter-black-market' });
    expect(below.phase).toBe('black-market');
  });

  it('ClosesBehindYou_OncePerVisit', () => {
    const out = apply(downstairs(inCity()), { type: 'leave-black-market' });
    expect(out.phase).toBe('game-corner');
    expect(out.city!.blackMarket!.done).toBe(true);
    expect(reject(out, { type: 'enter-black-market' })).toBe('market-closed');
  });
});

describe('What is on offer — §2.11.6', () => {
  it('IsRolledOnArrival_OnItsOwnStream', () => {
    const s = inCity();
    const m = s.city!.blackMarket!;
    expect(m.trades).toHaveLength(BLACK_MARKET.tradeOffers);
    expect(new Set(m.trades).size).toBe(m.trades.length);
    for (const id of m.trades) expect(BLACK_MARKET.tradePool).toContain(id);
    expect(m.wagerTargets).toHaveLength(BLACK_MARKET.wagerTargets);
    for (const id of m.wagerTargets) expect(content.relic(id).rarity).toBe('rare');
    expect(content.relic(m.legendary!).rarity).toBe('legendary');
    expect(m.candies).toBe(BLACK_MARKET.candies);
    expect(s.cursors.MarketRNG).toBeDefined();
  });

  it('TheTradersPokemon_AreLinesNoRouteOffers', () => {
    const lineOf = (id: string): string[] => {
      const out = [id];
      for (let i = 0; i < out.length; i++) out.push(...(content.species(out[i]!).evolvesTo ?? []));
      return out;
    };
    const routed = new Set(
      [BIOMES, BIOMES_R2, BIOMES_R3].flatMap((b) => Object.values(b).flatMap((p) => [...p!.common, ...p!.uncommon, ...p!.rare])).flatMap(lineOf),
    );
    for (const id of BLACK_MARKET.tradePool) {
      expect(content.species(id).stage, id).toBe('basic');
      expect(routed.has(id), id).toBe(false);
    }
    // Dratini and Pinsir are the Safari's too — the Trader's are stolen, the park's are stalked.
    expect(SAFARI.pools['celadon-city'].rare).toContain('dratini');
  });

  it('TheLegendary_IsOneTheRunDoesNotHold', () => {
    const held = ofRarity('legendary').slice(0, 1);
    for (let seed = 1; seed < 20; seed++) expect(inCity(1, { seed, relics: held }).city!.blackMarket!.legendary).not.toBe(held[0]);
  });
});

describe('The Trader — §2.11.6', () => {
  it('Trades_YoursForTheirs_AtYourLevel_Fresh_OnceAVisit', () => {
    let s = downstairs(inCity(1, { level: 10 }));
    s = produce(s, (d) => {
      d.box[1]!.heldItem = 'leftovers';
      d.box[1]!.traumaStacks = 3;
    });
    const given = s.box[1]!;
    const species = s.city!.blackMarket!.trades[0]!;
    const after = apply(s, { type: 'market-trade', offer: 0, giveUid: given.uid });
    expect(after.box).toHaveLength(s.box.length);
    const got = after.box[1]!;
    expect(got.speciesId).toBe(species);
    expect(got.level).toBe(10);
    expect(got.traumaStacks).toBe(0);
    expect(after.bag).toContain('leftovers');
    expect(after.activeUids).toContain(got.uid);
    expect(after.activeUids).not.toContain(given.uid);
    expect(reject(after, { type: 'market-trade', offer: 1, giveUid: after.box[2]!.uid })).toBe('market-closed');
    expect(reject(s, { type: 'market-trade', offer: 5, giveUid: given.uid })).toBe('market-closed');
    expect(reject(s, { type: 'market-trade', offer: 0, giveUid: 'nobody' })).toBe('unknown-pokemon');
  });

  it('ATradeAtOrPastTheThreshold_OpensTheEvolutionScreen_AndHandsBackBelow', () => {
    // Dratini at 30 is past both of its thresholds: two screens in a row, and both hand back to the market.
    let s = downstairs(inCity(1, { level: 30 }));
    s = produce(s, (d) => { d.city!.blackMarket!.trades = ['dratini', 'porygon']; });
    s = apply(s, { type: 'market-trade', offer: 0, giveUid: s.box[1]!.uid });
    expect(s.phase).toBe('evolution');
    for (let i = 0; i < 3 && s.phase === 'evolution'; i++) {
      const p = s.pendingEvolutions[0]!;
      s = apply(s, { type: 'choose-branch', uid: p.uid, branchId: p.branchIds[0]! });
    }
    expect(s.phase).toBe('black-market');
    expect(s.box[1]!.speciesId).toBe('dragonite');
  });
});

describe('The Fence — §2.11.6', () => {
  it('ARareCandy_IsExactlyOneLevel_AtItsPrice_ThreeAVisit', () => {
    let s = downstairs(inCity(1, { level: 20 }));
    const uid = s.box[1]!.uid;
    s = produce(s, (d) => { d.box[1]!.xp = 5; });
    const price = candyPrice(s, content);
    const after = apply(s, { type: 'market-candy', uid });
    const mon = after.box.find((m) => m.uid === uid)!;
    expect(mon.level).toBe(21);
    expect(mon.xp).toBe(0);
    expect(after.money).toBe(s.money - price);
    expect(xpToNext(20, ctx.progression)).toBeGreaterThan(5);
    let t = after;
    for (let i = 1; i < BLACK_MARKET.candies; i++) t = apply(t, { type: 'market-candy', uid });
    expect(t.city!.blackMarket!.candies).toBe(0);
    expect(reject(t, { type: 'market-candy', uid })).toBe('market-closed');
    expect(reject({ ...s, money: price - 1 }, { type: 'market-candy', uid })).toBe('cannot-afford');
  });

  it('ACandyToTheThreshold_OpensTheEvolutionScreen', () => {
    const s = downstairs(inCity(1, { level: 11 }));
    // Squirtle evolves at 12.
    const after = apply(s, { type: 'market-candy', uid: s.box[0]!.uid });
    expect(after.phase).toBe('evolution');
    expect(after.pendingEvolutions[0]!.returnTo).toBe('black-market');
  });

  it('BuysARelic_ForItsShare_ButNotASpentOne_NorOneTheBoxNeeds', () => {
    const [common] = ofRarity('common');
    let s = downstairs(inCity(1, { relics: [common!, 'box-expander', 'master-ball-charm'] }));
    const after = apply(s, { type: 'market-sell-relic', relicId: common! });
    expect(after.money).toBe(s.money + fencePrice(content, common!));
    expect(fencePrice(content, common!)).toBe(Math.floor(relicValue(content, common!) * BLACK_MARKET.fenceShare));
    expect(after.relics).not.toContain(common);
    expect(reject(s, { type: 'market-sell-relic', relicId: 'lucky-egg-charm-not-held' })).toBe('bad-payment');
    s = produce(s, (d) => { d.spentRelics.push('master-ball-charm'); });
    expect(reject(s, { type: 'market-sell-relic', relicId: 'master-ball-charm' })).toBe('bad-payment');
    // A Box filled past its base capacity cannot sell the Expander holding it.
    s = produce(s, (d) => {
      while (d.box.length < boxCapacity(d)) d.box.push(newPartyMon('pidgey', 20, content, d.box.length + 50));
    });
    expect(reject(s, { type: 'market-sell-relic', relicId: 'box-expander' })).toBe('bad-payment');
  });
});

describe('The Gambler — §2.11.6', () => {
  it('ThePrintedChance_IsTheEdgeTimesStakeOverTarget_Clamped', () => {
    const [rare] = rares();
    const [common] = ofRarity('common');
    const [uncommon] = ofRarity('uncommon');
    const [legendary] = ofRarity('legendary');
    expect(wagerChance(content, [rare!], rare!)).toBe(0.8);
    expect(wagerChance(content, [common!], rare!)).toBe(0.2);
    expect(wagerChance(content, [common!, uncommon!], rare!)).toBe(0.6);
    expect(wagerChance(content, [legendary!], rare!)).toBe(BLACK_MARKET.maxChance);
    // The house keeps its edge: in relic value the expectation is under what was staked.
    expect(BLACK_MARKET.edge).toBeLessThan(1);
  });

  it('TheStake_GoesEitherWay_TheRareOnlyOnTheRoll_OneWagerAVisit', () => {
    const [c1, c2] = ofRarity('common');
    let wins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = downstairs(inCity(1, { seed, relics: [c1!, c2!] }));
      const target = s.city!.blackMarket!.wagerTargets[0]!;
      const after = apply(s, { type: 'market-wager', target, stake: [c1!, c2!] });
      const w = after.city!.blackMarket!.wager!;
      expect(w.chance).toBe(wagerChance(content, [c1!, c2!], target));
      expect(after.relics).not.toContain(c1);
      expect(after.relics).not.toContain(c2);
      expect(after.relics.includes(target)).toBe(w.won);
      if (w.won) wins++;
      expect(reject(after, { type: 'market-wager', target: s.city!.blackMarket!.wagerTargets[1]!, stake: [] })).toBe('market-closed');
      // Its own stream: a wager never moves a fight's or a shelf's rolls.
      expect(after.cursors.EncounterRNG).toBe(s.cursors.EncounterRNG);
      expect(after.cursors.LootRNG).toBe(s.cursors.LootRNG);
    }
    // 40 wagers at 40 %: well away from never and always.
    expect(wins).toBeGreaterThan(4);
    expect(wins).toBeLessThan(30);
  });

  it('RefusesAStakeItWillNotTake', () => {
    const [c1, c2, c3, c4] = ofRarity('common');
    const s = downstairs(inCity(1, { relics: [c1!, c2!, c3!, c4!] }));
    const target = s.city!.blackMarket!.wagerTargets[0]!;
    expect(reject(s, { type: 'market-wager', target, stake: [] })).toBe('bad-payment');
    expect(reject(s, { type: 'market-wager', target, stake: [c1!, c1!] })).toBe('bad-payment');
    expect(reject(s, { type: 'market-wager', target, stake: [c1!, c2!, c3!, c4!] })).toBe('bad-payment');
    expect(reject(s, { type: 'market-wager', target, stake: ['not-held'] })).toBe('bad-payment');
    expect(reject(s, { type: 'market-wager', target: 'not-offered', stake: [c1!] })).toBe('not-offered');
  });

  it('AReload_RollsTheSameWager', () => {
    const [c1] = ofRarity('common');
    const s = downstairs(inCity(1, { relics: [c1!] }));
    const loaded = deserialiseRun(serialiseRun(s, 0), content);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const target = s.city!.blackMarket!.wagerTargets[0]!;
    const a = apply(s, { type: 'market-wager', target, stake: [c1!] }).city!.blackMarket!.wager;
    const b = apply(loaded.run, { type: 'market-wager', target, stake: [c1!] }).city!.blackMarket!.wager;
    expect(b).toEqual(a);
  });
});

describe('The showcase — §2.11.6, §7.3.7', () => {
  it('TheLegendary_CostsThreePokemon_AndTheDealClosesTheMarket', () => {
    let s = downstairs(inCity(1, { boxSize: 5 }));
    s = produce(s, (d) => { d.box[2]!.heldItem = 'leftovers'; });
    const legendary = s.city!.blackMarket!.legendary!;
    const give = [s.box[0]!.uid, s.box[1]!.uid, s.box[2]!.uid];
    const after = apply(s, { type: 'market-legendary', giveUids: give });
    expect(after.relics).toContain(legendary);
    expect(after.box).toHaveLength(2);
    expect(after.bag).toContain('leftovers');
    expect(after.activeUids.length).toBeGreaterThan(0);
    for (const u of after.activeUids) expect(after.box.some((m) => m.uid === u)).toBe(true);
    expect(after.phase).toBe('game-corner');
    expect(after.city!.blackMarket!.done).toBe(true);
    expect(reject(after, { type: 'enter-black-market' })).toBe('market-closed');
  });

  it('RefusesAPriceTheBoxCannotPay_AndARunAtTheCap', () => {
    const small = downstairs(inCity(1, { boxSize: 3 }));
    expect(reject(small, { type: 'market-legendary', giveUids: small.box.map((m) => m.uid) })).toBe('bad-payment');
    const s = downstairs(inCity(1, { boxSize: 5 }));
    const uids = s.box.map((m) => m.uid);
    expect(reject(s, { type: 'market-legendary', giveUids: uids.slice(0, 2) })).toBe('bad-payment');
    expect(reject(s, { type: 'market-legendary', giveUids: [uids[0]!, uids[0]!, uids[1]!] })).toBe('bad-payment');
    expect(reject(s, { type: 'market-legendary', giveUids: [uids[0]!, uids[1]!, 'nobody'] })).toBe('unknown-pokemon');
    // Off the books: a run at the usual cap of two may still buy it, and one at the showcase's own cap may not.
    const others = ofRarity('legendary').filter((id) => id !== s.city!.blackMarket!.legendary);
    const atTwo = produce(s, (d) => { d.relics.push(...others.slice(0, LEGENDARY_CAP)); });
    expect(reject(atTwo, { type: 'market-legendary', giveUids: uids.slice(0, 3) })).toBeNull();
    const capped = produce(s, (d) => { d.relics.push(...others.slice(0, SHOWCASE_CAP)); });
    expect(reject(capped, { type: 'market-legendary', giveUids: uids.slice(0, 3) })).toBe('legendary-cap');
  });

  it('StakingALegendaryAtTheGambler_FreesTheSlotForTheShowcase', () => {
    let s = downstairs(inCity(1, { boxSize: 5 }));
    const offered = s.city!.blackMarket!.legendary!;
    const two = ofRarity('legendary').filter((id) => id !== offered).slice(0, SHOWCASE_CAP);
    s = produce(s, (d) => { d.relics.push(...two); });
    const uids = s.box.map((m) => m.uid).slice(0, 3);
    expect(reject(s, { type: 'market-legendary', giveUids: uids })).toBe('legendary-cap');
    s = apply(s, { type: 'market-wager', target: s.city!.blackMarket!.wagerTargets[0]!, stake: [two[0]!] });
    expect(reject(s, { type: 'market-legendary', giveUids: uids })).toBeNull();
  });
});

describe('Saving — §10.8', () => {
  it('Save_CarriesTheMarket_AndAVersion12CityHasNone', () => {
    const s = downstairs(inCity());
    const loaded = deserialiseRun(serialiseRun(s, 0), content);
    expect(loaded.ok && loaded.run.city!.blackMarket).toEqual(s.city!.blackMarket);
    const old = JSON.parse(serialiseRun(inCity(), 0));
    delete old.run.city.blackMarket;
    old.version = 12;
    old.checksum = JSON.parse(serialiseRun({ ...old.run }, 0)).checksum;
    const migrated = deserialiseRun(JSON.stringify(old), content);
    expect(migrated.ok && migrated.run.city!.blackMarket).toBeNull();
  });
});

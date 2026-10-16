import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  createRun, defaultRunCtx, generateRegion, maxHpOf, newPartyMon, regionContent, runReducer, STARTER_IDS, TRADER, TRADER_PREVIEW,
  type MapNode, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';

// §2.9.6 — the route Trader: give one Pokémon from your Box, take one of three face-down offers, the newcomer two
// levels above the one you gave.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const refusal = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;

/** A run standing at a trader: the first reachable node made one, walked into, the Box filled to `size`. */
function atTrader(size = 3, seed = 7): RunState {
  const run = structuredClone(createRun('squirtle', seed, ctx)) as RunState;
  for (const id of ['pidgey', 'rattata'].slice(0, size - 1)) run.box.push(newPartyMon(id, 8, content, run.seed, `p-${id}`));
  run.activeUids = run.box.slice(0, 3).map((m) => m.uid);
  const id = run.reachable[0]!;
  run.map.nodes[id] = { ...run.map.nodes[id]!, kind: 'trader', preview: { ...TRADER_PREVIEW } } as MapNode;
  return apply(apply(run, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
}

describe('The route Trader on the map — §2.9.6', () => {
  const maps = Array.from({ length: 80 }, (_, i) => generateRegion(new RngStreams(3000 + i).get('MapRNG'), content, i % 3, 3000 + i));

  it('AboutHalfTheRoutes_AtMostOne_FromTheCrossroadsOn_NeverTheNurseOrAGuardedFind', () => {
    let routes = 0;
    for (const map of maps) {
      const traders = Object.values(map.nodes).filter((n) => n.kind === 'trader');
      expect(traders.length).toBeLessThanOrEqual(1);
      if (traders.length) routes++;
      for (const t of traders) {
        expect(t.layer).toBeGreaterThanOrEqual(TRADER.firstLayer);
        expect(t.preview.objective).toBeUndefined();
      }
      // Every lane keeps its nurse.
      expect(Object.values(map.nodes).filter((n) => n.kind === 'aid').length).toBeGreaterThanOrEqual(2);
    }
    expect(routes / maps.length).toBeGreaterThan(0.3);
    expect(routes / maps.length).toBeLessThan(0.7);
  });
});

describe('The route Trader — §2.9.6', () => {
  it('Offers_ThreeDifferentSpecies_FromTheRegionsWildAreas_NeverABoxLineAStarterOrALegendary', () => {
    for (const seed of [7, 8, 9, 10, 11]) {
      const s = atTrader(3, seed);
      expect(s.phase).toBe('trader');
      const offers = s.pendingTrade!.offers;
      expect(offers).toHaveLength(TRADER.offers);
      expect(new Set(offers.map((o) => o.speciesId)).size).toBe(offers.length);
      const region = regionContent(s.regionIndex);
      const pool = new Set(Object.values(region.biomes).flatMap((b) => (b ? [...b.common, ...b.uncommon, ...b.rare] : [])));
      const owned = new Set(s.box.map((m) => content.lineBase(m.speciesId)));
      for (const o of offers) {
        expect(pool.has(o.speciesId), o.speciesId).toBe(true);
        expect(owned.has(content.lineBase(o.speciesId))).toBe(false);
        expect(STARTER_IDS.map((id) => content.lineBase(id))).not.toContain(content.lineBase(o.speciesId));
        expect(content.species(o.speciesId).rarity).not.toBe('legendary');
        expect(content.species(o.speciesId).types).toContain(o.shownType);
      }
    }
  });

  it('Trade_TheNewcomerTakesTheGivensPlace_TwoLevelsAbove_FullHpNoTrauma_ItsItemBackToTheBag', () => {
    let s = atTrader(3);
    const given = s.box[1]!;
    s = structuredClone(s) as RunState;
    s.box[1]!.traumaStacks = 3;
    s.box[1]!.heldItem = 'leftovers';
    const after = apply(s, { type: 'trade', giveUid: given.uid, offer: 0 });
    const offer = s.pendingTrade!.offers[0]!;
    expect(after.box.some((m) => m.uid === given.uid)).toBe(false);
    const newcomer = after.box[1]!;
    expect(newcomer.speciesId).toBe(offer.speciesId);
    expect(newcomer.level).toBe(given.level + TRADER.levelBonus);
    expect(newcomer.traumaStacks).toBe(0);
    expect(newcomer.hp).toBe(maxHpOf(newcomer, content));
    expect(after.activeUids).toContain(newcomer.uid);
    expect(after.activeUids).not.toContain(given.uid);
    expect(after.bag).toContain('leftovers');
    expect(after.pendingTrade!.done!.receivedUid).toBe(newcomer.uid);
  });

  it('Trade_OnceAVisit', () => {
    const s = apply(atTrader(3), { type: 'trade', giveUid: atTrader(3).box[2]!.uid, offer: 1 });
    expect(refusal(s, { type: 'trade', giveUid: s.box[1]!.uid, offer: 0 })).toBe('already-traded');
  });

  it('Trade_NeverTheLastPokemonStanding_ButAFaintedOneMayGo', () => {
    let s = structuredClone(atTrader(2)) as RunState;
    s.box[1]!.hp = 0;
    // The lone one standing cannot go; the fainted one can (the trader nurses it).
    expect(refusal(s, { type: 'trade', giveUid: s.box[0]!.uid, offer: 0 })).toBe('last-standing');
    s = apply(s, { type: 'trade', giveUid: s.box[1]!.uid, offer: 0 });
    expect(s.box[1]!.hp).toBeGreaterThan(0);
  });

  it('WalkOn_WithoutTrading_BackToTheMap', () => {
    const s = atTrader(3);
    const after = apply(s, { type: 'leave-trader' });
    expect(after.phase).toBe('map');
    expect(after.pendingTrade).toBeNull();
    expect(after.box.map((m) => m.uid)).toEqual(s.box.map((m) => m.uid));
  });
});

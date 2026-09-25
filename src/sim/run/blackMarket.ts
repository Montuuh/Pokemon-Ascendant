import type { ContentRegistry, RelicRarity } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import type { BlackMarketState, RunState } from './types';
import { LEGENDARY_CAP, inPool, isOfferable, rollRelic, rollRelicOffer } from './economy';
import { priceFor } from './regionModifiers';

// §2.11.6 — Team Rocket's Black Market, beneath the Celadon Game Corner. No door on the City map: a switch behind
// the Game Corner's poster opens the stairs down (Gen I's way into the Rocket Hideout). Four counters, each what a
// Mart will not sell, none of them paid in the usual coin:
//
//   the Trader    two stolen Pokémon, one of yours for one of them
//   the Fence     Rare Candies (a level, on the spot), and it buys relics for money
//   the Gambler   relics staked on a Rare at a printed chance, the house's edge in plain sight
//   the showcase  one Legendary, paid for in Pokémon — and the deal closes the market
//
// Money cannot buy apex power here: the Legendary costs three of your Pokémon, the one price no Center in the
// same City can refund (a price in HP or Trauma could be healed or bought back two streets away).

export const BLACK_MARKET = {
  /**
   * The Trader's stock: the Game Corner's own prize Pokémon and Gen I's in-game trades, less every line a route
   * offers (a test holds it), so a trade is always a line the run could not otherwise have met on the road.
   */
  tradePool: ['clefairy', 'porygon', 'pinsir', 'dratini', 'lickitung', 'tangela'] as readonly string[],
  tradeOffers: 2,
  /** The Fence's Rare Candies: how many are on the counter a visit, and what one costs before modifiers. */
  candies: 3,
  candyPrice: 400,
  /** The Fence pays this share of a relic's value. */
  fenceShare: 0.4,
  /** What a relic is worth to the Fence and the Gambler: its shop price, and a Legendary twice a Rare. */
  value: { common: 150, uncommon: 300, rare: 600, legendary: 1200 } as Record<RelicRarity, number>,
  /** The Gambler: how many Rares to aim at, how many relics a stake may hold, and the printed chance's terms. */
  wagerTargets: 3,
  maxStake: 3,
  edge: 0.8,
  minChance: 0.05,
  maxChance: 0.9,
  /** The showcase's price: this many Pokémon from the Box, which must keep at least one. */
  legendaryPrice: 3,
  /**
   * §7.3.7 — the showcase's Legendary is off the books: it may take a run this many past the hold cap. Measured while
   * building v0.7.7: a run that took both Gyms' Legendaries reaches Celadon already at the cap of two, so a showcase
   * bound by it was shut to nearly everyone who found it. The cap is there against a snowball; three Pokémon is a
   * harder brake than the cap, and only once a run.
   */
  overCap: 1,
};

/** §2.11.6 — what a relic is worth at the market's counters. */
export const relicValue = (content: ContentRegistry, relicId: string): number => BLACK_MARKET.value[content.relic(relicId).rarity];

/** §2.11.6 — what the Fence pays for a relic. */
export const fencePrice = (content: ContentRegistry, relicId: string): number => Math.floor(relicValue(content, relicId) * BLACK_MARKET.fenceShare);

/** §2.11.6 — a Rare Candy's price, after the Region Modifier that prices every counter (§2.11.3). */
export const candyPrice = (run: RunState, content: ContentRegistry): number => priceFor(run, content, BLACK_MARKET.candyPrice);

/**
 * §2.11.6 — the Gambler's printed chance: the house's edge times what is staked over what is aimed at, clamped.
 * Rounded to a whole percent, so the number on the button is the number rolled. The stake is lost either way, so
 * the expectation is the edge (0.8) in relic value: a way to turn relics you do not want into a chance at one you
 * do, never a way to farm.
 */
export function wagerChance(content: ContentRegistry, stake: readonly string[], target: string): number {
  const staked = stake.reduce((a, id) => a + relicValue(content, id), 0);
  const raw = (BLACK_MARKET.edge * staked) / relicValue(content, target);
  return Math.round(Math.min(BLACK_MARKET.maxChance, Math.max(BLACK_MARKET.minChance, raw)) * 100) / 100;
}

/** §7.3.7 — the most Legendaries the showcase will sell up to: the hold cap, plus its one off the books. */
export const SHOWCASE_CAP = LEGENDARY_CAP + BLACK_MARKET.overCap;

/** §7.3.7 / §2.11.6 — does the run already hold as many Legendaries as the showcase will let it? */
export const atLegendaryCap = (run: RunState, content: ContentRegistry): boolean =>
  run.relics.filter((id) => content.relic(id).rarity === 'legendary').length >= SHOWCASE_CAP;

/**
 * §2.11.6 — roll the market for this visit, on its own stream: the two stolen Pokémon, the Gambler's three Rares
 * (topped up from the rarity below for an account that has not opened three, as the Ring's prize is), and one
 * Legendary the run does not hold. The Legendary is shown whatever the cap; the cap is checked at the counter, so
 * a run at the showcase's cap can still stake one at the Gambler and come back for it.
 */
export function rollBlackMarket(rng: GameRng, content: ContentRegistry, run: RunState): BlackMarketState {
  const pool = run.perks?.relicPool ?? null;
  const trades: string[] = [];
  const bag = BLACK_MARKET.tradePool.filter((id) => content.hasSpecies(id));
  while (trades.length < BLACK_MARKET.tradeOffers && bag.length) trades.push(bag.splice(rng.range(0, bag.length), 1)[0]!);

  const wagerTargets = rollRelicOffer(rng, content, run.relics, 'rare', BLACK_MARKET.wagerTargets, pool);
  while (wagerTargets.length < BLACK_MARKET.wagerTargets) {
    const id = rollRelic(rng, content, [...run.relics, ...wagerTargets], 'rare', pool);
    if (!id) break;
    wagerTargets.push(id);
  }

  const legendaries = content.allRelics().filter((r) => r.rarity === 'legendary' && isOfferable(r) && inPool(r, pool) && !run.relics.includes(r.id));
  const legendary = legendaries.length ? legendaries[rng.range(0, legendaries.length)]!.id : null;

  return { found: false, entered: false, done: false, trades, traded: false, candies: BLACK_MARKET.candies, wagerTargets, wager: null, legendary };
}

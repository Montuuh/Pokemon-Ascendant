import type { ContentRegistry } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import type { PokemonType } from '../types';
import { STARTER_IDS, WILD_TIERS, regionContent, type WildTier } from './region';
import type { MapNode, NodePreview, RegionMap, RunState } from './types';

// §2.9.6 — the route Trader: a trainer at the roadside who will swap. Give one Pokémon from your Box, then choose one
// of three face-down offers that show one of the newcomer's types and its level, nothing else. Priced in the
// Pokémon you let go (Pillar 3: you sculpt the team by choosing what to give up).

export const TRADER = {
  /** `TRADER_LEVEL_BONUS` — the newcomer arrives this many levels above the Pokémon you gave. */
  levelBonus: 2,
  offers: 3,
  /** The offer's rarity, from the current Region's Wild Areas. */
  odds: { common: 0.5, uncommon: 0.35, rare: 0.15 } as Record<WildTier, number>,
  /** About half of all routes have one, at most one, from the crossroads (column 8) on. */
  routeChance: 0.5,
  firstLayer: 8,
  /** The trainer at the roadside. */
  sprite: 'pokefan',
} as const;

/** One face-down offer: the species (revealed only when it is yours) and the one type it shows. */
export interface TradeOffer {
  speciesId: string;
  shownType: PokemonType;
}

export const TRADER_PREVIEW: NodePreview = {
  title: 'Roadside trader',
  detail: `Give one of your Box for one of three face-down offers, each showing a type: the species is a surprise, and it arrives ${TRADER.levelBonus} levels above the one you gave.`,
  speciesIds: [],
  levelBand: [0, 0],
  icon: 'trader',
};

/**
 * §2.9.6 — the three offers, rolled once on entry: from the current Region's Wild Areas by rarity (Common 50 % ·
 * Uncommon 35 % · Rare 15 %), at the Region's form, never a line already in your Box, never a starter line, never a
 * Legendary, three different species.
 */
export function rollTradeOffers(rng: GameRng, run: RunState, content: ContentRegistry): TradeOffer[] {
  const region = regionContent(run.regionIndex);
  const owned = new Set(run.box.map((m) => content.lineBase(m.speciesId)));
  const starters = new Set([...STARTER_IDS, run.starter].map((id) => content.lineBase(id)));
  const allowed = (id: string) =>
    content.hasSpecies(id) && content.species(id).rarity !== 'legendary' && !owned.has(content.lineBase(id)) && !starters.has(content.lineBase(id));
  const pools: Record<WildTier, string[]> = { common: [], uncommon: [], rare: [] };
  for (const biome of Object.values(region.biomes)) {
    if (!biome) continue;
    for (const tier of WILD_TIERS) for (const id of biome[tier]) if (allowed(id) && !pools[tier].includes(id)) pools[tier].push(id);
  }
  const offers: TradeOffer[] = [];
  for (let i = 0; i < TRADER.offers; i++) {
    const r = rng.range01();
    const rolled: WildTier = r < TRADER.odds.common ? 'common' : r < TRADER.odds.common + TRADER.odds.uncommon ? 'uncommon' : 'rare';
    // The rarity rolled, or the nearest one with somebody left to offer.
    const order: WildTier[] = rolled === 'common' ? ['common', 'uncommon', 'rare'] : rolled === 'uncommon' ? ['uncommon', 'common', 'rare'] : ['rare', 'uncommon', 'common'];
    const tier = order.find((t) => pools[t].some((id) => !offers.some((o) => o.speciesId === id)));
    if (!tier) break;
    const left = pools[tier].filter((id) => !offers.some((o) => o.speciesId === id));
    const speciesId = left[rng.range(0, left.length)]!;
    const types = content.species(speciesId).types;
    offers.push({ speciesId, shownType: types[rng.range(0, types.length)]! });
  }
  return offers;
}

/** §2.9.6 — who may be given: anyone in the Box but the last Pokémon standing; a fainted one may (the trader nurses it). */
export function tradeRefusal(run: RunState, giveUid: string): 'not-in-box' | 'last-standing' | null {
  const mon = run.box.find((m) => m.uid === giveUid);
  if (!mon) return 'not-in-box';
  const standing = run.box.filter((m) => m.hp > 0);
  if (mon.hp > 0 && standing.length <= 1) return 'last-standing';
  return null;
}

/** §2.9.6 — the level an offer arrives at, for the Pokémon you would give. */
export const tradeLevel = (givenLevel: number): number => givenLevel + TRADER.levelBonus;

/**
 * §2.9.6 — the route's trader, placed once the route is built: on about half of all routes, at most one, on a stop
 * from the crossroads on (never the field nurse, never a guarded find). Its own stream, seeded off the map's without
 * spending it, so every other node is what it was.
 */
export function placeTrader(map: Pick<RegionMap, 'nodes'>, mapCursor: number): void {
  const rng = new GameRng(fmix32(mapCursor ^ fnv1a('TraderRNG')));
  if (!rng.chance(TRADER.routeChance)) return;
  const stops: MapNode[] = Object.values(map.nodes)
    .filter((n) => n.layer >= TRADER.firstLayer && (n.kind === 'cache' || n.kind === 'mystery' || n.kind === 'merchant') && !n.preview.objective)
    .sort((a, b) => a.layer - b.layer || a.col - b.col);
  if (!stops.length) return;
  const node = stops[rng.range(0, stops.length)]!;
  node.kind = 'trader';
  node.preview = { ...TRADER_PREVIEW };
}

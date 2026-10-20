import type { ContentRegistry } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import { ownedItems, rollHeldItem, rollRelic } from './economy';
import { WILD_TIER_ODDS, WILD_TIERS, type WildTier } from './region';
import type { FindGot, FindPrize, FindTile, MapNode, RegionMap, RunState } from './types';

// §2.9.5 — the item ball (the user, 2026-10-20: "instead of handing over the item, a roulette between several, and
// a pool of everything — consumables, money, held items, relics"). A find on the route shows its reel before you choose
// it: seven prizes in three rows, each with its chance (a row's share split evenly, as a Wild Area's is, §2.6.2). Walking
// in spins it. Supplies, balls, money, a TM and a stone are named on the reel; a held item and a relic are a door — the
// kind and the rarity — and the reel says which one when it lands, so it can never be one you already have.

/** §2.9.5 — how many tiles of each row a reel carries: three Commons, two Uncommons, two Rares. */
export const REEL_SHAPE: Record<WildTier, number> = { common: 3, uncommon: 2, rare: 2 };

/** One kind of prize a row can field, before the reel names it: a TM or a stone is drawn from the content. */
type PrizeKind = FindPrize | { kind: 'any-tm' } | { kind: 'any-stone' };

/**
 * §2.9.5 — what a reel can hold, by Region (index) and row. A reel takes distinct entries from each row; the Rare row
 * always carries a relic. Region 1's Rare relics are Common or Uncommon; later Regions' Uncommon or Rare.
 */
export const FIND_REEL: readonly {
  common: readonly PrizeKind[];
  uncommon: readonly PrizeKind[];
  rare: readonly PrizeKind[];
  relics: readonly ('common' | 'uncommon' | 'rare')[];
  /** What a held item or a relic turns into when the run already owns every one there is. */
  fallbackMoney: number;
}[] = [
  {
    common: [
      { kind: 'supply', items: ['potion', 'potion'] },
      { kind: 'supply', items: ['poke-ball', 'poke-ball', 'poke-ball'] },
      { kind: 'supply', items: ['antidote', 'paralyze-heal'] },
      { kind: 'supply', items: ['ether'] },
      { kind: 'supply', items: ['x-attack'] },
      { kind: 'money', amount: 100 },
    ],
    uncommon: [
      { kind: 'supply', items: ['super-potion', 'super-potion'] },
      { kind: 'supply', items: ['great-ball', 'great-ball'] },
      { kind: 'money', amount: 250 },
      { kind: 'held-item' },
      { kind: 'any-tm' },
      { kind: 'supply', items: ['x-attack', 'x-defense'] },
    ],
    rare: [{ kind: 'any-stone' }, { kind: 'supply', items: ['revive'] }, { kind: 'supply', items: ['hyper-potion'] }, { kind: 'held-item' }],
    relics: ['common', 'uncommon'],
    fallbackMoney: 300,
  },
  {
    common: [
      { kind: 'supply', items: ['super-potion', 'super-potion'] },
      { kind: 'supply', items: ['great-ball'] },
      { kind: 'supply', items: ['full-heal'] },
      { kind: 'supply', items: ['ether'] },
      { kind: 'supply', items: ['x-defense'] },
      { kind: 'money', amount: 180 },
    ],
    uncommon: [
      { kind: 'supply', items: ['hyper-potion'] },
      { kind: 'supply', items: ['great-ball', 'great-ball', 'great-ball'] },
      { kind: 'money', amount: 400 },
      { kind: 'held-item' },
      { kind: 'any-tm' },
      { kind: 'supply', items: ['revive'] },
    ],
    rare: [{ kind: 'any-stone' }, { kind: 'supply', items: ['ultra-ball', 'ultra-ball'] }, { kind: 'supply', items: ['max-potion'] }, { kind: 'held-item' }],
    relics: ['uncommon', 'rare'],
    fallbackMoney: 500,
  },
  {
    common: [
      { kind: 'supply', items: ['hyper-potion'] },
      { kind: 'supply', items: ['ultra-ball'] },
      { kind: 'supply', items: ['full-heal', 'x-attack'] },
      { kind: 'supply', items: ['great-ball', 'great-ball'] },
      { kind: 'supply', items: ['ether', 'ether'] },
      { kind: 'money', amount: 300 },
    ],
    uncommon: [
      { kind: 'supply', items: ['max-potion'] },
      { kind: 'supply', items: ['revive'] },
      { kind: 'money', amount: 600 },
      { kind: 'held-item' },
      { kind: 'any-tm' },
      { kind: 'supply', items: ['ultra-ball', 'ultra-ball'] },
    ],
    rare: [{ kind: 'any-stone' }, { kind: 'supply', items: ['revive', 'revive'] }, { kind: 'supply', items: ['max-potion', 'max-potion'] }, { kind: 'held-item' }],
    relics: ['uncommon', 'rare'],
    fallbackMoney: 800,
  },
];

const tableFor = (regionIndex: number) => FIND_REEL[Math.min(Math.max(0, regionIndex), FIND_REEL.length - 1)]!;

/** `n` distinct picks from `from`, in the order drawn. */
function draw<T>(rng: GameRng, from: readonly T[], n: number): T[] {
  const left = [...from];
  const out: T[] = [];
  while (out.length < n && left.length) out.push(left.splice(rng.range(0, left.length), 1)[0]!);
  return out;
}

/** A kind named for the reel: a TM or a stone drawn from the content; everything else as it is. */
function name(rng: GameRng, kind: PrizeKind, content: ContentRegistry): FindPrize {
  if (kind.kind === 'any-tm') {
    const tms = content.allTms();
    return { kind: 'tm', id: tms[rng.range(0, tms.length)]!.id };
  }
  if (kind.kind === 'any-stone') {
    const stones = content.allEvolutionItems();
    return { kind: 'stone', id: stones[rng.range(0, stones.length)]!.id };
  }
  return kind;
}

/**
 * §2.9.5 — a reel for one find: rolled with the map, on a stream of its own (a hash of the map's cursor and the node), so
 * no other node moves and a reload shows the same reel. Commons first, then Uncommons, then Rares — one of them a relic.
 */
export function buildReel(rng: GameRng, regionIndex: number, content: ContentRegistry): FindTile[] {
  const table = tableFor(regionIndex);
  const relic: FindPrize = { kind: 'relic', rarity: table.relics[rng.range(0, table.relics.length)]! };
  const rows: Record<WildTier, FindPrize[]> = {
    common: draw(rng, table.common, REEL_SHAPE.common).map((k) => name(rng, k, content)),
    uncommon: draw(rng, table.uncommon, REEL_SHAPE.uncommon).map((k) => name(rng, k, content)),
    rare: [relic, ...draw(rng, table.rare, REEL_SHAPE.rare - 1).map((k) => name(rng, k, content))],
  };
  return WILD_TIERS.flatMap((tier) => rows[tier].map((prize) => ({ tier, prize })));
}

/** §2.9.5 — give every plain find on the map its reel (a guarded find keeps its own prize, §5.6.5). */
export function placeReels(map: Pick<RegionMap, 'nodes'>, mapCursor: number, regionIndex: number, content: ContentRegistry): void {
  for (const node of Object.values(map.nodes)) {
    if (node.kind !== 'cache' || node.preview.objective) continue;
    const rng = new GameRng(fmix32((mapCursor ^ fnv1a(`ReelRNG:${node.id}`)) >>> 0) || 1);
    node.preview.reel = buildReel(rng, regionIndex, content);
  }
}

/** §2.9.5 — each tile's chance: its row's share (Common 60 % · Uncommon 30 % · Rare 10 %) split evenly in the row. */
export function reelChances(tiles: readonly FindTile[]): number[] {
  const inRow = (tier: WildTier) => tiles.filter((t) => t.tier === tier).length;
  return tiles.map((t) => WILD_TIER_ODDS[t.tier] / Math.max(1, inRow(t.tier)));
}

/** The stream a find's spin and what it reveals are drawn on: the run's seed, the Region and the node. */
const spinRng = (run: RunState, node: MapNode) => new GameRng(fmix32((run.seed ^ fnv1a(`reel:${run.regionIndex}:${node.id}`)) >>> 0) || 1);

/**
 * §2.9.5 — spin the reel as you walk in, and put what it lands on in the bag: which tile (by the chances above), and
 * what a held item or a relic turned out to be — never one the run holds; with none left, the Region's fallback money.
 */
export function spinReel(run: RunState, node: MapNode, content: ContentRegistry): { won: number; got: FindGot } {
  const tiles = node.preview.reel ?? [];
  const rng = spinRng(run, node);
  const chances = reelChances(tiles);
  let roll = rng.range01();
  let won = tiles.length - 1;
  for (let i = 0; i < tiles.length; i++) {
    roll -= chances[i]!;
    if (roll < 0) {
      won = i;
      break;
    }
  }
  const prize = tiles[won]!.prize;
  const fallback = tableFor(run.regionIndex).fallbackMoney;
  if (prize.kind === 'held-item') {
    const id = rollHeldItem(rng, content, ownedItems(run));
    return { won, got: id ? { heldItem: id } : { money: fallback } };
  }
  if (prize.kind === 'relic') {
    const id = rollRelic(rng, content, run.relics, prize.rarity, run.perks?.relicPool ?? null);
    return { won, got: id ? { relic: id } : { money: fallback } };
  }
  return { won, got: {} };
}

/** §2.9.5 — the one line a find's prize is written as, on the reel and in the log. */
export function prizeLabel(prize: FindPrize, content: ContentRegistry, got: FindGot = {}): string {
  if (got.relic) return content.relic(got.relic).name;
  if (got.heldItem) return content.heldItem(got.heldItem).name;
  if (got.money !== undefined) return `${got.money} ₽`;
  switch (prize.kind) {
    case 'supply': {
      const counts = new Map<string, number>();
      for (const id of prize.items) counts.set(id, (counts.get(id) ?? 0) + 1);
      return [...counts].map(([id, n]) => (n > 1 ? `${content.consumable(id).name} ×${n}` : content.consumable(id).name)).join(', ');
    }
    case 'money':
      return `${prize.amount} ₽`;
    case 'tm':
      return content.tm(prize.id).name;
    case 'stone':
      return content.evolutionItem(prize.id).name;
    case 'held-item':
      return 'A held item';
    case 'relic':
      return `${prize.rarity.charAt(0).toUpperCase()}${prize.rarity.slice(1)} relic`;
  }
}

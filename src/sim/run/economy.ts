import type { ContentRegistry, RelicRarity } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import type { PartyMon, RunState, ShopSlot, ShopStock } from './types';
import { priceFor } from './regionModifiers';

// §2.14 / docs/design/catalogs/economy.md — money, prices, drops and shop stock. Every number here names the
// catalogue row it comes from, because this is the file a balance pass edits.

/** docs/design/catalogs/economy.md §2 — Poké Dollar income per node kind. */
export const MONEY_REWARD: Record<string, [number, number]> = {
  wild: [0, 25],
  trainer: [50, 150],
  elite: [300, 300],
  'elite-wild': [200, 200],
  gym: [500, 500],
};

/** §2.9.1 — the field nurse restores this share of Effective Max HP. */
export const AID_HEAL_PCT = 50;

/** §3 — prices. The route's merchant sells at these; a City shop adds 30 % (§2.11.2.3). */
export const PRICES = {
  consumableTier: [0, 40, 110, 200, 320] as number[],
  ball: 50,
  /** §2.9.2 — the merchant's Poké Balls come three to a slot. */
  merchantBalls: { qty: 3, price: 120 },
  /** §2.11.2.3 — a City shop's markup over the merchant: you pay for selection. */
  cityMarkup: 1.3,
  /** §2.11.2.4 — a held item sells for this share of its listed price. City shops only. */
  sellShare: 0.3,
  relic: { common: 150, uncommon: 300, rare: 600, legendary: 0 } as Record<RelicRarity, number>,
  heldItem: 300,
  tm: 350,
  /** §2.9.3 — the re-roll ladder: the merchant stops after the first rung, a City shop after the third. */
  rerolls: [25, 50, 100] as number[],
  /** §8.2.4 — Therapy costs more the worse the Trauma is: 100 × (1 + stacks). */
  therapy: (stacks: number) => 100 * (1 + Math.max(0, stacks)),
  /** §2.9.4 — the Dojo, the run's main money sink. */
  dojoMove: 150,
  dojoAbility: 200,
};

/**
 * §7.3.1 — drop weights. Rarity is drop weight; meta tier is pool membership, and the two are orthogonal.
 *
 * **Legendary is absent on purpose and must stay absent.** §7.3.7 makes it a rarity class *outside* the drop
 * table: the only way to one is a 1-of-3 pick. Adding a weight here, however small, would quietly turn the
 * apex tier into a lottery and make the pick-moment meaningless.
 */
const DROP_WEIGHTS: { rarity: RelicRarity; weight: number }[] = [
  { rarity: 'common', weight: 60 },
  { rarity: 'uncommon', weight: 30 },
  { rarity: 'rare', weight: 10 },
];

/** §7.3.7 — the cap on how many Legendaries one run may hold. At the cap a pick-moment offers Rares. */
export const LEGENDARY_CAP = 2;

/**
 * §7.3.7 — the three Legendaries offered at a Gym victory, already-held ones excluded.
 *
 * At the hold cap the offer becomes Rares instead of a skip-or-nothing, because a pick-moment that can only
 * be declined is not a moment. Returns fewer than three only when the pool itself has run dry.
 */
export function rollLegendaryOffer(rng: GameRng, content: ContentRegistry, held: readonly string[], count = 3, accountPool: readonly string[] | null = null): string[] {
  const atCap = held.filter((id) => content.relic(id).rarity === 'legendary').length >= LEGENDARY_CAP;
  const wanted: RelicRarity = atCap ? 'rare' : 'legendary';
  const pool = content.allRelics().filter((r) => r.rarity === wanted && isOfferable(r) && inPool(r, accountPool) && !held.includes(r.id));
  const out: string[] = [];
  const bag = [...pool];
  for (let i = 0; i < count && bag.length; i++) {
    out.push(bag.splice(Math.min(bag.length - 1, Math.floor(rng.range01() * bag.length)), 1)[0]!.id);
  }
  return out;
}

/**
 * §7.7 — what the game is allowed to *hand out*. A row whose system does not exist yet stays in the
 * catalogue, keeps its `pending` note, and is excluded from every offer, drop and shelf.
 *
 * The UI already tells the truth about an inert relic, so showing one is honest. Selling one for 300 ₽ or
 * dropping it as an Elite's reward is not: a labelled blank is still a blank, and it occupies the slot a
 * working relic would have had. They come back the version their hook lands in.
 */
export const isOfferable = (row: { pending?: string }): boolean => !row.pending;

/** §8.6.2 — is the relic in this account's pool? `null` is "no account": the whole catalogue. */
export const inPool = (r: { id: string }, accountPool: readonly string[] | null | undefined): boolean => !accountPool || accountPool.includes(r.id);

/**
 * §7.3 — pick a relic the run does not already hold. Duplicates are excluded from every offer and drop for
 * the rest of the run, which is what stops a long run turning into five Coin Pouches.
 */
export function rollRelic(rng: GameRng, content: ContentRegistry, held: readonly string[], rarity?: RelicRarity, accountPool: readonly string[] | null = null): string | null {
  const wanted = rarity ?? pickRarity(rng);
  // §7.3.7 — Legendary is never in the drop pool, whatever rarity was asked for.
  // §8.6.2 — and a Tier-2 or Tier-3 relic the account has not opened is not in the pool at all.
  const eligible = content.allRelics().filter((r) => isOfferable(r) && inPool(r, accountPool) && r.rarity !== 'legendary' && !held.includes(r.id));
  const pool = eligible.filter((r) => r.rarity === wanted);
  // Fall back across rarities rather than returning nothing: a reward that silently does not arrive is worse
  // than one slightly off its weight.
  // A pool with only Rares left still pays: the last relic in a long run is a Rare, not nothing.
  const fallback = eligible.filter((r) => r.rarity === 'common' || r.rarity === 'uncommon');
  const from = pool.length ? pool : fallback.length ? fallback : eligible;
  if (!from.length) return null;
  return from[Math.min(from.length - 1, Math.floor(rng.range01() * from.length))]!.id;
}

function pickRarity(rng: GameRng): RelicRarity {
  const total = DROP_WEIGHTS.reduce((n, w) => n + w.weight, 0);
  let roll = rng.range01() * total;
  for (const w of DROP_WEIGHTS) {
    roll -= w.weight;
    if (roll <= 0) return w.rarity;
  }
  return 'common';
}

/** §7.4.6 — held items drop from trainers 20 % of the time, uniform across the generic pool. */
export function rollHeldItem(rng: GameRng, content: ContentRegistry, owned: readonly string[]): string | null {
  const pool = content.allHeldItems().filter((i) => isOfferable(i) && !i.speciesLock && !owned.includes(i.id));
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng.range01() * pool.length))]!.id;
}

/** Everything the run is carrying, equipped or not — the duplicate guard for item drops. */
export const ownedItems = (run: RunState): string[] => [...run.bag, ...run.box.map((m) => m.heldItem).filter((x): x is string => !!x)];

/** §7.3 — the run's relic multipliers, read by the run layer rather than the combat sim. */
export function relicMultiplier(run: RunState, content: ContentRegistry, hook: 'xp-multiplier' | 'money-multiplier'): number {
  let m = 1;
  for (const id of run.relics) {
    const r = content.relic(id);
    if (r.hook === hook && typeof r.params?.multiplier === 'number') m *= r.params.multiplier;
  }
  return m;
}

/** §7.3.3 Exp Share — the benched Box share, 0.75 by default. */
export function benchXpShare(run: RunState, content: ContentRegistry, base: number): number {
  let share = base;
  for (const id of run.relics) {
    const r = content.relic(id);
    if (r.hook === 'bench-xp-share' && typeof r.params?.share === 'number') share = Math.max(share, r.params.share);
  }
  return share;
}

/** §7.3.4 Lure Module — how many species a Wild node offers. */
export function wildChoices(run: RunState, content: ContentRegistry, base: number): number {
  let n = base;
  for (const id of run.relics) {
    const r = content.relic(id);
    if (r.hook === 'wild-choices' && typeof r.params?.extra === 'number') n += r.params.extra;
  }
  return n;
}

/** Draw `n` *different* entries. With replacement, the same Ice Heal took two slots of one shelf. */
function drawDistinct<T>(rng: GameRng, list: T[], n: number): T[] {
  const bag = [...list];
  const out: T[] = [];
  for (let i = 0; i < n && bag.length; i++) out.push(bag.splice(Math.min(bag.length - 1, Math.floor(rng.range01() * bag.length)), 1)[0]!);
  return out;
}

/** A Held Item or a TM, whichever the team can actually use — a TM nobody can learn is a decoration. */
function teamSpecial(rng: GameRng, content: ContentRegistry, run: RunState, kind: 'tm' | 'held-item' | 'either'): ShopSlot | null {
  const usableTms = content.allTms().filter((tm) => run.box.some((m) => tm.compatibleSpecies.includes(m.speciesId) && !m.pool.includes(tm.move)));
  const itemId = rollHeldItem(rng, content, ownedItems(run));
  const wantTm = kind === 'tm' || (kind === 'either' && usableTms.length > 0 && (rng.range01() < 0.5 || !itemId));
  if (wantTm && usableTms.length) {
    const tm = usableTms[Math.min(usableTms.length - 1, Math.floor(rng.range01() * usableTms.length))]!;
    return { kind: 'tm', id: tm.id, price: PRICES.tm, sold: false };
  }
  return itemId && kind !== 'tm' ? { kind: 'held-item', id: itemId, price: PRICES.heldItem, sold: false } : null;
}

/**
 * A shop's stock, seeded per visit.
 *
 * **The travelling merchant** (§2.9.2) — four slots, basics only: two Tier-1 consumables, three Poké Balls, and
 * a wildcard that is a Common relic or a Held Item. One re-roll.
 *
 * **A City shop** (§2.11.2) — the Mart's eight curated slots (§2.11.2.2): two Tier-1 consumables, one Tier-2,
 * a Common and an Uncommon relic, a Rare half the time (otherwise a second Uncommon), a Held Item and a TM,
 * plus Poké Balls always on the counter; everything 30 % dearer than the merchant (§2.11.2.3); three re-rolls.
 */
export function rollShopStock(rng: GameRng, content: ContentRegistry, run: RunState, kind: 'merchant' | 'city' = 'merchant'): ShopStock {
  const slots: ShopSlot[] = [];
  const pool = run.perks?.relicPool ?? null;
  const tier = (t: number) => content.allConsumables().filter((c) => c.effect.kind !== 'catch' && c.tier === t);

  if (kind === 'merchant') {
    for (const def of drawDistinct(rng, tier(1), 2)) slots.push({ kind: 'consumable', id: def.id, price: PRICES.consumableTier[def.tier] ?? 50, sold: false });
    slots.push({ kind: 'ball', id: 'poke-ball', price: PRICES.merchantBalls.price, qty: PRICES.merchantBalls.qty, sold: false });
    // The wildcard: a Common relic or a Held Item, a coin flip between them.
    const relic = rng.range01() < 0.5 ? rollRelic(rng, content, run.relics, 'common', pool) : null;
    if (relic) slots.push({ kind: 'relic', id: relic, price: PRICES.relic.common, sold: false });
    else {
      const item = teamSpecial(rng, content, run, 'held-item');
      if (item) slots.push(item);
    }
  } else {
    for (const def of drawDistinct(rng, tier(1), 2)) slots.push({ kind: 'consumable', id: def.id, price: PRICES.consumableTier[def.tier] ?? 50, sold: false });
    for (const def of drawDistinct(rng, tier(2), 1)) slots.push({ kind: 'consumable', id: def.id, price: PRICES.consumableTier[def.tier] ?? 110, sold: false });
    const held: string[] = [...run.relics];
    const rarities: ('common' | 'uncommon' | 'rare')[] = ['common', 'uncommon', rng.range01() < 0.5 ? 'rare' : 'uncommon'];
    for (const rarity of rarities) {
      const id = rollRelic(rng, content, held, rarity, pool);
      if (id) {
        held.push(id);
        slots.push({ kind: 'relic', id, price: PRICES.relic[content.relic(id).rarity], sold: false });
      }
    }
    const item = teamSpecial(rng, content, run, 'held-item');
    if (item) slots.push(item);
    const tm = teamSpecial(rng, content, run, 'tm');
    if (tm) slots.push(tm);
    // §2.11.2.2 — Poké Balls are always on a City counter, outside the eight: a City that cannot sell you a ball
    // after the route's merchant stopped carrying many would be a Mart in name only.
    slots.push({ kind: 'ball', id: 'poke-ball', price: PRICES.ball, sold: false });
    for (const slot of slots) slot.price = Math.round(slot.price * PRICES.cityMarkup);
  }

  // §2.11.3 Bargain Hunter — the shelf is priced once, here, so the ticket and the affordability guard can
  // never disagree. `priceFor` lives in regionModifiers.ts and is imported lazily to keep the dependency
  // pointing one way: economy knows nothing about which modifier is in force, only what a price is.
  for (const slot of slots) slot.price = priceFor(run, content, slot.price);

  return { slots, rerolls: 0, maxRerolls: kind === 'merchant' ? 1 : PRICES.rerolls.length };
}

/** §2.9.3 — what the next re-roll costs, or null when the visit is out of them. */
export const rerollPrice = (stock: ShopStock): number | null =>
  stock.rerolls >= (stock.maxRerolls ?? PRICES.rerolls.length) ? null : (PRICES.rerolls[stock.rerolls] ?? null);

/** §2.11.2.4 — what a held item fetches at a City shop: 30 % of its listed price. */
export const sellPrice = (): number => Math.floor(PRICES.heldItem * PRICES.sellShare);

/** §8.2.4 — Therapy: one stack off, priced by how bad it already is. */
export const therapyPrice = (mon: PartyMon): number => PRICES.therapy(mon.traumaStacks);

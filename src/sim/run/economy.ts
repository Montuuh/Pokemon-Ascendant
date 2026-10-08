import type { ContentRegistry, RelicRarity } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import type { PartyMon, RunState, ShopSlot, ShopStock, StoreFloor } from './types';
import { priceFor } from './regionModifiers';
import { stonesForBox } from './xp';

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
  /** §7.2.5 / §2.6.4.2 — each ball's unit price (catalogs/consumables.md): the Poké Ball, Great ×1.5, Ultra ×2. */
  balls: { 'poke-ball': 50, 'great-ball': 120, 'ultra-ball': 250 } as Record<string, number>,
  /** §2.9.2 — the merchant's Poké Balls come three to a slot. */
  merchantBalls: { qty: 3, price: 120 },
  /** §2.11.2.3 — a City shop's markup over the merchant: you pay for selection. */
  cityMarkup: 1.3,
  /** §2.11.2.4 — a held item sells for this share of its listed price. City shops only. */
  sellShare: 0.3,
  /**
   * §2.11.2.3 — a relic's list price, before the collector's premium (`RELIC_PREMIUM`). Raised in v0.8.6 with
   * the premium: relics are meant to be scarce, and a shelf of them for 150 ₽ apiece was the main leak.
   */
  relic: { common: 175, uncommon: 350, rare: 650, legendary: 0 } as Record<RelicRarity, number>,
  /**
   * §2.9.2 / §2.11.2.2 — consumables are sold in bundles now that a played one is gone (§3.5): how many a slot
   * holds by the item's tier, the Potion's larger City bundle, and the bulk discount on the unit price.
   */
  bundle: { byTier: [0, 3, 2, 1, 1] as number[], potionCity: 5, ballsCity: 5, greatCity: 3, ultraStore: 3, discount: 0.9 },
  heldItem: 300,
  tm: 350,
  /** §7.2.5 — an Evolution Item, before the City markup (catalogs/economy.md: 250 ₽, 325 in a City). */
  stone: 250,
  /** §2.9.3 — the re-roll ladder: the merchant stops after the first rung, a City shop after the third. */
  rerolls: [25, 50, 100] as number[],
  /** §8.2.4 — Therapy costs more the worse the Trauma is: 100 × (1 + stacks). */
  therapy: (stacks: number) => 100 * (1 + Math.max(0, stacks)),
  /** §2.9.4 — the Dojo, the run's main money sink. */
  dojoMove: 150,
  dojoAbility: 200,
  /** §2.9.4.2 — an egg move from the master's scrolls: rarer than a tutor move, and chosen for the line. */
  dojoEgg: 250,
  /** §2.11.1 — the Center's Daycare: a whole level, and the Pokémon sits out the next fight. Once per visit. */
  daycare: 200,
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

/** §7.3.4 Lure Module — how many times a Wild Area rolls its rarity on entry; the rarest roll is kept. */
export function wildRolls(run: RunState, content: ContentRegistry): number {
  let n = 1;
  for (const id of run.relics) {
    const r = content.relic(id);
    if (r.hook === 'wild-lure' && typeof r.params?.extra === 'number') n += r.params.extra;
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

/** §6.3.2 — one Evolution Item the Box can use, or null: a stone nobody can use is a decoration too. */
function teamStone(rng: GameRng, content: ContentRegistry, run: RunState): ShopSlot | null {
  const usable = stonesForBox(run.box, content).filter((id) => !run.stones.includes(id));
  if (!usable.length) return null;
  const id = usable[Math.min(usable.length - 1, Math.floor(rng.range01() * usable.length))]!;
  return { kind: 'stone', id, price: content.evolutionItem(id).price, sold: false };
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

/** §2.9.4.1 — a relic 1-of-N of one rarity, distinct, none already held: the Ring's top prize. */
export function rollRelicOffer(rng: GameRng, content: ContentRegistry, held: readonly string[], rarity: RelicRarity, count: number, accountPool: readonly string[] | null = null): string[] {
  const pool = content.allRelics().filter((r) => r.rarity === rarity && isOfferable(r) && inPool(r, accountPool) && !held.includes(r.id));
  return drawDistinct(rng, pool, count).map((r) => r.id);
}

/**
 * §2.9.4.1 — will the Ring's top prize be three Rares for this run? Not until the account has opened three it
 * does not already hold (§8.6.2); until then the pick tops up from the rarity below. The screens ask this so
 * the ladder never promises a Rare it cannot pay.
 */
export function rarePickOpen(content: ContentRegistry, held: readonly string[], accountPool: readonly string[] | null, count: number): boolean {
  return content.allRelics().filter((r) => r.rarity === 'rare' && isOfferable(r) && inPool(r, accountPool) && !held.includes(r.id)).length >= count;
}

/**
 * §2.11.2 — the Department Store, one floor per category (the order is `STORE_FLOORS`, bottom to top). Each floor
 * follows the Mart's slot table for its category, only more of it — "far more stock than a Mart, and the only
 * place a run ever sees that much at once":
 *
 *   consumables  Potions ×5, two Tier-1 bundles, two Tier-2 bundles, a Tier-3, and Poké Balls ×5 on the counter
 *   TMs          four the team can learn
 *   held items   four
 *   relics       a Common and an Uncommon
 *   rare         one Rare relic and a Tier-4 consumable
 *
 * *(Settled while building v0.7.2: canon names the floors, not their size. Recorded in §2.11.2. v0.8.6 sells the
 * consumables in bundles and halves the relic floors — relics are scarce, consumables are spent.)*
 */
function storeFloor(rng: GameRng, content: ContentRegistry, run: RunState, floor: StoreFloor, held: string[]): ShopSlot[] {
  const pool = run.perks?.relicPool ?? null;
  const tier = (t: number) => content.allConsumables().filter((c) => c.effect.kind !== 'catch' && c.tier === t && c.id !== 'potion');
  const consumable = (t: number, n: number): ShopSlot[] => drawDistinct(rng, tier(t), n).map(bundleOf);
  const relics = (rarity: RelicRarity, n: number): ShopSlot[] => {
    const out: ShopSlot[] = [];
    for (let i = 0; i < n; i++) {
      const id = rollRelic(rng, content, held, rarity, pool);
      if (!id) break;
      held.push(id);
      out.push({ kind: 'relic', id, price: PRICES.relic[content.relic(id).rarity], sold: false });
    }
    return out;
  };
  switch (floor) {
    case 'consumables':
      return [potionBundle(content), ...consumable(1, 2), ...consumable(2, 2), ...consumable(3, 1), ...cityBalls()];
    case 'tms': {
      const usable = content.allTms().filter((tm) => run.box.some((m) => tm.compatibleSpecies.includes(m.speciesId) && !m.pool.includes(tm.move)));
      return drawDistinct(rng, usable, 4).map((tm) => ({ kind: 'tm', id: tm.id, price: PRICES.tm, sold: false }));
    }
    case 'held-items': {
      const owned = ownedItems(run);
      const items = content.allHeldItems().filter((i) => isOfferable(i) && !i.speciesLock && !owned.includes(i.id));
      return drawDistinct(rng, items, 4).map((i) => ({ kind: 'held-item', id: i.id, price: PRICES.heldItem, sold: false }));
    }
    case 'relics':
      return [...relics('common', 1), ...relics('uncommon', 1)];
    case 'rare': {
      // §6.3.2 — the top floor keeps the stones, one the Box can use when there is one.
      const stone = teamStone(rng, content, run);
      return [...relics('rare', 1), ...consumable(4, 1), ballSlot('ultra-ball', PRICES.bundle.ultraStore), ...(stone ? [stone] : [])];
    }
  }
}

/**
 * §2.11.2 — can a re-roll put anything new on this floor? Only if the floor's pool holds something that is not
 * already on its shelf: a Box that can learn one TM has a TMs floor that a re-roll would only charge to show again.
 * The pools are the ones `storeFloor` draws from, with the same fallback across relic rarities (§7.3).
 */
export function floorRestockable(run: RunState, floor: StoreFloor, content: ContentRegistry): boolean {
  const shown = new Set((run.pendingShop?.slots ?? []).filter((s) => s.floor === floor && !s.sold).map((s) => s.id));
  const pool = run.perks?.relicPool ?? null;
  const consumables = (...tiers: number[]) => content.allConsumables().filter((c) => c.effect.kind !== 'catch' && tiers.includes(c.tier)).map((c) => c.id);
  const relics = (...rarities: RelicRarity[]) => {
    const eligible = content.allRelics().filter((r) => isOfferable(r) && inPool(r, pool) && r.rarity !== 'legendary' && !run.relics.includes(r.id));
    const wanted = eligible.filter((r) => rarities.includes(r.rarity));
    return (wanted.length ? wanted : eligible).map((r) => r.id);
  };
  const candidates: Record<StoreFloor, () => string[]> = {
    consumables: () => consumables(1, 2, 3),
    tms: () => content.allTms().filter((tm) => run.box.some((m) => tm.compatibleSpecies.includes(m.speciesId) && !m.pool.includes(tm.move))).map((tm) => tm.id),
    'held-items': () => {
      const owned = ownedItems(run);
      return content.allHeldItems().filter((i) => isOfferable(i) && !i.speciesLock && !owned.includes(i.id)).map((i) => i.id);
    },
    relics: () => relics('common', 'uncommon'),
    rare: () => [...relics('rare'), ...consumables(4), ...stonesForBox(run.box, content).filter((id) => !run.stones.includes(id))],
  };
  return candidates[floor]().some((id) => !shown.has(id));
}

/** §2.11.2 — every floor of the store, each slot marked with its floor and priced at the City markup. */
function rollStore(rng: GameRng, content: ContentRegistry, run: RunState, floors: readonly StoreFloor[]): ShopSlot[] {
  const held: string[] = [...run.relics];
  const slots: ShopSlot[] = [];
  for (const floor of floors) for (const slot of storeFloor(rng, content, run, floor, held)) slots.push({ ...slot, floor });
  return slots;
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
 *
 * **The Department Store** (§2.11.2) — `storeFloor` above, every floor at once, or only `floors` when a re-roll
 * restocks one. Same markup, same three re-rolls, spent a floor at a time.
 */
export function rollShopStock(
  rng: GameRng,
  content: ContentRegistry,
  run: RunState,
  kind: 'merchant' | 'city' | 'department-store' = 'merchant',
  floors: readonly StoreFloor[] = ['consumables', 'tms', 'held-items', 'relics', 'rare'],
): ShopStock {
  const slots: ShopSlot[] = [];
  const pool = run.perks?.relicPool ?? null;
  const tier = (t: number) => content.allConsumables().filter((c) => c.effect.kind !== 'catch' && c.tier === t);

  // v0.8.6 — Potions have their own slot, so the other consumable slots draw from everything else.
  const others = (t: number) => tier(t).filter((c) => c.id !== 'potion');

  if (kind === 'merchant') {
    // §2.9.2 — bundles: Potions ×3 and one other Tier-1 item ×3, then the balls and the wildcard.
    slots.push(bundleSlot(content.consumable('potion'), PRICES.bundle.byTier[1] ?? 3));
    for (const def of drawDistinct(rng, others(1), 1)) slots.push(bundleOf(def));
    slots.push({ kind: 'ball', id: 'poke-ball', price: PRICES.merchantBalls.price, qty: PRICES.merchantBalls.qty, sold: false });
    // The wildcard: a Common relic one time in three, otherwise a Held Item (relics are scarce, §7.3.1).
    const relic = rng.range01() < MERCHANT_RELIC_CHANCE ? rollRelic(rng, content, run.relics, 'common', pool) : null;
    if (relic) slots.push({ kind: 'relic', id: relic, price: PRICES.relic.common, sold: false });
    else {
      const item = teamSpecial(rng, content, run, 'held-item');
      if (item) slots.push(item);
    }
  } else if (kind === 'department-store') {
    slots.push(...rollStore(rng, content, run, floors));
    for (const slot of slots) slot.price = Math.round(slot.price * PRICES.cityMarkup);
  } else {
    // §2.11.2.2 — Potions ×5, two Tier-1 bundles and a Tier-2 bundle; a Common and an Uncommon relic, the second a
    // Rare one visit in four (v0.8.6: two relic slots where there were three).
    slots.push(potionBundle(content));
    for (const def of drawDistinct(rng, others(1), 2)) slots.push(bundleOf(def));
    for (const def of drawDistinct(rng, others(2), 1)) slots.push(bundleOf(def));
    const held: string[] = [...run.relics];
    const rarities: ('common' | 'uncommon' | 'rare')[] = ['common', rng.range01() < CITY_RARE_CHANCE ? 'rare' : 'uncommon'];
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
    // §6.3.2 — a stone on the counter when someone in the Box can use one; the Mart is curated to the team.
    const stone = teamStone(rng, content, run);
    if (stone) slots.push(stone);
    // §2.11.2.2 — Poké Balls are always on a City counter, outside the eight: a City that cannot sell you a ball
    // after the route's merchant stopped carrying many would be a Mart in name only.
    slots.push(...cityBalls());
    for (const slot of slots) slot.price = Math.round(slot.price * PRICES.cityMarkup);
  }

  // §2.11.3 Bargain Hunter — the shelf is priced once, here, so the ticket and the affordability guard can
  // never disagree. `priceFor` lives in regionModifiers.ts and is imported lazily to keep the dependency
  // pointing one way: economy knows nothing about which modifier is in force, only what a price is.
  for (const slot of slots) slot.price = priceFor(run, content, slot.price);

  return { slots, rerolls: 0, maxRerolls: kind === 'merchant' ? 1 : PRICES.rerolls.length };
}

/**
 * §2.11.2.3 — the collector's premium: every relic bought this run makes every relic on every shelf dearer by
 * this share of its list price (v0.8.6). A flat price let a full wallet turn into a shelf of relics; a rising
 * one lets the first purchase stay easy and makes the fourth a real decision.
 */
export const RELIC_PREMIUM = 0.25;

/** §2.9.2 — the merchant's wildcard is a Common relic this often, otherwise a Held Item. */
export const MERCHANT_RELIC_CHANCE = 1 / 3;
/** §2.11.2.2 — a City Mart's second relic slot is a Rare this often, otherwise an Uncommon. */
export const CITY_RARE_CHANCE = 0.25;

/** §2.11.2.3 — what a slot costs right now. A relic carries the premium for every relic bought before it. */
export function slotPrice(run: Pick<RunState, 'relicsBought'>, slot: Pick<ShopSlot, 'kind' | 'price'>): number {
  if (slot.kind !== 'relic') return slot.price;
  return Math.round((slot.price * (1 + RELIC_PREMIUM * (run.relicsBought ?? 0))) / 5) * 5;
}

/** §2.9.2 / §2.11.2.2 — a consumable slot sold as a bundle: `qty` of the item at the bulk discount. */
function bundleSlot(def: { id: string; tier: number }, qty: number): ShopSlot {
  const unit = PRICES.consumableTier[def.tier] ?? 50;
  const price = qty > 1 ? Math.round((unit * qty * PRICES.bundle.discount) / 5) * 5 : unit;
  return { kind: 'consumable', id: def.id, price, sold: false, ...(qty > 1 ? { qty } : {}) };
}

const bundleOf = (def: { id: string; tier: number }): ShopSlot => bundleSlot(def, PRICES.bundle.byTier[def.tier] ?? 1);

/** §2.11.2.2 — every City counter keeps Potions, five to a slot: the one item nobody should have to fish for. */
const potionBundle = (content: ContentRegistry): ShopSlot => bundleSlot(content.consumable('potion'), PRICES.bundle.potionCity);

/** §2.11.2.2 / §2.6.4.2 — a bundle of one kind of ball at the bulk discount. */
const ballSlot = (id: string, qty: number): ShopSlot => ({
  kind: 'ball', id, qty, sold: false,
  price: Math.round(((PRICES.balls[id] ?? PRICES.ball) * qty * PRICES.bundle.discount) / 5) * 5,
});

/** §2.11.2.2 — a City counter's balls: Poké Balls ×5 and Great Balls ×3 (v0.8.6). */
const cityBalls = (): ShopSlot[] => [ballSlot('poke-ball', PRICES.bundle.ballsCity), ballSlot('great-ball', PRICES.bundle.greatCity)];

/** §2.9.3 — what the next re-roll costs, or null when the visit is out of them. */
export const rerollPrice = (stock: ShopStock): number | null =>
  stock.rerolls >= (stock.maxRerolls ?? PRICES.rerolls.length) ? null : (PRICES.rerolls[stock.rerolls] ?? null);

/** §2.11.2.4 — what a held item fetches at a City shop: 30 % of its listed price. */
export const sellPrice = (): number => Math.floor(PRICES.heldItem * PRICES.sellShare);

/** §8.2.4 — Therapy: one stack off, priced by how bad it already is. */
export const therapyPrice = (mon: PartyMon): number => PRICES.therapy(mon.traumaStacks);

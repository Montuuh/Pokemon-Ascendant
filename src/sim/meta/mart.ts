import type { ContentRegistry, RelicDef } from '../content/defs';
import { HUB_UPGRADE_LABEL, SHELVES, levelFor, type AccountState, type HubUpgrade, type ShelfId } from './account';
import { COSMETICS, COSMETIC_PRICE, cosmeticById, type CosmeticKind } from './cosmetics';
import { discoverableRelics, masteryRelics, relicTier, unlockedStarters } from './unlocks';

// §8.3.4, §8.4.1 — the Poké Mart: the shop of the pass.
//
// Trainer Level opens shelves; Tokens buy from them. Everything the account can hold that is not earned by
// playing — starters, Hub upgrades, cosmetics, the relics you did not discover — is on a shelf with a price,
// and the reward track's only job is to pay Tokens and open the next shelf (§8.3.5). XP decides what is for
// sale; Tokens decide what you take home. The fold in account.ts never sells; this file never earns.

export type MartItem =
  | { kind: 'cosmetic'; id: string }
  | { kind: 'hub'; id: HubUpgrade }
  | { kind: 'starter'; id: string }
  /** A Tier-2 row on the Discoveries shelf, or a Tier-3 (and Reactor Core) on the Mastery lane — by tier. */
  | { kind: 'relic'; id: string };

/** §8.5.2 — the three meta-starters, in shelf order: cheapest first. */
export const META_STARTERS: readonly string[] = ['magikarp', 'eevee', 'pikachu'];

/** §8.3.4 — the prices. The whole shop comes to ~210 Tokens against ~92 from the track and ~64 from medals: you choose. */
export const MART_PRICE = {
  starter: { magikarp: 4, eevee: 6, pikachu: 6 } as Record<string, number>,
  hub: {
    'starting-relic-plus-one': 3,
    'expanded-box': 5,
    'pokedex-insight': 4,
    'modifier-slot-plus-one': 6,
    'twin-run': 8,
    'trauma-salve-cache': 4,
    'apex-reveal': 4,
  } as Record<HubUpgrade, number>,
  /** A Tier-2 relic bought instead of discovered (§8.6.1). */
  discovery: 4,
  /** A Tier-3 relic (§8.6.1). */
  mastery: 5,
} as const;

export type MartError = 'locked' | 'owned' | 'cannot-afford' | 'pending' | 'unknown';

/** Is a shelf open to this account? Level only — Tokens never open a shelf (§8.3.5). */
export const shelfOpen = (account: AccountState, shelf: ShelfId): boolean => levelFor(account.xp) >= SHELVES[shelf].level;

/** §8.6.1 — the Tier-2 rows the Discoveries shelf sells: every discoverable row that is not on the Mastery lane. */
export const discoveryShelf = (content: ContentRegistry): RelicDef[] =>
  discoverableRelics(content).map((id) => content.relic(id)).filter((r) => r.mastery !== true);

/** The registry throws on an unknown relic id; the shop answers 'unknown' instead. */
const relicRow = (id: string, content: ContentRegistry): RelicDef | undefined => content.allRelics().find((r) => r.id === id);

/** The shelf an item sits on, or null if the Mart does not sell it. */
export function martShelf(item: MartItem, content: ContentRegistry): ShelfId | null {
  switch (item.kind) {
    case 'cosmetic':
      return cosmeticById(item.id) ? 'corner' : null;
    case 'hub':
      // §8.4.2 — the fourth Starting Relic offer is the one Hub upgrade cheap enough for the Corner.
      return !(item.id in MART_PRICE.hub) ? null : item.id === 'starting-relic-plus-one' ? 'corner' : 'hub';
    case 'starter':
      return item.id in MART_PRICE.starter ? 'starters' : null;
    case 'relic': {
      const r = relicRow(item.id, content);
      if (!r) return null;
      if (relicTier(r) === 3 || r.mastery === true) return 'mastery';
      return relicTier(r) === 2 ? 'discoveries' : null;
    }
  }
}

/** What an item costs, or null if the Mart does not sell it. */
export function martPrice(item: MartItem, content: ContentRegistry): number | null {
  switch (item.kind) {
    case 'cosmetic': {
      const c = cosmeticById(item.id);
      return c ? COSMETIC_PRICE[c.kind] : null;
    }
    case 'hub':
      return MART_PRICE.hub[item.id] ?? null;
    case 'starter':
      return MART_PRICE.starter[item.id] ?? null;
    case 'relic':
      return martShelf(item, content) === 'mastery' ? MART_PRICE.mastery : martShelf(item, content) === 'discoveries' ? MART_PRICE.discovery : null;
  }
}

/** Does the account already hold this? A Soulbound line counts as an owned starter (§6.8.2); a discovered relic as an owned one. */
export function martOwned(account: AccountState, item: MartItem, content: ContentRegistry): boolean {
  switch (item.kind) {
    case 'cosmetic':
      return account.cosmetics.includes(item.id);
    case 'hub':
      return account.hub.includes(item.id);
    case 'starter':
      return account.starters.includes(item.id) || unlockedStarters(account, content).includes(item.id);
    case 'relic':
      return account.relics.includes(item.id);
  }
}

/** Why an item cannot be bought *yet*: waiting on a system that is not in the build. */
export function martPending(item: MartItem, content: ContentRegistry): string | null {
  if (item.kind === 'hub') return HUB_UPGRADE_LABEL[item.id]?.pending ?? null;
  if (item.kind === 'relic') return relicRow(item.id, content)?.pending ?? null;
  // §8.5.2 — Pikachu is on the shelf before its kit ships; it is priced, and not sold, until the kit is there.
  if (item.kind === 'starter' && !content.hasSpecies(item.id)) return 'its move kit is not written yet';
  return null;
}

/** The items on a shelf, in the order the shelf shows them. Owned ones included — a shelf shows what it has sold. */
export function shelfItems(shelf: ShelfId, content: ContentRegistry): MartItem[] {
  switch (shelf) {
    case 'corner':
      return [{ kind: 'hub', id: 'starting-relic-plus-one' }, ...COSMETICS.map((c) => ({ kind: 'cosmetic', id: c.id }) as MartItem)];
    case 'starters':
      return META_STARTERS.map((id) => ({ kind: 'starter', id }));
    case 'hub':
      return (Object.keys(MART_PRICE.hub) as HubUpgrade[]).filter((id) => id !== 'starting-relic-plus-one').map((id) => ({ kind: 'hub', id }));
    case 'discoveries':
      return discoveryShelf(content).map((r) => ({ kind: 'relic', id: r.id }));
    case 'mastery':
      return masteryRelics(content).map((r) => ({ kind: 'relic', id: r.id }));
  }
}

/** The price of everything on every shelf: the number §8.3.4 sets the income against. */
export const shopTotal = (content: ContentRegistry): number =>
  (Object.keys(SHELVES) as ShelfId[]).flatMap((s) => shelfItems(s, content)).reduce((sum, item) => sum + (martPrice(item, content) ?? 0), 0);

/**
 * Buy one item. Pure: the new account, or the reason it did not happen. The checks are in the order the
 * shelf explains them — is it sold, is the shelf open, is it already yours, does it work yet, can you pay.
 */
export function buy(account: AccountState, item: MartItem, content: ContentRegistry): { state: AccountState } | { error: MartError } {
  const shelf = martShelf(item, content);
  const price = martPrice(item, content);
  if (!shelf || price === null) return { error: 'unknown' };
  if (!shelfOpen(account, shelf)) return { error: 'locked' };
  if (martOwned(account, item, content)) return { error: 'owned' };
  if (martPending(item, content)) return { error: 'pending' };
  if (account.tokens < price) return { error: 'cannot-afford' };
  const next = structuredClone(account);
  next.tokens -= price;
  switch (item.kind) {
    case 'cosmetic': {
      next.cosmetics.push(item.id);
      // §8.4.4 — a cosmetic just bought is worn: the purchase should be visible on the card the moment it is made.
      next.wearing[cosmeticById(item.id)!.kind] = item.id;
      break;
    }
    case 'hub':
      next.hub.push(item.id);
      break;
    case 'starter':
      next.starters.push(item.id);
      break;
    case 'relic':
      next.relics.push(item.id);
      break;
  }
  return { state: next };
}

/** §8.4.4 — wear an owned cosmetic of a kind, or none. Unknown or unowned ids leave the account as it was. */
export function wear(account: AccountState, kind: CosmeticKind, id: string | null): AccountState {
  if (id !== null && (!account.cosmetics.includes(id) || cosmeticById(id)?.kind !== kind)) return account;
  const next = structuredClone(account);
  if (id === null) delete next.wearing[kind];
  else next.wearing[kind] = id;
  return next;
}

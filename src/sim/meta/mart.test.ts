import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { emptyAccount, HUB_UPGRADE_LABEL, SHELF_ORDER, SHELVES, TOKENS, trackTokensBetween, xpForLevel, type AccountState, type HubUpgrade } from './account';
import { MART_PRICE, buy, martOwned, martPrice, martShelf, shelfItems, shelfOpen, shopTotal, wear } from './mart';
import { COSMETIC_PRICE, COSMETICS } from './cosmetics';
import { JOURNAL_COSMETICS } from './journal';
import { unlockedStarters } from './unlocks';
import { BOND_RANKS, BOND_TIER } from './bond';
import { MAX_RANK } from './rank';

// §8.3.4, §8.4.1, §8.4.4 — the Poké Mart: shelves open by rank, Tokens buy, nothing is granted twice.

const content = buildRegistry();
const at = (rank: number, tokens: number, over: Partial<AccountState> = {}): AccountState => ({ ...emptyAccount(), xp: xpForLevel(rank), tokens, ...over });
const ok = (r: ReturnType<typeof buy>): AccountState => {
  if ('error' in r) throw new Error(r.error);
  return r.state;
};

describe('Shelves — §8.4.1', () => {
  it('TheClerkArrivesAtTrainer_AndTheKitShelfOpensWithTheFirstSlot', () => {
    const fresh = emptyAccount();
    for (const shelf of SHELF_ORDER) expect(shelfOpen(fresh, shelf), shelf).toBe(false);
    for (const shelf of ['starters', 'hub', 'corner'] as const) {
      expect(shelfOpen(at(SHELVES[shelf].level - 1, 0), shelf)).toBe(false);
      expect(shelfOpen(at(SHELVES[shelf].level, 0), shelf)).toBe(true);
    }
    expect(shelfOpen(at(3, 0), 'kit')).toBe(false);
    expect(shelfOpen(at(4, 0), 'kit')).toBe(true);
  });

  it('AServiceSitsOnServices_APerkOnTheKitShelf_AndAnAidesPerkIsNotSold', () => {
    for (const id of Object.keys(HUB_UPGRADE_LABEL) as HubUpgrade[]) {
      const row = HUB_UPGRADE_LABEL[id];
      const shelf = martShelf({ kind: 'hub', id });
      if (row.from === 'aide') {
        expect(shelf, id).toBeNull();
        expect(martPrice({ kind: 'hub', id }), id).toBeNull();
      } else {
        expect(shelf, id).toBe(row.kind === 'service' ? 'hub' : 'kit');
        expect(martPrice({ kind: 'hub', id }), id).toBe(MART_PRICE.hub[id]);
      }
    }
    expect(shelfItems('hub').map((i) => i.id)).toEqual(['expanded-box', 'modifier-slot-plus-one', 'twin-run']);
    expect(shelfItems('kit')).toHaveLength(7);
  });

  it('AJournalsCosmetic_IsNotOnTheCorner', () => {
    const sold = shelfItems('corner').map((i) => i.id);
    for (const id of JOURNAL_COSMETICS) {
      expect(COSMETICS.some((c) => c.id === id), id).toBe(true);
      expect(sold).not.toContain(id);
      expect(martShelf({ kind: 'cosmetic', id })).toBeNull();
    }
    expect(sold.length).toBe(COSMETICS.length - JOURNAL_COSMETICS.length);
  });

  it('TheShopCostsMoreThanTheRankRoadPays_SoARunsTokensMatter', () => {
    expect(shopTotal(content)).toBeGreaterThan(trackTokensBetween(1, MAX_RANK));
    // A run pays about a perk's worth: the cheapest perk is within one average run (~590 XP and the ₽ it ends with).
    const cheapest = Math.min(...shelfItems('kit').map((i) => martPrice(i)!));
    expect(cheapest).toBeLessThanOrEqual(Math.floor(590 / TOKENS.perRunXp) + TOKENS.moneyCap);
  });
});

describe('Buying — §8.3.4', () => {
  it('Buy_TakesTheTokens_AndGivesTheThing', () => {
    const a = ok(buy(at(3, 100), { kind: 'starter', id: 'magikarp' }, content));
    expect(a.tokens).toBe(100 - MART_PRICE.starter.magikarp!);
    expect(a.starters).toEqual(['magikarp']);
    expect(unlockedStarters(a, content)).toContain('magikarp');
    const b = ok(buy(at(3, 100), { kind: 'hub', id: 'expanded-box' }, content));
    expect(b.hub).toEqual(['expanded-box']);
    const c = ok(buy(at(4, 100), { kind: 'hub', id: 'moms-allowance' }, content));
    expect(c.hub).toEqual(['moms-allowance']);
    // Bought, not packed: the Kit desk does that.
    expect(c.kit).toEqual([]);
  });

  it('Buy_Refuses_AClosedShelf_AnOwnedItem_AnEmptyWallet_AndWhatIsNotSold', () => {
    expect(buy(at(2, 100), { kind: 'starter', id: 'magikarp' }, content)).toEqual({ error: 'locked' });
    expect(buy(at(3, 100), { kind: 'hub', id: 'moms-allowance' }, content)).toEqual({ error: 'locked' });
    expect(buy(at(3, 100, { starters: ['magikarp'] }), { kind: 'starter', id: 'magikarp' }, content)).toEqual({ error: 'owned' });
    expect(buy(at(3, 1), { kind: 'starter', id: 'magikarp' }, content)).toEqual({ error: 'cannot-afford' });
    expect(buy(at(9, 100), { kind: 'hub', id: 'exp-share' }, content)).toEqual({ error: 'unknown' });
    expect(buy(at(9, 100), { kind: 'cosmetic', id: JOURNAL_COSMETICS[0]! }, content)).toEqual({ error: 'unknown' });
    expect(buy(at(9, 100), { kind: 'starter', id: 'mewtwo' }, content)).toEqual({ error: 'unknown' });
  });

  it('ASoulboundLine_CountsAsAnOwnedStarter', () => {
    const a = at(3, 100, { bond: { magikarp: BOND_RANKS[BOND_TIER.soulbound - 1]! } });
    expect(martOwned(a, { kind: 'starter', id: 'magikarp' }, content)).toBe(true);
    expect(buy(a, { kind: 'starter', id: 'magikarp' }, content)).toEqual({ error: 'owned' });
  });
});

describe("Cosmetics — the Trainer's Corner, §8.4.4", () => {
  it('ACosmeticBought_IsWorn_AndTheCornerSwaps', () => {
    const [first, second] = shelfItems('corner').filter((i) => COSMETICS.find((c) => c.id === i.id)!.kind === 'avatar');
    let a = ok(buy(at(3, 100), first!, content));
    expect(a.tokens).toBe(100 - COSMETIC_PRICE.avatar);
    expect(a.wearing.avatar).toBe(first!.id);
    a = ok(buy(a, second!, content));
    expect(a.wearing.avatar).toBe(second!.id);
    a = wear(a, 'avatar', first!.id);
    expect(a.wearing.avatar).toBe(first!.id);
    expect(wear(a, 'avatar', null).wearing.avatar).toBeUndefined();
    // An unowned cosmetic, or one of another kind, is not worn.
    expect(wear(a, 'frame', first!.id)).toBe(a);
    expect(wear(a, 'avatar', 'avatar-nope')).toBe(a);
  });
});

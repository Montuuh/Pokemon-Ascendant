import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { emptyAccount, SHELVES, xpForLevel, type AccountState } from './account';
import { MART_PRICE, buy, discoveryShelf, martOwned, martPrice, martShelf, shelfItems, shelfOpen, shopTotal, wear } from './mart';
import { COSMETIC_PRICE, COSMETICS } from './cosmetics';
import { relicPoolFor, unlockedStarters } from './unlocks';

// §8.3.4, §8.4.1, §8.4.4 — the Poké Mart: shelves open by level, Tokens buy, nothing is granted twice.

const content = buildRegistry();
const at = (level: number, tokens: number, over: Partial<AccountState> = {}): AccountState => ({ ...emptyAccount(), xp: xpForLevel(level), tokens, ...over });
const ok = (r: ReturnType<typeof buy>): AccountState => {
  if ('error' in r) throw new Error(r.error);
  return r.state;
};

describe('Shelves — §8.3.5', () => {
  it('OpenByLevel_TheCornerFromTheStart', () => {
    const fresh = emptyAccount();
    expect(shelfOpen(fresh, 'corner')).toBe(true);
    expect(shelfOpen(fresh, 'starters')).toBe(false);
    expect(shelfOpen(at(3, 0), 'starters')).toBe(true);
    expect(shelfOpen(at(9, 0), 'mastery')).toBe(false);
    expect(shelfOpen(at(10, 0), 'mastery')).toBe(true);
  });

  it('EveryItemSitsOnOneShelf_AndTheShopCostsMoreThanTheTrackPays', () => {
    // The fourth Starting Relic is the one Hub upgrade on the Corner; the rest are on their own shelf.
    expect(martShelf({ kind: 'hub', id: 'starting-relic-plus-one' }, content)).toBe('corner');
    expect(martShelf({ kind: 'hub', id: 'twin-run' }, content)).toBe('hub');
    expect(martShelf({ kind: 'starter', id: 'eevee' }, content)).toBe('starters');
    expect(martShelf({ kind: 'relic', id: 'steady-aim' }, content)).toBe('discoveries');
    expect(martShelf({ kind: 'relic', id: 'sages-tome' }, content)).toBe('mastery');
    // Reactor Core is Tier 2 but sold on the Mastery lane, so the Discoveries shelf does not list it twice.
    expect(martShelf({ kind: 'relic', id: 'reactor-core' }, content)).toBe('mastery');
    expect(discoveryShelf(content).map((r) => r.id)).not.toContain('reactor-core');
    // Not for sale: a Tier-1 relic, a Legendary, a species that is not a meta-starter.
    expect(martShelf({ kind: 'relic', id: 'coin-pouch' }, content)).toBeNull();
    expect(martShelf({ kind: 'starter', id: 'pidgey' }, content)).toBeNull();
    expect(shelfItems('corner', content)).toHaveLength(1 + COSMETICS.length);
    expect(shelfItems('starters', content).map((i) => i.id)).toEqual(['magikarp', 'eevee', 'pikachu']);
    // §8.3.4 — ~210 against 92 from the track: the wallet chooses.
    expect(shopTotal(content)).toBeGreaterThan(200);
    expect(shopTotal(content)).toBeLessThan(230);
  });
});

describe('Buying — §8.3.4', () => {
  it('AClosedShelfRefuses_AnOpenOneSells_AndTheTokensComeOff', () => {
    expect(buy(at(2, 20), { kind: 'starter', id: 'magikarp' }, content)).toEqual({ error: 'locked' });
    const after = ok(buy(at(3, 20), { kind: 'starter', id: 'magikarp' }, content));
    expect(after.tokens).toBe(20 - MART_PRICE.starter.magikarp!);
    expect(after.starters).toEqual(['magikarp']);
    expect(unlockedStarters(after, content)).toContain('magikarp');
    expect(buy(after, { kind: 'starter', id: 'magikarp' }, content)).toEqual({ error: 'owned' });
    expect(buy(at(3, 3), { kind: 'starter', id: 'magikarp' }, content)).toEqual({ error: 'cannot-afford' });
  });

  it('TheMasteryLane_SellsTierThreeForFive_FromLevelTen', () => {
    expect(buy(at(9, 20), { kind: 'relic', id: 'sages-tome' }, content)).toEqual({ error: 'locked' });
    const after = ok(buy(at(10, 7), { kind: 'relic', id: 'sages-tome' }, content));
    expect(after.tokens).toBe(2);
    expect(after.relics).toContain('sages-tome');
    expect(relicPoolFor(after, content)).toContain('sages-tome');
    expect(buy(after, { kind: 'relic', id: 'crown-of-echoes' }, content)).toEqual({ error: 'cannot-afford' });
    // A row waiting on its system is priced and not sold.
    expect(buy(at(10, 20), { kind: 'relic', id: 'time-spinner' }, content)).toEqual({ error: 'pending' });
  });

  it('TheDiscoveriesShelf_SellsAnUndiscoveredTierTwoForFour_FromLevelEight', () => {
    expect(martPrice({ kind: 'relic', id: 'steady-aim' }, content)).toBe(MART_PRICE.discovery);
    expect(buy(at(7, 20), { kind: 'relic', id: 'steady-aim' }, content)).toEqual({ error: 'locked' });
    const after = ok(buy(at(8, 4), { kind: 'relic', id: 'steady-aim' }, content));
    expect(after.tokens).toBe(0);
    expect(after.relics).toEqual(['steady-aim']);
    // One already discovered is owned, whatever the wallet says.
    expect(buy(at(8, 20, { relics: ['steady-aim'] }), { kind: 'relic', id: 'steady-aim' }, content)).toEqual({ error: 'owned' });
  });

  it('HubUpgrades_AreSoldNotGranted_AndThePendingOnesWait', () => {
    expect(buy(at(4, 20), { kind: 'hub', id: 'expanded-box' }, content)).toEqual({ error: 'locked' });
    const after = ok(buy(at(5, 20), { kind: 'hub', id: 'expanded-box' }, content));
    expect(after.hub).toEqual(['expanded-box']);
    expect(after.tokens).toBe(20 - MART_PRICE.hub['expanded-box']);
    // The Corner sells the fourth Starting Relic from Level 1.
    expect(ok(buy(at(1, 3), { kind: 'hub', id: 'starting-relic-plus-one' }, content)).hub).toEqual(['starting-relic-plus-one']);
    // v0.7.1 — the Cities opened, so the Salve Cache is sold now; the Apex Reveal still waits on Victory Road.
    expect(ok(buy(at(5, 20), { kind: 'hub', id: 'trauma-salve-cache' }, content)).hub).toEqual(['trauma-salve-cache']);
    expect(buy(at(5, 20), { kind: 'hub', id: 'apex-reveal' }, content)).toEqual({ error: 'pending' });
  });

  it('ASoulboundLine_CountsAsAnOwnedStarter_§6.8.2', () => {
    const soul = at(3, 20, { bond: { eevee: 100 } });
    expect(martOwned(soul, { kind: 'starter', id: 'eevee' }, content)).toBe(true);
    expect(buy(soul, { kind: 'starter', id: 'eevee' }, content)).toEqual({ error: 'owned' });
  });

  it('Pikachu_IsSold_NowItsKitShips_§8.5.2', () => {
    // v0.7.3 — the kit shipped with Region 2, so the shelf that priced it since v0.6 sells it now.
    expect(martPrice({ kind: 'starter', id: 'pikachu' }, content)).toBe(6);
    const bought = buy(at(3, 20), { kind: 'starter', id: 'pikachu' }, content);
    expect('state' in bought && bought.state.starters).toContain('pikachu');
  });

  it('TheMartDoesNotSellWhatItDoesNotKnow', () => {
    expect(buy(at(30, 99), { kind: 'relic', id: 'coin-pouch' }, content)).toEqual({ error: 'unknown' });
    expect(buy(at(30, 99), { kind: 'cosmetic', id: 'title-nobody' }, content)).toEqual({ error: 'unknown' });
    expect(buy(at(30, 99), { kind: 'relic', id: 'not-a-relic' }, content)).toEqual({ error: 'unknown' });
  });
});

describe("The Trainer's Corner — §8.4.4", () => {
  it('ACosmeticBought_IsWorn_AndOnlyOnePerKindIsWornAtATime', () => {
    const one = ok(buy(at(1, 10), { kind: 'cosmetic', id: 'title-veteran' }, content));
    expect(one.tokens).toBe(10 - COSMETIC_PRICE.title);
    expect(one.cosmetics).toEqual(['title-veteran']);
    expect(one.wearing).toEqual({ title: 'title-veteran' });
    const two = ok(buy(one, { kind: 'cosmetic', id: 'title-ace-trainer' }, content));
    expect(two.wearing.title).toBe('title-ace-trainer');
    const avatar = ok(buy(two, { kind: 'cosmetic', id: 'avatar-hiker' }, content));
    expect(avatar.wearing).toEqual({ title: 'title-ace-trainer', avatar: 'avatar-hiker' });
    expect(buy(avatar, { kind: 'cosmetic', id: 'avatar-hiker' }, content)).toEqual({ error: 'owned' });
  });

  it('Wear_SwapsAmongOwnedOnes_AndIgnoresTheRest', () => {
    const a = ok(buy(ok(buy(at(1, 10), { kind: 'cosmetic', id: 'title-veteran' }, content)), { kind: 'cosmetic', id: 'title-ace-trainer' }, content));
    expect(wear(a, 'title', 'title-veteran').wearing.title).toBe('title-veteran');
    expect(wear(a, 'title', null).wearing.title).toBeUndefined();
    // Not owned, or the wrong kind for the slot: no change, same object.
    expect(wear(a, 'title', 'title-champion-in-waiting')).toBe(a);
    expect(wear(a, 'avatar', 'title-veteran')).toBe(a);
  });

  it('TheCornerIsOpenAtLevelOne_SoTheFirstTokensHaveSomewhereToGo', () => {
    expect(SHELVES.corner.level).toBe(1);
    expect(shelfOpen(emptyAccount(), 'corner')).toBe(true);
  });
});

import { expect, test, type Page } from '@playwright/test';

// v0.8.6 — consumables that are spent and relics that are scarce: the reward screen's supplies (§2.7.2), the
// Elite Trainer's relic pick (§2.8.1), and the shop's bundles and collector's premium (§2.9.2, §2.11.2.2–3).
// Driven through the dev hook's real reducers, like every other run spec.

async function freshRun(page: Page, seed = 7): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate((n) => window.__ascendant!.run.new('squirtle', n), seed);
  await page.evaluate(() => window.__ascendant!.run.fill(3));
  await page.evaluate(() => window.__ascendant!.run.levelTo(22));
  await page.evaluate(() => window.__ascendant!.goTo('map'));
  await expect(page.getByTestId('map-screen')).toBeVisible();
}

test.describe('Supplies and scarce relics — v0.8.6', () => {
  test('a trainer pays in supplies, named and counted on the reward screen — §2.7.2', async ({ page }) => {
    await freshRun(page);
    await page.evaluate(() => {
      window.__ascendant!.run.jump('trainer');
      window.__ascendant!.goTo('map');
    });
    const target = await page.evaluate(() => window.__ascendant!.run.state()!.reachable[0]!);
    await page.getByTestId(`node-${target}`).click();
    await page.getByTestId('btn-enter-node').click();
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.evaluate(() => window.__ascendant!.auto(400));
    await page.getByTestId('btn-continue-run').click();
    await expect(page.getByTestId('reward-screen')).toBeVisible();
    await expect(page.getByTestId('reward-supplies')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'playtest/reward-supplies.png' });
    const bag = await page.evaluate(() => window.__ascendant!.run.state()!.pendingReward!.consumables.length);
    expect(bag).toBeGreaterThan(0);
  });

  test('the Elite Trainer offers a relic pick after the summary — §2.8.1', async ({ page }) => {
    await freshRun(page);
    await page.evaluate(() => window.__ascendant!.run.levelTo(30));
    await page.evaluate(() => window.__ascendant!.run.goto('elite'));
    const phase = await page.evaluate(() => window.__ascendant!.run.state()!.phase);
    test.skip(phase !== 'reward', `the walk ended on ${phase}`);
    await page.evaluate(() => window.__ascendant!.goTo('map'));
    await expect(page.getByTestId('reward-screen')).toBeVisible();
    await expect(page.getByTestId('btn-claim')).toHaveText('Choose a relic');
    // The loot rows must leave the button on a 720p screen (the UI review's Blocker, v0.8.6).
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'playtest/reward-elite-720.png' });
    await expect(page.getByTestId('btn-claim')).toBeInViewport({ ratio: 1 });
    await page.getByTestId('btn-claim').click();
    await expect(page.getByTestId('elite-relic-pick')).toBeVisible();
    const offers = page.locator('[data-testid^="elite-offer-"]');
    await expect(offers).toHaveCount(3);
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete));
    await page.screenshot({ path: 'playtest/elite-relic-pick.png' });
    const before = await page.evaluate(() => window.__ascendant!.run.state()!.relics.length);
    await offers.nth(2).click();
    await page.getByTestId('btn-take-elite-relic').click();
    await expect(page.getByTestId('reward-screen')).toHaveCount(0);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics.length)).toBe(before + 1);
  });

  test('the Mart sells bundles, and a second relic carries the premium — §2.11.2.2, §2.11.2.3', async ({ page }) => {
    await freshRun(page);
    await page.evaluate(() => window.__ascendant!.run.city(0));
    await page.evaluate(() => window.__ascendant!.run.pay(5000));
    await expect(page.getByTestId('city-screen')).toBeVisible();
    await page.getByTestId('door-mart').click();
    await expect(page.getByTestId('shop-screen')).toBeVisible();

    const slots = await page.evaluate(() => window.__ascendant!.run.state()!.pendingShop!.slots.map((s) => ({ kind: s.kind, id: s.id, qty: s.qty ?? 1 })));
    const potion = slots.findIndex((s) => s.kind === 'consumable' && s.id === 'potion');
    expect(slots[potion]!.qty).toBe(5);
    await expect(page.getByTestId(`shop-slot-${potion}`)).toContainText('Potion ×5');

    const relics = slots.map((s, i) => ({ ...s, i })).filter((s) => s.kind === 'relic');
    expect(relics).toHaveLength(2);
    await page.getByTestId(`shop-slot-${relics[0]!.i}`).click();
    await expect(page.getByTestId(`shop-premium-${relics[1]!.i}`)).toContainText('+25 %');
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete));
    await page.screenshot({ path: 'playtest/shop-bundles-premium.png' });
  });

  test('the Center hands over supplies on the first visit only, and the nurse on the route — §2.11.1, §2.9.1', async ({ page }) => {
    await freshRun(page);
    await page.evaluate(() => window.__ascendant!.run.city(0));
    await page.getByTestId('door-center').click();
    await expect(page.getByTestId('center-gift')).toBeVisible();
    await expect(page.getByTestId('center-gift-super-potion')).toHaveAttribute('aria-label', 'Super Potion ×2');
    await page.screenshot({ path: 'playtest/center-gift.png' });
    await page.getByTestId('btn-leave-center').click();
    await page.getByTestId('door-center').click();
    await expect(page.getByTestId('center-screen')).toBeVisible();
    await expect(page.getByTestId('center-gift')).toHaveCount(0);

    await freshRun(page);
    await page.evaluate(() => {
      window.__ascendant!.run.goto('aid');
      window.__ascendant!.goTo('map');
    });
    const phase = await page.evaluate(() => window.__ascendant!.run.state()!.phase);
    test.skip(phase !== 'aid', `the walk ended on ${phase}`);
    await expect(page.getByTestId('aid-gift')).toBeVisible();
  });

  test('the Bag opens everything carried, two items a turn — §3.5', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await expect(page.getByTestId('bag-uses')).toHaveText('2/2');
    await page.getByTestId('btn-bag').click();
    await expect(page.getByTestId('bag-panel')).toBeVisible();
    // One card per kind, with its count: the fixture's two Potions are one card.
    await expect(page.getByTestId('consumable-potion')).toHaveCount(1);
    await expect(page.getByTestId('consumable-potion')).toContainText('×2');
    await page.screenshot({ path: 'playtest/combat-bag.png' });
    // Two items used this turn: the bag says so, and what is left is locked until the next.
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const dev = window.__ascendant!;
      for (const id of ['potion', 'antidote']) {
        const card = dev.state()!.player.consumables.hand.find((c) => c.consumableId === id)!;
        dev.dispatch({ type: 'use-consumable', cardId: card.id, targetIndex: 0 });
      }
    });
    await expect(page.getByTestId('bag-uses')).toHaveText('0/2');
    await page.getByTestId('btn-bag').click();
    await expect(page.getByTestId('consumable-potion')).toHaveAttribute('data-state', 'locked');
  });

  test('the catch pill lists every ball in the bag with its own chance — §2.6.4.2', async ({ page }) => {
    await freshRun(page);
    await page.evaluate(() => {
      const dev = window.__ascendant!;
      dev.run.patch((d) => {
        d.consumables.push('great-ball', 'ultra-ball');
      });
      dev.run.jump('wild');
      dev.goTo('map');
    });
    const target = await page.evaluate(() => window.__ascendant!.run.state()!.reachable[0]!);
    await page.getByTestId(`node-${target}`).click();
    await page.getByTestId('btn-enter-node').click();
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.getByTestId('catch-pill').first().click();
    await expect(page.getByTestId('catch-picker')).toBeVisible();
    const pct = async (id: string) => Number((await page.getByTestId(`catch-with-${id}`).locator('.display').innerText()).replace('%', ''));
    const [ultra, great, poke] = [await pct('ultra-ball'), await pct('great-ball'), await pct('poke-ball')];
    expect(ultra).toBeGreaterThan(great);
    expect(great).toBeGreaterThan(poke);
    await page.screenshot({ path: 'playtest/combat-catch-picker.png' });
    await page.getByTestId('catch-with-great-ball').click();
    expect(await page.evaluate(() => window.__ascendant!.state()!.player.consumables.used.map((c) => c.consumableId))).toContain('great-ball');
  });
});

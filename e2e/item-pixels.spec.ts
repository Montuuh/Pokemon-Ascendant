import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const evidence = 'playtest/art-review-2026-10-24/implementation/B06';

async function fresh(page: Page) {
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    a.run.fill(6);
  });
}

/** D9: measure painted pixels after decode AND React's load-driven layout commit. */
async function pixelFit(image: Locator) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((i: HTMLImageElement) => {
    if (!i.complete || !i.naturalWidth) return false;
    const r = i.getBoundingClientRect();
    return r.width / i.naturalWidth === r.height / i.naturalHeight && Number.isInteger(r.width / i.naturalWidth * 2);
  })).toBe(true);
  const fit = await image.evaluate((i: HTMLImageElement) => {
    const r = i.getBoundingClientRect();
    const cell = i.parentElement!.getBoundingClientRect();
    return { native: i.naturalWidth, scale: r.width / i.naturalWidth, inside: r.left >= cell.left - 0.01 && r.top >= cell.top - 0.01 && r.right <= cell.right + 0.01 && r.bottom <= cell.bottom + 0.01, rendering: getComputedStyle(i).imageRendering };
  });
  expect(fit.inside).toBe(true);
  expect(fit.rendering).toBe('pixelated');
  expect(fit.scale).toBeGreaterThanOrEqual(0.5);
  return fit;
}

for (const height of [1080, 720]) for (const motion of ['reduce', 'no-preference'] as const) {
  test.describe(`Item pixels ${height}p ${motion}`, () => {
    test.use({ viewport: { width: height === 720 ? 1280 : 1920, height }, reducedMotion: motion });

    test('Summit retains native pixels, keyboard selection and its one-way confirmation', async ({ page }) => {
      await fresh(page);
      await page.evaluate(() => {
        const a = window.__ascendant!;
        a.run.victoryRoad();
        a.run.patch(d => { d.reachable = [Object.values(d.map.nodes).find(n => n.kind === 'summit')!.id]; });
        a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
        a.run.dispatch({ type: 'begin-combat' });
      });
      const confirm = page.getByTestId('btn-take-summit-relic');
      await expect(confirm).toBeDisabled();
      const cards = page.locator('[data-testid^="summit-offer-"]');
      for (const card of await cards.all()) await pixelFit(card.locator('img'));
      const card = cards.first();
      await card.focus();
      await expect(card).toBeFocused();
      expect(await card.evaluate(e => getComputedStyle(e).outlineStyle)).toBe('solid');
      await expect(page.getByRole('tooltip')).toBeVisible();
      await pixelFit(page.getByRole('tooltip').locator('img'));
      await page.keyboard.press('Escape');
      await expect(page.getByRole('tooltip')).toBeHidden();
      await expect(card).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(confirm).toBeEnabled();
      await card.hover();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await pixelFit(card.locator('img'));
      await pixelFit(page.getByRole('tooltip').locator('img'));
      await page.keyboard.press('Escape');
      await page.screenshot({ path: `${evidence}/tests/summit-${height}-${motion}.png` });
      await confirm.click();
      await expect(page.getByTestId('league-hall')).toBeVisible();
    });

    test('shop cards and both bag source sizes keep tooltips, targets and blocked offers', async ({ page }) => {
      await fresh(page);
      await page.evaluate(() => {
        const a = window.__ascendant!;
        a.run.city(0); a.run.pay(0);
        a.run.patch(d => { d.relics = ['berry-pouch', 'clear-mind']; });
      });
      await page.getByTestId('door-mart').click();
      await expect(page.getByTestId('shop-screen')).toBeVisible();
      const shopCards = page.locator('[data-kind]');
      expect(await shopCards.count()).toBeGreaterThan(0);
      for (const card of await shopCards.all()) {
        await pixelFit(card.locator('img'));
        await expect(card).toBeDisabled();
      }
      // Native disabled buttons do not receive React mouse-enter events. Inspect an affordable offer's door.
      await page.evaluate(() => window.__ascendant!.run.pay(600));
      await expect(shopCards.first()).toBeEnabled();
      await shopCards.first().hover();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await pixelFit(page.getByRole('tooltip').locator('img'));
      await page.evaluate(() => {
        window.__ascendant!.run.dispatch({ type: 'leave-shop' });
      });
      await page.getByTestId('btn-inventory').click();
      for (const [id, source] of [['berry-pouch', 24], ['clear-mind', 30]] as const) {
        const card = page.getByTestId(`relic-${id}`);
        expect((await pixelFit(card.locator('img'))).native).toBe(source);
        await card.hover();
        await expect(page.getByRole('tooltip')).toContainText(id === 'berry-pouch' ? 'Berry Pouch' : 'Clear Mind');
        const tip = await pixelFit(page.getByRole('tooltip').locator('img'));
        expect(tip.native).toBe(source);
        expect(tip.scale).toBe(0.5);
      }
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('inventory-drawer')).toBeHidden();
      await expect(page.getByTestId('btn-inventory')).toBeFocused();
      // Focus returning to Bag opens its own door; the removed item's bubble must not survive.
      await expect(page.getByRole('tooltip')).not.toContainText('Clear Mind');
    });
  });
}

test('every catalogue bag icon and tooltip fits its native grid, including TMs and stones', async ({ page }) => {
  test.setTimeout(180_000);
  const rows = (file: string, key: string) => (JSON.parse(readFileSync(`src/content/data/${file}.json`, 'utf8'))[key] as { id: string }[]).map(r => r.id);
  const fixture = { relics: rows('relics', 'relics'), bag: rows('held-items', 'items'), consumables: rows('consumables', 'consumables'), tms: rows('tms', 'tms'), stones: rows('evolution-items', 'items') };
  await fresh(page);
  await page.evaluate(fixture => {
    const a = window.__ascendant!;
    a.run.city(0);
    a.run.patch(d => { Object.assign(d, fixture); });
  }, fixture);
  await page.getByTestId('btn-inventory').click();
  const sources = new Set<string>();
  for (const tab of ['relics', 'items', 'bag']) {
    await page.getByTestId(`inv-tab-${tab}`).click();
    for (const card of await page.locator('[data-kind]').all()) {
      await card.scrollIntoViewIfNeeded();
      await pixelFit(card.locator('img'));
      await card.hover();
      const tip = page.getByRole('tooltip');
      await expect(tip).toBeVisible();
      const src = await card.locator('img').getAttribute('src');
      await expect(tip.locator('img')).toHaveAttribute('src', src!);
      await pixelFit(tip.locator('img'));
      sources.add(src!);
    }
  }
  expect(sources.size).toBeGreaterThan(100);
});

test('missing item images hide their frame and tooltip icon without losing the card action', async ({ page }) => {
  await page.route('**/art/items/leftovers.png', route => route.abort());
  await fresh(page);
  await page.evaluate(() => {
    window.__ascendant!.run.city(0);
    window.__ascendant!.run.patch(d => { d.bag = ['leftovers']; });
  });
  await page.getByTestId('btn-inventory').click();
  await page.getByTestId('inv-tab-items').click();
  const card = page.getByTestId('bagged-leftovers');
  await expect(card.locator('[data-empty="true"]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(card.locator('img')).toBeHidden();
  await card.focus();
  await expect(page.getByRole('tooltip')).toContainText('Leftovers');
  await expect(page.getByRole('tooltip').locator('img')).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('equip-leftovers-squirtle')).toBeVisible();
});

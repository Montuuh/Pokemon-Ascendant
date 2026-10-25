import { expect, test, type Page } from '@playwright/test';

async function arrive(page: Page) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    const dev = window.__ascendant!;
    dev.run.new('squirtle', 11);
    dev.run.fill(6);
    dev.run.victoryRoad();
    dev.run.patch((draft) => {
      for (const mon of draft.box) { mon.hp = 1; mon.status = { kind: 'burn', turnsLeft: null }; }
      draft.reachable = [Object.values(draft.map.nodes).find((node) => node.kind === 'summit')!.id];
    });
    dev.run.dispatch({ type: 'enter-node', nodeId: dev.run.state()!.reachable[0]! });
    dev.run.dispatch({ type: 'begin-combat' });
  });
  await expect(page.getByTestId('summit-screen')).toBeVisible();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  await page.evaluate(async () => { await document.fonts.ready; });
}

for (const [width, height] of [[1280,720], [1920,1080]] as const) {
  test(`§2.12.4 — native Indigo arrival, real healed Box and keyboard relic choice at ${height}p`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await arrive(page);
    const screen = page.getByTestId('summit-screen');
    const art = screen.locator('img[src$="/league/summit.png"]');
    // §9.1.1 — compact arrivals retain native half-step scaling and room for the large-text decision.
    expect(await art.evaluate((image) => image.getBoundingClientRect().width / (image as HTMLImageElement).naturalWidth)).toBe(height === 720 ? 1.5 : 3);
    await expect(screen.getByRole('list', { name: 'Healed in full' }).locator('li')).toHaveCount(6);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.box.every((mon) => mon.hp > 1 && mon.status === null))).toBe(true);
    await expect(page.getByTestId('summit-league').locator('li')).toHaveCount(5);
    await expect(screen).not.toContainText(/Bruno|Agatha|Will|Lance|Blue/);
    const offers = screen.locator('[data-testid^="summit-offer-"]');
    await expect(offers).toHaveCount(3);
    await expect(page.getByTestId('btn-take-summit-relic')).toBeDisabled();
    expect(await screen.evaluate((element) => element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth)).toBe(true);
    const before = await page.evaluate(() => window.__ascendant!.run.state()!.relics);
    const selectedId = (await offers.first().getAttribute('data-testid'))!.replace('summit-offer-', '');
    await offers.first().focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toBeHidden();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('btn-take-summit-relic')).toBeEnabled();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).toEqual(before);
    await page.mouse.move(0,0);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await screen.screenshot({ path: `playtest/a11-summit-${height}.png` });
    await page.getByTestId('btn-take-summit-relic').click();
    await expect(page.getByTestId('league-hall')).toBeVisible();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).toEqual([...before, selectedId]);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.zone)).toBe('league');
  });
}

test('§2.12.4 — declining crosses the gate with no relic granted', async ({ page }) => {
  await arrive(page);
  const before = await page.evaluate(() => window.__ascendant!.run.state()!.relics);
  await page.getByTestId('btn-decline-summit-relic').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('league-hall')).toBeVisible();
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).toEqual(before);
});

test('§2.12.4 — the three longest Legendary descriptions fit the 720p arrival', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await arrive(page);
  await page.evaluate(() => window.__ascendant!.run.patch((draft) => {
    draft.pendingSummit = { relics: ['apex-predator', 'living-legend', 'unbreakable-will'] };
  }));
  await page.getByTestId('summit-offer-apex-predator').click();
  const screen = page.getByTestId('summit-screen');
  expect(await screen.evaluate((element) => element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth)).toBe(true);
  for (const card of await screen.locator('[data-testid^="summit-offer-"]').all()) {
    expect(await card.evaluate((element) => element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await page.getByTestId('btn-decline-summit-relic').focus();
  await screen.screenshot({ path: 'playtest/a11-summit-long-offers-720.png' });
});

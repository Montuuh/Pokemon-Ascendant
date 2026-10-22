import { expect, test, type Locator } from '@playwright/test';

// §9.1.3 / D9 — the handheld face must fit the real plates, including long move names at 720p.
async function expectTextFits(locator: Locator): Promise<void> {
  expect(await locator.count()).toBeGreaterThan(0);
  for (const element of await locator.all()) {
    const box = await element.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent, width: node.clientWidth, scroll: node.scrollWidth, left: rect.left, right: rect.right, viewport: innerWidth };
    });
    expect(box.scroll, `${box.text}: truncated text`).toBeLessThanOrEqual(box.width + 1);
    expect(box.left, `${box.text}: left of viewport`).toBeGreaterThanOrEqual(0);
    expect(box.right, `${box.text}: right of viewport`).toBeLessThanOrEqual(box.viewport);
  }
}

for (const [width, height] of [[1280, 720], [1920, 1080]]) {
  test(`handheld lettering fits long combat names and counters at ${height}p`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    const external: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).hostname !== 'localhost') external.push(request.url());
    });
    await page.goto('/?scenario=full-hand-3mon');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.evaluate(() => {
      window.__ascendant!.hand(['high-jump-kick', 'thunder-punch', 'self-destruct', 'light-screen', 'solar-beam']);
      window.__ascendant!.intend('high-jump-kick');
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId('hand')).toContainText('High Jump Kick');
    await expect(page.getByTestId('intent-chip')).toContainText('High Jump Kick');
    await expectTextFits(page.getByTestId('hand').locator('[class*="_name_"]'));
    await expectTextFits(page.locator('[data-testid^="portrait-"], [data-testid^="enemy-"]').locator('[class*="_name_"]'));
    await expectTextFits(page.locator('[data-testid="intent-chip"], [class*="_hpText_"]'));
    // Check the actual loaded local face as well as the geometry, never just a font-family declaration.
    expect(await page.evaluate(() => [...document.fonts].some((face) => face.family === 'Pixelify Sans' && face.status === 'loaded'))).toBe(true);
    expect(await page.evaluate(() => [...document.fonts].some((face) => face.family === 'Tiny5' && face.status === 'loaded'))).toBe(true);
    await expect(page.locator('[class*="_hpText_"]').first()).toHaveCSS('font-family', /Tiny5/);
    await expect(page.getByTestId('ap-pips').locator('b').first()).toHaveCSS('font-family', /Tiny5/);
    expect(external).toEqual([]);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `playtest/a04-a06/a04-tests/long-combat-verified-${height}.png` });
  });
}

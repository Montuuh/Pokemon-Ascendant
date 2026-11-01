import { expect, test, type Page } from '@playwright/test';

async function center(page: Page, count = 3) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate((count) => {
    const a = window.__ascendant!; a.run.new('squirtle', 7); a.run.fill(count); a.run.city(0); a.run.pay(2000); a.run.trauma(2);
    a.run.patch((d) => { for (const m of d.box) m.hp = 1; });
  }, count);
  await page.getByTestId('door-center').click();
  await expect(page.getByTestId('center-health')).toBeVisible();
}
for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
  test(`Center room and relocated services at ${height}p`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' }); await center(page);
    const lobby = page.getByTestId('center-lobby'); await expect(lobby).toBeVisible();
    expect((Number(await lobby.getAttribute('data-scale')) * 2) % 1).toBe(0);
    const art = lobby.locator('img').first(); await expect(art).toHaveJSProperty('naturalWidth', 320); await expect(art).toHaveJSProperty('naturalHeight', 224);
    await expect(page.getByTestId('door-center-daycare')).toHaveCount(0);
    const beds = await page.getByTestId('door-center-therapy').boundingBox(); const nurse = await page.getByTestId('door-center-heal').boundingBox();
    expect(beds!.x).toBeLessThan(nurse!.x); expect(beds!.y).toBeGreaterThan(nurse!.y);
    await page.getByTestId('door-center-therapy').click(); await expect(page.getByRole('dialog', { name: 'Therapy' })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByTestId('door-center-therapy')).toBeFocused();
    await page.getByTestId('door-center-pc').click(); await expect(page.getByTestId('center-pc')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByTestId('door-center-pc')).toBeFocused();
    await page.screenshot({ path: `playtest/ap-evolution-center-2026-10-30/center-${height}.png` });
  });
}

test('Requested heal owns the animation and its machine stays aligned with the room', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await page.emulateMedia({ reducedMotion: 'no-preference' }); await center(page);
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.box.every((m) => m.hp === 1))).toBe(true);
  await expect(page.getByTestId('center-heal')).toHaveCount(0);
  await page.getByTestId('door-center-heal').click();
  await expect(page.getByTestId('center-heal')).not.toHaveAttribute('data-beat', 'done');
  await expect(page.getByTestId('center-counters')).toHaveAttribute('inert', '');
  const room = await page.getByTestId('center-lobby').locator('img').first().boundingBox();
  const machine = await page.getByTestId('center-heal-stand').locator('span').first().boundingBox();
  const scale = Number(await page.getByTestId('center-lobby').getAttribute('data-scale'));
  expect(Math.abs(machine!.x - (room!.x + 112 * scale))).toBeLessThanOrEqual(2);
  expect(Math.abs(machine!.y - (room!.y + 17 * scale))).toBeLessThanOrEqual(2);
  await page.getByTestId('center-heal-stand').click();
  await expect(page.getByTestId('center-heal')).toHaveAttribute('data-beat', 'done');
  await expect(page.getByTestId('center-health')).toBeVisible();
  await expect(page.getByTestId('center-counters')).not.toHaveAttribute('inert', '');
});

import { expect, test } from '@playwright/test';

// v0.7.3 — Region 2, Coastal Cliffs (§2.2, §2.13.2): out of Pallet Town's gate, the map is a different place —
// its name, its own plate, and one of its own four Gyms at the end of each lane.

test('the gate out of Pallet Town opens onto the Coastal Cliffs', async ({ page }) => {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(() => {
    const d = window.__ascendant!;
    d.run.new('squirtle', 11);
    d.run.fill(3);
    d.run.city(0);
  });
  await expect(page.getByTestId('city-screen')).toBeVisible();
  await page.getByTestId('door-gate').click();
  await page.locator('[data-testid^="reflection-"]').first().click();
  await page.getByTestId('btn-depart').click();

  await expect(page.getByRole('heading', { name: 'Region 2' })).toBeVisible();
  await expect(page.getByTestId('map-screen')).toContainText('Coastal Cliffs');
  const gyms = await page.evaluate(() => window.__ascendant!.run.state()!.map.gyms);
  for (const id of gyms) expect(['fire-gym-r2', 'grass-gym-r2', 'electric-gym-r2', 'poison-gym-r2']).toContain(id);
  // Its own route plate, not Region 1's meadow.
  await expect(page.locator('img[src$="region-2.png"]')).toHaveCount(1);
  await page.screenshot({ path: 'playtest/run-region2.png' });
});

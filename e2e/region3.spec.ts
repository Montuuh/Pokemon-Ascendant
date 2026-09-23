import { expect, test } from '@playwright/test';

// v0.7.4 — Region 3, Volcanic Highlands (§2.2, §2.13.3): out of Celadon's gate, the map is the last Region of the
// run — its name, its own plate, and one of its own four Gyms at the end of each lane; and a Gym fight there is
// one of Sabrina, Giovanni, Kiyo or Lorelei.

test('the gate out of Celadon opens onto the Volcanic Highlands, and its Gym is its own', async ({ page }) => {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(() => {
    const d = window.__ascendant!;
    d.run.new('squirtle', 11);
    d.run.fill(3);
    d.run.city(1);
  });
  await expect(page.getByTestId('city-screen')).toBeVisible();
  await page.getByTestId('door-gate').click();
  await page.locator('[data-testid^="reflection-"]').first().click();
  await page.getByTestId('btn-depart').click();

  await expect(page.getByRole('heading', { name: 'Region 3' })).toBeVisible();
  // §2.13 — named now: v0.7.4 retired the placeholder that went unnamed.
  await expect(page.getByTestId('map-screen')).toContainText('Volcanic Highlands');
  const gyms = await page.evaluate(() => window.__ascendant!.run.state()!.map.gyms);
  for (const id of gyms) expect(['psychic-gym-r3', 'ground-gym-r3', 'fighting-gym-r3', 'ice-gym-r3']).toContain(id);
  await expect(page.locator('img[src$="region-3.png"]')).toHaveCount(1);
  await page.screenshot({ path: 'playtest/run-region3.png' });

  // The Gym at the end of a lane, fought: its Leader is one of Region 3's.
  await page.evaluate(() => {
    const d = window.__ascendant!;
    d.run.jump('gym');
    d.run.dispatch({ type: 'enter-node', nodeId: d.run.state()!.reachable[0]! });
  });
  await page.getByTestId('btn-enter-node').click();
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  await expect(page.getByTestId('combat-screen')).toContainText(/Sabrina|Giovanni|Kiyo|Lorelei/);
  await page.screenshot({ path: 'playtest/run-region3-gym.png' });
});

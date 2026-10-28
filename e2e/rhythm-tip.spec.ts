import { expect, test } from '@playwright/test';

// §4.1.3.1 — the critical rhythm's hover: the Speed the ring reads, the card's own number beside it, every tier of its
// side with the Pokémon's marked (v0.9.80).

test.describe('The rhythm dial hover — §4.1.3.1', () => {
  test('an ally and a foe each get their own table, their tier marked', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=7');
    const dials = page.getByTestId('rhythm-dial');
    await expect(dials.first()).toBeVisible();
    const n = await dials.count();
    expect(n).toBeGreaterThan(1);
    for (const [i, rows] of [[0, 5], [n - 1, 4]] as const) {
      await dials.nth(i).hover();
      const table = page.getByTestId('rhythm-tiers').last();
      await expect(table).toBeVisible();
      await expect(table.locator('tr')).toHaveCount(rows);
      await expect(table.locator('tr[aria-current="true"]')).toHaveCount(1);
      await expect(table).toContainText('Reads Speed');
      if (i === 0) await page.screenshot({ path: 'playtest/rhythm-tip.png' });
      await page.mouse.move(5, 5);
    }
  });
});

import { expect, test } from '@playwright/test';

// §9.13 — the title screen (v0.9.17): a Pokémon battle behind the title mark and the menu, carried on behind the
// new-run steps. With motion on it plays — a move's picture lands, a bar drains, the next matchup comes in; with motion
// off (the suite's default) it is one still frame. Screenshots to playtest/title-*.png.

test.describe('The title screen — §9.13', () => {
  test('a still battle behind the mark and the menu, with motion off', async ({ page }) => {
    await page.goto('/?screen=menu');
    await expect(page.getByRole('heading', { name: 'Pokémon Ascendant' })).toBeVisible();
    const battle = page.getByTestId('title-battle');
    const fighters = battle.getByTestId('title-fighter');
    await expect(fighters).toHaveCount(2);
    // Both sprites drawn, at their pixels times the scale.
    for (const side of ['near', 'far']) {
      const sprite = battle.locator(`[data-side="${side}"] img`).first();
      await expect.poll(() => sprite.evaluate((img: HTMLImageElement) => img.getBoundingClientRect().width)).toBeGreaterThan(80);
    }
    const match = await battle.locator('[data-match]').getAttribute('data-match');
    await page.waitForTimeout(2_500);
    await expect(battle.getByTestId('title-hit')).toHaveCount(0);
    await expect(battle.locator('[data-match]')).toHaveAttribute('data-match', match!);
    await expect(battle.locator('[data-side="far"] [role="meter"]')).toHaveAttribute('aria-valuenow', '100');
    await page.screenshot({ path: 'playtest/title-still.png' });
  });

  test.describe('with motion on', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the Pokémon trade moves, one faints, and the next matchup comes in', async ({ page }) => {
      await page.goto('/?screen=menu');
      const battle = page.getByTestId('title-battle');
      const first = await battle.locator('[data-match]').getAttribute('data-match');
      // The first hit: the near Pokémon's move lands on the far one and its bar drains.
      await expect(battle.locator('[data-side="far"]').getByTestId('title-hit')).toBeVisible({ timeout: 4_000 });
      await page.screenshot({ path: 'playtest/title-hit.png' });
      await expect.poll(async () => Number(await battle.locator('[data-side="far"] [role="meter"]').getAttribute('aria-valuenow'))).toBeLessThan(100);
      // One faints, and another fight takes its place.
      await expect(battle.locator('[data-fainted]')).toHaveCount(1, { timeout: 12_000 });
      await expect(battle.locator('[data-match]')).not.toHaveAttribute('data-match', first!, { timeout: 6_000 });
    });

    test('the battle carries on behind the new-run steps, and each starter stands in its window', async ({ page }) => {
      await page.goto('/?screen=menu');
      await page.getByTestId('btn-new-run').click();
      await expect(page.getByTestId('starter-select')).toBeVisible();
      await expect(page.getByTestId('title-battle')).toBeAttached();
      await page.getByTestId('btn-continue').click();
      const tile = page.getByTestId('starter-charmander');
      await tile.click();
      await expect(tile.locator('img[src*="charmander"]')).toBeVisible();
      await expect(page.getByTestId('starter-detail')).toContainText('Charmander');
      await page.screenshot({ path: 'playtest/title-starter.png' });
    });
  });
});

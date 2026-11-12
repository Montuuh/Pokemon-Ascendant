import { expect, test } from '@playwright/test';

// §2.6.1 (v0.9.120) — the habitat legend: opened from the board's corner or with H, one section per stretch of route, rows
// that mark their nodes on the board, and the fork banner's bubbles naming each lane's habitats.

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test.describe(`Habitat legend ${viewport.width}`, () => {
    test.use({ viewport });

    test('Legend_OpensWithH_ListsTheTrunkAndBothLanes_AndAHoverMarksItsNodes', async ({ page }) => {
      await page.goto('/?screen=menu');
      await page.evaluate(() => { const a = window.__ascendant!; a.run.new('squirtle', 7); a.goTo('map'); });
      await expect(page.getByTestId('route-board')).toHaveAttribute('data-painted', 'true');
      await expect(page.getByTestId('habitat-legend')).toHaveCount(0);
      await page.keyboard.press('h');
      const legend = page.getByTestId('habitat-legend');
      await expect(legend).toBeVisible();
      await expect(page.getByTestId('map-habitats')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('habitat-section')).toHaveCount(3);
      // A column beside the board, never over it: no node is under the panel, and the corner buttons stay on the board.
      const [panel, board, button] = await Promise.all([legend.boundingBox(), page.getByTestId('route-scroller').boundingBox(), page.getByTestId('map-habitats').boundingBox()]);
      expect(panel!.x).toBeGreaterThanOrEqual(board!.x + board!.width);
      expect(button!.x + button!.width).toBeLessThanOrEqual(board!.x + board!.width);
      // Fixed columns: every row's count sits at the same x.
      const xs = await page.locator('[data-testid^="habitat-row-"]').evaluateAll((rows) => rows.map((r) => Math.round(r.children[2]!.getBoundingClientRect().left)));
      expect(new Set(xs).size).toBe(1);
      const row = page.locator('[data-testid^="habitat-row-"]').first();
      await row.hover();
      await expect(page.locator('[data-marked]').first()).toBeVisible();
      await page.mouse.move(5, 5);
      await expect(page.locator('[data-marked]')).toHaveCount(0);
      await page.keyboard.press('h');
      await expect(legend).toHaveCount(0);
    });

    test('Escape_ClosesTheLegendFirst_ThenOpensThePauseMenu_AndTabWalksIntoThePanel', async ({ page }) => {
      await page.goto('/?screen=menu');
      await page.evaluate(() => { const a = window.__ascendant!; a.run.new('squirtle', 7); a.goTo('map'); });
      await expect(page.getByTestId('route-board')).toHaveAttribute('data-painted', 'true');
      await page.getByTestId('map-habitats').click();
      await expect(page.getByTestId('habitat-legend')).toBeVisible();
      await page.getByTestId('map-habitats').focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid^="habitat-row-"]').first()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('habitat-legend')).toHaveCount(0);
      await expect(page.getByTestId('map-habitats')).toBeFocused();
      await expect(page.getByTestId('pause-menu')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('pause-menu')).toBeVisible();
    });

    test('ForkBanner_NamesEachLanesHabitats', async ({ page }) => {
      await page.goto('/?screen=menu');
      await page.evaluate(() => { const a = window.__ascendant!; a.run.new('squirtle', 7); a.goTo('map'); });
      await expect(page.getByTestId('route-board')).toHaveAttribute('data-painted', 'true');
      await page.locator('[data-testid="fork-banner"] [data-lane="0"]').hover();
      await expect(page.getByRole('tooltip')).toContainText('Wild Areas:');
    });
  });
}

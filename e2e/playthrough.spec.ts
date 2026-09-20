import { expect, test, type Page } from '@playwright/test';

// A full fight driven through the real UI (clicks only, no dev hooks): play every playable card on the enemy,
// end the turn, pick a new Lead when asked, until an outcome overlay appears. Proves the whole loop is wired.

async function playOneTurn(page: Page): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const playable = page.locator('[data-testid="hand"] [data-testid^="card-"][data-state="playable"]');
    if ((await playable.count()) === 0) break;
    const card = playable.first();
    await card.click();
    // Step-Backward cards ask for a bench: pick the first selectable portrait if the hint says so.
    const hint = page.getByTestId('selection-hint');
    if ((await hint.count()) > 0 && (await hint.textContent())?.includes('Step-Backward')) {
      const bench = page.locator('[data-testid^="portrait-bench-"]').first();
      await bench.click();
    } else {
      const enemy = page.locator('[data-testid^="enemy-"]');
      if ((await enemy.count()) > 0) await enemy.first().click();
      else break;
    }
    await page.waitForTimeout(120);
    if ((await page.getByTestId('outcome-overlay').count()) > 0) return;
  }
}

test('wild-basic can be won through the UI alone', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?scenario=wild-basic');
  await expect(page.getByTestId('combat-screen')).toBeVisible();

  for (let turn = 0; turn < 25; turn++) {
    if ((await page.getByTestId('outcome-overlay').count()) > 0) break;
    if ((await page.getByTestId('lead-pick-modal').count()) > 0) {
      await page.locator('[data-testid^="pick-lead-"]').first().click();
    }
    await playOneTurn(page);
    if ((await page.getByTestId('outcome-overlay').count()) > 0) break;
    const endTurn = page.getByTestId('btn-end-turn');
    if (await endTurn.isEnabled()) await endTurn.click();
    await page.waitForTimeout(150);
    if ((await page.getByTestId('lead-pick-modal').count()) > 0) {
      await page.locator('[data-testid^="pick-lead-"]').first().click();
    }
  }
  const overlay = page.getByTestId('outcome-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText(/Victory|Gotcha/);
  await page.screenshot({ path: 'playtest/combat-victory.png' });
  await overlay.getByTestId('btn-restart').click();
  await expect(page.getByTestId('combat-screen')).toHaveAttribute('data-turn', '1');
});

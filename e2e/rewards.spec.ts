import { expect, test, type Page } from '@playwright/test';

// v0.9.6 — after a fight: what the levels gave (stats, moves), what the fight moved on the account's medals, the
// progress panel that waits for the fight to end; and the type charts, attacking on a move and defending on a Pokémon.

async function intoAWildFight(page: Page): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 9);
    a.goTo('map');
    a.run.jump('wild');
    a.goTo('map');
  });
  const target = await page.evaluate(() => window.__ascendant!.run.state()!.reachable[0]!);
  await page.getByTestId(`node-${target}`).click();
  await page.getByTestId('btn-enter-node').click();
  await expect(page.getByTestId('combat-screen')).toBeVisible();
}

test('a move type reads attacking, a Pokémon type defending (§4.1.2)', async ({ page }) => {
  await intoAWildFight(page);
  // A card's tooltip carries its type's attacking chart.
  await page.getByTestId('hand').locator('[data-testid^="card-"]').first().hover();
  const tip = page.getByTestId('tooltip');
  await expect(tip).toContainText('Super effective against');
  await page.screenshot({ path: 'playtest/type-attack.png' });
  await page.mouse.move(0, 0);
  await page.getByTestId('squad').locator('[aria-label="water"]').first().hover();
  await expect(tip).toContainText('Defending');
  await expect(tip).toContainText('Weak to');
  await page.screenshot({ path: 'playtest/type-defense.png' });
});

test('the reward names what the levels gave and what the fight moved on the account (§3.5, §8.7)', async ({ page }) => {
  await intoAWildFight(page);
  // The fight itself moves medals; nothing is said while it lasts.
  await page.evaluate(() => window.__ascendant!.auto(400));
  await expect(page.getByTestId('progress-toast')).toHaveCount(0);
  const overlay = page.getByTestId('outcome-overlay');
  await expect(overlay).toBeVisible();
  await overlay.getByTestId('btn-continue-run').click();

  await expect(page.getByTestId('reward-screen')).toBeVisible();
  // A first win: First Blood, listed on the reward screen — the panel leaves the fight's own news to it.
  await expect(page.getByTestId('reward-progress')).toContainText('First Blood');
  await expect(page.getByTestId('progress-toast')).toHaveCount(0);
  // Squirtle came in at level 5: one fight levels it, and the levels name their stats.
  await expect(page.getByTestId('gains-squirtle')).toContainText('HP');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'playtest/reward-levelled.png' });
  await page.getByTestId('btn-claim').click();
  await expect(page.getByTestId('reward-screen')).toHaveCount(0);
});

test('progress made outside a fight shows in the panel, which never takes a click (§8.7)', async ({ page }) => {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('bulbasaur', 7);
    a.goTo('map');
    a.run.fill(3);
    a.run.levelTo(11);
    a.run.goto('wild', true);
  });
  await expect(page.getByTestId('evolution-screen')).toBeVisible();
  await page.locator('[data-archetype="vanguard"]').click();
  await page.getByTestId('btn-evolve').click();
  // A first evolution: Growing Up, in the panel along the bottom-left.
  const toast = page.getByTestId('progress-toast');
  await expect(toast.filter({ hasText: 'Growing Up' })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'playtest/progress-toast.png' });
});

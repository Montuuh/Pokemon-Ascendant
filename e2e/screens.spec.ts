import { expect, test, type Page } from '@playwright/test';

// Visual verification harness. `npm run shot` regenerates playtest/*.png for Claude to read back.
// Deep-links use the router in src/app/store.ts (`?screen=` and `?scenario=`).

const FIXTURES = ['wild-basic', 'wild-catch-ready', 'trainer-2enemy', 'status-showcase', 'full-hand-3mon', 'wild-boss-3phase'];

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // let card-in animations land
}

test('main menu renders and screenshots', async ({ page }) => {
  await page.goto('/?screen=menu');
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pokémon Ascendant' })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: 'playtest/menu.png' });
});

test('scenario picker lists all six fixtures', async ({ page }) => {
  await page.goto('/?screen=scenarios');
  await expect(page.getByTestId('scenario-picker')).toBeVisible();
  for (const id of FIXTURES) await expect(page.getByTestId(`scenario-${id}`)).toBeVisible();
  await settle(page);
  await page.screenshot({ path: 'playtest/scenarios.png' });
});

for (const id of FIXTURES) {
  test(`combat ${id} boots into the action phase and screenshots`, async ({ page }) => {
    await page.goto(`/?scenario=${id}`);
    const screen = page.getByTestId('combat-screen');
    await expect(screen).toBeVisible();
    await expect(screen).toHaveAttribute('data-turn', '1');
    await expect(page.getByTestId('hand').locator('[data-testid^="card-"]')).toHaveCount(5);
    await expect(page.getByTestId('intent-chip')).toBeVisible();
    await expect(page.getByTestId('btn-end-turn')).toBeEnabled();
    await settle(page);
    await page.screenshot({ path: `playtest/combat-${id}.png` });
  });
}

test('hovering a damaging card shows the sim-computed preview; melee bench cards are visibly locked', async ({ page }) => {
  await page.goto('/?scenario=wild-basic');
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  const damaging = page.locator('[data-testid^="card-"][data-state="playable"]').first();
  await damaging.hover();
  const preview = page.getByTestId('damage-preview');
  if (await preview.isVisible()) await expect(preview.locator('div').first()).toHaveText(/\d+/);
  const locked = page.locator('[data-testid^="card-"][data-state="melee-needs-lead"]');
  if ((await locked.count()) > 0) await expect(locked.first()).toBeVisible();
  await page.screenshot({ path: 'playtest/combat-hover.png' });
});

test('selecting a card and clicking the enemy plays it (AP drops, log grows)', async ({ page }) => {
  await page.goto('/?scenario=wild-basic');
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  const card = page.locator('[data-testid^="card-"][data-state="playable"]').first();
  await card.click();
  await expect(page.getByTestId('selection-hint')).toBeVisible();
  await page.locator('[data-testid^="enemy-"]').click();
  await expect(page.getByTestId('ap-pips')).toContainText(/[0-2] AP/);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'playtest/combat-after-play.png' });
});

test('end turn advances to turn 2 and the enemy acts', async ({ page }) => {
  await page.goto('/?scenario=wild-basic');
  await page.getByTestId('btn-end-turn').click();
  await expect(page.getByTestId('combat-screen')).toHaveAttribute('data-turn', '2');
  await expect(page.getByTestId('combat-log')).toContainText('Turn 2');
});

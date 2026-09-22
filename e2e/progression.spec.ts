import { expect, test, type Page } from '@playwright/test';

// v0.3 — the two screens the version exists for: the Evolution branch pick (§6.3.3 / §3.6) and the Dojo
// (§2.9.4), plus teaching a TM (§6.4.1). All three sit deep in a route, so these tests use the dev hook to
// get there. Everything it does goes through the real reducers, so the state reached is one the game could
// have reached on its own — it just skips the twenty minutes.

async function newRun(page: Page, starter = 'bulbasaur', seed = 7): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  // A run first, then the screen: /?screen=map with nothing loaded bounces straight back to the menu.
  await page.evaluate(([s, n]) => window.__ascendant!.run.new(s as string, n as number), [starter, seed] as const);
  await page.evaluate(() => window.__ascendant!.goTo('map'));
  await expect(page.getByTestId('map-screen')).toBeVisible();
}

test('the Evolution screen offers the archetypes and applies the one you pick', async ({ page }) => {
  await newRun(page);
  // §6.2.4 — Bulbasaur's threshold is 12. Standing it at 11 means the next node's XP crosses it.
  // A lone level-5 starter loses the first wild fight about as often as not, so field a team first.
  await page.evaluate(() => window.__ascendant!.run.fill(3));
  await page.evaluate(() => window.__ascendant!.run.levelTo(11));
  await page.evaluate(() => window.__ascendant!.run.goto('wild', true));
  await page.waitForTimeout(200);

  await expect(page.getByTestId('evolution-screen')).toBeVisible();

  // §6.3.3 — a starter offers three, and every card names its payload rather than just its archetype.
  const branches = page.locator('[data-testid^="branch-"]');
  await expect(branches).toHaveCount(3);
  await expect(branches.first()).toContainText(/AP/);
  for (const archetype of ['vanguard', 'specialist', 'support']) {
    await expect(page.locator(`[data-archetype="${archetype}"]`)).toHaveCount(1);
  }

  // Confirm is gated on a choice: an evolution nobody picked is not an evolution.
  await expect(page.getByTestId('btn-evolve')).toBeDisabled();
  await page.locator('[data-archetype="specialist"]').click();
  await expect(page.getByTestId('btn-evolve')).toBeEnabled();
  await expect(page.getByTestId('evolution-after')).toBeVisible();
  await page.waitForTimeout(1200); // let the morph finish, so the screenshot shows the "after"
  await page.screenshot({ path: 'playtest/run-evolution.png' });

  const before = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.speciesId);
  await page.getByTestId('btn-evolve').click();
  await page.waitForTimeout(250);

  const after = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!);
  expect(before).toBe('bulbasaur');
  expect(after.speciesId).toBe('ivysaur');
  expect(after.archetype).toBe('specialist');
  // §6.5.1 — the first evolution grants a passive, and the branch decides which.
  expect(after.abilityId).toBeTruthy();

  // The queue is one screen per Pokémon, so a route that levelled two of them shows two in a row.
  for (let i = 0; i < 5 && (await page.getByTestId('evolution-screen').count()) > 0; i++) {
    await page.locator('[data-testid^="branch-"]').first().click();
    await page.getByTestId('btn-evolve').click();
    await page.waitForTimeout(200);
  }
  await expect(page.getByTestId('evolution-screen')).toHaveCount(0);
  await expect(page.getByTestId('map-screen').or(page.getByTestId('swap-or-skip'))).toBeVisible();
});

test('the Dojo sells as many services as the money covers — §2.9.4', async ({ page }) => {
  await newRun(page, 'squirtle');
  await page.evaluate(() => window.__ascendant!.run.fill(4));
  await page.evaluate(() => window.__ascendant!.run.levelTo(16));
  // §2.11.4 — the Dojo is a building in the town now, not a node on the route.
  await page.evaluate(() => window.__ascendant!.run.city());
  await expect(page.getByTestId('city-screen')).toBeVisible();
  await page.getByTestId('door-dojo').click();
  await expect(page.getByTestId('dojo-screen')).toBeVisible();

  // v0.3 rationed the visit to one free service because there was no money. v0.4 restores canon: 150 ₽ a
  // tutor move, as many as you can pay for, and the wallet is the only gate.
  await page.evaluate(() => window.__ascendant!.run.pay(320));
  await expect(page.getByTestId('dojo-money')).toContainText('320');

  const poolBefore = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.pool.length);
  await page.locator('[data-testid^="tutor-"]:not([disabled])').first().click();
  await expect(page.getByTestId('dojo-money')).toContainText('170');

  // Still open for business: 170 ₽ buys another move at 150, but not an ability at 200.
  await expect(page.locator('[data-testid^="tutor-"]:not([disabled])').first()).toBeVisible();
  await expect(page.locator('[data-testid^="ability-"]').first()).toBeDisabled();

  await page.locator('[data-testid^="tutor-"]:not([disabled])').first().click();
  await expect(page.getByTestId('dojo-money')).toContainText('20');
  // Broke: every offer closes.
  await expect(page.locator('[data-testid^="tutor-"]').first()).toBeDisabled();
  await expect(page.getByTestId('btn-leave-dojo')).toContainText('Back to town');

  const poolAfter = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.pool.length);
  expect(poolAfter).toBe(poolBefore + 2);
  await page.screenshot({ path: 'playtest/run-dojo.png' });

  // §2.11.0 — the Challenge Ring's door is in here, and it says it is not open yet.
  await page.getByTestId('door-ring').click();
  await expect(page.getByTestId('door-soon')).toBeVisible();
  await page.getByTestId('btn-door-back').click();
  await expect(page.getByTestId('door-soon')).toHaveCount(0);
  // …and Escape closes it too.
  await page.getByTestId('door-ring').click();
  await expect(page.getByTestId('door-soon')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('door-soon')).toHaveCount(0);

  await page.getByTestId('btn-leave-dojo').click();
  await expect(page.getByTestId('city-screen')).toBeVisible();
});

test('a TM is greyed out on an incompatible Pokémon, never hidden', async ({ page }) => {
  await newRun(page, 'squirtle');
  await page.evaluate(() => window.__ascendant!.run.grantTm('tm05-surf', 'tm04-flamethrower'));
  await page.getByTestId('box-moves-squirtle').click();

  const manager = page.getByTestId('move-manager');
  await expect(manager).toBeVisible();
  // Surf works on a Squirtle; Flamethrower does not, and it stays on screen saying why (ui.md).
  await expect(manager.getByTestId('tm-tm05-surf')).toBeEnabled();
  await expect(manager.getByTestId('tm-tm04-flamethrower')).toBeVisible();
  await expect(manager.getByTestId('tm-tm04-flamethrower')).toBeDisabled();
  await expect(manager.getByTestId('tm-tm04-flamethrower')).toContainText('not for Squirtle');

  await manager.getByTestId('tm-tm05-surf').click();
  await expect(manager.getByTestId('move-surf')).toBeVisible();
  const mon = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!);
  expect(mon.pool).toContain('surf');
  expect(mon.moveIds).toContain('surf');
});

test('a move left in the pool is reported, not lost', async ({ page }) => {
  await newRun(page, 'bulbasaur');
  // Five known at level 10 against four slots — §6.7.2's pressure, stated on the row.
  await page.evaluate(() => window.__ascendant!.run.levelTo(10));
  await page.evaluate(() => window.__ascendant!.run.dispatch({ type: 'set-moves', uid: window.__ascendant!.run.state()!.box[0]!.uid, moveIds: window.__ascendant!.run.state()!.box[0]!.pool.slice(0, 4) }));

  const handle = page.getByTestId('box-moves-bulbasaur');
  await expect(handle).toContainText('1');
  await handle.click();
  const manager = page.getByTestId('move-manager');
  await expect(manager.locator('[data-testid^="move-"][data-in-kit="true"]')).toHaveCount(4);
  await expect(manager.locator('[data-testid^="move-"][data-in-kit="false"]')).toHaveCount(1);
  // At the cap, an unequipped card is locked rather than silently swapping something out.
  await expect(manager.locator('[data-testid^="move-"][data-in-kit="false"]').first()).toBeDisabled();
  await page.screenshot({ path: 'playtest/run-move-manager.png' });
});

import { expect, test, type Page } from '@playwright/test';

// §2.12 — Victory Road on the screen: its map (a cave road, the Summit at its end), the Training Grounds (one
// Pokémon, one upgrade), and the Summit (everyone healed, a Legendary relic, the gate). Screenshots to
// playtest/victory-road-*.png.

/** A run of three on Victory Road's map. */
async function onVictoryRoad(page: Page) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    a.run.fill(3);
    a.run.victoryRoad();
  });
  await expect(page.getByTestId('map-screen')).toBeVisible();
}

/** Walk into the first node of a kind (made the only reachable one) and through its preview. */
async function stopAt(page: Page, kind: string) {
  await page.evaluate((kind) => {
    const a = window.__ascendant!;
    a.run.patch((d) => {
      d.reachable = [Object.values(d.map.nodes).find((n) => n.kind === kind)!.id];
    });
    a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
    a.run.dispatch({ type: 'begin-combat' });
  }, kind);
}

test.describe('Victory Road — §2.12', () => {
  test('the map names itself and ends at the Summit', async ({ page }) => {
    await onVictoryRoad(page);
    await expect(page.getByRole('heading', { name: 'Victory Road' })).toBeVisible();
    await expect(page.getByTestId('fork-banner')).toHaveCount(0);
    await expect(page.locator('[data-kind="summit"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="route-board"][data-painted]')).toBeVisible();
    // The whole board fits its window, so there is no scroll position for the strip to show.
    await expect(page.getByTestId('route-strip')).toBeHidden();
    await page.getByTestId('map-screen').screenshot({ path: 'playtest/victory-road-map.png' });
  });

  test('the Training Grounds: one Pokémon, one upgrade, and the road', async ({ page }) => {
    await onVictoryRoad(page);
    await stopAt(page, 'training');
    await expect(page.getByTestId('training-screen')).toBeVisible();
    const train = page.getByTestId('btn-train');
    await expect(train).toBeDisabled();

    const uid = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.uid);
    const attack = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0);
    await page.getByTestId(`train-mon-${uid}`).click();
    await page.getByTestId('train-upgrade-stat').click();
    await expect(train).toBeDisabled();
    await page.getByTestId('train-stat-attack').click();
    await expect(train).toBeEnabled();
    await page.getByTestId('training-screen').screenshot({ path: 'playtest/victory-road-training.png' });

    await train.click();
    await expect(page.getByTestId('training-screen')).toBeHidden();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0);
    expect(after).toBeGreaterThan(attack);
    // The Box card says it was trained.
    await expect(page.getByTestId('box-boost-squirtle')).toBeVisible();
  });

  test('the Summit heals everyone, and its relic pick is the gate', async ({ page }) => {
    await onVictoryRoad(page);
    await page.evaluate(() => window.__ascendant!.run.patch((d) => { d.box[1]!.hp = 1; }));
    await stopAt(page, 'summit');
    await expect(page.getByTestId('summit-screen')).toBeVisible();
    const hurt = await page.evaluate(() => {
      const m = window.__ascendant!.run.state()!.box[1]!;
      return m.hp;
    });
    expect(hurt).toBeGreaterThan(1);
    await expect(page.locator('[data-testid^="summit-offer-"]')).not.toHaveCount(0);
    await page.getByTestId('summit-screen').screenshot({ path: 'playtest/victory-road-summit.png' });

    await page.getByTestId('btn-decline-summit-relic').click();
    await expect.poll(() => page.evaluate(() => window.__ascendant!.run.state()?.outcome ?? null)).toBe('victory');
  });
});

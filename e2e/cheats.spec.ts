import { expect, test, type Page } from '@playwright/test';

// The secret playtest menu: typed (`rarecandy`), never shown. It reaches a state fast — a town, a level, a won
// fight — by writing the stores directly, so none of it touches the account.

async function freshRun(page: Page): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(() => window.__ascendant!.run.new('squirtle', 7));
  await page.evaluate(() => window.__ascendant!.goTo('map'));
  await expect(page.getByTestId('map-screen')).toBeVisible();
}

test.describe('The playtest menu', () => {
  test('typing the code opens it; it travels, levels, heals and pays, and the account is left alone', async ({ page }) => {
    await freshRun(page);
    await expect(page.getByTestId('cheat-menu')).toHaveCount(0);
    await page.keyboard.type('rarecandy');
    await expect(page.getByTestId('cheat-menu')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'playtest/cheat-menu.png' });

    const before = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.level);
    await page.getByTestId('cheat-level-5').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.level)).toBe(before + 5);

    await page.evaluate(() => window.__ascendant!.run.trauma(3));
    await page.getByTestId('cheat-trauma').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.traumaStacks)).toBe(0);

    const money = await page.evaluate(() => window.__ascendant!.run.state()!.money);
    await page.getByTestId('cheat-money').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(money + 1000);

    // Not in a fight: says so rather than doing something odd.
    await page.getByTestId('cheat-win').click();
    await expect(page.getByTestId('cheat-menu')).toContainText('Not from here');

    const xp = await page.evaluate(() => window.__ascendant!.meta.account().xp);
    await page.getByTestId('cheat-pallet').click();
    await page.getByTestId('cheat-close').click();
    await expect(page.getByTestId('city-screen')).toHaveAttribute('data-city', 'pallet-town');
    expect(await page.evaluate(() => window.__ascendant!.meta.account().xp)).toBe(xp);

    // Escape closes the menu and stops there: the town's pause menu does not open behind it.
    await page.keyboard.type('rarecandy');
    await expect(page.getByTestId('cheat-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('cheat-menu')).toHaveCount(0);
    await expect(page.getByTestId('pause-menu')).toHaveCount(0);
  });

  test('in a fight, Win this fight ends it as a victory and the reward follows', async ({ page }) => {
    await freshRun(page);
    // Stand in front of a wild node and walk in through its preview, as a player would.
    await page.evaluate(() => {
      const dev = window.__ascendant!;
      dev.run.jump('wild');
      dev.run.dispatch({ type: 'enter-node', nodeId: dev.run.state()!.reachable[0]! });
    });
    await page.getByTestId('btn-enter-node').click();
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    // The code has an e in it, and E ends a turn in a fight: typing it must not.
    const turn = await page.getByTestId('combat-screen').getAttribute('data-turn');
    await page.keyboard.type('rarecandy');
    await expect(page.getByTestId('cheat-menu')).toBeVisible();
    await expect(page.getByTestId('combat-screen')).toHaveAttribute('data-turn', turn!);
    await page.getByTestId('cheat-win').click();
    await page.getByTestId('cheat-close').click();
    await expect(page.getByTestId('combat-screen')).toHaveAttribute('data-outcome', 'victory');
  });
});

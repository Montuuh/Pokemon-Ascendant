import { expect, test, type Page } from '@playwright/test';

// v0.7.2 — the city: the Challenge Ring (§2.9.4.1; its own building since v0.7.7), its prize, the Game Corner (§2.11.5) and the Department
// Store's floors (§2.11.2), each driven through the real reducers via the dev hook and then through the UI.

async function inCity(page: Page, cityIndex: 0 | 1, money = 2000): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(([i, m]) => {
    const dev = window.__ascendant!;
    dev.run.new('squirtle', 7);
    dev.run.fill(3);
    for (const mon of dev.run.state()!.box) dev.run.levelTo(30, mon.uid);
    dev.run.city(i as 0 | 1);
    dev.run.pay(m as number);
  }, [cityIndex, money] as const);
  await expect(page.getByTestId('city-screen')).toBeVisible();
}

test.describe('The Ring and the Coliseum — §2.9.4.1', () => {
  test('the Ring is a building in the square: the ladder on show, the fee on the button, a rung a real fight', async ({ page }) => {
    await inCity(page, 0, 1000);
    await expect(page.getByTestId('door-ring')).toContainText('Challenge Ring');
    // The town's art, loaded, with the Ring in the square where the court was.
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: 'playtest/city-pallet-ring.png' });
    await page.getByTestId('door-ring').click();
    await expect(page.getByTestId('ring-screen')).toBeVisible();
    // Nothing is paid yet: the ladder and the first rival are there to be looked at first.
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(1000);
    await expect(page.getByTestId('ring-ladder').locator('li')).toHaveCount(2);
    await expect(page.getByTestId('ring-rival').locator('li')).toHaveCount(3);
    await expect(page.getByTestId('btn-ring-enter')).toContainText('250');
    await page.screenshot({ path: 'playtest/ring-entry.png' });
    await page.getByTestId('btn-ring-enter').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(750);
    await expect(page.getByTestId('ring-banked')).toContainText('0');
    await expect(page.getByTestId('ring-rung-0')).toHaveAttribute('data-state', 'next');
    await page.screenshot({ path: 'playtest/ring.png' });

    await page.getByTestId('btn-ring-fight').click();
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.evaluate(() => window.__ascendant!.auto(999));
    await page.getByTestId('btn-continue-run').click();
    // Won: back on the ladder with 300 banked. Lost: back in town, the ladder gone — never the run.
    await expect(page.getByTestId('ring-screen').or(page.getByTestId('city-screen'))).toBeVisible();
    if (await page.getByTestId('ring-screen').isVisible()) await expect(page.getByTestId('ring-banked')).toContainText('300');
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.outcome)).toBe('in-progress');
  });

  test('walking back out before paying costs nothing; walking away after asks first and shuts it', async ({ page }) => {
    await inCity(page, 0, 1000);
    await page.getByTestId('door-ring').click();
    await page.getByTestId('btn-leave-ring').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
    await page.getByTestId('door-ring').click();
    await page.getByTestId('btn-ring-enter').click();
    await page.getByTestId('btn-ring-cash-out').click();
    await expect(page.getByTestId('confirm-leave')).toBeVisible();
    await page.screenshot({ path: 'playtest/ring-leave-warning.png' });
    await page.getByTestId('btn-leave-stay').click();
    await expect(page.getByTestId('confirm-leave')).toBeHidden();
    await page.getByTestId('btn-ring-cash-out').click();
    await page.getByTestId('btn-leave-confirm').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
    await page.getByTestId('door-ring').click();
    await expect(page.getByTestId('ring-closed')).toBeVisible();
    await expect(page.getByTestId('btn-ring-enter')).toHaveCount(0);
  });

  test('the fee the wallet cannot cover says so on the button', async ({ page }) => {
    await inCity(page, 0, 100);
    await page.getByTestId('door-ring').click();
    await expect(page.getByTestId('btn-ring-enter')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('btn-ring-enter')).toHaveAttribute('aria-label', /not enough money/);
    // Pressing it anyway pays nothing and steps nowhere (Playwright holds back from aria-disabled; a player does not).
    await page.getByTestId('btn-ring-enter').click({ force: true });
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.city!.ring!.entered)).toBe(false);
  });

  test('Celadon City has the Pokémon Coliseum, three rungs high', async ({ page }) => {
    await inCity(page, 1, 1000);
    await expect(page.getByTestId('door-ring')).toContainText('Pokémon Coliseum');
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: 'playtest/city-celadon-coliseum.png' });
    await page.getByTestId('door-ring').click();
    await expect(page.getByTestId('ring-screen')).toContainText('Pokémon Coliseum');
    await expect(page.getByTestId('ring-ladder').locator('li')).toHaveCount(3);
  });

  async function climbToThePrize(page: Page): Promise<void> {
    await inCity(page, 0, 1000);
    // Win both rungs through the reducer: these tests are about the prize, not the fights.
    await page.evaluate(() => {
      const dev = window.__ascendant!;
      dev.run.dispatch({ type: 'enter-building', building: 'ring' });
      dev.run.dispatch({ type: 'enter-ring' });
      for (let i = 0; i < 2; i++) {
        dev.run.dispatch({ type: 'ring-fight' });
        const s = dev.run.state()!;
        dev.run.dispatch({ type: 'finish-combat', report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: s.balls, turns: 5 } });
      }
      dev.goTo('map');
    });
    await expect(page.getByTestId('ring-prize-screen')).toBeVisible();
  }

  test('the top rung opens a relic 1-of-3, and taking one pays the ladder out', async ({ page }) => {
    await climbToThePrize(page);
    await page.screenshot({ path: 'playtest/ring-prize.png' });
    await page.locator('[data-testid^="ring-prize-"]').first().click();
    await page.getByTestId('btn-take-prize').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
    const run = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(run.money).toBe(1000 - 250 + 300);
    expect(run.relics).toHaveLength(1);
  });

  test('leaving all three is an answer, and the ladder still pays out', async ({ page }) => {
    await climbToThePrize(page);
    await page.getByTestId('btn-decline-prize').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
    const run = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(run.money).toBe(1000 - 250 + 300);
    expect(run.relics).toHaveLength(0);
  });
});

test.describe('The Game Corner — §2.11.5', () => {
  test('the Wheel and the Slots take their stake, show their result, and print their odds', async ({ page }) => {
    await inCity(page, 1, 1000);
    await page.getByTestId('door-game-corner').click();
    await expect(page.getByTestId('game-corner-screen')).toBeVisible();
    await expect(page.getByTestId('machine-wheel')).toContainText('66 %');
    await expect(page.getByTestId('machine-slots')).toContainText('0.4 %');

    await page.getByTestId('stake-up').click();
    await page.getByTestId('stake-up').click();
    await page.getByTestId('stake-down').click();
    await expect(page.getByTestId('wheel-stake')).toContainText('60');
    await page.getByTestId('btn-spin').click();
    const wheel = await page.evaluate(() => window.__ascendant!.run.state()!.city!.casino.wheel!);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(1000 - 60 + wheel.payout);
    // The result lands with the wheel, and so does the wallet.
    await expect(page.getByTestId('wheel-result')).toContainText(`×${wheel.multiplier}`);
    await expect(page.getByTestId('casino-money')).toContainText((1000 - 60 + wheel.payout).toLocaleString('en-GB'));

    await expect(page.getByTestId('slot-reels').getByRole('img')).toHaveCount(3);
    await page.getByTestId('btn-pull').click();
    const slots = await page.evaluate(() => window.__ascendant!.run.state()!.city!.casino.slots!);
    await expect(page.getByTestId('slots-result')).toContainText(slots.multiplier ? `×${slots.multiplier}` : 'Nothing lines up');
    // The Wheel's result is still on the Wheel after a pull.
    await expect(page.getByTestId('wheel-result')).toContainText(`×${wheel.multiplier}`);
    await page.waitForTimeout(2600);
    await page.screenshot({ path: 'playtest/game-corner.png' });

    await page.getByTestId('btn-leave-game-corner').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
  });
});

test.describe('The Department Store — §2.11.2', () => {
  test('floors are tabs, each its own shelf, and a re-roll restocks the floor on screen', async ({ page }) => {
    await inCity(page, 1, 3000);
    await page.getByTestId('door-department-store').click();
    await expect(page.getByTestId('store-floors')).toBeVisible();
    for (const f of ['consumables', 'tms', 'held-items', 'relics', 'rare']) await expect(page.getByTestId(`floor-${f}`)).toBeVisible();
    // The lift buttons are real tabs: an arrow key moves to the next floor and shows it.
    await page.getByTestId('floor-consumables').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('floor-tms')).toHaveAttribute('data-state', 'active');
    await page.getByTestId('floor-relics').click();
    const others = await page.evaluate(() => window.__ascendant!.run.state()!.pendingShop!.slots.filter((s) => s.floor !== 'relics').map((s) => s.id));
    await page.getByTestId('btn-reroll').click();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!.pendingShop!.slots.filter((s) => s.floor !== 'relics').map((s) => s.id));
    expect(after).toEqual(others);
    await page.screenshot({ path: 'playtest/department-store.png' });
  });
});

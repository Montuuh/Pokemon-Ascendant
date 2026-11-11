import { expect, test, type Page } from '@playwright/test';

// §2.7 — a fight's opening line holds the battle ticker on turn 1 and gives way at the first thing you do; the line
// fits the ticker whole, even at 1280×720 in a Gym whose rule chips leave it least room. Screenshots to
// playtest/trainer-opening*.png.

async function enter(page: Page, kind: 'trainer' | 'gym') {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?screen=menu&seed=7');
  await page.waitForFunction(() => !!window.__ascendant);
  const id = await page.evaluate((k) => {
    const d = window.__ascendant!;
    d.run.new('squirtle', 7);
    d.run.jump(k);
    d.goTo('map');
    return d.run.state()!.reachable[0]!;
  }, kind);
  await page.getByTestId(`node-${id}`).click();
  await page.getByTestId('btn-enter-node').click();
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  return page.evaluate(() => window.__ascendant!.state()!.opening!);
}

const pinned = (page: Page) => page.getByTestId('log-ticker').locator('[data-pinned]');

test('TrainerFight_Opens_TickerHoldsItsLineUntilTheFirstMove — §2.7', async ({ page }) => {
  const line = await enter(page, 'trainer');
  expect(line.length).toBeGreaterThan(0);
  await expect(pinned(page)).toHaveText(`“${line}”`);
  await page.screenshot({ path: 'playtest/trainer-opening.png' });
  await page.evaluate(() => window.__ascendant!.auto(1));
  await expect(pinned(page)).toHaveCount(0);
  await expect(page.getByTestId('log-ticker')).not.toContainText(line);
});

test('GymFight_At720_OpeningLineFitsTheTickerWhole — §2.7', async ({ page }) => {
  const line = await enter(page, 'gym');
  await expect(pinned(page)).toHaveText(`“${line}”`);
  const cut = await pinned(page).evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(cut, 'the opening line is cut off by the ticker').toBe(false);
  await page.screenshot({ path: 'playtest/trainer-opening-gym-720.png' });
});

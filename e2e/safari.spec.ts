import { expect, test, type Page } from '@playwright/test';

// v0.7.6 — the Safari Zone (§2.11.6): the door, the ticket, today's lineup, and the stalk on its board, driven
// through the UI; the throw's odds and the Pokémon's plan are the sim's, so the screen is checked against them.

async function inTown(page: Page, cityIndex: 0 | 1 = 0, money = 2000, guide = false): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  // The How to play opens by itself on a first visit; these tests are about the park, so it has been read.
  if (!guide) await page.evaluate(() => window.localStorage.setItem('ascendant.safari-guide-seen', '1'));
  await page.evaluate(([i, m]) => {
    const dev = window.__ascendant!;
    dev.run.new('squirtle', 7);
    dev.run.fill(3);
    dev.run.city(i as 0 | 1);
    dev.run.pay(m as number);
  }, [cityIndex, money] as const);
  await expect(page.getByTestId('city-screen')).toBeVisible();
}

test.describe('The Safari Zone — §2.11.6', () => {
  test('How to play opens by itself on the first visit, steps through its pages, and comes back from its button', async ({ page }) => {
    await inTown(page, 0, 1000, true);
    await page.getByTestId('door-safari').click();
    await expect(page.getByTestId('safari-guide')).toBeVisible();
    await expect(page.getByTestId('safari-guide-page-0')).toBeVisible();
    for (let i = 1; i < 6; i++) {
      await page.getByTestId('btn-guide-next').click();
      await expect(page.getByTestId(`safari-guide-page-${i}`)).toBeVisible();
      if (i === 4) await page.screenshot({ path: 'playtest/safari-guide.png' });
    }
    await page.getByTestId('btn-guide-next').click();
    await expect(page.getByTestId('safari-guide')).toHaveCount(0);
    // Read once: leaving and coming back does not open it again, but the button does.
    await page.getByTestId('btn-leave-safari').click();
    await page.getByTestId('door-safari').click();
    await expect(page.getByTestId('safari-guide')).toHaveCount(0);
    await page.getByTestId('btn-safari-help').click();
    await expect(page.getByTestId('safari-guide-page-0')).toBeVisible();
    await page.getByTestId('btn-guide-back').click();
    await expect(page.getByTestId('safari-guide')).toHaveCount(0);
  });

  test('the lineup is on show before the ticket, and the ticket buys the balls and the clock', async ({ page }) => {
    await inTown(page, 0, 1000);
    await page.getByTestId('door-safari').click();
    await expect(page.getByTestId('safari-screen')).toBeVisible();
    await expect(page.getByTestId('safari-lineup').getByRole('listitem')).toHaveCount(3);
    await expect(page.getByTestId('safari-spot-2')).toHaveAttribute('data-tier', 'rare');
    // No stalking before the ticket.
    await expect(page.getByTestId('btn-stalk-0')).toHaveCount(0);
    await page.screenshot({ path: 'playtest/safari.png' });

    await page.getByTestId('btn-safari-ticket').click();
    await expect(page.getByTestId('safari-balls')).toContainText('3');
    await expect(page.getByTestId('safari-clock')).toContainText('10');
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(800);
  });

  test('a stalk: the board shows its sight and path, a step is a click, and the throw prints its odds', async ({ page }) => {
    await inTown(page, 0, 1000);
    await page.getByTestId('door-safari').click();
    await page.getByTestId('btn-safari-ticket').click();
    await page.getByTestId('btn-stalk-0').click();
    await expect(page.getByTestId('safari-board')).toBeVisible();
    // The throw is out of reach from the entrance — off, but its bubble still says why.
    await expect(page.getByTestId('btn-safari-throw')).toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('btn-safari-throw').hover();
    await expect(page.getByRole('tooltip')).toContainText('Out of reach');
    // Every tile says whether it would be seen there, and the Bait button has its door.
    expect(await page.getByTestId('safari-board').locator('[data-seen]').count()).toBeGreaterThan(40);
    await page.getByTestId('btn-mode-bait').hover();
    await expect(page.getByRole('tooltip')).toContainText('eats for two turns');

    // Walk: click a highlighted tile.
    const before = await page.evaluate(() => window.__ascendant!.run.state()!.city!.safari!.hunt!.player);
    await page.getByTestId('safari-board').getByRole('button').first().click();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!.city!.safari!.hunt!.player);
    expect(after).not.toEqual(before);

    // Stand it behind the Pokémon, unseen, and the button reads the sim's own chance.
    await page.evaluate(() => {
      const dev = window.__ascendant!;
      const s = dev.run.state()!;
      const h = s.city!.safari!.hunt!;
      const f = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[h.facing]!;
      dev.run.patch((d) => {
        const hunt = d.city!.safari!.hunt!;
        hunt.tiles = hunt.tiles.replace(/[rw]/g, 'g');
        hunt.player = [h.mon[0] - f[0]!, h.mon[1] - f[1]!];
        hunt.ap = 2;
      });
    });
    await expect(page.getByTestId('btn-safari-throw')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('btn-safari-throw')).toContainText('%');
    await page.screenshot({ path: 'playtest/safari-stalk.png' });

    await page.getByTestId('btn-safari-throw').click();
    const result = await page.evaluate(() => window.__ascendant!.run.state()!.city!.safari!);
    expect(result.balls).toBe(2);
    // A miss is an alarm, on the temper pips and in the line under the buttons.
    if (result.hunt) {
      await expect(page.getByTestId('safari-alarms')).toHaveAttribute('data-alarms', '1');
      await expect(page.getByTestId('safari-last-throw')).toContainText('broke out');
    }
  });

  test('standing in its sight is flagged before the turn ends', async ({ page }) => {
    await inTown(page, 0, 1000);
    await page.getByTestId('door-safari').click();
    await page.getByTestId('btn-safari-ticket').click();
    await page.getByTestId('btn-stalk-0').click();
    await expect(page.getByTestId('safari-exposed')).toHaveAttribute('data-on', 'no');
    // Put the player on open ground right in front of it.
    await page.evaluate(() => {
      window.__ascendant!.run.patch((d) => {
        const h = d.city!.safari!.hunt!;
        const f = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[h.facing]!;
        h.held = true;
        h.player = [h.mon[0] + f[0]!, h.mon[1] + f[1]!];
        const i = h.player[1] * h.width + h.player[0];
        h.tiles = h.tiles.slice(0, i) + 'o' + h.tiles.slice(i + 1);
      });
    });
    await expect(page.getByTestId('safari-exposed')).toHaveAttribute('data-on', 'yes');
  });

  test('backing away asks once, then the Pokémon is gone for the visit', async ({ page }) => {
    await inTown(page, 1, 1000);
    await page.getByTestId('door-safari').click();
    await expect(page.getByTestId('safari-lineup').getByRole('listitem')).toHaveCount(4);
    await page.getByTestId('btn-safari-ticket').click();
    await page.getByTestId('btn-stalk-1').click();
    await page.getByTestId('btn-safari-retreat').click();
    await expect(page.getByTestId('safari-board')).toBeVisible();
    await expect(page.getByTestId('btn-safari-retreat')).toContainText('Sure?');
    await page.getByTestId('btn-safari-retreat').click();
    await expect(page.getByTestId('safari-result-1')).toContainText('Left');
    await page.getByTestId('btn-leave-safari').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
    // Once per visit.
    await page.getByTestId('door-safari').click();
    await expect(page.getByTestId('btn-stalk-0')).toHaveCount(0);
  });
});

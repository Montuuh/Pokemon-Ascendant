import { expect, test } from '@playwright/test';

// docs/release-doctrine.md — What's new: CHANGELOG.md as a page, reached from the version on the main menu. A
// version is as loud as its level (a minor's banner outsizes a patch's card), and the menu's dot goes out once
// the page has been read.

test.describe("What's new — the release doctrine", () => {
  test('the menu version opens the changelog, a minor outsizes its patches, and reading it clears the dot', async ({ page }) => {
    await page.goto('/?screen=menu');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/?screen=menu');

    // A browser that has never read it sees the dot.
    const door = page.getByTestId('btn-changelog');
    await expect(door).toHaveAttribute('data-unread', 'true');
    await expect(door).toContainText(/^v\d+\.\d+\.\d+/);
    await door.click();
    await expect(page.getByTestId('changelog-screen')).toBeVisible();
    await expect(page.getByTestId('changelog-version')).toHaveText(/^v\d+\.\d+\.\d+$/);
    // What reached the game since the last version sits apart, in a box of its own, while there is any.
    if (await page.getByTestId('changelog-next').count()) await expect(page.getByTestId('changelog-next')).toContainText('New since v');

    // Every version from the first; the newest minor is open with its newest patch, the rest are closed.
    await expect(page.getByTestId('changelog-v0.1')).toBeVisible();
    await expect(page.getByTestId('changelog-v0.7')).toHaveAttribute('data-level', 'minor');
    await expect(page.getByTestId('changelog-v0.7.3')).toHaveAttribute('data-level', 'patch');
    await expect(page.getByTestId('changelog-v0.7.3')).toContainText('Coastal Cliffs');
    // D10 — dates in the game's language whatever the browser's.
    await expect(page.getByTestId('changelog-v0.7.3')).toContainText('23 Sep 2026');
    // The outline follows the sizes: a minor is a heading one level above its patches.
    await expect(page.getByTestId('changelog-v0.7').locator('h2')).toHaveCount(1);
    await expect(page.getByTestId('changelog-v0.7.3').locator('h3')).toHaveCount(1);
    await expect(page.getByTestId('changelog-v0.1')).not.toContainText('Your party is your deck');

    // R1 — size by level: the minor's number is bigger than its patch's.
    const size = (id: string, sel: string) =>
      page.getByTestId(id).locator(sel).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const minor = await size('changelog-v0.7', 'span.display.tabular');
    const patch = await size('changelog-v0.7.3', 'span.display.tabular');
    expect(minor).toBeGreaterThan(patch * 2);

    // A closed version opens on a click and says what it added.
    await page.getByTestId('changelog-v0.1').getByRole('button').first().click();
    await expect(page.getByTestId('changelog-v0.1')).toContainText('Your party is your deck');
    await page.getByTestId('changelog-v0.1').getByRole('button').first().click();
    await page.evaluate(() => document.querySelector('[data-testid="changelog-screen"]')?.scrollTo(0, 0));
    await page.screenshot({ path: 'playtest/changelog.png' });

    // Read: back on the menu, the dot is gone.
    await page.getByTestId('btn-changelog-back').click();
    await expect(page.getByTestId('btn-changelog')).toHaveAttribute('data-unread', 'false');

    // The other door: About's version pill, and the way back is About.
    await page.getByTestId('btn-about').click();
    await page.getByTestId('about-version').click();
    await expect(page.getByTestId('changelog-screen')).toBeVisible();
    await expect(page.getByTestId('btn-changelog-back')).toHaveText(/About/);
    await page.getByTestId('btn-changelog-back').click();
    await expect(page.getByTestId('about-screen')).toBeVisible();
  });
});

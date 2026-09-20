import { expect, test, type Page } from '@playwright/test';

// §8.4 / §8.7 / §9.6 — the three v0.5 screens that live outside a run: the Hub with its PC Terminal, the
// medals it shows, and the settings that have to survive a reload.

async function menu(page: Page): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
}

test.describe('The Trainer Hub — §8.4', () => {
  test('the PC Terminal lists every medal, and the locked kiosks say what opens them', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-hub').click();
    await expect(page.getByTestId('hub-screen')).toBeVisible();

    // §8.7 — ten rows, all of them visible, none of them earned on a fresh account.
    await expect(page.locator('[data-testid^="achievement-"]')).toHaveCount(10);
    await expect(page.getByTestId('hub-achievement-count')).toContainText('0 / 10');

    // §8.7.3 — a hidden row keeps its description and says so.
    await expect(page.getByTestId('achievement-full-house')).toContainText('???');
    await expect(page.getByTestId('achievement-full-house')).toContainText('hidden');

    // §8.4.1 — the PC Terminal is open and the other four are not, each naming what it waits on (§7.7).
    await expect(page.getByTestId('kiosk-pc')).toBeEnabled();
    for (const id of ['card', 'mart', 'daycare', 'door']) {
      await expect(page.getByTestId(`kiosk-${id}`)).toBeDisabled();
    }
    await expect(page.getByTestId('kiosk-card')).toContainText('v0.6');
    await page.screenshot({ path: 'playtest/hub.png' });
  });

  test('a medal earned in a run is still there on the next visit', async ({ page }) => {
    await menu(page);
    // §8.7 — the record is the account's, not the run's: it has to outlive the run save.
    await page.evaluate(() => {
      const e = (window as unknown as { __ascendant: Record<string, never> }).__ascendant;
      (e as unknown as { meta: { record: (events: unknown[]) => void } }).meta.record([
        { t: 'combat-end', outcome: 'victory', kind: 'wild', damageTaken: 4, manualSwaps: 0, faints: 0 },
      ]);
    });
    await page.getByTestId('btn-hub').click();
    await expect(page.getByTestId('achievement-first-blood')).toContainText('Earned');
    await expect(page.getByTestId('hub-achievement-count')).toContainText('1 / 10');

    // A reload is the real test: this lives in its own storage key, beside the run save and not inside it.
    await page.reload();
    await page.goto('/?screen=hub');
    await expect(page.getByTestId('achievement-first-blood')).toContainText('Earned');
  });
});

test.describe('Settings — §9.6', () => {
  test('text size scales the whole game and survives a reload', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-settings').click();
    await expect(page.getByTestId('settings-screen')).toBeVisible();

    const sampleSize = async () =>
      parseFloat(await page.getByTestId('settings-sample').evaluate((el) => getComputedStyle(el).fontSize));

    const normal = await sampleSize();
    await page.getByTestId('text-scale-150').click();
    const largest = await sampleSize();
    expect(largest).toBeGreaterThan(normal * 1.4);
    await page.screenshot({ path: 'playtest/settings-150.png' });

    // §9.6 — the layouts were built to hold at 150 %, so the menu behind it must still fit on screen.
    await page.getByTestId('btn-settings-back').click();
    await expect(page.getByTestId('main-menu')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'the menu overflows horizontally at 150 % text').toBeLessThanOrEqual(1);

    // It is a setting, so it has to be there next time.
    await page.reload();
    await page.goto('/?screen=settings');
    await expect(page.getByTestId('text-scale-150')).toHaveAttribute('aria-pressed', 'true');
    expect(await sampleSize()).toBeGreaterThan(normal * 1.4);
  });

  test('the motion override writes the attribute the stylesheet reads', async ({ page }) => {
    await menu(page);
    await page.goto('/?screen=settings');
    await page.getByTestId('motion-reduced').click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.getByTestId('motion-full').click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
    // "System" removes it entirely rather than writing a third value, so the media query is back in charge.
    await page.getByTestId('motion-system').click();
    expect(await page.locator('html').getAttribute('data-motion')).toBeNull();
  });
});

test('a save written before the rename is carried onto the new key', async ({ page }) => {
  // §10.8 — the project was renamed on 2026-09-20 and the localStorage keys moved with it. This is the real
  // browser doing what `storageKeys.test.ts` proves in isolation: a player who updates mid-run keeps it.
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('evoline.achievements.v1', JSON.stringify({ counts: { 'first-blood': 1 }, species: ['pidgey'], winStreak: 2, unlocked: ['first-blood'] }));
    localStorage.setItem('evoline.settings.v1', JSON.stringify({ textScale: 1.25, motion: 'reduced' }));
  });
  await page.goto('/?screen=hub');

  // The medal survived the rename, under the new key, and the old one is gone.
  await expect(page.getByTestId('achievement-first-blood')).toContainText('Earned');
  const keys = await page.evaluate(() => ({
    newAch: localStorage.getItem('ascendant.achievements.v1'),
    oldAch: localStorage.getItem('evoline.achievements.v1'),
    newSet: localStorage.getItem('ascendant.settings.v1'),
  }));
  expect(keys.newAch).toContain('first-blood');
  expect(keys.oldAch, 'the pre-rename key should be cleared once it is carried').toBeNull();
  expect(keys.newSet).toContain('1.25');

  // And the setting it carried is actually in force, not merely stored.
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
});

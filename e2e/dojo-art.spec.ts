import { expect, test, type Page } from '@playwright/test';

async function waitForArt(page: Page) {
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
}

async function openDojo(page: Page, cityIndex: 0 | 1 = 0) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate((city) => {
    const d = window.__ascendant!;
    d.run.new('squirtle', 7);
    d.run.fill(4);
    d.run.levelTo(16);
    d.run.city(city);
    d.run.pay(1000);
  }, cityIndex);
  await page.getByTestId('door-dojo').click();
  await expect(page.getByTestId('dojo-room')).toBeVisible();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
  );
}

for (const [width, height] of [
  [1280, 720],
  [1920, 1080],
] as const) {
  test(`Dojo FRLG room, visual previews and accessible deck comparison at ${height}p`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openDojo(page);
    const scale = Number(await page.getByTestId('dojo-room').getAttribute('data-scale'));
    expect(scale * 2).toBe(Math.floor(scale * 2));
    expect(scale).toBeGreaterThanOrEqual(1.5);
    expect(
      await page
        .getByTestId('dojo-screen')
        .evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight),
    ).toBe(true);
    const room = page.getByTestId('dojo-room').locator('img').first();
    await expect(room).toHaveAttribute('src', /art\/dojo\/training-room.png/);
    await expect(room).toHaveCSS('image-rendering', 'pixelated');
    await expect(page.getByTestId('dojo-room').locator('img[src$="/pokemon/squirtle.png"]')).toBeVisible();
    await expect(page.getByTestId('dojo-room').locator('img[src$="/substitute.png"]')).toBeVisible();
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `playtest/a08-a09/dojo-v2/dojo-${height}.png` });

    await page.getByTestId('dojo-master').hover();
    await expect(page.getByRole('tooltip')).toContainText('Tutor moves');
    await page.getByTestId('dojo-scrolls').focus();
    await expect(page.getByRole('tooltip')).toContainText('Egg moves');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('dojo-tab-eggs')).toHaveAttribute('data-state', 'active');
    await waitForArt(page);
    await expect(page.getByTestId('dojo-room').locator('img[src$="/egg.png"]')).toBeVisible();
    await expect(page.getByTestId('dojo-room').locator('img[src$="/substitute.png"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `playtest/a08-a09/dojo-v2/eggs-${height}.png` });
    await page.keyboard.press('Escape');
    await page.getByTestId('dojo-master').click();
    await expect(page.getByTestId('dojo-tutor')).toBeVisible();

    const previews = page.locator('[data-testid^="dojo-preview-tutor-"]');
    const target = previews.last();
    const name = (await target.getAttribute('aria-label'))!.replace('Preview move: ', '');
    const before = await page.evaluate(() => window.__ascendant!.run.state()!.money);
    await target.focus();
    await page.keyboard.press('Enter');
    await expect(target).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('dojo-room').locator('img[src*="/dojo/effects/"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(before);
    await page.getByTestId('dojo-deck').click();
    await expect(page.getByTestId('dojo-comparison')).toContainText(name);
    await expect(page.getByTestId('move-manager')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Active 4', exact: true })).toContainText('/4');
    await page.mouse.move(0, 0);
    await waitForArt(page);
    await page.screenshot({ path: `playtest/a08-a09/dojo-v2/deck-${height}.png` });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dojo-deck-dialog')).toHaveCount(0);
    await expect(page.getByTestId('dojo-deck')).toBeFocused();
    await page.getByTestId('dojo-deck').click();
    await page.getByTestId('dojo-deck-close').click();
    await expect(page.getByTestId('dojo-deck-dialog')).toHaveCount(0);
    await expect(page.getByTestId('dojo-deck')).toBeFocused();
    await page.getByTestId('dojo-pick-pidgey').click();
    await expect(page.getByTestId('dojo-pick-pidgey')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('dojo-room').locator('img[src$="/pokemon/pidgey.png"]')).toBeVisible();
    await page.evaluate(() =>
      window.__ascendant!.run.patch((d) => {
        d.box.find((m) => m.speciesId === 'pidgey')!.shiny = true;
      }),
    );
    await expect(
      page.getByTestId('dojo-room').locator('img[src$="/pokemon/pidgey-shiny.png"]'),
    ).toBeVisible();
  });
}

test('Dojo buys into the pool, keeps known and unaffordable previews, and names the Bond lock', async ({
  page,
}) => {
  await openDojo(page);
  const offer = page.locator('[data-testid^="tutor-"]:not([disabled])').first();
  const id = (await offer.getAttribute('data-testid'))!.replace('tutor-', '');
  const before = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.pool.length);
  await offer.click();
  await expect(page.getByTestId(`tutor-${id}`)).toBeDisabled();
  await expect(page.getByTestId(`tutor-${id}`)).toContainText('already known');
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.pool.length)).toBe(before + 1);
  await page.evaluate(() => window.__ascendant!.run.pay(0));
  const previews = page.locator('[data-testid^="dojo-preview-tutor-"]');
  await expect(page.getByTestId(`dojo-preview-tutor-${id}`)).toBeEnabled();
  await expect(page.locator('[data-testid^="tutor-"]:not([disabled])')).toHaveCount(0);
  await previews.last().focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByTestId('dojo-pick-pidgey').click();
  await page.getByTestId('dojo-apprentice').click();
  const locked = page.locator('[data-testid^="ability-"][data-locked="true"]');
  await expect(locked).toBeDisabled();
  await expect(locked).toContainText('locked');
  await locked.locator('..').focus();
  await expect(page.getByRole('tooltip')).toContainText('Hidden');
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'playtest/a08-a09/dojo-v2/ability-locked.png' });
  await page.getByTestId('dojo-pick-squirtle').click();
  await page.getByTestId('dojo-scrolls').click();
  await expect(page.locator('[data-testid^="egg-"]')).toHaveCount(3);
  await page.evaluate(() => window.__ascendant!.run.pay(250));
  await page.locator('[data-testid^="egg-"]:not([disabled])').first().click();
  await expect(page.getByTestId('dojo-money')).toContainText('0');
});

test('the decorative practice effect follows a preview and honours reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await openDojo(page);
  const money = await page.evaluate(() => window.__ascendant!.run.state()!.money);
  // A cold asset may arrive after the first 350ms CSS beat; loading must start a fresh beat.
  await page.route('**/art/dojo/effects/*.png', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });
  await page.locator('[data-testid^="dojo-preview-tutor-"]').last().click();
  const effect = page.getByTestId('dojo-room').locator('img[src*="/dojo/effects/"]');
  await expect(effect).toHaveCount(1);
  await expect(effect).toHaveCSS('image-rendering', 'pixelated');
  await expect.poll(() => effect.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'playtest/a08-a09/dojo-v2/practice-effect-720.png' });
  await expect(effect).toHaveCSS('opacity', '0');
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(money);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-testid^="dojo-preview-tutor-"]').first().click();
  // The shared motion tokens react to a system preference changed while the room is already mounted.
  await expect(effect).toHaveCSS('animation-duration', '0s');
  await expect(effect).toHaveCSS('opacity', '0');
});

test('Celadon keeps its +30% prices and the fifth Mastery slot stays fixed in the deck', async ({ page }) => {
  await openDojo(page, 1);
  await page.evaluate(() =>
    window.__ascendant!.run.patch((d) => {
      d.perks.mastery.squirtle = 3;
    }),
  );
  const before = await page.evaluate(() => window.__ascendant!.run.state()!.money);
  await page.locator('[data-testid^="tutor-"]:not([disabled])').first().click();
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(before - 195);
  await page.getByTestId('dojo-deck').click();
  await expect(page.getByTestId('mastery-slot')).toContainText('Mastery · fixed');
  await expect(page.getByTestId('mastery-slot').locator('button')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'playtest/a08-a09/dojo-v2/mastery-fixed.png' });
});

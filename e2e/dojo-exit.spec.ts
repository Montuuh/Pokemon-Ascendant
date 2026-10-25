import { expect, test } from '@playwright/test';

// B08 / §9.6 — the physical exit is navigation, independent of the selected or locked service.
for (const [width, height] of [[1920, 1080], [1280, 720]]) {
  for (const text of [100, 150]) {
    for (const motion of ['reduce', 'no-preference'] as const) {
      test(`DojoExit_MatPointerAndKeyboard_ReturnToDoor_${height}_${text}_${motion}`, async ({ page }) => {
        await page.setViewportSize({ width: width!, height: height! });
        await page.emulateMedia({ reducedMotion: motion });
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/?screen=menu');
        await page.waitForFunction(() => !!window.__ascendant);
        await page.evaluate((text) => {
          document.documentElement.style.setProperty('--text-scale', String(text / 100));
          const a = window.__ascendant!;
          a.run.new('squirtle', 7);
          a.run.fill(4);
          a.run.city(0);
          a.run.pay(1000);
        }, text);
        for (const [index, service] of ['tutor', 'eggs', 'passive'].entries()) {
          await page.getByTestId('door-dojo').click();
          await page.getByTestId(`dojo-tab-${service}`).click();
          // No money: all purchases unavailable; leaving must remain possible.
          if (index === 2) await page.evaluate(() => window.__ascendant!.run.patch(d => { d.money = 0; }));
          const before = await page.evaluate(() => window.__ascendant!.run.state()!);
          const exit = page.getByTestId('dojo-exit');
          await expect(exit).toHaveAccessibleName('Back to town');
          await expect(exit).not.toHaveAttribute('aria-pressed');
          await expect(exit).toBeEnabled();
          await exit.hover();
          await expect(page.getByRole('tooltip')).toContainText('Back to town');
          await expect(page.locator('[data-shape="exit"]')).toHaveAttribute('data-state', 'near');
          await page.mouse.move(0, 0);
          await page.getByTestId('dojo-apprentice').focus();
          await page.keyboard.press('Tab');
          await expect(exit).toBeFocused();
          await expect(page.getByRole('tooltip')).toContainText('Back to town');
          await page.keyboard.press('Escape');
          await expect(page.getByRole('tooltip')).toHaveCount(0);
          await expect(page.getByTestId('dojo-screen')).toBeVisible();
          if (index === 0) {
            await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
            await page.screenshot({ path: `playtest/art-review-2026-10-24/implementation/B08/after/dojo-${height}-${text}-${motion}.png` });
            // Use the actual mat centre, rather than a label or a test-id click.
            const art = (await page.getByTestId('dojo-room').locator('img').first().boundingBox())!;
            await page.mouse.click(art.x + art.width * 104 / 208, art.y + art.height * 236 / 256);
          } else await page.keyboard.press('Enter');
          await expect(page.getByTestId('city-screen')).toBeVisible();
          await expect(page.getByTestId('door-dojo')).toBeFocused();
          const after = await page.evaluate(() => window.__ascendant!.run.state()!);
          expect(after.money).toBe(before.money);
          expect(after.box).toEqual(before.box);
          expect(after.bag).toEqual(before.bag);
        }
        expect(errors).toEqual([]);
      });
    }
  }
}

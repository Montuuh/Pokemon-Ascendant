import { expect, test } from '@playwright/test';
import { readdirSync } from 'node:fs';

// D8/D9 / §9.2.3 — every exported native cell must fit in the actual card without clipping or resampling.
const ids = readdirSync('public/art/moves').filter((name) => name.endsWith('.png')).map((name) => name.slice(0, -4));
for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test.describe(`Move artwork window ${viewport.width}`, () => {
    test.use({ viewport });
    test('EveryMove_CompleteNativeCellFitsAtDoubleScale', async ({ page }) => {
      await page.goto('/?scenario=wild-basic&seed=7');
      await expect(page.getByTestId('combat-screen')).toBeVisible();
      await page.evaluate(async () => { await document.fonts.ready; });
      for (const id of ids) {
        await page.evaluate((move) => window.__ascendant!.hand([move]), id);
        const img = page.getByTestId(`card-${id}`).locator(`img[src$="/moves/${id}.png"]`);
        await expect(img).toBeVisible();
        await img.evaluate(async (image) => { await (image as HTMLImageElement).decode(); });
        const fit = await img.evaluate((node) => {
          const image = node as HTMLImageElement;
          const r = image.getBoundingClientRect();
          const w = image.parentElement!.getBoundingClientRect();
          return { scaleX: r.width / image.naturalWidth, scaleY: r.height / image.naturalHeight,
            contained: r.left >= w.left - 0.5 && r.right <= w.right + 0.5 && r.top >= w.top - 0.5 && r.bottom <= w.bottom + 0.5 };
        });
        expect(fit.scaleX, id).toBeCloseTo(2, 3);
        expect(fit.scaleY, id).toBeCloseTo(2, 3);
        expect(fit.contained, `${id}: complete illustration stays inside its window`).toBe(true);
      }
      await page.evaluate(() => window.__ascendant!.hand(['flash', 'fire-blast', 'skull-bash', 'surf', 'barrier']));
      await page.mouse.move(4, 4);
      await page.evaluate(async () => Promise.all([...document.images].map((i) => i.decode())));
      await page.screenshot({ path: `playtest/a16-a18/move-window-${viewport.width}.png` });
      await expect(page.getByTestId('btn-end-turn')).toBeInViewport();
    });
  });
}

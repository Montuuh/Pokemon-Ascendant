import { expect, test } from '@playwright/test';

// D9 / §9.2.1 — indexed stage pixels keep their 640×360 grid when filling a wide arena or the title.
for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`stage pixels cover the arena and title at half steps at ${viewport.height}p`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?scenario=wild-basic&seed=7');
    const stage = page.locator('[data-fx-stage]');
    await expect(stage).toBeVisible();
    const field = await stage.evaluate((el) => {
      const css = getComputedStyle(el);
      return { size: parseFloat(css.backgroundSize), rendering: css.imageRendering, image: css.backgroundImage, width: el.clientWidth, height: el.clientHeight };
    });
    expect(field.image).toContain('/art/stages/meadow.png');
    expect(field.rendering).toBe('pixelated');
    expect(field.size / 320).toBeCloseTo(Math.round(field.size / 320), 5);
    expect(field.size).toBeGreaterThanOrEqual(field.width);
    expect(field.size * 9 / 16).toBeGreaterThanOrEqual(field.height);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `playtest/a04-a06/stages/final-arena-${viewport.height}.png` });

    await page.goto('/?screen=menu');
    const image = page.locator('[data-testid="title-battle"] img[src*="/art/stages/"]').first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(640);
    const title = await image.evaluate((el) => {
      const img = el as HTMLImageElement;
      const r = img.getBoundingClientRect();
      const parent = img.closest('[data-testid="title-battle"]')!.getBoundingClientRect();
      // Chrome rounds top:62% to 1/64px before translate:-62%; a same-height image can differ by <0.01px.
      const epsilon = 0.02;
      return { scaleX: r.width / img.naturalWidth, scaleY: r.height / img.naturalHeight, rendering: getComputedStyle(img).imageRendering, covers: r.left <= parent.left + epsilon && r.right >= parent.right - epsilon && r.top <= parent.top + epsilon && r.bottom >= parent.bottom - epsilon };
    });
    expect(title.rendering).toBe('pixelated');
    expect(title.scaleX).toBeCloseTo(title.scaleY, 5);
    expect(title.scaleX * 2).toBeCloseTo(Math.round(title.scaleX * 2), 5);
    expect(title.covers).toBe(true);
    for (const side of ['near', 'far']) {
      await expect.poll(() => page.locator(`[data-testid="title-fighter"][data-side="${side}"] img`).first().evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(80);
    }
    await page.screenshot({ path: `playtest/a04-a06/stages/final-title-${viewport.height}.png` });

    await page.goto('/?screen=scenarios');
    const thumbnail = page.getByTestId('scenario-wild-basic').locator('[style*="background-image"]');
    await expect(thumbnail).toBeVisible();
    const preview = await thumbnail.evaluate((el) => {
      const css = getComputedStyle(el, '::before');
      return { size: parseFloat(css.backgroundSize), rendering: css.imageRendering, width: el.clientWidth, height: el.clientHeight };
    });
    expect(preview.rendering).toBe('pixelated');
    expect(preview.size / 320).toBeCloseTo(Math.round(preview.size / 320), 5);
    expect(preview.size).toBeGreaterThanOrEqual(preview.width);
    expect(preview.size * 9 / 16).toBeGreaterThanOrEqual(preview.height);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `playtest/a04-a06/stages/final-previews-${viewport.height}.png` });
  });
}

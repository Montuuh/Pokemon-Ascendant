import { expect, test, type Locator } from '@playwright/test';

// D9 / D8 — measure the image's painted dimensions against its source, never just its layout cell.
async function expectPixelFit(image: Locator) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const result = await image.evaluate((img: HTMLImageElement) => {
    const r = img.getBoundingClientRect();
    const cell = img.closest('[data-pixel-sprite]')?.getBoundingClientRect();
    return {
      x: r.width / img.naturalWidth,
      y: r.height / img.naturalHeight,
      rendering: getComputedStyle(img).imageRendering,
      inside: !cell || (r.width <= cell.width + 0.01 && r.height <= cell.height + 0.01),
      natural: img.naturalWidth,
      width: r.width,
    };
  });
  expect(result.rendering).toBe('pixelated');
  expect(result.x).toBeGreaterThanOrEqual(0.5);
  expect(result.x * 2).toBeCloseTo(Math.round(result.x * 2), 5);
  expect(result.y).toBeCloseTo(result.x, 5);
  expect(result.inside).toBe(true);
  return result;
}

for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
  test.describe(`Pixel assets at ${viewport.height}p`, () => {
    test.use({ viewport });

    test('the Pokédex retains its cells, source pixels and accessible species sheets', async ({ page }) => {
      await page.goto('/?screen=hub');
      await page.waitForFunction(() => !!window.__ascendant);
      await page.evaluate(() => window.__ascendant!.meta.meet('bulbasaur', 'ivysaur', 'venusaur'));
      await page.getByTestId('kiosk-pc').click();
      await expect(page.getByTestId('dex-grid')).toBeVisible();
      for (const [species, natural] of [['bulbasaur', 52], ['ivysaur', 62], ['venusaur', 82]] as const) {
        const card = page.getByTestId(`dex-${species}`);
        const image = card.locator('[data-pixel-sprite] img');
        await expect(card).toHaveAttribute('data-met', 'true');
        const measured = await expectPixelFit(image);
        expect(measured.natural).toBe(natural);
        const cell = await image.locator('..').boundingBox();
        expect(cell!.width).toBe(64);
        expect(cell!.height).toBe(64);
        await expect(image).toHaveAttribute('alt', species.charAt(0).toUpperCase() + species.slice(1));
        // Hover used to add scale(1.08), undoing every otherwise-correct image size.
        await card.hover();
        await expectPixelFit(image);
        for (const type of await card.locator('img[src*="/type/"]').all()) await expectPixelFit(type);
        await card.click();
        const sheet = page.getByTestId('pc-sheet');
        await expect(sheet).toBeVisible();
        const bounds = await sheet.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
        await expectPixelFit(sheet.locator('[data-pixel-sprite] img').first());
        await page.screenshot({ path: `playtest/a04-a06/a05-tests/sheet-${species}-${viewport.height}.png` });
        await page.keyboard.press('Escape');
        await expect(card).toBeFocused();
      }
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `playtest/a04-a06/a05-tests/pc-${viewport.height}.png` });
    });

    test('a failed animated portrait keeps the static fallback visible on its original pixel grid', async ({ page }) => {
      await page.route('**/art/pokemon/battle/venusaur.gif', route => route.abort());
      await page.goto('/?screen=hub');
      await page.waitForFunction(() => !!window.__ascendant);
      await page.evaluate(() => window.__ascendant!.meta.meet('venusaur'));
      await page.getByTestId('kiosk-pc').click();
      await page.getByTestId('dex-venusaur').click();
      const fallback = page.getByTestId('pc-sheet').locator('img[src*="/portraits/"]');
      await expect(fallback).toHaveAttribute('alt', 'Venusaur');
      const measured = await expectPixelFit(fallback);
      expect(measured.natural).toBe(82);
      expect(measured.x).toBe(1.5);
      await page.screenshot({ path: `playtest/a04-a06/a05-tests/fallback-${viewport.height}.png` });
    });

    test('tiny party cells and requested type heights fit without fractional pixel scales', async ({ page }) => {
      await page.goto('/?screen=menu');
      // Exercise the shared components at every small size used by inventory, lists and starter slots.
      await page.evaluate(async () => {
        const reactPath = '/node_modules/.vite/deps/react.js';
        const domPath = '/node_modules/.vite/deps/react-dom_client.js';
        const monPath = '/src/ui/components/MonIcon.tsx';
        const labelPath = '/src/ui/components/TypeBadge.tsx';
        const [{ default: { createElement } }, { default: { createRoot } }, { MonIcon }, { TypeLabel, StatusBadge }] = await Promise.all([
          import(reactPath), import(domPath), import(monPath), import(labelPath),
        ]);
        const host = document.createElement('div');
        host.dataset.testid = 'pixel-regression';
        Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '9999', background: 'white', display: 'flex', gap: '12px', flexWrap: 'wrap', alignContent: 'start', padding: '12px' });
        document.body.append(host);
        createRoot(host).render(createElement('div', null,
          ...[26, 28, 30, 34, 40, 44, 46, 64].flatMap(size => ['bulbasaur', 'venusaur', 'moltres'].map(speciesId =>
            createElement('span', { key: `${size}-${speciesId}`, 'data-cell-size': size }, createElement(MonIcon, { speciesId, size })))),
          ...[6, 12, 14, 15, 16, 18, 20, 24].map(size => createElement('span', { key: `type-${size}`, 'data-label-size': size }, createElement(TypeLabel, { type: 'water', size }))),
          createElement(StatusBadge, { status: 'burn', size: 14 }),
        ));
      });
      const harness = page.getByTestId('pixel-regression');
      await expect(harness.locator('img')).toHaveCount(33);
      for (const image of await harness.locator('img').all()) await expectPixelFit(image);
      for (const cell of await harness.locator('[data-cell-size]').all()) {
        const size = Number(await cell.getAttribute('data-cell-size'));
        const image = cell.locator('img');
        const frame = await cell.locator('[data-pixel-sprite]').boundingBox();
        expect(frame!.width).toBe(size);
        expect(frame!.height).toBe(size);
        await expect(image).toHaveAttribute('src', size < 48 ? /\/compact\// : /\/portraits\//);
      }
      for (const label of await harness.locator('[data-label-size]').all()) {
        const requested = Number(await label.getAttribute('data-label-size'));
        const rect = await label.locator('img').boundingBox();
        expect(rect!.height).toBeLessThanOrEqual(requested);
        expect(rect!.height % 6).toBe(0);
      }
      await page.screenshot({ path: `playtest/a04-a06/a05-tests/cells-${viewport.height}.png` });
    });
  });
}

import { expect, test, type Page } from '@playwright/test';

async function route(page: Page) {
  // Resident sources rotate in normal motion; decode their initial still pair before testing live hover.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?screen=menu');
  await page.evaluate(() => { const a = window.__ascendant!; a.run.new('squirtle', 7); a.goTo('map'); });
  await expect(page.getByTestId('route-board')).toHaveAttribute('data-painted', 'true');
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode())); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test.describe(`Responsive route ${viewport.width}`, () => {
    test.use({ viewport, reducedMotion: 'no-preference' });
    test('Labels_ClearArtwork_AndEveryGoldChipKeepsItsOwnChoice', async ({ page }) => {
      await route(page);
      await expect(page.getByTestId('route-strip')).toHaveCount(0);
      const toggle = page.getByTestId('map-labels');
      await expect(toggle).toBeInViewport();
      const scroller = (await page.getByTestId('route-scroller').boundingBox())!;
      const t = (await toggle.boundingBox())!;
      expect(t.x + t.width).toBeLessThanOrEqual(scroller.x + scroller.width);
      expect(t.y + t.height).toBeLessThanOrEqual(scroller.y + scroller.height);
      await toggle.click();
      // Captions must clear neighbouring artwork as well as their own, including stacked caves.
      const collisions = await page.locator('[data-testid^="node-"][data-kind]').evaluateAll((nodes) => {
        const hits: string[] = [];
        for (const node of nodes) {
          const chip = node.querySelector('[data-chip]');
          if (!chip) continue;
          const a = chip.getBoundingClientRect();
          for (const other of nodes) {
            if (other === node) continue;
            for (const image of other.querySelectorAll('img')) {
              const bounds = image.getBoundingClientRect();
              const canvas = document.createElement('canvas');
              canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
              const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
              const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
              let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
              for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
                if (pixels[(y * canvas.width + x) * 4 + 3]! > 0) {
                  left = Math.min(left, x); right = Math.max(right, x + 1);
                  top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
                }
              }
              const b = { left: bounds.left + left / canvas.width * bounds.width, right: bounds.left + right / canvas.width * bounds.width,
                top: bounds.top + top / canvas.height * bounds.height, bottom: bounds.top + bottom / canvas.height * bounds.height };
              if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
                hits.push(`${node.getAttribute('data-testid')} caption intersects ${other.getAttribute('data-testid')}: ${image.getAttribute('src')}`);
            }
          }
        }
        return hits;
      });
      expect(collisions).toEqual([]);
      const choices = page.locator('[data-status="reachable"]');
      const firstWild = choices.filter({ has: page.locator('[data-testid="habitat-art"]') }).first();
      if (await firstWild.count()) {
        const lower = choices.first();
        const box = (await lower.boundingBox())!;
        await lower.hover({ position: { x: box.width / 2, y: box.height - 24 } });
        await firstWild.locator('[data-chip="go"]').hover();
        await expect(page.getByTestId('node-hover')).toContainText('Wild');
      }
      const heights: number[] = [];
      for (const node of await choices.all()) {
        const id = (await node.getAttribute('data-testid'))!.slice(5);
        const chip = node.locator('[data-chip="go"]');
        const bounds = await chip.boundingBox();
        const artBottom = await node.locator('img').evaluateAll((imgs) => Math.max(...imgs.map((i) => i.getBoundingClientRect().bottom)));
        expect(bounds!.y, id).toBeGreaterThanOrEqual(artBottom);
        heights.push(bounds!.height);
        await chip.hover();
        await expect(node).toHaveCSS('z-index', '2');
        await expect(page.getByTestId('node-hover')).toContainText('Available now');
        await page.screenshot({ path: `playtest/a19-a20/hover-${id}-${viewport.width}.png` });
        await chip.click();
        await expect(page.getByTestId('node-preview')).toBeVisible();
        expect(await page.evaluate(() => window.__ascendant!.run.state()!.pendingNodeId)).toBe(id);
        await page.getByTestId('btn-cancel-node').click();
      }
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
      await page.mouse.move(2, 2);
      await page.screenshot({ path: `playtest/a19-a20/route-final-${viewport.width}.png` });
    });
    test('LockedNodes_ExplainTheirServiceWithoutCommitting', async ({ page }) => {
      await route(page);
      for (const kind of ['merchant', 'aid', 'mystery', 'wild', 'trainer']) {
        const node = page.locator(`[data-kind="${kind}"][data-status="locked"]`).first();
        if (!(await node.count())) continue;
        await node.scrollIntoViewIfNeeded();
        const box = (await node.boundingBox())!;
        // Inspect the visible figure near its feet, rather than the transparent padding above its sprite.
        await node.hover({ position: { x: box.width / 2, y: box.height - 24 } });
        await expect(page.getByTestId('node-hover')).toBeVisible();
        await expect(page.getByTestId('node-hover')).toContainText('Ahead on your route');
        if (kind === 'wild') {
          await expect(page.getByTestId('node-hover').locator('[data-tier]')).not.toHaveCount(0);
        }
        await node.click({ force: true });
        await expect(page.getByTestId('node-preview')).toHaveCount(0);
        await page.screenshot({ path: `playtest/a19-a20/hover-${kind}-locked-${viewport.width}.png` });
      }
    });
  });
}
test('NodeScale_TracksRouteHeight_AtNativePixelMultiples', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await route(page);
  const npc = page.locator('[data-kind="trainer"] img').first();
  const small = (await npc.boundingBox())!.width;
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(async () => (await npc.boundingBox())!.width).toBeGreaterThan(small);
  const large = (await npc.boundingBox())!.width;
  expect(small / 16 * 2).toBeCloseTo(Math.round(small / 16 * 2));
  expect(large / 16 * 2).toBeCloseTo(Math.round(large / 16 * 2));
  for (const image of await page.locator('[data-resident]').all()) {
    const scale = await image.evaluate((img) => img.getBoundingClientRect().width / (img as HTMLImageElement).naturalWidth);
    expect(scale * 2).toBeCloseTo(Math.round(scale * 2));
  }
});

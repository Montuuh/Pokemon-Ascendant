import { expect, test, type Page } from '@playwright/test';

const baseline = process.env.A17_BASELINE === '1';

async function onRoute(page: Page, region: number) {
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 7);
    a.run.fill(6);
    a.goTo('map');
  });
  // Let the first map's asset queue settle before a fixture jumps to a later Region.
  // RouteView deliberately keeps shared image loads alive when a City replaces the board.
  await expect(page.getByTestId('route-board')).toHaveAttribute('data-painted', 'true', { timeout: 20_000 });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.evaluate((region) => {
    const a = window.__ascendant!;
    if (region === 3) a.run.victoryRoad();
    else if (region > 0) {
      a.run.city(region - 1);
      const city = a.run.state()!.city!;
      a.run.dispatch({ type: 'depart-city', modifierId: city.reflection[0] ?? null });
    }
    a.goTo('map');
  }, region);
  await expect(page.getByTestId('route-board')).toHaveAttribute('data-painted', 'true', { timeout: 20_000 });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
}

for (const size of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) for (const region of [0,1,2,3]) {
  test(`A17 route ${region + 1} at ${size.width}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(size);
    await onRoute(page, region);
    const board = page.getByTestId('route-board');
    const toggle = page.getByTestId('map-labels');
    if (await toggle.getAttribute('aria-pressed') === 'true') await toggle.click();
    const prefix = `playtest/a16-a18/a17-${baseline ? 'before' : 'after'}-${region === 3 ? 'victory-road' : `region-${region+1}`}-${size.width}`;
    await page.screenshot({ path: `${prefix}-start.png` });
    await toggle.click();
    await page.mouse.move(0, 0);
    await expect(page.getByTestId('tooltip')).toBeHidden();
    await page.screenshot({ path: `${prefix}-labels.png` });
    await page.getByTestId('route-scroller').focus();
    await page.keyboard.press('End');
    await page.screenshot({ path: `${prefix}-end.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    if (baseline) return;
    const people = board.locator('[data-art="trainer"] img');
    expect(await people.count()).toBeGreaterThan(0);
    expect(await people.evaluateAll((images) => images.every((image) => {
      const im = image as HTMLImageElement;
      const b = im.getBoundingClientRect();
      const scale = im.closest('[data-kind="gym"]') ? 4 : 2;
      return im.src.includes('/art/map/people/') && b.width === im.naturalWidth * scale && b.height === im.naturalHeight * scale;
    }))).toBe(true);
    for (const node of await board.locator('[data-kind="wild"][data-art="habitat"]').all()) {
      await expect(node.getByTestId('habitat-art')).toBeAttached();
      expect(await node.locator('[data-resident]').count()).toBeGreaterThan(0);
    }
    await page.keyboard.press('Home');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const choices = board.locator('[data-status="reachable"]');
    for (const node of await choices.all()) {
      const id = (await node.getAttribute('data-testid'))!.slice(5);
      const chip = node.locator('[data-chip="go"]');
      await chip.hover();
      await expect(node).toHaveCSS('z-index', '2');
      await expect(page.getByTestId('tooltip')).toBeVisible();
      await chip.click();
      await expect(page.getByTestId('node-preview')).toBeVisible();
      expect(await page.evaluate(() => window.__ascendant!.run.state()!.pendingNodeId)).toBe(id);
      await page.getByTestId('btn-cancel-node').click();
    }
  });
}

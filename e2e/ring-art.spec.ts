import { expect, test, type Page } from '@playwright/test';

async function arrive(page: Page, city: 0 | 1) {
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate((index) => {
    localStorage.setItem('ascendant.ring-guide-seen', '1');
    const a = window.__ascendant!;
    a.run.new('squirtle', 7);
    a.run.fill(6);
    a.run.city(index);
    a.run.pay(2000);
    // Four revealed rivals and a full Box exercise the densest dossier at 720p.
    a.run.patch((r) => {
      r.activeUids = r.box.slice(0, 3).map((m) => m.uid);
      for (const rung of r.city!.ring!.rungs) while (rung.team.length < 4) rung.team.push({ ...rung.team[0]! });
    });
  }, city);
  await page.getByTestId('door-ring').click();
  await expect(page.getByTestId('ring-arena')).toBeVisible();
  await page.waitForFunction(() => [...document.images].every((im) => im.complete && im.naturalWidth > 0));
}

async function fits(page: Page) {
  expect(await page.evaluate(() => {
    const root = document.querySelector('[data-testid="ring-screen"]')!;
    const bad = [...root.querySelectorAll('[data-testid^="ring-rung-"], [data-testid="ring-rival"] li, [data-testid^="btn-ring-"]')].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight || el.scrollWidth > el.clientWidth + 1;
    });
    return bad.map((el) => `${el.getAttribute('data-testid') ?? el.tagName}: ${el.textContent}`);
  })).toEqual([]);
  const scale = Number(await page.getByTestId('ring-arena').getAttribute('data-scale'));
  expect(scale * 2 % 1).toBe(0);
  expect(await page.locator('[data-testid="ring-screen"] [data-pixel-sprite] img').evaluateAll((images) => images.every((image) => {
    const im = image as HTMLImageElement;
    const b = im.getBoundingClientRect();
    return Number.isInteger(b.width / im.naturalWidth * 2) && Number.isInteger(b.height / im.naturalHeight * 2);
  }))).toBe(true);
}

for (const size of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`A12 native venues and paid ladder at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    for (const city of [0, 1] as const) {
      await arrive(page, city);
      await expect(page.getByTestId('ring-arena')).toHaveAttribute('data-venue', city === 0 ? 'pallet-town' : 'celadon-city');
      await expect(page.getByTestId('ring-ladder').locator('li')).toHaveCount(city === 0 ? 2 : 3);
      await expect(page.getByTestId('ring-rival').locator('li')).toHaveCount(4);
      await fits(page);
      await page.getByTestId('ring-rung-0').hover();
      await expect(page.getByRole('tooltip')).toContainText('Rung 1');
      await page.mouse.move(10, 700);
      await page.screenshot({ path: `playtest/a12-a13/a12-${city === 0 ? 'pallet' : 'celadon'}-${size.width}-entry.png` });
      await page.getByTestId('btn-ring-enter').click();
      // A real won rung carries HP onward and lights only the next platform.
      await page.evaluate(() => {
        const a = window.__ascendant!;
        a.run.dispatch({ type: 'ring-fight' });
        const r = a.run.state()!;
        a.run.dispatch({ type: 'finish-combat', report: { outcome: 'victory', team: r.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: 0, turns: 5 } });
        a.goTo('map');
      });
      await expect(page.getByTestId('ring-rung-0')).toHaveAttribute('data-state', 'won');
      await expect(page.getByTestId('ring-rung-1')).toHaveAttribute('data-state', 'next');
      await expect(page.getByTestId('ring-banked')).toContainText(city === 0 ? '300' : '400');
      await fits(page);
      await page.screenshot({ path: `playtest/a12-a13/a12-${city === 0 ? 'pallet' : 'celadon'}-${size.width}-banked.png` });
      await page.getByTestId('btn-ring-cash-out').click();
      await expect(page.getByTestId('confirm-leave')).toBeVisible();
      await page.getByTestId('btn-leave-stay').click();
      await expect(page.getByTestId('confirm-leave')).toBeHidden();
    }
  });
}

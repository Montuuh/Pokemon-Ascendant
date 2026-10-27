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

// The rung plates are tags on the arena's edge, not placards over it: each one sits wholly inside the drawn arena (the
// scene clips what pokes out), its number sits inside its own chip at every text size, and together the plates leave
// the place its own shape.
for (const [size, textScale] of [[{ width: 1280, height: 720 }, 1.5], [{ width: 1280, height: 720 }, 1], [{ width: 1920, height: 1080 }, 1.5]] as const) {
  test(`Ring rung plates stay inside a compact arena at ${size.width}x${size.height}, text ${textScale * 100} %`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/?screen=menu');
    await page.evaluate((s) => localStorage.setItem('ascendant.settings.v1', JSON.stringify({ textScale: s, motion: 'system' })), textScale);
    for (const city of [0, 1] as const) {
      await arrive(page, city);
      await page.getByTestId('btn-ring-enter').click();
      const m = await page.evaluate(() => {
        const scene = document.querySelector('[data-testid="ring-arena"] > div')!.getBoundingClientRect();
        const plates = [...document.querySelectorAll('[data-testid^="ring-rung-"]')].map((el) => {
          const b = el.getBoundingClientRect();
          const chip = el.querySelector('[aria-hidden="true"]')!;
          const c = chip.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(chip);
          const g = range.getBoundingClientRect();
          return {
            id: el.getAttribute('data-testid'),
            inside: b.left >= scene.left - 0.5 && b.right <= scene.right + 0.5 && b.top >= scene.top - 0.5 && b.bottom <= scene.bottom + 0.5,
            numberInChip: chip.querySelector('svg') !== null || (g.top >= c.top - 0.5 && g.bottom <= c.bottom + 0.5 && g.left >= c.left - 0.5 && g.right <= c.right + 0.5),
            prize: el.children[2]?.textContent ?? '',
            area: b.width * b.height,
          };
        });
        return { plates, share: plates.reduce((s, p) => s + p.area, 0) / (scene.width * scene.height) };
      });
      expect(m.plates.filter((p) => !p.inside).map((p) => p.id), `city ${city}: plates cut off by the arena's edge`).toEqual([]);
      expect(m.share, `city ${city}: plates cover too much of the arena`).toBeLessThan(0.08);
      expect(m.plates.filter((p) => !p.numberInChip).map((p) => p.id), `city ${city}: a rung number spills out of its chip`).toEqual([]);
      for (const p of m.plates) expect(p.prize, `${p.id} shows what it pays`).toMatch(/\d|Relic/);
    }
  });
}

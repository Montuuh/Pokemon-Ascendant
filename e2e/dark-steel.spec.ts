import { expect, test } from '@playwright/test';

// v0.9.84 — Dark and Steel: the two types on the cards, in the chart's tooltip and on Eevee's four-way evolution screen.

test.describe('Dark and Steel — §4.1.2', () => {
  test('a hand of Dark and Steel cards wears the two types: frame colour, label and illustration', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=7');
    await page.waitForFunction(() => !!window.__ascendant?.state());
    await page.evaluate(() => window.__ascendant!.hand(['crunch', 'dark-pulse', 'iron-head', 'flash-cannon', 'bite']));
    for (const [id, type] of [['crunch', 'dark'], ['dark-pulse', 'dark'], ['bite', 'dark'], ['iron-head', 'steel'], ['flash-cannon', 'steel']] as const) {
      const card = page.getByTestId(`card-${id}`);
      await expect(card).toBeVisible();
      // The card's own frame takes its type's token, and the token is defined (an unknown type would resolve to nothing).
      const [frame, token] = await card.evaluate((el, t) => [getComputedStyle(el).getPropertyValue('--card-type').trim(), getComputedStyle(document.documentElement).getPropertyValue(`--type-${t}`).trim()], type);
      expect(token, `--type-${type}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(frame, id).toBe(token);
      // Its illustration is on disk and loaded.
      const art = card.locator('img').first();
      await expect(art).toHaveJSProperty('complete', true);
      expect(await art.evaluate((el: HTMLImageElement) => el.naturalWidth), `${id} art`).toBeGreaterThan(0);
    }
    await page.screenshot({ path: 'playtest/dark-steel-hand.png' });
  });

  test('the type labels of the two new types are real pixel boxes', async ({ page }) => {
    for (const type of ['dark', 'steel']) {
      const res = await page.request.get(`/art/icons/type/icon-type-${type}.png`);
      expect(res.ok(), type).toBe(true);
      // A PNG signature, not a placeholder page.
      expect((await res.body()).subarray(1, 4).toString('latin1'), type).toBe('PNG');
    }
  });

  test('Eevee has four paths, and at 720 p the choice and its button are all on the screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/?screen=menu&seed=7');
    await page.waitForFunction(() => !!window.__ascendant);
    await page.evaluate(() => {
      const a = window.__ascendant!;
      a.run.new('eevee', 7);
      a.run.patch((d) => {
        d.box[0]!.level = 12;
        d.phase = 'evolution';
        d.pendingEvolutions = [{ uid: d.box[0]!.uid, from: 'eevee', branchIds: ['eevee-vanguard', 'eevee-specialist', 'eevee-support', 'eevee-dark'], returnTo: 'map' } as never];
      });
      a.goTo('map');
    });
    await expect(page.getByTestId('evolution-screen')).toBeVisible();
    for (const id of ['eevee-vanguard', 'eevee-specialist', 'eevee-support', 'eevee-dark']) await expect(page.getByTestId(`branch-${id}`)).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('btn-evolve')).toBeInViewport({ ratio: 1 });
    await page.getByTestId('branch-eevee-dark').click();
    await page.screenshot({ path: 'playtest/dark-steel-evolution-720.png' });
    await page.getByTestId('btn-evolve').click();
    await expect.poll(() => page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.speciesId), { timeout: 15_000 }).toBe('umbreon');
  });
});

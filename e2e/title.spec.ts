import { expect, test, type Page } from '@playwright/test';

// §9.13 — the title screen: a summit at dawn behind the title mark and the menu, a party of three on its ledge; the
// summit alone behind the new-run steps. With motion on the clouds drift and the party evolves; with motion off (the suite's
// default) it is one still frame. Screenshots to playtest/title-*.png.

const species = (page: Page) => page.getByTestId('title-scene').locator('img[data-species]').evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).dataset.species));

/** Every picture of the scene decoded: a screenshot must not beat its art. */
const drawn = (page: Page) =>
  expect.poll(() => page.getByTestId('title-scene').locator('img').evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);

test.describe('The title screen — §9.13', () => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    test(`a still summit behind the mark and the menu at ${viewport.height}p, with motion off`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/?screen=menu');
      await expect(page.getByRole('heading', { name: 'Pokémon Ascendant' })).toBeVisible();
      const scene = page.getByTestId('title-scene');
      await expect(scene.getByTestId('title-member')).toHaveCount(3);
      await drawn(page);
      // D9 — the vista's 640×360 pixels at a whole or half step, covering the screen; the party at the same step.
      const vista = scene.getByTestId('title-vista');
      const box = await vista.evaluate((el) => {
        const img = el as HTMLImageElement;
        const r = img.getBoundingClientRect();
        return { k: r.width / img.naturalWidth, ky: r.height / img.naturalHeight, natural: img.naturalWidth, left: r.left, top: r.top, right: r.right, bottom: r.bottom, rendering: getComputedStyle(img).imageRendering };
      });
      expect(box.natural).toBe(640);
      expect(box.rendering).toBe('pixelated');
      expect(box.k).toBeCloseTo(box.ky, 5);
      expect(box.k * 2).toBeCloseTo(Math.round(box.k * 2), 5);
      expect(box.left).toBeLessThanOrEqual(0);
      expect(box.top).toBeLessThanOrEqual(0);
      expect(box.right).toBeGreaterThanOrEqual(viewport.width);
      expect(box.bottom).toBeGreaterThanOrEqual(viewport.height);
      for (const form of await scene.locator('img[data-species]').all()) {
        const k = await form.evaluate((el) => el.getBoundingClientRect().width / (el as HTMLImageElement).naturalWidth);
        expect(k).toBeCloseTo(box.k, 5);
        // On the ledge, clear of the menu's column.
        expect((await form.boundingBox())!.x).toBeGreaterThan(viewport.width / 2);
      }
      // Still: the same three, and nothing running.
      const before = await species(page);
      expect(before).toEqual(['bulbasaur', 'charmander', 'squirtle']);
      await page.waitForTimeout(2_000);
      expect(await species(page)).toEqual(before);
      expect(await scene.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
      await page.screenshot({ path: `playtest/title-still-${viewport.height}.png` });
    });
  }

  test('the menu is walked with the arrow keys', async ({ page }) => {
    await page.goto('/?screen=menu');
    await page.getByTestId('btn-new-run').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('btn-hub')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByTestId('btn-about')).toBeFocused();
  });

  test.describe('with motion on', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the clouds drift, the party evolves twice, and the next party takes its place', async ({ page }) => {
      test.slow();
      await page.clock.install();
      await page.goto('/?screen=menu');
      const scene = page.getByTestId('title-scene');
      await drawn(page);
      expect(await species(page)).toEqual(['bulbasaur', 'charmander', 'squirtle']);
      // Only transform and opacity ever move (the cheap properties), and the drifts go a pixel at a time.
      const moving = await scene.evaluate((el) =>
        el.getAnimations({ subtree: true }).flatMap((a) => (a.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p)))),
      );
      expect(moving.length).toBeGreaterThan(0);
      expect(moving.filter((p) => p !== 'transform' && p !== 'opacity')).toEqual([]);
      await page.screenshot({ path: 'playtest/title-live.png' });
      // No two members of a party stand over one another, at any form (the widest are three times the first).
      const apart = async () => {
        const boxes = await scene.locator('img[data-species]').evaluateAll((imgs) => imgs.map((img) => img.getBoundingClientRect()).map((r) => [r.left, r.right]));
        for (let i = 1; i < boxes.length; i++) expect(boxes[i]![0]!).toBeGreaterThanOrEqual(boxes[i - 1]![1]!);
      };
      await apart();
      await page.clock.runFor(12_100);
      await expect(scene).toHaveAttribute('data-stage', '1');
      expect(await species(page)).toEqual(['ivysaur', 'charmeleon', 'wartortle']);
      // The evolution's own pictures: each member's old and new shape in light, one member's beat after another's.
      await expect(scene.locator('img[data-role="new-light"]')).toHaveCount(3);
      await expect(scene.locator('img[data-role="new-flash"]')).toHaveCount(3);
      const delays = await scene.locator('img[data-role="new-light"]').evaluateAll((imgs) => imgs.map((img) => parseFloat(getComputedStyle(img).animationDelay) * 1000));
      const beat = await scene.locator('img[data-role="new-light"]').first().evaluate((img) => parseFloat(getComputedStyle(img).animationDuration) * 1000);
      expect(delays[1]! - delays[0]!).toBeGreaterThanOrEqual(beat);
      expect(delays[2]! - delays[1]!).toBeGreaterThanOrEqual(beat);
      await page.clock.runFor(20_400);
      await expect(scene).toHaveAttribute('data-stage', '2');
      expect(await species(page)).toEqual(['venusaur', 'charizard', 'blastoise']);
      await drawn(page);
      // The beats are CSS, on the real clock: let the three play out before looking at the evolved party.
      await page.waitForTimeout(9_000);
      await apart();
      await page.screenshot({ path: 'playtest/title-evolved.png' });
      await page.clock.runFor(21_200);
      await expect(scene).toHaveAttribute('data-party', '1');
      await expect(scene).toHaveAttribute('data-stage', '0');
    });

    test('a hidden tab holds the scene where it is', async ({ page }) => {
      await page.clock.install();
      await page.goto('/?screen=menu');
      const scene = page.getByTestId('title-scene');
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect(scene).toHaveAttribute('data-paused', 'true');
      await page.clock.runFor(30_000);
      await expect(scene).toHaveAttribute('data-stage', '0');
      expect(await scene.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').map((a) => (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty))).toEqual([]);
    });

    test('the summit stays behind the new-run steps without its party, and each starter stands in its window', async ({ page }) => {
      await page.goto('/?screen=menu');
      await page.getByTestId('btn-new-run').click();
      await expect(page.getByTestId('starter-select')).toBeVisible();
      await expect(page.getByTestId('title-scene')).toBeAttached();
      await expect(page.getByTestId('title-member')).toHaveCount(0);
      await page.getByTestId('btn-continue').click();
      const tile = page.getByTestId('starter-charmander');
      await tile.click();
      await expect(tile.locator('img[src*="charmander"]')).toBeVisible();
      await expect(page.getByTestId('starter-detail')).toContainText('Charmander');
      await page.screenshot({ path: 'playtest/title-starter.png' });
    });
  });
});

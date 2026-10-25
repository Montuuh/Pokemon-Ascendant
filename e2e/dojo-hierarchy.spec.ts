import { expect, test } from '@playwright/test';

// B10 / §2.9.4, §9.6 — preview and purchase remain separate, with one coordinated selection.
for (const [width, height] of [[1920, 1080], [1280, 720]]) {
  for (const text of [100, 150]) {
    for (const motion of ['reduce', 'no-preference'] as const) {
      test(`DojoHierarchy_SelectionPurchaseAndDeck_${height}_${text}_${motion}`, async ({ page }) => {
        await page.setViewportSize({ width: width!, height: height! });
        await page.emulateMedia({ reducedMotion: motion });
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        // The document's missing favicon predates B10; retain all product errors.
        page.on('console', m => {
          if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) errors.push(m.text());
        });
        await page.goto('/?screen=menu');
        await page.waitForFunction(() => !!window.__ascendant);
        await page.evaluate(text => {
          document.documentElement.style.setProperty('--text-scale', String(text / 100));
          const a = window.__ascendant!;
          a.run.new('squirtle', 7); a.run.fill(4); a.run.levelTo(16); a.run.city(0); a.run.pay(1000);
        }, text);
        await page.getByTestId('door-dojo').click();
        const ready = () => page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(i => i.decode()));
        });
        const money = () => page.evaluate(() => window.__ascendant!.run.state()!.money);
        const root = page.getByTestId('dojo-screen');
        const head = page.getByTestId('dojo-preview-tutor-headbutt');
        const swift = page.getByTestId('dojo-preview-tutor-swift');
        const headBuy = page.getByTestId('tutor-headbutt');
        const swiftBuy = page.getByTestId('tutor-swift');
        const deck = page.getByTestId('dojo-deck');
        await ready();
        await expect(head).toHaveAttribute('aria-pressed', 'true');
        await expect(headBuy).toHaveAccessibleName('Learn Headbutt, 150 ₽');
        await expect(headBuy).toContainText('150');
        await expect(headBuy).toHaveCSS('background-color', 'rgb(255, 203, 61)');
        await expect(swiftBuy).toHaveCSS('background-color', 'rgb(243, 231, 208)');
        await expect(deck).toHaveCSS('background-color', 'rgb(243, 231, 208)');
        await page.mouse.move(0, 0);
        const key = `${height}-${text}-${motion}`;
        await page.screenshot({ path: `playtest/art-review-2026-10-24/implementation/B10/verified/dojo-${key}.png` });

        await head.hover();
        await expect(page.getByRole('tooltip')).toContainText('Headbutt');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('tooltip')).toHaveCount(0);
        await swift.focus();
        await page.keyboard.press('Enter');
        await expect(swift).toBeFocused();
        await expect(swift).toHaveAttribute('aria-pressed', 'true');
        await expect(head).toHaveAttribute('aria-pressed', 'false');
        await page.mouse.move(0, 0);
        await expect(swiftBuy).toHaveCSS('background-color', 'rgb(255, 203, 61)');
        await expect(headBuy).toHaveCSS('background-color', 'rgb(243, 231, 208)');
        expect(await money()).toBe(1000);
        // Focusing the preview alone can leave its footer below a 720p / 150% shelf.
        // Activating the choice must reveal the complete decision, including the committing action.
        expect(await swift.locator('..').evaluate(card => {
          const c = card.getBoundingClientRect();
          const shelf = card.closest('[role="tabpanel"]')!.getBoundingClientRect();
          return c.top >= shelf.top && c.bottom <= shelf.bottom;
        })).toBe(true);
        await page.keyboard.press('Escape');
        await page.screenshot({ path: `playtest/art-review-2026-10-24/implementation/B10/verified/selected-${key}.png` });
        await expect(swift).toHaveCSS('outline-style', 'solid');

        // An unselected purchase still commits its own move, without a forced preview step.
        await headBuy.click();
        expect(await money()).toBe(850);
        await expect(head).toHaveAttribute('aria-pressed', 'true');
        await expect(headBuy).toBeDisabled();
        await expect(headBuy).toContainText('already known');
        await expect(head).toBeEnabled();
        expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.pool)).toContain('headbutt');

        await page.getByTestId('dojo-scrolls').focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('dojo-tab-eggs')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('dojo-scrolls')).toHaveAttribute('aria-pressed', 'true');
        const eggBuy = page.locator('[data-testid^="egg-"]').first();
        await expect(eggBuy).toContainText('250');
        await ready();
        await page.keyboard.press('Escape');
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `playtest/art-review-2026-10-24/implementation/B10/verified/eggs-${key}.png` });
        await page.getByTestId('dojo-tab-eggs').focus();
        await page.keyboard.press('ArrowRight');
        await expect(page.getByTestId('dojo-tab-passive')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('dojo-apprentice')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('dojo-scrolls')).toHaveAttribute('aria-pressed', 'false');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await expect(page.getByTestId('dojo-master')).toHaveAttribute('aria-pressed', 'true');

        await page.evaluate(() => window.__ascendant!.run.pay(0));
        await swift.focus();
        await page.keyboard.press('Enter');
        await expect(swift).toHaveAttribute('aria-pressed', 'true');
        await expect(swiftBuy).toBeDisabled();
        await expect(swiftBuy).toContainText('150');
        await expect(swift).toBeEnabled();
        if (motion === 'reduce') {
          await expect(root.locator('img[src*="/dojo/effects/"]')).toHaveCount(0);
        } else {
          await expect(root.locator('img[src*="/dojo/effects/"]')).toHaveCount(1);
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await expect(root.locator('img[src*="/dojo/effects/"]')).toHaveCount(0);
        }
        await page.keyboard.press('Escape');
        await ready();
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `playtest/art-review-2026-10-24/implementation/B10/verified/blocked-${key}.png` });

        await deck.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByTestId('dojo-deck-dialog');
        await expect(dialog).toBeVisible();
        await expect(page.getByTestId('dojo-comparison')).toContainText('Swift');
        await expect(page.getByTestId('move-manager')).toBeVisible();
        await ready();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(deck).toBeFocused();
        await deck.click();
        await ready();
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `playtest/art-review-2026-10-24/implementation/B10/verified/deck-${key}.png` });
        await page.getByTestId('dojo-deck-close').click();
        await expect(deck).toBeFocused();
        expect(await money()).toBe(0);
        expect(await root.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
        expect(errors).toEqual([]);
      });
    }
  }
}

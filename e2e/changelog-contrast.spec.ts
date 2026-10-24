import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// §9.6 / D5 — Tiny5 numerals must meet normal-text contrast in every accordion state.
const evidence = 'playtest/art-review-2026-10-24/implementation/B01';
const phase = process.env.B01_PHASE ?? 'after';

for (const width of [1920, 1280]) {
  for (const scale of [1, 1.5]) {
    test(`Changelog_AllPatchStates_Readable_${width}_${scale}`, async ({ page }) => {
      test.setTimeout(120_000);
      const height = width === 1920 ? 1080 : 720;
      const motion = scale === 1 ? 'no-preference' : 'reduce';
      const name = `${phase}-${width}-${height}-${scale * 100}`;
      mkdirSync(evidence, { recursive: true });
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: motion });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/?screen=changelog');
      await expect(page.getByTestId('changelog-screen')).toBeVisible();
      await page.evaluate((value) => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${evidence}/${name}-initial.png` });

      // Reveal every minor's patches, including older releases outside the initial viewport.
      const banners = page.locator('[data-level="minor"], [data-level="major"]');
      for (const banner of await banners.all()) {
        const trigger = banner.locator('h2 button');
        if (await trigger.getAttribute('aria-expanded') === 'false') await trigger.click();
      }
      const patches = page.locator('[data-level="patch"]');
      const count = await patches.count();
      expect(count).toBeGreaterThan(20); // Audit output was capped at 20; check the complete history.
      const results = [];
      for (const open of [false, true]) {
        for (const patch of await patches.all()) {
          const trigger = patch.locator('h3 button');
          if (await trigger.getAttribute('aria-expanded') !== String(open)) await trigger.click();
        }
        results.push(...await patches.evaluateAll((elements) => {
          const luminance = (color: string) => {
            const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => {
              const c = value / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
          };
          return elements.flatMap((element) => {
            const button = element.querySelector<HTMLButtonElement>('h3 button')!;
            const label = button.querySelector<HTMLElement>('.tabular')!;
            return [false, true].map((focused) => {
              if (focused) button.focus({ preventScroll: true });
              else button.blur();
              const style = getComputedStyle(label);
              const foreground = luminance(style.color);
              const background = luminance(style.backgroundColor);
              return {
                version: label.textContent, current: element.getAttribute('data-current'),
                expanded: button.getAttribute('aria-expanded'), focused,
                focusReached: focused ? document.activeElement === button : true,
                color: style.color, background: style.backgroundColor,
                ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
                family: style.fontFamily, weight: style.fontWeight, size: style.fontSize,
              };
            });
          });
        }));
      }

      // Exercise actual keyboard and pointer paths on the current patch.
      const current = page.locator('[data-level="patch"][data-current="true"]');
      const trigger = current.locator('h3 button');
      await current.scrollIntoViewIfNeeded();
      await trigger.focus();
      await page.keyboard.press('Space');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(trigger).toBeFocused();
      expect(await trigger.evaluate((node) => node.matches(':focus-visible'))).toBe(true);
      await page.screenshot({ path: `${evidence}/${name}-focus.png` });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('changelog-screen')).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await trigger.hover();
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await page.screenshot({ path: `${evidence}/${name}-collapsed.png` });
      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.scrollWidth > innerWidth,
        screen: (() => {
          const screen = document.querySelector('[data-testid="changelog-screen"]')!;
          return screen.scrollWidth > screen.clientWidth;
        })(),
      }));
      writeFileSync(`${evidence}/${name}.json`, JSON.stringify({ count, scale, motion, results, overflow, errors }, null, 2));
      expect(results.filter((result) => result.ratio < 4.5)).toEqual([]);
      expect(results.every((result) => result.focusReached)).toBe(true);
      expect(results.some((result) => result.current === 'true')).toBe(true);
      expect(overflow).toEqual({ viewport: false, screen: false });
      expect(errors).toEqual([]);
    });
  }
}

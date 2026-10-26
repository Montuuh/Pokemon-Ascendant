import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const evidence = 'playtest/art-review-2026-10-24/implementation/B02';
const phase = 'after';

// B02 / §2.1.7 — a lost League fight cannot undo a completed regional route.
for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
  for (const textScale of [1, 1.5]) {
    test(`Record_CompletedRegions_${viewport.width}_${textScale} — §2.1`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: textScale === 1 ? 'reduce' : 'no-preference' });
      await page.goto('/?screen=menu');
      await page.evaluate((scale) => {
        document.documentElement.style.setProperty('--text-scale', String(scale));
        window.__ascendant!.meta.reset();
      }, textScale);
      const results = [];
      for (const location of ['region-1', 'region-2', 'region-3', 'victory-road', 'bruno', 'agatha', 'will', 'lance', 'champion']) {
        const expected = location.startsWith('region-') ? Number(location.at(-1)) - 1 : 3;
        await page.evaluate((location) => {
          const a = window.__ascendant!;
          a.run.new('squirtle', 7);
          if (location === 'victory-road') a.run.victoryRoad();
          else if (!location.startsWith('region-')) a.run.league();
          a.run.patch((d) => {
            if (location.startsWith('region-')) d.regionIndex = Number(location.at(-1)) - 1;
            else if (location !== 'victory-road') {
              const rosterId = location === 'champion' ? location : `elite-four-${['bruno', 'agatha', 'will', 'lance'].indexOf(location) + 1}`;
              d.position = Object.values(d.map.nodes).find((n) => n.preview.rosterId === rosterId)!.id;
            }
            d.box.forEach((m) => { m.hp = 0; });
            d.phase = 'ended';
            d.outcome = 'defeat';
          });
          a.goTo('defeat');
        }, location);
        const open = page.getByTestId('btn-run-record');
        await open.focus();
        await page.keyboard.press('Enter');
        const record = page.getByTestId('run-record');
        await expect(record).toBeVisible();
        const value = record.locator('dt').filter({ hasText: /^Regions cleared$/ }).locator('..').locator('dd');
        const actual = await value.innerText();
        results.push({ location, expected, actual });
        const tag = `${phase}-${viewport.width}-${textScale * 100}-${location}`;
        mkdirSync(evidence, { recursive: true });
        if (location === 'champion' || location === 'victory-road' || location === 'region-3') {
          await page.screenshot({ path: `${evidence}/${tag}.png` });
        }
        await expect(value).toHaveText(`${expected} / 3`);
        await expect(value).toBeInViewport();
        const lastMember = record.getByRole('listitem').last();
        await lastMember.scrollIntoViewIfNeeded();
        await expect(lastMember).toBeInViewport();
        await expect(page.getByTestId('btn-close-run-record')).toBeInViewport();
        // The count remains accessible within the existing focus-managed record.
        await expect(page.getByTestId('btn-close-run-record')).toBeFocused();
        await page.keyboard.press('Tab');
        expect(await record.evaluate((node) => node.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Escape');
        await expect(record).toHaveCount(0);
        await expect(open).toBeFocused();
        await open.click();
        await expect(value).toHaveText(actual);
        await page.getByTestId('btn-close-run-record').click();
        await expect(open).toBeFocused();
      }
      writeFileSync(`${evidence}/${phase}-${viewport.width}-${textScale * 100}.json`, JSON.stringify(results, null, 2));
    });
  }
}

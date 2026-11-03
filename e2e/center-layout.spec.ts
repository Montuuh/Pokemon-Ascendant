import { expect, test } from '@playwright/test';

// §2.11.1 / D8 — the whole Box remains inspectable at both ends of its health scroller.
for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
  for (const scale of [1, 1.5]) {
    test(`Center full Box health and controls fit_${height}_${scale}`, async ({ page }) => {
      await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/?screen=menu'); await page.evaluate(() => localStorage.clear()); await page.reload();
      await page.waitForFunction(() => !!window.__ascendant);
      await page.evaluate((scale) => {
        document.documentElement.style.setProperty('--text-scale', String(scale));
        const a = window.__ascendant!; a.run.new('charmander', 7); a.run.patch((d) => { d.perks.boxBonus = 3; }); a.run.grantRelic('box-expander'); a.run.fill(11); a.run.fill(11); a.run.city(1); a.run.pay(2000); a.run.trauma(3);
        a.run.patch((d) => { d.box[0]!.hp = 1; d.box[1]!.hp = 0; });
      }, scale);
      await page.getByTestId('door-center').click();
      const rows = page.getByTestId('center-health').getByRole('listitem'); await expect(rows).toHaveCount(11);
      await expect(rows.first()).toContainText('HP 1/'); await expect(rows.first()).toContainText('Trauma 3'); await expect(rows.nth(1)).toContainText('HP 0/');
      await page.screenshot({ path: `playtest/ap-evolution-center-2026-10-30/full-box-top-${height}-${scale}.png` });
      for (const row of [rows.first(), rows.last()]) { await row.scrollIntoViewIfNeeded(); await expect(row).toBeInViewport(); }
      for (const id of ['door-center-heal', 'door-center-therapy', 'door-center-pc', 'door-center-groom', 'center-exit']) {
        const door = page.getByTestId(id); await door.scrollIntoViewIfNeeded(); await expect(door).toBeInViewport();
        expect(await door.evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === el || !!hit && el.contains(hit); })).toBe(true);
      }
      expect(await page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth + 1, y: document.documentElement.scrollHeight > innerHeight + 1 }))).toEqual({ x: false, y: false });
      await page.screenshot({ path: `playtest/ap-evolution-center-2026-10-30/full-box-${height}-${scale}.png` });
    });
  }
}

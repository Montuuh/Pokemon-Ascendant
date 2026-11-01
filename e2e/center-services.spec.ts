import { expect, test } from '@playwright/test';

for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
  for (const scale of [1, 1.5]) {
    for (const motion of ['reduce', 'no-preference'] as const) {
      test(`Manual healing and Therapy_${height}_${scale}_${motion}`, async ({ page }) => {
        await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: motion });
        await page.goto('/?screen=menu'); await page.evaluate(() => localStorage.clear()); await page.reload();
        await page.waitForFunction(() => !!window.__ascendant);
        await page.evaluate((scale) => {
          document.documentElement.style.setProperty('--text-scale', String(scale));
          const a = window.__ascendant!; a.run.new('squirtle', 7); a.run.fill(6); a.run.city(0); a.run.pay(2000); a.run.trauma(2);
          a.run.patch((d) => { for (const m of d.box) m.hp = 1; });
        }, scale);
        await page.getByTestId('door-center').click();
        const before = await page.evaluate(() => window.__ascendant!.run.state()!);
        await expect(page.getByTestId('center-health').getByRole('listitem')).toHaveCount(6);
        for (const mon of before.box) await expect(page.getByTestId(`center-health-${mon.uid}`)).toContainText('HP 1/');
        await page.getByTestId('door-center-therapy').focus(); await page.keyboard.press('Enter');
        const patient = page.getByTestId(`therapy-${before.box[0]!.speciesId}`);
        await expect(patient).toContainText('300'); await patient.focus(); await page.keyboard.press('Enter');
        const treated = await page.evaluate(() => window.__ascendant!.run.state()!);
        expect(treated.money).toBe(before.money - 300); expect(treated.box[0]!.traumaStacks).toBe(1); expect(treated.box[0]!.hp).toBe(1);
        expect(treated.box[0]!.level).toBe(before.box[0]!.level); expect(treated.activeUids).toEqual(before.activeUids);
        await page.keyboard.press('Escape'); await expect(page.getByTestId('door-center-therapy')).toBeFocused();
        await page.getByTestId('door-center-heal').focus(); await page.keyboard.press('Enter');
        if (motion === 'no-preference') await page.getByTestId('center-heal-stand').click();
        await expect(page.getByTestId('center-heal')).toHaveAttribute('data-beat', 'done');
        await expect(page.getByTestId('center-health')).toBeVisible();
        const healed = await page.evaluate(() => window.__ascendant!.run.state()!);
        expect(healed.box.every((m) => m.hp > 1)).toBe(true); expect(healed.money).toBe(treated.money); expect(healed.box[0]!.traumaStacks).toBe(1);
        await page.reload();
        await page.evaluate((scale) => document.documentElement.style.setProperty('--text-scale', String(scale)), scale);
        await expect(page.getByTestId('center-health')).toBeVisible();
        expect(await page.evaluate(() => window.__ascendant!.run.state()!.box.map((m) => m.hp))).toEqual(healed.box.map((m) => m.hp));
        await page.screenshot({ path: `playtest/ap-evolution-center-2026-10-30/services-${height}-${scale}-${motion}.png` });
      });
    }
  }
}

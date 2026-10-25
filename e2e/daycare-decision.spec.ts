import { expect, test, type Page } from '@playwright/test';

// §2.11.1 / D2, D4 — the cost in fights is visible before the Daycare row commits.
const evidence = process.env.B11_EVIDENCE ?? 'playtest/art-review-2026-10-24/implementation/B11/verified';

async function daycare(page: Page, money = 1000, count = 3) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(
    ({ money, count }) => {
      const dev = window.__ascendant!;
      dev.run.new('squirtle', 7);
      if (count > 1) dev.run.fill(count);
      dev.run.city(0);
      dev.run.pay(money);
    },
    { money, count },
  );
  await page.getByTestId('door-center').click();
  await page.getByTestId('door-center-daycare').click();
  await expect(page.getByTestId('center-daycare')).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
}

async function unchanged(page: Page, before: unknown) {
  expect(await page.evaluate(() => window.__ascendant!.run.state())).toEqual(before);
}

test.describe('Daycare decision — §2.11.1', () => {
  for (const [width, height] of [
    [1920, 1080],
    [1280, 720],
  ] as const) {
    for (const scale of [1, 1.5]) {
      for (const motion of ['reduce', 'no-preference'] as const) {
        test(`Decision_${height}_${scale}_${motion}_NamesAbsenceBeforePointerAndKeyboardPurchase`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height });
          await page.emulateMedia({ reducedMotion: motion });
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await daycare(page);
          await page.evaluate(
            (s) => document.documentElement.style.setProperty('--text-scale', String(s)),
            scale,
          );
          const before = await page.evaluate(() => window.__ascendant!.run.state());
          const row = page.getByTestId('daycare-squirtle');
          const cue = row.getByText('Misses next fight');
          await page.mouse.move(0, 0);
          await expect(cue).toBeHidden();
          await row.hover();
          await expect(cue).toBeVisible();
          const tip = page.getByRole('tooltip');
          await expect(tip).toContainText('Squirtle sits out the next fight');
          await expect(tip).toContainText('then returns to the first free team slot or waits in the Box');
          await expect(tip).toContainText('200');
          await unchanged(page, before);
          await page.screenshot({ path: `${evidence}/hover-${height}-${scale}-${motion}.png` });

          // Tab reaches an offer without buying; its own tooltip also names the consequence.
          await page.mouse.move(0, 0);
          await page.getByTestId('center-service-back').focus();
          await page.keyboard.press('Tab'); // the heading's InfoDot
          await page.keyboard.press('Tab'); // Squirtle
          await expect(row).toBeFocused();
          await expect(cue).toBeVisible();
          await expect(tip).toContainText('Squirtle sits out the next fight');
          expect(await row.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
          await expect(row).toHaveAccessibleName(/Squirtle.*200 Poké Dollars.*sits out the next fight/);
          await unchanged(page, before);
          await page.screenshot({ path: `${evidence}/keyboard-${height}-${scale}-${motion}.png` });

          // Measure the actual offer, including its cue at 150%, rather than only the viewport.
          const layout = await row.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return {
              overflow: el.scrollWidth > el.clientWidth + 1,
              outside: [...el.querySelectorAll('*')]
                .filter((child) => {
                  const style = getComputedStyle(child);
                  if (style.position === 'absolute' || style.visibility === 'hidden') return false;
                  const b = child.getBoundingClientRect();
                  return (
                    b.width > 0 && (b.left < r.left - 1 || b.right > r.right + 1 || b.bottom > r.bottom + 1)
                  );
                })
                .map((child) => child.textContent),
            };
          });
          expect(layout).toEqual({ overflow: false, outside: [] });
          await page.keyboard.press('Escape');
          await expect(page.getByTestId('center-daycare')).toBeHidden();
          await expect(page.getByTestId('door-center-daycare')).toBeFocused();
          await unchanged(page, before);
          await page.keyboard.press('Enter');
          const choice =
            motion === 'reduce' ? page.getByTestId('daycare-squirtle') : page.getByTestId('daycare-pidgey');
          const species = motion === 'reduce' ? 'squirtle' : 'pidgey';
          if (motion === 'reduce') await choice.click();
          else {
            await choice.focus();
            await page.keyboard.press('Enter');
          }
          await expect(page.getByTestId('daycare-used')).toContainText(
            'resting until the next fight is over',
          );
          const after = await page.evaluate(() => window.__ascendant!.run.state()!);
          const chosen = before!.box.find((mon) => mon.speciesId === species)!;
          expect(after.money).toBe(before!.money - 200);
          expect(after.resting).toBe(chosen.uid);
          expect(after.box.find((mon) => mon.uid === chosen.uid)!.level).toBe(chosen.level + 1);
          expect(after.activeUids).not.toContain(chosen.uid);
          expect(after.city!.daycareUsed).toBe(true);
          expect(errors).toEqual([]);
        });
      }
    }
  }

  for (const blocked of ['money', 'alone', 'last-healthy', 'maximum', 'alone-and-money'] as const) {
    test(`Blocked_${blocked}_KeepsPriceTimingReasonAndRejectsPointerAndKeyboard`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await daycare(page, blocked.includes('money') ? 0 : 1000, blocked.includes('alone') ? 1 : 3);
      if (blocked === 'last-healthy')
        await page.evaluate(() =>
          window.__ascendant!.run.patch((d) => {
            d.box.slice(1).forEach((mon) => {
              mon.hp = 0;
            });
          }),
        );
      if (blocked === 'maximum')
        await page.evaluate(() =>
          window.__ascendant!.run.patch((d) => {
            d.box[0]!.level = 60;
          }),
        );
      await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '1.5'));
      const row = page.getByTestId('daycare-squirtle');
      const reason =
        blocked === 'maximum'
          ? 'Maximum level'
          : blocked.includes('alone') || blocked === 'last-healthy'
            ? 'Someone else has to be able to fight'
            : 'Not enough money';
      await expect(row).toHaveAttribute('aria-disabled', 'true');
      await row.hover();
      await expect(row.getByText('Misses next fight')).toBeVisible();
      await expect(row).toContainText('200');
      await expect(page.getByRole('tooltip')).toContainText('Squirtle sits out the next fight');
      await expect(page.getByRole('tooltip')).toContainText(reason);
      if (blocked === 'maximum') {
        await expect(row).not.toContainText('61');
        await expect(row).toContainText('Lv 60');
        await expect(row.getByText('Maximum level', { exact: true })).toHaveCount(1);
      }
      const before = await page.evaluate(() => window.__ascendant!.run.state());
      await row.click({ force: true });
      await unchanged(page, before);
      await row.focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('Enter');
      await unchanged(page, before);
      await page.screenshot({ path: `${evidence}/blocked-${blocked}-720-150.png` });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('door-center-daycare')).toBeFocused();
    });
  }
});

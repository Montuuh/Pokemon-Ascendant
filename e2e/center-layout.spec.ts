import { expect, test, type Page } from '@playwright/test';

// §2.11.1 / §9.9.3 — healthy reception and persistent, usable healing feedback.
const evidence = process.env.B12_EVIDENCE ?? 'playtest/art-review-2026-10-24/implementation/B12/verified';
type State = 'healthy' | 'injured' | 'revived' | 'full-box';

async function arrive(page: Page, state: State, scale = 1) {
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(
    ({ state, scale }) => {
      document.documentElement.style.setProperty('--text-scale', String(scale));
      const a = window.__ascendant!;
      a.run.new('squirtle', 7);
      a.run.fill(3);
      a.run.city(0);
      a.run.patch((d) => {
        if (state === 'full-box') {
          d.perks.boxBonus = 2;
          while (d.box.length < 8) d.box.push({ ...d.box[1]!, uid: `b12-${d.box.length}` });
          d.box.forEach((m) => {
            m.hp = 1;
          });
        }
        if (state === 'injured') d.box[0]!.hp = 3;
        if (state === 'revived') {
          d.box[0]!.hp = 0;
        d.box[1]!.status = { kind: 'poison', turnsLeft: null };
        }
      });
    },
    { state, scale },
  );
  await page.getByTestId('door-center').click();
  await expect(page.getByTestId('center-screen')).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const room = document.querySelector<HTMLElement>('[data-testid="center-lobby"]')!;
    const total = document.querySelector<HTMLElement>('[data-testid="center-heal-total"]')!;
    const heal = document.querySelector<HTMLElement>('[data-testid="center-heal"]')!;
    const reception = heal.parentElement!;
    const rect = (el: Element) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom };
    };
    const exit = document.querySelector('[data-testid="center-exit"] span')!;
    const bounds = rect(room);
    const label = rect(exit);
    return {
      room: bounds,
      status: rect(total),
      reception: rect(reception),
      frame: getComputedStyle(reception).borderTopWidth,
      labelFits: label.bottom + 7 <= bounds.bottom && label.x - 7 >= bounds.x,
      overflow:
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
      spill: [...heal.querySelectorAll<HTMLElement>('li')].some((li) => li.scrollWidth > li.clientWidth + 1),
    };
  });
}

test.describe('Center composition — §2.11.1 / §9.9.3', () => {
  for (const [width, height] of [
    [1920, 1080],
    [1280, 720],
  ] as const) {
    for (const scale of [1, 1.5]) {
      for (const state of ['healthy', 'injured', 'revived', 'full-box'] as const) {
        test(`Reception_${state}_${height}_${scale}_PreservesRoomAndFeedback`, async ({ page }) => {
          await page.setViewportSize({ width, height });
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await arrive(page, state, scale);
          await expect(page.getByTestId('center-heal')).toHaveAttribute('data-beat', 'done');
          const before = await geometry(page);
          expect(before.overflow).toBe(false);
          if (state === 'healthy') {
            expect(before.frame).toBe('0px');
            expect(Math.abs(before.room.x + before.room.width / 2 - width / 2)).toBeLessThan(1);
            expect(before.status.y).toBeGreaterThanOrEqual(before.room.bottom);
            expect(before.labelFits).toBe(true);
            await expect(page.getByTestId('center-heal-report')).toHaveCount(0);
            await page.getByTestId('center-heal-stand').hover();
            await expect(page.getByRole('tooltip')).toBeVisible();
            await page.mouse.move(0, 0);
          } else {
            expect(before.status.x).toBeGreaterThan(before.room.right);
            const report = page.getByTestId('center-heal-report');
            await report.focus();
            await page.keyboard.press('Enter');
            const rows = page.getByTestId('center-heal').getByRole('listitem');
            await expect(rows).toHaveCount(state === 'full-box' ? 8 : 3);
            await rows.last().focus();
            await expect(rows.last()).toBeInViewport();
            if (state === 'revived') {
              await expect(page.getByText('Revived', { exact: true })).toBeVisible();
              await expect(page.getByText('Cured', { exact: true })).toBeVisible();
            }
            expect((await geometry(page)).spill).toBe(false);
            await page.screenshot({ path: `${evidence}/${state}-${height}-${scale}-report.png` });
            await report.focus();
            await page.keyboard.press('Space');
            await expect(rows.first()).toBeHidden();
            await report.click();
            await expect(rows.first()).toBeVisible();
            const after = await geometry(page);
            expect(after.room).toEqual(before.room);
            await report.click();
          }
          await page.getByTestId('door-center-pc').focus();
          await page.keyboard.press('Enter');
          await expect(page.getByTestId('center-service-back')).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(page.getByTestId('door-center-pc')).toBeFocused();
          await page.mouse.move(0, 0);
          await page.getByTestId('door-center-pc').blur();
          await page.screenshot({ path: `${evidence}/${state}-${height}-${scale}.png` });
          expect(errors).toEqual([]);
        });
      }
    }
  }

  for (const skip of ['none', 'pointer', 'keyboard'] as const) {
    test(`Healing_${skip}_KeepsReportAndRoomStableAfterAnimation`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize({ width: 1280, height: 720 });
      await arrive(page, 'revived', 1.5);
      const panel = page.getByTestId('center-heal');
      await expect(page.getByTestId('center-heal-total')).toHaveText('Healing…');
      await expect(page.getByTestId('center-counters')).toHaveAttribute('inert', '');
      await expect(page.getByTestId('door-center-pc')).not.toBeFocused();
      const before = (await geometry(page)).room;
      await page.screenshot({ path: `${evidence}/anim-${skip}-before.png` });
      if (skip === 'pointer') await page.getByTestId('center-heal-stand').click();
      if (skip === 'keyboard') {
        await page.getByTestId('center-heal-stand').focus();
        await page.keyboard.press('Enter');
      }
      await expect(panel).toHaveAttribute('data-beat', 'done', { timeout: 8000 });
      await expect(page.getByTestId('center-counters')).not.toHaveAttribute('inert');
      expect((await geometry(page)).room).toEqual(before);
      await page.getByTestId('center-heal-report').click();
      await expect(page.getByText('Revived', { exact: true })).toBeVisible();
      await expect(page.getByText('Cured', { exact: true })).toBeVisible();
      await page.screenshot({ path: `${evidence}/anim-${skip}-after.png` });
    });
  }
});

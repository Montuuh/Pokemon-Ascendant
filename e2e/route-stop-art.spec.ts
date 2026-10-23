import { expect, test, type Page } from '@playwright/test';

// §2.9.1–§2.9.2 / §2.12.3 — the grounded stop must leave every service usable at both supported desktop sizes.
async function atStop(page: Page, kind: 'merchant' | 'aid' | 'training') {
  await page.goto('/?screen=menu');
  await page.evaluate((kind) => {
    const a = window.__ascendant!;
    a.run.new('squirtle', kind === 'training' ? 11 : 7);
    a.run.fill(6);
    a.run.pay(1000);
    if (kind === 'training') a.run.victoryRoad();
    a.run.patch((d) => {
      if (kind === 'aid')
        d.box.forEach((m) => {
          m.hp = 1;
        });
      d.reachable = [Object.values(d.map.nodes).find((n) => n.kind === kind)!.id];
    });
    a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
    a.run.dispatch({ type: 'begin-combat' });
    a.goTo('map');
  }, kind);
  await expect(page.getByTestId('route-stop-vignette')).toHaveAttribute('data-stop', kind);
  await expect(page.getByTestId('route-stop-vignette').locator('img')).toHaveJSProperty('naturalWidth', 256);
}

async function fits(page: Page) {
  const overflow = await page.evaluate(() => {
    const visible = [
      ...document.querySelectorAll<HTMLElement>('main button, [data-testid="route-stop-vignette"]'),
    ].filter((e) => e.getClientRects().length > 0);
    return visible
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight;
      })
      .map((e) => e.dataset.testid ?? e.textContent);
  });
  expect(overflow).toEqual([]);
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test.describe(`Route stop art ${viewport.width} — §2.9 / §2.12.3`, () => {
    test.use({ viewport });

    test('Merchant_BuyRerollLeave_PreservesService', async ({ page }) => {
      await atStop(page, 'merchant');
      await expect(page.locator('[data-testid^="shop-slot-"]')).toHaveCount(4);
      await fits(page);
      await page.screenshot({ path: `playtest/a12-a13/merchant-${viewport.width}.png` });
      await page.getByTestId('shop-slot-0').click();
      await expect(page.getByTestId('shop-sold-0')).toBeVisible();
      await page.getByTestId('btn-reroll').click();
      await expect(page.getByTestId('btn-reroll')).toBeDisabled();
      await expect(page.getByTestId('shop-sold-0')).toBeVisible();
      await page.evaluate(() =>
        window.__ascendant!.run.patch((d) => {
          d.money = 0;
        }),
      );
      await expect(page.getByTestId('shop-slot-1')).toBeDisabled();
      await page.getByTestId('btn-leave-shop').click();
      await expect(page.getByTestId('map-screen')).toBeVisible();
    });

    test('Nurse_SixPatients_HealAndLeave', async ({ page }) => {
      await atStop(page, 'aid');
      await expect(page.getByTestId('aid-box').locator('li')).toHaveCount(6);
      await expect(page.getByTestId('aid-box')).toHaveAttribute('data-beat', 'done');
      await fits(page);
      await page.screenshot({ path: `playtest/a12-a13/aid-${viewport.width}.png` });
      await page.getByTestId('btn-leave-aid').click();
      await expect(page.getByTestId('map-screen')).toBeVisible();
    });

    test('Training_AllChoicesLongestBranch_TrainAndLeave', async ({ page }) => {
      await atStop(page, 'training');
      await page.locator('[data-testid^="train-mon-"]').first().click();
      await expect(page.locator('[data-testid^="train-upgrade-"]')).toHaveCount(5);
      for (const upgrade of ['stat', 'move-upgrade', 'level', 'evolve', 'move-replace']) {
        const choice = page.getByTestId(`train-upgrade-${upgrade}`);
        if ((await choice.getAttribute('aria-disabled')) !== 'true') await choice.click();
        await fits(page);
      }
      await page.getByTestId('train-upgrade-move-replace').click();
      await fits(page);
      await page.mouse.move(2, 2);
      await expect(page.getByRole('tooltip')).toBeHidden();
      await page.screenshot({ path: `playtest/a12-a13/training-replace-${viewport.width}.png` });
      await page.locator('[data-testid^="train-out-"]').first().click();
      await page.locator('[data-testid^="train-in-"]').first().click();
      await expect(page.getByTestId('btn-train')).toBeEnabled();
      await page.getByTestId('btn-train').click();
      await expect(page.getByTestId('map-screen')).toBeVisible();
    });

    test('Training_LongLearnset_AllReplacementChoicesFit', async ({ page }) => {
      await atStop(page, 'training');
      // Tauros has the largest single-stage learnset: eight future moves at Lv 5.
      await page.evaluate(() =>
        window.__ascendant!.run.patch((d) => {
          const m = d.box[5]!;
          m.speciesId = 'tauros';
          m.level = 5;
          m.pool = ['tackle', 'tail-whip'];
          m.moveIds = ['tackle', 'tail-whip'];
        }),
      );
      await page.locator('[data-testid^="train-mon-"]').last().click();
      await page.getByTestId('train-upgrade-move-replace').click();
      await expect(page.locator('[data-testid^="train-in-"]')).toHaveCount(8);
      await fits(page);
      await page.mouse.move(2, 2);
      await expect(page.getByRole('tooltip')).toBeHidden();
      await page.screenshot({ path: `playtest/a12-a13/training-long-${viewport.width}.png` });
      await page.getByTestId('btn-leave-training').click();
      await expect(page.getByTestId('map-screen')).toBeVisible();
    });
  });
}

test('Nurse_NormalMotion_SkipStillWorks — §9.9.3', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await atStop(page, 'aid');
  await expect(page.getByTestId('aid-box')).toHaveAttribute('data-beat', 'run');
  await page.getByTestId('aid-box-stand').click();
  await expect(page.getByTestId('aid-box')).toHaveAttribute('data-beat', 'done');
});

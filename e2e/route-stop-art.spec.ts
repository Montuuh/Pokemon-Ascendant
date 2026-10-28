import { expect, test, type Page } from '@playwright/test';

// §2.9.1–§2.9.2 / §2.12.3 — the grounded stop must leave every service usable at both supported desktop sizes.
async function atStop(
  page: Page,
  kind: 'merchant' | 'aid' | 'training',
  opts: { text?: number; healthy?: boolean } = {},
) {
  await page.goto('/?screen=menu');
  await page.evaluate(
    ([kind, text, healthy]) => {
      document.documentElement.style.setProperty('--text-scale', String(text / 100));
      const a = window.__ascendant!;
      a.run.new('squirtle', kind === 'training' ? 11 : 7);
      a.run.fill(6);
      a.run.pay(1000);
      if (kind === 'training') a.run.victoryRoad();
      a.run.patch((d) => {
        if (kind === 'aid' && !healthy)
          d.box.forEach((m) => {
            m.hp = 1;
          });
        d.reachable = [Object.values(d.map.nodes).find((n) => n.kind === kind)!.id];
      });
      a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
      a.run.dispatch({ type: 'begin-combat' });
      a.goTo('map');
    },
    [kind, opts.text ?? 100, !!opts.healthy] as const,
  );
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

// A service is one visit: the scene and what acts on it are a single composition, and nothing in it moves as the
// choices are made. Measured, not eyeballed.
const box = async (page: Page, id: string) => (await page.getByTestId(id).boundingBox())!;

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
])
  for (const text of [100, 150]) {
    test.describe(`Service visit ${viewport.width} text ${text}`, () => {
      test.use({ viewport });

      test('Training_TraineeOnTheMat_TrainUnderScene_NothingAboveMoves', async ({ page }) => {
        await atStop(page, 'training', { text });
        // Before anyone is chosen: nobody on the mat, the five upgrades already standing (greyed), Train waiting.
        await expect(page.getByTestId('training-trainee')).toHaveCount(0);
        await expect(page.locator('[data-testid^="train-upgrade-"]')).toHaveCount(5);
        await expect(page.getByTestId('train-upgrade-stat')).toHaveAttribute('aria-disabled', 'true');
        await expect(page.getByTestId('btn-train')).toBeDisabled();
        // The cards of a row stand as one block, and a wide window seats all five in one row.
        const cards = await page.locator('[data-testid^="train-upgrade-"]').evaluateAll((els) =>
          els.map((e) => {
            const r = e.getBoundingClientRect();
            return { y: Math.round(r.y), h: Math.round(r.height) };
          }),
        );
        for (const c of cards.filter((c) => c.y === cards[0]!.y)) expect(c.h).toBe(cards[0]!.h);
        if (viewport.width >= 1800) expect(new Set(cards.map((c) => c.y)).size).toBe(1);
        const firstMon = page.locator('[data-testid^="train-mon-"]').first();
        const monBefore = (await firstMon.boundingBox())!;
        const statBefore = await box(page, 'train-upgrade-stat');

        await firstMon.click();
        const trainee = page.getByTestId('training-trainee');
        await expect(trainee).toBeVisible();
        await expect(trainee).toHaveJSProperty('naturalWidth', 32);
        const scene = await box(page, 'route-stop-vignette');
        const t = (await trainee.boundingBox())!;
        // On the scene, drawn at a whole multiple of its 32 art pixels.
        expect(t.x).toBeGreaterThanOrEqual(scene.x);
        expect(t.x + t.width).toBeLessThanOrEqual(scene.x + scene.width);
        expect(t.y + t.height).toBeLessThanOrEqual(scene.y + scene.height);
        expect(Number.isInteger(t.width / 32)).toBe(true);
        // The upgrades stood still when a Pokémon was chosen; so did the row of Pokémon.
        expect(await box(page, 'train-upgrade-stat')).toEqual(statBefore);
        expect((await firstMon.boundingBox())!).toEqual(monBefore);

        await page.getByTestId('train-upgrade-stat').click();
        await page.getByTestId('train-stat-attack').click();
        // Train is the scene's own foot: directly under it, centred on it, and where it stood before anything was chosen.
        const train = await box(page, 'btn-train');
        expect(train.y).toBeGreaterThanOrEqual(scene.y + scene.height);
        expect(train.y - (scene.y + scene.height)).toBeLessThan(40);
        expect(Math.abs(train.x + train.width / 2 - (scene.x + scene.width / 2))).toBeLessThan(2);
        expect((await firstMon.boundingBox())!).toEqual(monBefore);
        await expect(page.getByTestId('btn-train')).toBeEnabled();
        // Seated left of the choices, Train is still the last stop of the Tab walk: who → what → how → Train.
        await page.getByTestId('train-stat-speed').focus();
        await page.keyboard.press('Tab');
        await expect(page.getByTestId('btn-train')).toBeFocused();
        await fits(page);

        // A different Pokémon steps on in place of the first.
        await page.locator('[data-testid^="train-mon-"]').nth(1).click();
        await expect(trainee).toHaveCount(1);
        await expect(page.getByTestId('btn-train')).toBeDisabled();
        await page.screenshot({ path: `playtest/b18/training-${viewport.width}-${text}.png` });
        await page.getByTestId('btn-leave-training').click();
        await expect(page.getByTestId('map-screen')).toBeVisible();
      });

      test('Training_Train_TellsItsResultOnTheSceneFoot_ThenWalksOn_ClickSkips', async ({ page }) => {
        await atStop(page, 'training', { text });
        const uid = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.uid);
        const attack = await page.evaluate(
          () => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0,
        );
        await page.getByTestId(`train-mon-${uid}`).click();
        await page.getByTestId('train-upgrade-stat').click();
        await page.getByTestId('train-stat-attack').click();
        const scene = await box(page, 'route-stop-vignette');
        const trainBefore = await box(page, 'btn-train');
        const centre = (b: { x: number; width: number }) => b.x + b.width / 2;
        await page.getByTestId('btn-train').click();
        // The result stands where Train stood, with the choices frozen; the road is not taken yet.
        await expect(page.getByTestId('train-result')).toHaveText('Attack +6');
        const told = await box(page, 'btn-train');
        expect([told.y, told.height]).toEqual([trainBefore.y, trainBefore.height]);
        expect(Math.abs(centre(told) - centre(trainBefore))).toBeLessThan(2);
        await expect(page.getByTestId('training-screen')).toBeVisible();
        expect(await page.evaluate(() => window.__ascendant!.run.state()!.phase)).toBe('training');
        expect(await page.getByTestId('train-upgrade-stat').evaluate((e) => !!e.closest('[inert]'))).toBe(
          true,
        );
        await page.screenshot({ path: `playtest/b18/training-result-${viewport.width}-${text}.png` });
        // A click on the foot of the scene skips what is left of the beat (no double training).
        await page.getByTestId('btn-train').click();
        await expect(page.getByTestId('map-screen')).toBeVisible();
        const after = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0);
        expect(after).toBe(attack + 6);
        expect(scene.height).toBeGreaterThan(0);
      });

      test('Training_Trainees_StandOnOneLineOfTheMat', async ({ page }) => {
        await atStop(page, 'training', { text });
        // Magnemite's art stops at row 20 of its 32 px cell, Charizard's at 31: their feet still land on the same line.
        await page.evaluate(() =>
          window.__ascendant!.run.patch((d) => {
            d.box[0]!.speciesId = 'magnemite';
            d.box[1]!.speciesId = 'charizard';
            d.box[2]!.speciesId = 'squirtle';
          }),
        );
        const feet: number[] = [];
        for (let i = 0; i < 3; i++) {
          await page.locator('[data-testid^="train-mon-"]').nth(i).click();
          const trainee = page.getByTestId('training-trainee');
          await expect(trainee).toHaveJSProperty('complete', true);
          // Measured by the sprite's own pixels, in the page: the lowest opaque row, then its place on the screen.
          feet.push(
            await trainee.evaluate(async (img: HTMLImageElement) => {
              await new Promise((r) => setTimeout(r, 400));
              const c = document.createElement('canvas');
              c.width = img.naturalWidth;
              c.height = img.naturalHeight;
              const g = c.getContext('2d')!;
              g.drawImage(img, 0, 0);
              const px = g.getImageData(0, 0, c.width, c.height).data;
              let low = 0;
              for (let y = c.height - 1; y >= 0 && !low; y--)
                for (let x = 0; x < c.width; x++) if (px[(y * c.width + x) * 4 + 3]! > 0) low = y;
              const r = img.getBoundingClientRect();
              return Math.round(r.y + ((low + 1) * r.height) / c.height);
            }),
          );
        }
        expect(Math.max(...feet) - Math.min(...feet)).toBeLessThanOrEqual(1);
      });

      test('Nurse_TotalUnderScene_BarsBesideIt_IdleStandsAlone', async ({ page }) => {
        await atStop(page, 'aid', { text });
        await expect(page.getByTestId('aid-box')).toHaveAttribute('data-beat', 'done');
        const scene = await box(page, 'route-stop-vignette');
        const total = await box(page, 'aid-box-total');
        // The result is under the one who produced it, centred on her scene.
        expect(total.y).toBeGreaterThanOrEqual(scene.y + scene.height);
        expect(total.y - (scene.y + scene.height)).toBeLessThan(40);
        expect(Math.abs(total.x + total.width / 2 - (scene.x + scene.width / 2))).toBeLessThan(2);
        // The bars stand to the right of the scene, from the same top.
        const bars = await page.getByTestId('aid-box').locator('li').first().boundingBox();
        expect(bars!.x).toBeGreaterThanOrEqual(scene.x + scene.width);
        expect(Math.abs(bars!.y - scene.y)).toBeLessThan(2);
        await fits(page);
        await page.screenshot({ path: `playtest/b18/aid-${viewport.width}-${text}.png` });

        // Nobody hurt: no bars, and the scene stands alone in the middle of the window, its total under it.
        await atStop(page, 'aid', { text, healthy: true });
        await expect(page.getByTestId('aid-box').locator('li')).toHaveCount(0);
        const alone = await box(page, 'route-stop-vignette');
        expect(Math.abs(alone.x + alone.width / 2 - viewport.width / 2)).toBeLessThan(2);
        const idle = await box(page, 'aid-box-total');
        expect(idle.y).toBeGreaterThanOrEqual(alone.y + alone.height);
        await fits(page);
      });
    });
  }

test('Training_BackArrowDuringTheBeat_StillTrains_AndTheTraineeStaysOnTheMat', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await atStop(page, 'training');
  const attack = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0);
  await page.locator('[data-testid^="train-mon-"]').first().click();
  await page.getByTestId('train-upgrade-stat').click();
  await page.getByTestId('train-stat-attack').click();
  await page.getByTestId('btn-train').click();
  // The hop is under way (a click on the foot would skip it), and the title's line has gone quiet without moving.
  await expect(page.getByTestId('training-trainee')).toHaveCSS('animation-name', /hop/i);
  await expect(page.locator('main p').first()).toHaveCSS('visibility', 'hidden');
  await expect(page.getByTestId('train-result')).toHaveText('Attack +6');
  // The result lands with the trainee on the mat, not after it blinked out and back.
  const trainee = page.getByTestId('training-trainee');
  await expect(trainee).toHaveCSS('opacity', '1');
  await expect(trainee).toHaveCSS('animation-name', /hop/i);
  // The way back, pressed after the result was told, still trains: the player has seen it happen.
  await page.getByTestId('btn-leave-training').click();
  await expect(page.getByTestId('map-screen')).toBeVisible();
  const after = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0);
  expect(after).toBe(attack + 6);
});

test('Training_ClickDuringTheHop_SkipsStraightToTheRoad', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await atStop(page, 'training');
  const attack = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0);
  await page.locator('[data-testid^="train-mon-"]').first().click();
  await page.getByTestId('train-upgrade-stat').click();
  await page.getByTestId('train-stat-hp').click();
  await page.getByTestId('btn-train').click();
  await page.getByTestId('btn-train').click();
  await expect(page.getByTestId('map-screen')).toBeVisible();
  const after = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.hp ?? 0);
  expect(after).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0)).toBe(
    attack,
  );
});

// A Level Push is a level-up: the same fanfare and stat window the fight's end plays, with the move it teaches.
for (const motion of ['no-preference', 'reduce'] as const)
  test(`Training_LevelPush_PlaysTheLevelUpWindow_WithTheTaughtMove_${motion}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: motion });
    await atStop(page, 'training');
    // Squirtle learns Water Gun at Lv 8: one level short of it, the push teaches it.
    await page.evaluate(() =>
      window.__ascendant!.run.patch((d) => {
        const m = d.box[0]!;
        m.level = 7;
        m.xp = 0;
        m.pool = ['tackle', 'tail-whip', 'bubble'];
        m.moveIds = ['tackle', 'tail-whip', 'bubble'];
      }),
    );
    const uid = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.uid);
    await page.getByTestId(`train-mon-${uid}`).click();
    await page.getByTestId('train-upgrade-level').click();
    const scene = await box(page, 'route-stop-vignette');
    await page.getByTestId('btn-train').click();
    const panel = page.getByTestId(`levelup-panel-${uid}`);
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('train-result')).toHaveText('Lv 7 → 8');
    await expect(panel).toContainText('Squirtle grew to Lv 8!');
    await expect(panel).toContainText('Water Gun');
    // Said aloud too, since the window itself is silent on this screen.
    await expect(page.getByTestId('training-screen').locator('p.sr-only')).toContainText('New: Water Gun');
    // Finished and standing, not folding: with motion off by a settled clock, not by an animation's fill.
    await expect(panel).toHaveCSS('opacity', '1');
    expect(await panel.evaluate((e) => /folding/.test(e.className))).toBe(false);
    // Under the scene, inside its column, and nothing above it moved.
    const p = (await panel.boundingBox())!;
    expect(p.y).toBeGreaterThanOrEqual(scene.y + scene.height);
    expect(p.x).toBeGreaterThanOrEqual(scene.x - 1);
    expect(p.x + p.width).toBeLessThanOrEqual(scene.x + scene.width + 1);
    expect((await box(page, 'route-stop-vignette')).y).toBe(scene.y);
    await page.screenshot({ path: `playtest/b18/level-push-${motion}.png` });
    // The push still lands once, with the move in the pool, whether the beat plays out or is skipped.
    await page.getByTestId('btn-train').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!);
    expect(after.level).toBe(8);
    expect(after.pool).toContain('water-gun');
  });

test('Training_RunSwappedDuringTheBeat_IsNotTrained', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await atStop(page, 'training');
  await page.locator('[data-testid^="train-mon-"]').first().click();
  await page.getByTestId('train-upgrade-stat').click();
  await page.getByTestId('train-stat-attack').click();
  await page.getByTestId('btn-train').click();
  // The run is abandoned for a new one under the screen: the stored training must not land in it.
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 7);
    a.goTo('map');
  });
  await expect(page.getByTestId('training-screen')).toBeHidden();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.boosts?.attack ?? 0)).toBe(0);
});

// A level that teaches two moves is the tallest window; at 720p with large text it must still fit under its scene.
for (const text of [100, 150])
  test(`Training_LevelPushTeachingTwoMoves_FitsAt720p_Text${text}_NoScroll`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await atStop(page, 'training', { text });
    // Snorlax learns Harden and Ice Beam together at Lv 24.
    await page.evaluate(() =>
      window.__ascendant!.run.patch((d) => {
        const m = d.box[0]!;
        m.speciesId = 'snorlax';
        m.level = 23;
        m.xp = 0;
        m.pool = ['headbutt', 'amnesia', 'rest', 'body-slam'];
        m.moveIds = ['headbutt', 'amnesia', 'rest', 'body-slam'];
      }),
    );
    const uid = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.uid);
    await page.getByTestId(`train-mon-${uid}`).click();
    await page.getByTestId('train-upgrade-level').click();
    await page.getByTestId('btn-train').click();
    const panel = page.getByTestId(`levelup-panel-${uid}`);
    await expect(panel).toContainText('Ice Beam');
    await expect(panel).toContainText('Harden');
    const fit = await page
      .getByTestId('training-screen')
      .evaluate((e) => ({ scroll: e.scrollHeight, client: e.clientHeight }));
    expect(fit.scroll).toBeLessThanOrEqual(fit.client);
    await page.screenshot({ path: `playtest/b18/level-push-two-moves-${text}.png` });
  });

test('Training_LevelPush_EscapeAndAClickOnTheWindowSkipToTheRoad', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const skip of ['escape', 'click'] as const) {
    await atStop(page, 'training');
    const uid = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.uid);
    const level = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.level);
    await page.getByTestId(`train-mon-${uid}`).click();
    await page.getByTestId('train-upgrade-level').click();
    await page.getByTestId('btn-train').click();
    const panel = page.getByTestId(`levelup-panel-${uid}`);
    await expect(panel).toBeVisible();
    if (skip === 'escape') await page.keyboard.press('Escape');
    else await panel.click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.level)).toBe(level + 1);
  }
});

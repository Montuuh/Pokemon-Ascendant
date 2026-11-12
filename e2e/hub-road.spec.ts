import { expect, test, type Page } from '@playwright/test';

// §8.4, §8.4.1, §8.4.6, §8.15 — the Road to the Plateau: the Trainer Hub is a different place as the career advances,
// what is not earned yet stands in it as a silhouette, an arrival plays once, the Hall of Fame is a room of its own,
// and an account from before the road is kept.

type Hub = { hub: (place: string, opts?: { fresh?: boolean }) => void };
const meta = (page: Page, run: string) => page.evaluate(`(() => { const meta = window.__ascendant.meta; ${run}; })()`);

async function fresh(page: Page): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=hub');
  await page.waitForFunction(() => !!window.__ascendant);
}
const painted = (page: Page) => page.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0));

const PLACES = ['bedroom', 'lab', 'center', 'plateau'] as const;

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test.describe(`The Road to the Plateau ${viewport.width}`, () => {
    test.use({ viewport });

    for (const place of PLACES) {
      test(`Hub_At_${place}_IsThatRoom_WholeOnScreen_AtAWholePixelScale`, async ({ page }) => {
        // Every picture the place asks for is there: no request comes back missing.
        const missing: string[] = [];
        page.on('response', (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
        await fresh(page);
        await page.evaluate((p) => (window.__ascendant!.meta as unknown as Hub).hub(p), place);
        await expect(page.getByTestId('hub-screen')).toHaveAttribute('data-place', place);
        await expect(page.getByTestId('hub-place')).toHaveAttribute('data-place', place);
        // Seen already: the room opens at rest.
        await expect(page.getByTestId('hub-arrival')).toHaveCount(0);
        const room = page.getByTestId('hub-lobby');
        // D9 — one pixel density: a map pixel is a whole number of the screen's own pixels, between ×2 and ×4.
        const scale = Number(await room.getAttribute('data-scale'));
        const dpr = await page.evaluate(() => window.devicePixelRatio);
        expect(Number.isInteger(scale * dpr) && scale >= 2 && scale <= 4, `scale ${scale} at ${dpr}`).toBe(true);
        // The first day's three doors are in every room, and the way back to the title.
        for (const id of ['run', 'card', 'pc']) await expect(page.getByTestId(`kiosk-${id}`)).toBeVisible();
        await expect(page.getByTestId('hub-exit')).toBeVisible();
        // Every door, silhouette and prop is inside the window (the worst case: the plates under the south wall).
        const boxes = await page.locator('[data-testid^="kiosk-"], [data-testid^="locked-"], [data-testid^="prop-"], [data-testid="hub-exit"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.left, r.top, r.right, r.bottom]));
        for (const [l, t, r, b] of boxes) {
          expect(l).toBeGreaterThanOrEqual(0);
          expect(t).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(viewport.width);
          expect(b).toBeLessThanOrEqual(viewport.height);
        }
        await painted(page);
        await page.screenshot({ path: `playtest/hub-${place}-${viewport.width}.png` });
        // Every door in the place opens its kiosk and comes back.
        const doors = await page.locator('[data-testid^="kiosk-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('kiosk-'.length)));
        expect(doors.length).toBe({ bedroom: 3, lab: 5, center: 7, plateau: 7 }[place]);
        for (const id of doors.filter((d) => d !== 'run')) {
          await page.getByTestId(`kiosk-${id}`).click();
          await expect(page.getByTestId(`hub-panel-${id}`)).toBeVisible();
          await painted(page);
          await page.getByTestId('btn-hub-lobby').click();
        }
        expect(missing).toEqual([]);
      });
    }

    test('Hub_HallOfFame_IsARoomOfItsOwn_UpTheStairs_AndThePcLinksToIt', async ({ page }) => {
      await fresh(page);
      // At the Plateau without a win: the stairs are a silhouette that says what opens them, and the PC has no link.
      await page.evaluate(() => (window.__ascendant!.meta as unknown as Hub).hub('plateau'));
      await expect(page.getByTestId('locked-hall')).toHaveAccessibleName(/Hall of Fame, locked\. Beat the Champion/);
      await expect(page.getByTestId('kiosk-hall')).toHaveCount(0);
      await page.getByTestId('kiosk-pc').click();
      await expect(page.getByTestId('pc-link-hall')).toHaveCount(0);
      await page.getByTestId('btn-hub-lobby').click();
      // A Champion: the stairs open the room, with the newest winning team standing in it.
      await page.evaluate(() => (window.__ascendant!.meta as unknown as Hub).hub('hall'));
      await page.getByTestId('kiosk-hall').click();
      await expect(page.getByTestId('hall-room')).toHaveAttribute('data-run', '12');
      await expect(page.getByTestId('hall-mon-0')).toHaveAccessibleName('Charizard, Lv 52');
      await expect(page.getByTestId('hall-mon-2')).toBeVisible();
      await expect(page.getByTestId('hall-12')).toHaveAttribute('aria-pressed', 'true');
      await painted(page);
      await page.screenshot({ path: `playtest/hub-hall-${viewport.width}.png` });
      // And the PC keeps a link to it.
      await page.getByTestId('btn-hub-lobby').click();
      await page.getByTestId('kiosk-pc').click();
      await page.getByTestId('pc-link-hall').click();
      await expect(page.getByTestId('hall-room')).toBeVisible();
    });
  });
}

test.describe('Silhouettes — §8.4.6', () => {
  test('Hub_FirstDay_ShowsEveryFeatureToCome_AsASilhouetteThatNamesWhatBringsIt_AndOpensNothing', async ({ page }) => {
    await fresh(page);
    await expect(page.getByTestId('hub-screen')).toHaveAttribute('data-place', 'bedroom');
    for (const id of ['aide', 'guide', 'mart', 'kit', 'badges', 'trophies', 'dex', 'banner', 'ladder']) await expect(page.getByTestId(`locked-${id}`)).toBeVisible();
    // The Hall of Fame's stairs stand only at the Plateau.
    await expect(page.getByTestId('locked-hall')).toHaveCount(0);
    // §8.4.1 — the Item Guide arrives with Oak's aide: not a door on the first day.
    await expect(page.getByTestId('kiosk-guide')).toHaveCount(0);
    const mart = page.getByTestId('locked-mart');
    await expect(mart).toHaveAccessibleName('Poké Mart, locked. Reach Trainer rank.');
    await expect(page.getByTestId('locked-badges')).toHaveAccessibleName('Badge Case, locked. Win a Badge.');
    // Honest: focus says what brings it, and pressing it does nothing.
    await mart.focus();
    await expect(page.getByRole('tooltip')).toContainText('Reach Trainer rank');
    await mart.click();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('hub-screen')).toHaveAttribute('data-kiosk', 'lobby');
    await page.screenshot({ path: 'playtest/hub-bedroom-locked-tip.png' });
  });

  test('Hub_TheCareerStandsOnTheFloor_AsItIsEarned', async ({ page }) => {
    await fresh(page);
    await meta(page, 'meta.hub("center"); meta.patch((a) => { a.badges = ["boulder-badge"]; a.ladder = 2; a.xp = 6000; a.hubSeen = [...a.hubSeen, "badges", "ladder", "banner"]; })');
    await expect(page.getByTestId('prop-badges')).toBeVisible();
    await page.getByTestId('prop-badges').focus();
    await expect(page.getByRole('tooltip')).toContainText('1 of 12 Badges won');
    // §8.14 — the case shows what is won: one Badge in its socket, eleven sockets empty.
    await expect(page.locator('[data-testid^="pip-"]')).toHaveCount(1);
    await expect(page.getByTestId('pip-boulder-badge')).toBeVisible();
    await expect(page.getByTestId('prop-ladder')).toBeVisible();
    await expect(page.getByTestId('prop-banner')).toBeVisible();
    await expect(page.getByTestId('locked-trophies')).toBeVisible();
    await painted(page);
    await page.screenshot({ path: 'playtest/hub-center-career.png' });
  });
});

test.describe('Arrivals — §8.4.6', () => {
  test('Hub_AMove_IsAnnouncedOnce_AndNeverAgain', async ({ page }) => {
    await fresh(page);
    await page.evaluate(() => (window.__ascendant!.meta as unknown as Hub).hub('lab', { fresh: true }));
    await expect(page.getByTestId('hub-screen')).toHaveAttribute('data-place', 'lab');
    await expect(page.getByTestId('hub-arrival')).toHaveText("You arrive at Professor Oak's Lab.");
    // The move brought the aide and his Item Guide: their silhouettes lift and their plates pulse with it.
    await expect(page.getByTestId('hub-warp')).toHaveCount(1);
    for (const id of ['aide', 'guide']) {
      await expect(page.getByTestId(`kiosk-${id}`)).toHaveAttribute('data-fresh', 'true');
      await expect(page.getByTestId(`lifting-${id}`)).toHaveCount(1);
    }
    // The box stands in the header, clear of the room, its plates and the way out.
    const [box, room] = await Promise.all([page.getByTestId('hub-arrival').boundingBox(), page.getByTestId('hub-lobby').boundingBox()]);
    expect(box!.y + box!.height).toBeLessThanOrEqual(room!.y);
    await painted(page);
    await page.screenshot({ path: 'playtest/hub-arrival-lab.png' });
    // Skippable: any key ends it, and the room is already usable under it.
    await page.keyboard.press('Shift');
    await expect(page.getByTestId('hub-arrival')).toHaveCount(0);
    await expect(page.getByTestId('hub-warp')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('hub-screen')).toHaveAttribute('data-place', 'lab');
    await expect(page.getByTestId('hub-arrival')).toHaveCount(0);
    await expect(page.getByTestId('hub-screen')).toHaveAttribute('data-fresh', '');
  });

  test('Hub_ANewFeature_LiftsItsSilhouette_PulsesItsPlate_TakesTheFocus_Once', async ({ page }) => {
    await fresh(page);
    await page.evaluate(() => (window.__ascendant!.meta as unknown as Hub).hub('lab'));
    await expect(page.getByTestId('locked-mart')).toBeVisible();
    await meta(page, 'meta.rank(3)');
    await expect(page.getByTestId('kiosk-mart')).toHaveAttribute('data-fresh', 'true');
    await expect(page.getByTestId('kiosk-mart')).toBeFocused();
    await expect(page.getByTestId('lifting-mart')).toHaveCount(1);
    await expect(page.getByTestId('locked-mart')).toHaveCount(0);
    await expect(page.getByTestId('hub-arrival')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('kiosk-mart')).toBeVisible();
    await expect(page.locator('[data-fresh="true"]')).toHaveCount(0);
    await expect(page.getByTestId('lifting-mart')).toHaveCount(0);
  });
});

test.describe('Older saves — §8.10', () => {
  test('Hub_AnAccountFromBeforeTheRoad_IsKept_AndOpensWhereItsCareerStands_WithNoParade', async ({ page }) => {
    await fresh(page);
    // What v0.9.119 wrote: a version 4 account with no seen-list.
    await page.evaluate(() => {
      const key = Object.keys(window.localStorage).find((k) => k.endsWith('account.v1'))!;
      const saved = JSON.parse(window.localStorage.getItem(key)!) as { account: Record<string, unknown> };
      delete saved.account.hubSeen;
      window.localStorage.setItem(key, JSON.stringify({ account: { ...saved.account, version: 4, xp: 4000, tokens: 23, badges: ['boulder-badge'] } }));
    });
    await page.reload();
    await expect(page.getByTestId('hub-level')).toHaveAttribute('data-level', '5');
    await expect(page.getByTestId('hub-tokens')).toHaveAttribute('data-tokens', '23');
    await expect(page.getByTestId('hub-screen')).toHaveAttribute('data-place', 'center');
    await expect(page.getByTestId('hub-arrival')).toHaveCount(0);
    await expect(page.getByTestId('hub-screen')).toHaveAttribute('data-fresh', '');
    for (const id of ['aide', 'guide', 'mart', 'kit']) await expect(page.getByTestId(`kiosk-${id}`)).toBeVisible();
    await expect(page.getByTestId('prop-badges')).toBeVisible();
  });
});

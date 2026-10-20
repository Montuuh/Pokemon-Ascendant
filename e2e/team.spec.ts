import { expect, test, type Page } from '@playwright/test';

// §2.3 / §9.12 — the Team screen: opened from the map (its button and T) and from a City's lobby, the formation moved by
// dragging and by the sheet's place buttons, an item given and taken, the matchup against the route's Gyms. Screenshots
// to playtest/team-*.png.

type Dev = { goTo: (s: string) => void; run: Record<string, (...a: unknown[]) => unknown> };
async function newRun(page: Page, setup: () => void) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!(window as unknown as { __ascendant?: unknown }).__ascendant);
  await page.evaluate(setup);
}
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ascendant: Dev }).__ascendant.run.state!() as { activeUids: string[]; box: { uid: string; speciesId: string; heldItem: string | null }[]; bag: string[] });

test.describe('The Team screen — §2.3, §9.12', () => {
  test('from the map: the formation, the Box, a drag to the Lead and the sheet', async ({ page }) => {
    await newRun(page, (() => {
      const a = (window as unknown as { __ascendant: Dev }).__ascendant;
      a.run.new!('squirtle', 7);
      a.run.fill!(4);
      a.run.patch!((d: { activeUids: string[]; box: { uid: string }[] }) => {
        d.activeUids = d.box.slice(0, 3).map((m) => m.uid);
      });
      a.goTo('map');
    }));
    await page.getByTestId('btn-team').click();
    const team = page.getByTestId('team-screen');
    await expect(team).toBeVisible();
    await expect(page.getByTestId('team-slot-0').locator('[data-testid^="team-card-"]')).toHaveCount(1);
    const before = await state(page);
    const benched = before.box.find((m) => !before.activeUids.includes(m.uid))!;
    // Drag a Box tile onto the Lead's place: it leads, and the old Lead goes to the Box.
    await page.getByTestId(`team-tile-${benched.uid}`).dragTo(page.getByTestId('team-slot-0'));
    await expect.poll(async () => (await state(page)).activeUids[0]).toBe(benched.uid);
    await page.screenshot({ path: 'playtest/team-map.png' });
    // The sheet's place buttons: send it to Bench 2.
    await page.getByTestId(`team-card-${benched.uid}`).click();
    await page.getByTestId('team-place-2').click();
    await expect.poll(async () => (await state(page)).activeUids.indexOf(benched.uid)).toBeGreaterThan(0);
    // The matchup against the route's two Gyms.
    await expect(page.getByTestId('team-sheet').locator('[data-good], [data-bad], span:has-text("hits ×")').first()).toBeVisible();
    // Escape closes it, and the map is still there (the menu did not open over it).
    await page.keyboard.press('Escape');
    await expect(team).toBeHidden();
    await expect(page.getByTestId('pause-menu')).toHaveCount(0);
    // T opens it again.
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('t');
    await expect(team).toBeVisible();
  });

  test('the keyboard: focus stays put, Tab stays inside, Escape closes the Moves first, then the Team — §9.6', async ({ page }) => {
    await newRun(page, (() => {
      const a = (window as unknown as { __ascendant: Dev }).__ascendant;
      a.run.new!('squirtle', 7);
      a.run.fill!(4);
      a.run.patch!((d: { activeUids: string[]; box: { uid: string }[] }) => {
        d.activeUids = d.box.slice(0, 3).map((m) => m.uid);
      });
      a.goTo('map');
    }));
    const door = page.getByTestId('btn-team');
    await door.focus();
    await page.keyboard.press('Enter');
    const team = page.getByTestId('team-screen');
    await expect(team).toBeVisible();
    // A place button keeps the focus after it acts.
    const bench = page.getByTestId('team-place-1');
    await bench.focus();
    await page.keyboard.press('Enter');
    await expect(bench).toBeFocused();
    // Thirty Tabs never leave the dialog.
    for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="team-screen"]'))).toBe(true);
    // The Move Manager takes the focus; Escape closes it first and hands the focus back to its button.
    await page.getByTestId('team-manage-moves').click();
    await expect(page.getByTestId('move-manager-overlay')).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="move-manager-overlay"]'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('move-manager-overlay')).toHaveCount(0);
    await expect(page.getByTestId('team-manage-moves')).toBeFocused();
    // Then the Team, and the focus is back on its door.
    await page.keyboard.press('Escape');
    await expect(team).toBeHidden();
    await expect(door).toBeFocused();
  });

  test('a card dragged onto the Box leaves the formation; the last one cannot', async ({ page }) => {
    await newRun(page, (() => {
      const a = (window as unknown as { __ascendant: Dev }).__ascendant;
      a.run.new!('squirtle', 7);
      a.run.fill!(3);
      a.run.patch!((d: { activeUids: string[]; box: { uid: string }[] }) => {
        d.activeUids = d.box.slice(0, 2).map((m) => m.uid);
      });
      a.goTo('map');
    }));
    await page.getByTestId('btn-team').click();
    const [lead, second] = (await state(page)).activeUids;
    await page.getByTestId(`team-card-${second}`).dragTo(page.getByTestId('team-box'));
    await expect.poll(async () => (await state(page)).activeUids).toEqual([lead]);
    // The last one in the formation: its Box button is refused, and says so.
    await page.getByTestId(`team-card-${lead}`).click();
    await expect(page.getByTestId('team-place-box')).toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('team-place-box').click({ force: true });
    expect((await state(page)).activeUids).toEqual([lead]);
    // Dragged onto the Box, it stays too, and the header says why.
    await page.getByTestId(`team-card-${lead}`).dragTo(page.getByTestId('team-box'));
    await expect(page.getByTestId('team-screen').getByRole('status')).toContainText('Somebody has to be in the formation');
    expect((await state(page)).activeUids).toEqual([lead]);
    // The next free place's "+" puts a Box Pokémon there, from the keyboard too.
    await page.getByTestId(`team-tile-${second}`).click();
    await page.getByTestId('team-put-1').focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page)).activeUids).toEqual([lead, second]);
    await expect(page.getByTestId(`team-card-${second}`)).toBeFocused();
  });

  test('an item is given from the bag and taken back on the sheet', async ({ page }) => {
    await newRun(page, (() => {
      const a = (window as unknown as { __ascendant: Dev }).__ascendant;
      a.run.new!('squirtle', 7);
      a.run.fill!(3);
      a.run.patch!((d: { bag: string[] }) => {
        d.bag = [...d.bag, 'leftovers'];
      });
      a.goTo('map');
    }));
    await page.getByTestId('btn-team').click();
    await page.getByTestId('team-give-leftovers').focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page)).box.some((m) => m.heldItem === 'leftovers')).toBe(true);
    // The button that acted is gone: its Take button has the focus now, and Enter takes it back.
    await expect(page.getByTestId('team-take')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page)).bag.includes('leftovers')).toBe(true);
    await expect(page.getByTestId('team-give-leftovers')).toBeFocused();
  });

  test('the Move Manager closes alone: its ✕ and a move taken out of the four leave the Team open', async ({ page }) => {
    await newRun(page, (() => {
      const a = (window as unknown as { __ascendant: Dev }).__ascendant;
      a.run.new!('bulbasaur', 7);
      a.goTo('map');
    }));
    await page.getByTestId('btn-team').click();
    const team = page.getByTestId('team-screen');
    await page.getByTestId('team-manage-moves').click();
    const manager = page.getByTestId('move-manager');
    await expect(manager).toBeVisible();
    // A move out of the four: both stay open, and the move goes to the pool.
    const before = await manager.locator('[data-testid^="move-"][data-in-kit="true"]').count();
    await manager.locator('[data-testid^="move-"][data-in-kit="true"]').first().click();
    await expect(manager.locator('[data-testid^="move-"][data-in-kit="true"]')).toHaveCount(before - 1);
    await expect(manager).toBeVisible();
    await expect(team).toBeVisible();
    // Its ✕ closes the Move Manager only.
    await page.getByTestId('btn-close-moves').click();
    await expect(page.getByTestId('move-manager-overlay')).toHaveCount(0);
    await expect(team).toBeVisible();
  });

  test("the route's panel shows the team and manages nothing: no row to click, no Move Manager — the Team screen does", async ({ page }) => {
    await newRun(page, (() => {
      const a = (window as unknown as { __ascendant: Dev }).__ascendant;
      a.run.new!('squirtle', 7);
      a.run.fill!(3);
      a.goTo('map');
    }));
    const panel = page.getByTestId('box-panel');
    await expect(panel.locator('[data-testid^="box-row-"]')).toHaveCount(3);
    await expect(panel.locator('button[data-testid^="box-row-"]')).toHaveCount(0);
    await expect(panel.locator('[data-testid^="box-moves-"]')).toHaveCount(0);
    const before = (await state(page)).activeUids;
    await panel.locator('[data-testid^="box-row-"]').first().click();
    expect((await state(page)).activeUids).toEqual(before);
    await expect(page.getByTestId('move-manager-overlay')).toHaveCount(0);
    await expect(panel.getByTestId('btn-team')).toBeVisible();
  });

  test('from a City lobby, beside its party', async ({ page }) => {
    await newRun(page, (() => {
      const a = (window as unknown as { __ascendant: Dev }).__ascendant;
      a.run.new!('squirtle', 7);
      a.run.fill!(3);
      a.run.city!(0);
    }));
    await expect(page.getByTestId('city-screen')).toBeVisible();
    await page.getByTestId('btn-team').click();
    await expect(page.getByTestId('team-screen')).toBeVisible();
    await page.screenshot({ path: 'playtest/team-city.png' });
    await page.getByTestId('team-close').click();
    await expect(page.getByTestId('team-screen')).toBeHidden();
  });
});

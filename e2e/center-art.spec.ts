import { expect, test, type Page } from '@playwright/test';

// A09 / §2.11.1, §9.9.3 — the room is the menu; the machine still owns the reveal.
async function center(
  page: Page,
  opts: { count?: number; money?: number; trauma?: number; hurt?: boolean } = {},
) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(({ count = 3, money = 2000, trauma = 2, hurt = true }) => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 7);
    a.run.fill(count);
    a.run.city(0);
    a.run.pay(money);
    if (trauma) a.run.trauma(trauma);
    if (hurt)
      a.run.patch((d) => {
        for (const m of d.box) m.hp = 1;
      });
  }, opts);
  await page.getByTestId('door-center').click();
  await expect(page.getByTestId('center-heal')).toHaveAttribute('data-beat', 'done');
}

for (const [width, height] of [
  [1920, 1080],
  [1280, 720],
]) {
  test(`the Center's room, doors and service sheets at ${height}p`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await center(page);
    const lobby = page.getByTestId('center-lobby');
    await expect(lobby).toBeVisible();
    expect((Number(await lobby.getAttribute('data-scale')) * 2) % 1).toBe(0);
    const art = lobby.locator('img').first();
    await expect(art).toHaveAttribute('src', '/art/center/room.png');
    expect(
      await art.evaluate((el) => ({
        width: (el as HTMLImageElement).naturalWidth,
        height: (el as HTMLImageElement).naturalHeight,
      })),
    ).toEqual({ width: 320, height: 224 });
    const image = await art.boundingBox();
    const machine = await page.getByTestId('center-heal-stand').locator('span').first().boundingBox();
    const scale = Number(await lobby.getAttribute('data-scale'));
    expect(machine!.x).toBeCloseTo(image!.x + 112 * scale, 0);
    expect(machine!.y).toBeCloseTo(image!.y + 17 * scale, 0);
    expect(machine!.width).toBe(34 * scale);
    expect(machine!.height).toBe(28 * scale);
    await page.screenshot({ path: `playtest/a08-a09/center-v2/lobby-${height}.png` });
    await page.getByTestId('door-center-therapy').hover();
    await expect(page.getByRole('tooltip')).toContainText('Trauma');
    await page.screenshot({ path: `playtest/a08-a09/center-v2/therapy-hover-${height}.png` });
    await page.mouse.move(0, 0);
    for (const id of ['therapy', 'daycare', 'pc']) {
      const door = page.getByTestId(`door-center-${id}`);
      await door.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('center-service-back')).toBeFocused();
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
      await page.screenshot({ path: `playtest/a08-a09/center-v2/${id}-${height}.png` });
      await page.keyboard.press('Escape');
      await expect(door).toBeFocused();
    }
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    }));
    expect(overflow.width).toBe(overflow.viewportWidth);
    expect(overflow.height).toBe(overflow.viewportHeight);
    await page.getByTestId('center-exit').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
  });
}

test('Therapy, Daycare, PC, Moves and Team retain their actions and close inside out', async ({ page }) => {
  await center(page);
  await page.getByTestId('door-center-therapy').click();
  const before = await page.evaluate(() => window.__ascendant!.run.state()!);
  await page.locator('[data-testid^="therapy-"]').first().click();
  const after = await page.evaluate(() => window.__ascendant!.run.state()!);
  expect(after.money).toBe(before.money - 300);
  expect(after.box[0]!.traumaStacks).toBe(1);
  await page.keyboard.press('Escape');
  await page.getByTestId('door-center-daycare').click();
  const second = after.box[1]!;
  await page.getByTestId(`daycare-${second.speciesId}`).click();
  await expect(page.getByTestId('daycare-used')).toContainText('resting');
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.resting)).toBe(second.uid);
  await page.keyboard.press('Escape');
  await page.getByTestId('door-center-pc').click();
  await expect(page.getByTestId(`box-row-${second.speciesId}`)).toBeDisabled();
  const moves = page.locator('[data-testid^="box-moves-"]').first();
  await moves.click();
  await expect(page.getByTestId('move-manager-overlay')).toBeVisible();
  await expect(page.getByTestId('btn-close-moves')).toBeFocused();
  for (let i = 0; i < 20; i++) await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('[data-testid="move-manager-overlay"]')),
  ).toBe(true);
  await page.getByTestId('btn-auto-pick').focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.screenshot({ path: 'playtest/a08-a09/center-v2/moves-focus.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('move-manager-overlay')).toHaveCount(0);
  await expect(moves).toBeFocused();
  await expect(page.getByTestId('center-pc')).toBeVisible();
  await page.getByTestId('btn-team').click();
  await expect(page.getByTestId('team-screen')).toBeVisible();
  await page.getByTestId('team-manage-moves').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('team-screen')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('team-screen')).toHaveCount(0);
  await expect(page.getByTestId('btn-team')).toBeFocused();
  await expect(page.getByTestId('center-pc')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('door-center-pc')).toBeFocused();
});

test('a lone Pokémon and an empty wallet keep their blocked choices legible', async ({ page }) => {
  await center(page, { count: 1, money: 0 });
  await page.getByTestId('door-center-therapy').click();
  await expect(page.locator('[data-testid^="therapy-"]').first()).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByTestId('door-center-daycare').click();
  const row = page.locator('[data-testid^="daycare-"]').first();
  await expect(row).toHaveAttribute('aria-disabled', 'true');
  await row.focus();
  await expect(page.getByRole('tooltip')).toContainText('Someone else');
  await page.screenshot({ path: 'playtest/a08-a09/center-v2/needs-partner.png' });
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.resting)).toBeFalsy();
});

test('a full Box keeps its scrollable report beside the room', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await center(page, { count: 12 });
  const patients = page.getByTestId('center-heal').locator('ul');
  await expect(patients).toBeHidden();
  await page.getByTestId('center-heal-report').click();
  await expect(patients).toBeVisible();
  expect(await patients.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await patients.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(patients.locator('li').last()).toBeInViewport();
  const result = await patients.boundingBox();
  const roomArt = await page.getByTestId('center-lobby').locator('img').first().boundingBox();
  expect(result!.x).toBeGreaterThan(roomArt!.x + roomArt!.width);
  await page.screenshot({ path: 'playtest/a08-a09/center-v2/full-box-720.png' });
  await page.getByTestId('center-heal-report').click();
  await expect(patients).toBeHidden();
});

test('the animated heal holds every service until its bars have landed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 7);
    a.run.fill(3);
    a.run.city(0);
    a.run.patch((d) => {
      for (const mon of d.box) mon.hp = 1;
    });
  });
  await page.getByTestId('door-center').click();
  const heal = page.getByTestId('center-heal');
  await expect(heal).toHaveAttribute('data-beat', 'tray');
  await expect(page.locator('[inert] [data-testid="door-center-pc"]')).toHaveCount(1);
  await expect(page.getByTestId('center-heal-total')).toHaveText('Healing…');
  expect(await heal.ariaSnapshot()).not.toMatch(/restored|\+\d+/);
  await expect(heal).toHaveAttribute('data-beat', 'run', { timeout: 4000 });
  await expect(heal.locator('ul')).toBeVisible();
  await page.screenshot({ path: 'playtest/a08-a09/center-v2/machine-running.png' });
  await expect(heal).toHaveAttribute('data-beat', 'fill', { timeout: 4000 });
  await expect(heal.getByRole('listitem').first()).toHaveAccessibleName(/restored/);
  expect(await heal.ariaSnapshot()).toMatch(/restored/);
  await expect(page.getByTestId('center-counters')).toHaveAttribute('inert', '');
  await expect(heal).toHaveAttribute('data-beat', 'done', { timeout: 6000 });
  await expect(heal.locator('ul')).toBeHidden();
  await expect(page.getByTestId('center-heal-report')).toBeVisible();
  await page.screenshot({ path: 'playtest/a08-a09/center-v2/machine-done.png' });
  await expect(page.locator('[inert] [data-testid="door-center-pc"]')).toHaveCount(0);
  await page.getByTestId('door-center-pc').click();
  await expect(page.getByTestId('center-pc')).toBeVisible();
});

import { expect, test, type Page } from '@playwright/test';

// §2.1.6 / §5.11 / §5.12 — the authored gallery preserves the existing fixed sequence and preview gate.
async function atLeague(page: Page) {
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    a.run.fill(4);
    a.run.league();
    a.run.patch((s) => { s.activeUids = s.box.slice(0, 3).map((mon) => mon.uid); });
  });
  await expect(page.getByTestId('league-hall')).toBeVisible();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="league-hall"] img')].every((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0));
}

for (const [width, height, scale] of [[1280, 720, 2], [1920, 1080, 3]]) {
  test(`Gallery_${width}x${height}_FivePhysicalDoorsFitAndChampionStaysDistinct — §2.1.6`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await atLeague(page);
    const gallery = page.getByTestId('league-gallery');
    await expect(gallery).toHaveAttribute('data-scale', String(scale));
    await expect(page.locator('[data-testid^="league-door-"]')).toHaveCount(5);
    await expect(page.getByTestId('league-door-0')).toHaveAttribute('data-state', 'next');
    await expect(page.getByTestId('league-door-4')).toHaveAttribute('data-state', 'ahead');
    for (const [i, name] of ['Bruno', 'Agatha', 'Will', 'Lance', 'Blue'].entries()) {
      await expect(page.getByTestId(`league-door-${i}`)).toContainText(name);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    const hall = await page.getByTestId('league-hall').boundingBox();
    const scene = await gallery.boundingBox();
    expect(scene!.x).toBeGreaterThanOrEqual(hall!.x);
    expect(scene!.x + scene!.width).toBeLessThanOrEqual(hall!.x + hall!.width);
    await page.screenshot({ path: `playtest/a11/league-${width}.png` });

    await page.evaluate(() => window.__ascendant!.run.patch((s) => {
      const nodes = Object.values(s.map.nodes).sort((a, b) => a.layer - b.layer);
      s.visited = nodes.slice(0, 4).map((n) => n.id);
      s.reachable = [nodes[4]!.id];
      s.position = nodes[3]!.id;
    }));
    await expect(page.getByTestId('league-door-0')).toHaveAttribute('data-state', 'beaten');
    await expect(page.getByTestId('league-door-4')).toHaveAttribute('data-state', 'next');
    await page.screenshot({ path: `playtest/a11/league-champion-${width}.png` });
  });
}

test('Gallery_KeyboardAndManagement_PreviewOnlyAndLockedDoorsExplain — §2.1.6 / §9.6', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await atLeague(page);
  const ahead = page.getByTestId('league-door-1');
  await ahead.focus();
  await expect(ahead).toBeFocused();
  await expect(page.getByRole('tooltip')).toContainText('Behind the door before it');
  await page.screenshot({ path: 'playtest/a11/league-keyboard.png' });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('node-preview')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('league-door-2')).toBeFocused();
  await page.getByTestId('league-door-0').focus();
  await page.keyboard.press('Enter');
  const preview = page.getByTestId('node-preview');
  await expect(preview).toBeVisible();
  await expect(preview.getByTestId('preview-team-size')).toBeVisible();
  await page.screenshot({ path: 'playtest/a11/league-preview.png' });
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.phase)).toBe('preview');
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);

  await page.getByTestId('btn-team').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('team-screen')).toBeVisible();
  const before = await page.evaluate(() => window.__ascendant!.run.state()!.activeUids[0]);
  await page.getByTestId('team-place-1').click();
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.activeUids[1])).toBe(before);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('team-screen')).toHaveCount(0);
  await expect(page.getByTestId('league-hall')).toBeVisible();

  await page.evaluate(() => window.__ascendant!.run.patch((s) => { s.modifiers = ['tight-schedule']; }));
  await expect(page.getByTestId('league-rest')).toContainText('20 %');
  await page.getByTestId('league-rest').focus();
  await expect(page.getByRole('tooltip')).toContainText('Tight Schedule');
});

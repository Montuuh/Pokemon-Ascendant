import { expect, test, type Page } from '@playwright/test';

async function fresh(page: Page) {
  await page.goto('/?screen=menu'); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
}
for (const [width, height, scale] of [[1920, 1080, 1], [1280, 720, 1.5]] as const) {
for (const motion of ['reduce', 'no-preference'] as const) {
  test(`Evolution can be postponed and resumed from the sheet_${height}_${scale}_${motion}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: motion }); await fresh(page);
    await page.evaluate((scale) => document.documentElement.style.setProperty('--text-scale', String(scale)), scale);
    await page.evaluate(() => {
      const a = window.__ascendant!; a.run.new('eevee', 7); a.run.levelTo(11); a.run.grantStone('fire-stone'); a.run.grantRelic('evolution-catalyst'); a.run.city(0);
      a.run.dispatch({ type: 'use-stone', uid: a.run.state()!.box[0]!.uid, stoneId: 'fire-stone' });
    });
    if (motion === 'no-preference') { await expect(page.getByTestId('evolution-cutscene')).toBeVisible(); await page.keyboard.press('Escape'); }
    else { await expect(page.getByTestId('btn-evolution-later')).toBeVisible(); await page.getByTestId('btn-evolution-later').click(); }
    await expect(page.getByTestId('city-screen')).toBeVisible(); await page.reload();
    await page.evaluate((scale) => document.documentElement.style.setProperty('--text-scale', String(scale)), scale);
    await expect(page.getByTestId('city-screen')).toBeVisible();
    const state = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(state.box[0]!.speciesId).toBe('eevee'); expect(state.box[0]!.deferredEvolutionFrom).toBe('eevee'); expect(state.stones).toEqual(['fire-stone']);
    await page.getByTestId('btn-team').click(); await expect(page.getByTestId('team-evolve')).toBeVisible();
    await expect(page.getByTestId('team-screen')).toContainText('Fire Stone ready');
    await page.screenshot({ path: `playtest/ap-evolution-center-2026-10-30/postponed-${height}-${scale}-${motion}.png` });
    await page.getByTestId('team-evolve').click();
    if (motion === 'no-preference') await page.getByTestId('evo-skip').click();
    await expect(page.getByTestId('evolution-screen')).toBeVisible(); await page.getByTestId('btn-evolve').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
    const evolved = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(evolved.box[0]!.speciesId).toBe('flareon'); expect(evolved.stones).toEqual([]); expect(evolved.box[0]!.deferredEvolutionFrom).toBeUndefined(); expect(evolved.spentRelics).not.toContain('evolution-catalyst');
  });
}
}

test('The console retains AP provenance from the opening turn through a long fight', async ({ page }) => {
  await fresh(page);
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('snorlax', 7); a.run.levelTo(60); a.run.heal(); a.run.grantRelic('sages-tome');
    a.run.patch((d) => { d.box[0]!.abilityId = 'immunity'; });
    a.run.jump('wild');
    // A Caterpie's PP outlasts forty turns; a pool that rolls a frailer foe ends the fixture early (the map is the seed's).
    const id = a.run.state()!.reachable[0]!;
    a.run.patch((d) => { d.map.nodes[id]!.preview.wild!.pool = { common: ['caterpie'], uncommon: ['caterpie'], rare: ['caterpie'] }; });
    a.run.dispatch({ type: 'enter-node', nodeId: id }); a.goTo('map');
  });
  await page.getByTestId('btn-enter-node').click();
  await expect(page.getByTestId('log-ticker')).toBeVisible();
  await page.evaluate(() => {
    for (let i = 0; i < 40; i++) if (!window.__ascendant!.dispatch({ type: 'end-turn' })) throw new Error('Long-fight fixture ended early');
  });
  await page.getByTestId('log-ticker').click();
  const log = page.getByTestId('combat-log');
  expect(await log.locator(':scope > div').count()).toBeGreaterThan(200);
  await expect(log.getByText('— Turn 1 —', { exact: true })).toHaveCount(1);
  const tome = log.getByText(/AP \+1 — Sage's Tome/); await expect(tome).toHaveCount(41);
  await tome.first().scrollIntoViewIfNeeded(); await expect(tome.first()).toBeVisible();
  await page.screenshot({ path: 'playtest/ap-evolution-center-2026-10-30/ap-console.png' });
});


test('Evolution stats and four branch headers have intrinsic room at 720p and 150 percent', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const shiny of [false, true]) {
    await fresh(page);
    await page.evaluate((shiny) => {
      document.documentElement.style.setProperty('--text-scale', '1.5');
      // §6.3.7 — Eevee never evolves by level: a Training right (§2.12.3) opens all four of its paths.
      const a = window.__ascendant!; a.run.new('eevee', 7); a.run.levelTo(16);
      a.run.patch((d) => { d.box[0]!.shiny = shiny; d.box[0]!.deferredEvolutionFrom = 'eevee'; d.box[0]!.deferredEvolutionForced = true; });
      a.run.dispatch({ type: 'resume-evolution', uid: a.run.state()!.box[0]!.uid }); a.goTo('map');
    }, shiny);
    await page.getByTestId('branch-eevee-specialist').click();
    const stats = page.getByRole('list', { name: 'Stats', exact: true });
    // The widest Speed gain on the sheet (Jolteon's), at Lv 16.
    await expect(stats.getByRole('listitem').last()).toContainText('+112');
    const overlaps = await stats.evaluate((list) => {
      const failures: string[] = [];
      for (const row of Array.from(list.children)) {
        const cells = Array.from(row.children); const range = document.createRange();
        range.selectNodeContents(cells[0]!);
        if (range.getBoundingClientRect().right > cells[1]!.getBoundingClientRect().left + 1) failures.push(`${cells[0]!.textContent} overlaps bar`);
        const r = row.getBoundingClientRect();
        for (const cell of cells) { const b = cell.getBoundingClientRect(); if (b.left < r.left - 1 || b.right > r.right + 1) failures.push(`${cell.textContent} overflows row`); }
      }
      return failures;
    });
    expect(overlaps).toEqual([]);
    const headers = await page.locator('[data-testid^="branch-"]').evaluateAll((branches) => {
      const failures: string[] = [];
      for (const branch of branches) {
        const r = branch.getBoundingClientRect(); const head = branch.firstElementChild!;
        for (const child of Array.from(head.querySelectorAll('span,img'))) {
          const b = child.getBoundingClientRect(); if (b.width && (b.left < r.left - 1 || b.right > r.right + 1)) failures.push(`${child.textContent || child.getAttribute('alt')} overflows card`);
        }
      }
      return failures;
    });
    expect(headers).toEqual([]);
    await page.screenshot({ path: `playtest/ap-evolution-center-2026-10-30/evolution-fixed-150-${shiny}.png` });
    await page.getByTestId('btn-evolution-later').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('btn-evolution-later')).toBeVisible();
    await page.screenshot({ path: `playtest/ap-evolution-center-2026-10-30/evolution-fixed-footer-150-${shiny}.png` });
  }
});

test('An unconfirmed evolution reveal remains a preview and can still be postponed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await fresh(page);
  await page.evaluate(() => {
    const a = window.__ascendant!; a.run.new('eevee', 7); a.run.levelTo(11); a.run.grantStone('fire-stone'); a.run.grantRelic('evolution-catalyst'); a.run.city(0);
    a.run.dispatch({ type: 'use-stone', uid: a.run.state()!.box[0]!.uid, stoneId: 'fire-stone' });
  });
  await expect(page.getByTestId('evolution-cutscene')).toHaveAttribute('data-phase', 'reveal', { timeout: 12_000 });
  await expect(page.getByTestId('evolution-line')).toHaveText('Eevee could evolve into Flareon.');
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.speciesId)).toBe('eevee');
  await page.screenshot({ path: 'playtest/ap-evolution-center-2026-10-30/evolution-preview-full.png' });
  await page.getByTestId('evo-cancel').click();
  await expect(page.getByTestId('city-screen')).toBeVisible();
  expect(await page.evaluate(() => window.__ascendant!.run.state()!.stones)).toEqual(['fire-stone']);
});

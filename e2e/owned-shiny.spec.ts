import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const evidence = process.env.B05_EVIDENCE ?? 'playtest/art-review-2026-10-24/implementation/B05';
mkdirSync(evidence, { recursive: true });

async function fresh(page: Page, scale = 1) {
  await page.goto('/?screen=menu');
  await page.evaluate((scale) => {
    localStorage.clear();
    localStorage.setItem('ascendant.settings.v1', JSON.stringify({ textScale: scale, motion: 'reduced' }));
  }, scale);
  await page.reload();
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 7); a.run.fill(6);
    a.run.patch((d) => {
      d.box[0]!.speciesId = 'charizard'; d.box[0]!.shiny = true;
      d.box[1]!.speciesId = 'blastoise'; d.box[1]!.shiny = false;
      d.box[3]!.speciesId = 'gyarados'; d.box[3]!.shiny = true;
      d.activeUids = d.box.slice(0, 3).map((m) => m.uid);
    });
    a.goTo('map');
  });
  // Check the actual setting rather than assuming a storage key is still current.
  await expect(page.locator('html')).toHaveAttribute('style', new RegExp(`--text-scale: ${scale}`));
}

async function ready(page: Page) {
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.evaluate(() => document.fonts.ready);
}
async function shot(page: Page, name: string) {
  await page.mouse.move(1, 1); await ready(page);
  await page.screenshot({ path: `${evidence}/${name}.png` });
}
async function shiny(scope: Locator, species = 'charizard') {
  const image = scope.locator(`img[src$="/dojo/pokemon/${species}-shiny.png"][alt^="Shiny"]`).first();
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('alt', new RegExp(`Shiny ${species}`, 'i'));
  await expect(scope.getByTestId('shiny-mark').first()).toHaveAttribute('aria-label', /Shiny/);
  await image.evaluate((img) => (img as HTMLImageElement).decode());
  const geometry = await image.evaluate((el) => {
    const img = el as HTMLImageElement;
    const rect = img.getBoundingClientRect();
    const cell = img.closest('[data-pixel-sprite]')!.getBoundingClientRect();
    return { x: rect.width / img.naturalWidth, y: rect.height / img.naturalHeight, width: rect.width, height: rect.height, cellWidth: cell.width, cellHeight: cell.height, rendering: getComputedStyle(img).imageRendering };
  });
  expect(geometry.x).toBe(geometry.y);
  expect(geometry.x * 2).toBe(Math.round(geometry.x * 2));
  expect(geometry.width).toBeLessThanOrEqual(geometry.cellWidth);
  expect(geometry.height).toBeLessThanOrEqual(geometry.cellHeight);
  expect(geometry.rendering).toBe('pixelated');
}

async function shinyDoor(page: Page, host: Locator) {
  await host.hover();
  await expect(page.getByTestId('tooltip')).toContainText('alternate colours');
  await page.mouse.move(1, 1);
  await host.focus();
  await expect(page.getByTestId('tooltip')).toContainText('alternate colours');
}

// B05 / §5.14 — specimen identity across scene, record and owned summaries; catalogue state is separate.
for (const width of [1920, 1280]) {
  for (const scale of [1, 1.5]) {
    const label = `${width}-${scale * 100}`;
    test(`OwnedIdentity_RecordBothOutcomes_${label} — §5.14`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1920 ? 1080 : 720 });
      await fresh(page, scale);
      for (const outcome of ['victory', 'defeat'] as const) {
        await page.evaluate((outcome) => {
          const a = window.__ascendant!;
          a.run.patch((d) => {
            d.phase = 'ended'; d.outcome = outcome;
            // Two specimens of the same species prove the flag belongs to the specimen.
            d.box[1]!.speciesId = 'charizard'; d.box[1]!.shiny = false;
            d.box.forEach((m) => { m.hp = outcome === 'defeat' ? 0 : 20; });
          }); a.goTo(outcome);
        }, outcome);
        await expect(page.locator('[data-testid^="run-end-mon-"][data-shiny="true"] img').first()).toHaveAttribute('src', /charizard-shiny\.png$/);
        const door = page.getByTestId('btn-run-record');
        await door.focus(); await page.keyboard.press('Enter');
        const record = page.getByTestId('run-record');
        const rows = record.locator('li');
        await shiny(rows.nth(0));
        await expect(rows.nth(1).getByTestId('shiny-mark')).toHaveCount(0);
        await expect(rows.nth(1).locator('img')).toHaveAttribute('src', /compact\/006-charizard\.png$/);
        const mark = rows.nth(0).getByTestId('shiny-mark');
        await mark.hover(); await expect(page.getByTestId('tooltip')).toContainText('Caught in its alternate colours');
        await page.keyboard.press('Escape');
        // Radix Escape can close the record as well as the tooltip; reopen for focus verification.
        if (!(await record.isVisible())) await door.click();
        await record.locator('[data-testid="shiny-mark"]').first().focus();
        await expect(page.getByTestId('tooltip')).toContainText('Caught in its alternate colours');
        await shot(page, `record-${outcome}-${label}`);
        await page.keyboard.press('Escape');
        await expect(record).toBeHidden(); await expect(door).toBeFocused();
      }
    });

    test(`OwnedIdentity_DojoTeamAndBag_${label} — §5.14`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1920 ? 1080 : 720 });
      await fresh(page, scale);
      await shiny(page.getByTestId('box-row-charizard'));
      await page.getByTestId('btn-team').click();
      const uids = await page.evaluate(() => window.__ascendant!.run.state()!.box.map((m) => m.uid));
      const tile = page.getByTestId(`team-tile-${uids[3]}`);
      await shiny(tile, 'gyarados'); await expect(tile).toHaveAccessibleName(/Shiny Gyarados/);
      await tile.focus(); await page.keyboard.press('Enter');
      await shiny(page.getByTestId('team-sheet'), 'gyarados');
      await shot(page, `team-${label}`);
      await page.getByTestId('team-manage-moves').click();
      await shiny(page.getByTestId('move-manager'), 'gyarados');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('team-screen')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        const a = window.__ascendant!; a.run.wear('leftovers');
        a.run.patch((d) => { d.box[0]!.heldItem = 'charcoal'; });
      });
      await page.getByTestId('btn-inventory').click();
      await page.getByTestId('inv-tab-items').click();
      await shiny(page.getByTestId('inventory-drawer'));
      await page.getByTestId('bagged-leftovers').click();
      const wearer = page.getByTestId('equip-leftovers-charizard');
      await shiny(wearer); await expect(wearer).toHaveAccessibleName(/Shiny Charizard/);
      await shot(page, `bag-${label}`);
      await page.keyboard.press('Escape');
      await page.evaluate(() => { const a = window.__ascendant!; a.run.city(0); a.run.pay(600); });
      await shiny(page.getByTestId('city-mon-charizard'));
      await page.getByTestId('door-dojo').click();
      const dojo = page.getByTestId('dojo-screen');
      await shiny(dojo);
      const pick = page.getByTestId('dojo-pick-charizard');
      await expect(pick).toHaveAccessibleName(/Shiny Charizard/);
      await pick.focus(); await expect(page.getByTestId('tooltip')).toContainText('alternate colours');
      await page.keyboard.press('Escape');
      await page.getByTestId('dojo-pick-blastoise').click();
      await expect(dojo.getByRole('heading', { name: 'Blastoise', exact: true })).toBeVisible();
      await expect(dojo.locator('img[alt="Shiny Blastoise"]')).toHaveCount(0);
      await pick.focus(); await page.keyboard.press('Enter');
      await expect(dojo.getByRole('heading', { name: 'Charizard', exact: true })).toBeVisible();
      await expect(page.locator('img[src$="/dojo/pokemon/charizard-shiny.png"]')).toHaveCount(3);
      await shot(page, `dojo-${label}`);
      await page.getByTestId('dojo-deck').click(); await shiny(page.getByTestId('move-manager'));
      await page.keyboard.press('Escape'); await expect(page.getByTestId('dojo-deck')).toBeFocused();
    });
  }
}

test('OwnedIdentity_AssetsAndCatalogueRemainSeparate — §5.14', async ({ page }) => {
  const species = JSON.parse(readFileSync('src/content/data/species.json', 'utf8')).species as { id: string }[];
  for (const mon of species) {
    const metadata = await sharp(`public/art/dojo/pokemon/${mon.id}-shiny.png`).metadata();
    expect([metadata.width, metadata.height], mon.id).toEqual([32, 32]);
  }
  await fresh(page);
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.meta.record([{ t: 'recruit', speciesId: 'charizard', boxFull: false, firstThisRun: true, shiny: true }]);
    a.goTo('hub');
  });
  await page.getByTestId('kiosk-pc').click();
  const card = page.getByTestId('dex-charizard');
  await expect(card.getByTestId('shiny-mark')).toHaveCount(1);
  await expect(card.locator('img').first()).toHaveAttribute('src', /portraits\/006-charizard\.png$/);
  await expect(card.locator('img[src*="-shiny"]')).toHaveCount(0);
  await shot(page, 'catalogue');
});

for (const width of [1920, 1280]) {
  test(`OwnedIdentity_ServiceSummariesAndLockedTargets_${width} — §5.14`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 720 });
    await fresh(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluate(() => { const a = window.__ascendant!; a.run.wear('light-ball'); a.run.patch((d) => { d.box[0]!.hp = 1; }); });
    await page.getByTestId('btn-inventory').click(); await page.getByTestId('inv-tab-items').click();
    await page.getByTestId('bagged-light-ball').click();
    const locked = page.getByTestId('equip-light-ball-charizard');
    await shiny(locked); await expect(locked).toBeDisabled(); await expect(locked).toHaveAccessibleName(/Shiny Charizard/);
    await shinyDoor(page, locked);
    const before = await page.evaluate(() => JSON.stringify(window.__ascendant!.run.state()));
    await locked.click({ force: true }); await locked.focus(); await page.keyboard.press('Enter');
    expect(await page.evaluate(() => JSON.stringify(window.__ascendant!.run.state()))).toBe(before);
    await page.getByTestId('inv-tab-bag').click(); await page.getByTestId('bag-potion').click();
    await shiny(page.getByTestId('use-potion-charizard'));
    await shinyDoor(page, page.getByTestId('use-potion-charizard'));
    await shot(page, `bag-targets-${width}`); await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const a = window.__ascendant!; const run = a.run.state()!;
      a.run.dispatch({ type: 'enter-node', nodeId: run.reachable[0]! });
    });
    await shiny(page.getByTestId('preview-team'));
    await shot(page, `preview-${width}`);
    await page.evaluate(() => window.__ascendant!.run.patch((d) => { d.phase = 'training'; }));
    const uid = await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.uid);
    await shiny(page.getByTestId(`train-mon-${uid}`));
    await shinyDoor(page, page.getByTestId(`train-mon-${uid}`));
    await page.getByTestId(`train-mon-${uid}`).focus(); await page.keyboard.press('Enter');
    await expect(page.getByTestId(`train-mon-${uid}`)).toHaveAttribute('aria-pressed', 'true');
    await shot(page, `training-${width}`);
    await page.evaluate(() => window.__ascendant!.run.patch((d) => { d.phase = 'trader'; d.pendingTrade = { offers: [{ speciesId: 'pidgey', shownType: 'normal' }] }; }));
    await shiny(page.getByTestId(`trade-give-${uid}`));
    await shinyDoor(page, page.getByTestId(`trade-give-${uid}`));
    await shot(page, `trader-${width}`);
    await page.evaluate(() => window.__ascendant!.run.patch((d) => { d.phase = 'summit'; d.pendingSummit = { relics: ['clear-mind', 'flow-state', 'grandmasters-tempo'] }; }));
    await shiny(page.getByTestId('summit-screen'));
    await shot(page, `summit-${width}`);
    await page.evaluate(() => window.__ascendant!.run.patch((d) => { d.phase = 'swap-or-skip'; d.pendingRecruit = { speciesId: 'charizard', level: 5, shiny: true }; }));
    const swap = page.getByTestId('swap-or-skip');
    await expect(swap.getByTestId('btn-swap-recruit')).toBeDisabled();
    await shiny(swap.getByTestId('release-charizard'));
    await shinyDoor(page, swap.getByTestId('release-charizard'));
    await expect(swap.locator('img[src$="/charizard-shiny.png"]')).toHaveCount(2);
    await shot(page, `swap-${width}`);
    await page.evaluate(() => { const a = window.__ascendant!; a.run.patch((d) => { d.pendingRecruit = null; d.phase = 'map'; }); a.run.city(0); a.run.pay(2000); a.run.trauma(1); });
    await shinyDoor(page, page.getByTestId('city-mon-charizard'));
    await page.getByTestId('door-center').click(); await page.getByTestId('door-center-daycare').click();
    await shiny(page.getByTestId('daycare-charizard'));
    await shinyDoor(page, page.getByTestId('daycare-charizard'));
    await expect(page.getByTestId('daycare-charizard')).toHaveAccessibleName(/Shiny Charizard/);
    await shot(page, `daycare-${width}`);
    await page.keyboard.press('Escape'); await page.getByTestId('door-center-therapy').click();
    await shiny(page.getByTestId('therapy-charizard'));
    await shinyDoor(page, page.getByTestId('therapy-charizard'));
    await shot(page, `therapy-${width}`);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.__ascendant!.run.patch((d) => {
      d.phase = 'aid'; d.city = null;
      d.lastHeal = d.box.map((m) => ({ uid: m.uid, from: 1, to: 20, cured: false }));
      d.box.forEach((m) => { m.hp = 20; });
    }));
    await shiny(page.getByTestId('aid-box'));
    await shinyDoor(page, page.getByTestId(`aid-box-${uid}`));
    await shot(page, `heal-${width}`);
    await page.evaluate(() => {
      const a = window.__ascendant!;
      a.run.patch((d) => { d.phase = 'map'; }); a.run.city(1); a.run.pay(3000);
      a.run.dispatch({ type: 'enter-building', building: 'game-corner' });
      a.run.dispatch({ type: 'push-switch' }); a.run.dispatch({ type: 'enter-black-market' });
    });
    await page.getByTestId('market-trader').click();
    await shiny(page.getByTestId('market-counter'));
    await shinyDoor(page, page.getByTestId(`trade-give-${uid}`));
    await shot(page, `black-market-${width}`);
    await page.keyboard.press('Escape'); await expect(page.getByTestId('market-trader')).toBeFocused();
    expect(errors).toEqual([]);
  });
}

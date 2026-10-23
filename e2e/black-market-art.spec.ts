import { expect, test, type Page } from '@playwright/test';

// A18 / §2.11.6 — the room is a set of physical doors, while every deal retains its original contract.
async function downstairs(page: Page, relics: string[] = []) {
  await page.goto('/?screen=menu');
  await page.evaluate((relics) => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 7);
    a.run.fill(6);
    const settled = ['blastoise', 'tauros', 'kangaskhan', 'lapras', 'snorlax', 'scyther'];
    a.run.patch((d) => {
      d.box.forEach((m, i) => {
        m.speciesId = settled[i]!;
        m.level = 30;
      });
    });
    for (const id of relics) a.run.grantRelic(id);
    a.run.city(1);
    a.run.pay(5000);
  }, relics);
  await expect(page.getByTestId('door-black-market')).toHaveCount(0);
  await page.getByTestId('door-game-corner').click();
  await page.getByTestId('gc-poster').click();
  await page.getByTestId('btn-switch-push').click();
  await page.getByTestId('gc-stairs').click();
  await expect(page.getByTestId('black-market-room')).toBeVisible();
}
async function capture(page: Page, name: string) {
  await page.mouse.move(2, 2);
  const dialog = page.getByTestId('market-counter');
  if (await dialog.isVisible()) await dialog.focus();
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: `playtest/a16-a18/${name}.png` });
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test.describe(`Black Market art ${viewport.width} — §2.11.6 / D8`, () => {
    test.use({ viewport });
    test('Room_FourPhysicalCounters_OpenAndReturnFocus', async ({ page }) => {
      await downstairs(page, ['coin-pouch', 'brave-charm']);
      await expect(page.getByTestId('market-counter')).toHaveCount(0);
      for (const id of ['trader', 'fence', 'gambler', 'showcase'])
        await expect(page.getByTestId(`market-${id}`)).toBeInViewport();
      const scale = Number(await page.getByTestId('black-market-room').getAttribute('data-scale'));
      expect(Number.isInteger(scale)).toBe(true);
      await capture(page, `black-market-room-${viewport.width}`);
      for (const id of ['trader', 'fence', 'gambler', 'showcase']) {
        await page.getByTestId(`market-${id}`).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('market-counter')).toHaveAttribute('data-counter', id);
        const button =
          id === 'trader'
            ? 'btn-trade'
            : id === 'fence'
              ? 'btn-candy'
              : id === 'gambler'
                ? 'btn-wager'
                : 'btn-showcase';
        await expect(page.getByTestId(button)).toBeInViewport();
        if (id === 'gambler') await expect(page.locator('[data-testid^="wager-target-"]')).toHaveCount(3);
        await capture(page, `black-market-${id}-${viewport.width}`);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('market-counter')).toHaveCount(0);
        await expect(page.getByTestId(`market-${id}`)).toBeFocused();
      }
    });
  });
}

test.describe('Black Market retained contracts — §2.11.6', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test('Trader_TradeAtGivenLevel_ReturnsHeldItemAndMarksDealt', async ({ page }) => {
    await downstairs(page);
    await page.evaluate(() =>
      window.__ascendant!.run.patch((d) => {
        d.box[1]!.heldItem = 'leftovers';
        d.city!.blackMarket!.trades[0] = 'porygon';
      }),
    );
    const before = await page.evaluate(() => window.__ascendant!.run.state()!);
    await page.getByTestId('market-trader').click();
    await page.getByTestId('trade-offer-0').click();
    await page.getByTestId(`trade-give-${before.box[1]!.uid}`).click();
    await expect(page.getByTestId('btn-trade')).toContainText('Lv 30');
    await page.getByTestId('btn-trade').click();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(after.box).toHaveLength(before.box.length);
    expect(after.box[1]!.speciesId).toBe('porygon');
    expect(after.box[1]!.level).toBe(30);
    expect(after.bag).toContain('leftovers');
    await page.getByTestId('btn-close-market-counter').click();
    await expect(page.getByTestId('market-trader')).toHaveAttribute('aria-label', /Dealt this visit/);
  });
  test('Fence_CandyAndTwoPressSale_KeepPricesAndRefusals', async ({ page }) => {
    await downstairs(page, ['coin-pouch', 'evolution-catalyst']);
    await page.evaluate(() =>
      window.__ascendant!.run.patch((d) => {
        d.spentRelics.push('evolution-catalyst');
      }),
    );
    const before = await page.evaluate(() => window.__ascendant!.run.state()!);
    await page.getByTestId('market-fence').click();
    await expect(page.getByTestId('sell-evolution-catalyst')).toBeDisabled();
    await page.getByTestId(`candy-${before.box[1]!.uid}`).click();
    await page.getByTestId('btn-candy').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[1]!.level)).toBe(31);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(before.money - 400);
    await page.getByTestId('sell-coin-pouch').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).toContain('coin-pouch');
    await page.getByTestId('sell-coin-pouch').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).not.toContain('coin-pouch');
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(before.money - 400 + 60);
  });
  test('Gambler_PrintedRiskAndRefusedStake_KeepOutcome', async ({ page }) => {
    await downstairs(page, ['coin-pouch', 'brave-charm', 'ground-gem', 'water-gem', 'evolution-catalyst']);
    await page.evaluate(() =>
      window.__ascendant!.run.patch((d) => {
        d.spentRelics.push('evolution-catalyst');
      }),
    );
    await page.getByTestId('market-gambler').click();
    await expect(page.getByTestId('stake-evolution-catalyst')).toBeDisabled();
    await expect(page.getByTestId('btn-wager')).toBeDisabled();
    await page.locator('[data-testid^="wager-target-"]').first().focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    // The shared tooltip portal remains outside Radix's hidden background for assistive technology.
    expect(await page.getByRole('tooltip').evaluate((el) => !!el.closest('[aria-hidden="true"]'))).toBe(
      false,
    );
    await page.locator('[data-testid^="wager-target-"]').first().click();
    for (const id of ['coin-pouch', 'brave-charm', 'ground-gem'])
      await page.getByTestId(`stake-${id}`).click();
    await expect(page.getByTestId('stake-water-gem')).toBeDisabled();
    await expect(page.getByTestId('wager-chance')).toContainText('%');
    await expect(page.getByTestId('btn-wager')).toBeInViewport();
    await capture(page, 'black-market-gambler-refusals-1280');
    await page.getByTestId('btn-wager').click();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!);
    for (const id of ['coin-pouch', 'brave-charm', 'ground-gem']) expect(after.relics).not.toContain(id);
    const wager = after.city!.blackMarket!.wager!;
    expect(after.relics.includes(wager.target)).toBe(wager.won);
    await capture(page, 'black-market-gambler-outcome-1280');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('market-gambler')).toHaveAttribute('aria-label', /Dealt this visit/);
    await page.getByTestId('market-gambler').click();
    await expect(page.getByTestId('btn-wager')).toHaveCount(0);
  });
  test('Executive_NestedConfirmationEscape_OnlyCancelsTheDeal', async ({ page }) => {
    await downstairs(page);
    await page.evaluate(() =>
      window.__ascendant!.run.patch((d) => {
        d.box[2]!.heldItem = 'leftovers';
      }),
    );
    const before = await page.evaluate(() => window.__ascendant!.run.state()!);
    await page.getByTestId('market-showcase').click();
    for (const mon of before.box.slice(2, 5)) await page.getByTestId(`showcase-give-${mon.uid}`).click();
    await page.getByTestId('btn-showcase').click();
    await expect(page.getByTestId('confirm-showcase')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('confirm-showcase')).toHaveCount(0);
    await expect(page.getByTestId('market-counter')).toBeVisible();
    await expect(page.getByTestId('btn-showcase')).toBeEnabled();
    await page.getByTestId('btn-showcase').click();
    await page.screenshot({ path: 'playtest/a16-a18/black-market-showcase-confirm-1280.png' });
    await page.getByTestId('btn-leave-confirm').click();
    await expect(page.getByTestId('game-corner-screen')).toBeVisible();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(after.box).toHaveLength(before.box.length - 2);
    expect(after.box.some((m) => m.speciesId === before.city!.blackMarket!.showcase)).toBe(true);
    expect(after.bag).toContain('leftovers');
    await expect(page.getByTestId('gc-hatch')).toBeVisible();
  });
  test('Stairs_ConfirmAndEscape_PreserveSecretEntryLock', async ({ page }) => {
    await downstairs(page);
    await page.getByTestId('market-stairs').click();
    await expect(page.getByTestId('confirm-leave')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('black-market-room')).toBeVisible();
    await page.getByTestId('btn-leave-market').click();
    await page.getByTestId('btn-leave-confirm').click();
    await expect(page.getByTestId('gc-hatch')).toBeVisible();
    await expect(page.getByTestId('gc-stairs')).toHaveCount(0);
  });
});

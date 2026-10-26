import { expect, test, type Page } from '@playwright/test';

const evidence = 'playtest/art-review-2026-10-24/implementation/B15/verified';

async function openTrader(page: Page, text = 100) {
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(text => {
    document.documentElement.style.setProperty('--text-scale', String(text / 100));
    const a = window.__ascendant!;
    a.run.new('squirtle', 7); a.run.fill(6); a.run.city(1);
    a.run.patch(d => {
      d.box[1]!.speciesId = 'tauros'; d.box[1]!.shiny = true;
      d.box[1]!.hp = 0; d.box[1]!.traumaStacks = 2;
      d.box[1]!.status = { kind: 'burn', turnsLeft: 2 };
      d.box[1]!.confusionTurns = 2; d.box[1]!.heldItem = 'leftovers';
      d.city!.blackMarket!.trades = ['porygon', 'lickitung'];
    });
    a.run.dispatch({ type: 'enter-building', building: 'game-corner' });
    a.run.dispatch({ type: 'push-switch' }); a.run.dispatch({ type: 'enter-black-market' });
  }, text);
  await page.getByTestId('market-trader').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('btn-close-market-counter')).toBeFocused();
  return page.evaluate(() => window.__ascendant!.run.state()!);
}

async function capture(page: Page, name: string) {
  await page.mouse.move(0, 0); await page.getByTestId('market-counter').focus();
  await page.evaluate(async () => {
    await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode()));
  });
  await page.screenshot({ path: `${evidence}/${name}.png` });
}

for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
  for (const text of [100, 150]) for (const motion of ['reduce', 'no-preference'] as const) {
    test(`Trader_CompareCancelAndConfirm_${height}_${text}_${motion} — §2.11.6 / D8`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: motion });
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      const before = await openTrader(page, text);
      const key = `${height}-${text}-${motion}`;
      const donor = page.getByTestId(`trade-give-${before.box[1]!.uid}`);
      const offer = page.getByTestId('trade-offer-0');
      const commit = page.getByTestId('btn-trade');
      await expect(commit).toBeDisabled();
      await expect(commit).toHaveText('Pick a Pokémon');
      await expect(page.getByTestId('trade-outgoing')).toHaveCount(0);
      await capture(page, `${key}-empty`);
      await expect(offer.locator('img').first()).toHaveAttribute('src', motion === 'reduce' ? /\.png$/ : /\.gif$/);
      await donor.focus(); await page.keyboard.press('Enter');
      await expect(donor).toHaveAttribute('aria-pressed', 'true');
      await expect(commit).toBeDisabled();
      await expect(commit).toHaveText('Pick an offer');
      await offer.click();
      await expect(commit).toBeEnabled();
      await expect(commit).toHaveAccessibleName(`Confirm trade: Trade Tauros for Porygon, Lv ${before.box[1]!.level}`);
      const outgoing = page.getByTestId('trade-outgoing');
      for (const label of ['Tauros', 'Fainted', 'Trauma 2', 'Burned', 'Confused', 'Leftovers → Bag'])
        await expect(outgoing).toContainText(label);
      await expect(outgoing.getByTestId('shiny-mark')).toHaveAccessibleName('Shiny Tauros');
      await expect(offer).toContainText(`Lv ${before.box[1]!.level}`);
      await capture(page, `${key}-selected`);
      await expect(commit).toBeInViewport({ ratio: 1 });
      const overflow = await page.getByTestId('market-counter').evaluate(el => ({
        width: el.scrollWidth - el.clientWidth,
        body: el.lastElementChild!.scrollHeight - el.lastElementChild!.clientHeight,
      }));
      expect(overflow).toEqual({ width: 0, body: 0 });
      await offer.hover(); await expect(page.getByRole('tooltip')).toContainText('One trade a visit');
      await page.mouse.move(0, 0); await outgoing.focus();
      await expect(page.getByRole('tooltip')).toContainText('leaves for good');
      await expect(page.getByRole('tooltip')).toContainText('Shiny');
      await page.keyboard.press('Escape');
      if (await page.getByTestId('market-counter').isVisible()) await page.keyboard.press('Escape');
      await expect(page.getByTestId('market-counter')).toHaveCount(0);
      await expect(page.getByTestId('market-trader')).toBeFocused();
      expect(await page.evaluate(() => window.__ascendant!.run.state()!)).toEqual(before);
      await page.keyboard.press('Enter');
      await expect(commit).toBeDisabled();
      await expect(page.getByTestId('trade-outgoing')).toHaveCount(0);
      await donor.click(); await offer.click();
      await page.getByTestId('btn-close-market-counter').click();
      await expect(page.getByTestId('market-trader')).toBeFocused();
      expect(await page.evaluate(() => window.__ascendant!.run.state()!)).toEqual(before);
      await page.keyboard.press('Enter'); await donor.click(); await offer.click();
      // Toggling either side clears confirmation without changing the run.
      await offer.click(); await expect(commit).toBeDisabled(); await offer.click();
      await donor.click(); await expect(commit).toBeDisabled(); await donor.click();
      await commit.focus(); await page.keyboard.press('Enter');
      await expect(page.getByTestId('market-counter')).toContainText('Pleasure doing business.');
      const after = await page.evaluate(() => window.__ascendant!.run.state()!);
      expect(after.box).toHaveLength(before.box.length);
      expect(after.box.some(m => m.uid === before.box[1]!.uid)).toBe(false);
      expect(after.box[1]).toMatchObject({ speciesId: 'porygon', level: before.box[1]!.level, traumaStacks: 0, status: null, confusionTurns: 0, heldItem: null });
      expect(after.box[1]!.hp).toBeGreaterThan(0);
      expect(after.bag.filter(x => x === 'leftovers')).toHaveLength(before.bag.filter(x => x === 'leftovers').length + 1);
      expect(after.activeUids).toEqual(before.activeUids.map(uid => uid === before.box[1]!.uid ? after.box[1]!.uid : uid));
      expect(after.city!.blackMarket!.traded).toBe(true);
      await capture(page, `${key}-done`);
      expect(errors).toEqual([]);
    });
  }
}

test('Trader_UnavailableDonor_CannotCommit — §2.11.6 / D8', async ({ page }) => {
  const before = await openTrader(page);
  await page.getByTestId(`trade-give-${before.box[1]!.uid}`).click();
  await page.getByTestId('trade-offer-0').click();
  await page.evaluate(uid => window.__ascendant!.run.patch(d => {
    d.box = d.box.filter(m => m.uid !== uid); d.activeUids = d.activeUids.filter(u => u !== uid);
  }), before.box[1]!.uid);
  await expect(page.getByTestId('btn-trade')).toBeDisabled();
  await expect(page.getByTestId('btn-trade')).toHaveText('Pick a Pokémon');
  await expect(page.getByTestId('trade-outgoing')).toHaveCount(0);
  await capture(page, 'unavailable-donor');
});

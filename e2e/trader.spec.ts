import { expect, test, type Page } from '@playwright/test';

// §2.9.6 — the roadside trader, on the screen: give one of the Box, pick one of three face-down offers (a type and the
// level it arrives at), see the newcomer, walk on. Screenshots to playtest/trader-*.png.

/** A run of three standing at a trader (the first reachable node made one), walked into. */
async function atTrader(page: Page) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 7);
    a.run.fill(3);
    a.run.patch((d) => {
      const id = d.reachable[0]!;
      d.map.nodes[id]!.kind = 'trader';
      d.map.nodes[id]!.preview = { title: 'Roadside trader', detail: '', speciesIds: [], levelBand: [0, 0], icon: 'trader' };
      d.reachable = [id];
    });
    a.goTo('map');
    const id = a.run.state()!.reachable[0]!;
    a.run.dispatch({ type: 'enter-node', nodeId: id });
    a.run.dispatch({ type: 'begin-combat' });
  });
  await expect(page.getByTestId('trader-screen')).toBeVisible();
}

test.describe('The roadside trader — §2.9.6', () => {
  test('give one, pick a face-down offer, and the newcomer arrives two levels above', async ({ page }) => {
    await atTrader(page);
    const trade = page.getByTestId('btn-trade');
    await expect(page.locator('[data-testid^="trade-offer-"]')).toHaveCount(3);
    await expect(trade).toBeDisabled();

    // Pidgey (Lv 8) goes: its card says the newcomer arrives at Lv 10.
    const give = page.locator('[data-testid^="trade-give-"]').nth(1);
    await give.click();
    await expect(give).toContainText('Lv 8 → 10');
    await page.getByTestId('trade-offer-2').click();
    await expect(trade).toBeEnabled();
    await expect(trade).toContainText('Give Pidgey');
    await page.getByTestId('trader-screen').screenshot({ path: 'playtest/trader-pick.png' });

    await trade.click();
    await expect(page.getByTestId('trade-reveal')).toContainText('joins you!');
    await expect(page.getByTestId('trade-reveal')).toContainText('Lv 10');
    await page.getByTestId('trader-screen').screenshot({ path: 'playtest/trader-reveal.png' });
    await page.getByTestId('btn-trade-continue').click();
    await expect(page.getByTestId('trader-screen')).toBeHidden();
  });

  test('your last Pokémon standing cannot go, and walking on trades nothing', async ({ page }) => {
    await atTrader(page);
    await page.evaluate(() => window.__ascendant!.run.patch((d) => { d.box[1]!.hp = 0; d.box[2]!.hp = 0; }));
    const lead = page.locator('[data-testid^="trade-give-"]').first();
    await expect(lead).toHaveAttribute('aria-disabled', 'true');
    await expect(lead).toHaveAccessibleName(/last one standing/);
    await page.getByTestId('btn-leave-trader').click();
    await expect(page.getByTestId('trader-screen')).toBeHidden();
  });
});

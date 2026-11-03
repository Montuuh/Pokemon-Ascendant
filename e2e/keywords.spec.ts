import { expect, test, type Page } from '@playwright/test';

// v0.9.89 — the move keywords on the combat screen (§3.11): what a keyword leaves on a card (with its stages, never over
// its slot tag), each side's conditions over its own half of the stage, a move-set field's turns on the top bar, PP on the
// card, a recharge that locks the cards, AP borrowed from next turn, and an enemy's stance read as one.

const play = (moveId: string) =>
  `(() => { const a = window.__ascendant; const c = a.state().player.hand.find((x) => x.moveId === '${moveId}'); a.dispatch({ type: 'play-card', cardId: c.id }); })()`;

async function open(page: Page) {
  await page.goto('/?scenario=wild-basic&seed=7');
  await page.waitForFunction(() => !!window.__ascendant?.state());
}

const overlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe('Move keywords on screen — §3.11', () => {
  test('the rain counts its turns on the top bar, your Reflect over your side, Protect and Guard on the Lead', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.__ascendant!.hand(['reflect', 'rain-dance', 'protect', 'withdraw', 'recover']));
    for (const m of ['reflect', 'rain-dance', 'protect', 'withdraw']) await page.evaluate(play(m));

    await expect(page.getByTestId('field-rain-dance-turns')).toHaveText('3');
    await expect(page.getByTestId('sides-player').getByTestId('side-player-reflect')).toContainText('3');
    await expect(page.getByTestId('keyword-protect')).toBeVisible();
    await expect(page.getByTestId('keyword-guard')).toBeVisible();
    // §3.11.1 — Recover's one PP is a pip in its foot.
    await expect(page.getByTestId('card-recover').getByTestId('card-pp').locator('span')).toHaveCount(1);
    await page.screenshot({ path: 'playtest/keywords-top-bar.png' });

    // Each chip is a door: its rule in the bubble.
    await page.getByTestId('keyword-protect').hover();
    await expect(page.getByRole('tooltip')).toContainText('Protect is up');
  });

  test('at 720p the keyword chips never cover the card\'s slot tag', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page);
    await page.evaluate(() => window.__ascendant!.hand(['protect', 'withdraw', 'substitute', 'counter']));
    for (const m of ['protect', 'withdraw', 'substitute', 'counter']) await page.evaluate(play(m));
    const lead = page.getByTestId('squad').locator('[data-unit-uid]').last();
    const tag = await page.locator('[data-testid="squad"] [class*="leadTag"]').first().boundingBox();
    expect(tag).not.toBeNull();
    for (const chip of await page.locator('[data-testid^="keyword-"], [data-testid="unit-chips-more"]').all()) {
      if (!(await chip.isVisible())) continue;
      const box = await chip.boundingBox();
      if (box) expect(overlap(box, tag!), 'a keyword chip over the LEAD tag').toBe(false);
    }
    await expect(lead).toBeVisible();
    await page.screenshot({ path: 'playtest/keywords-720.png' });
  });

  test("at 720p in a group fight the foe's conditions stay off every intent chip, and your chips clear the rhythm dial", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/?scenario=group-wild-flock&seed=7');
    await page.waitForFunction(() => !!window.__ascendant?.state());
    // Your Reflect, and the foe's Light Screen (every enemy raises it this turn: a stance it plays through the debug intent).
    await page.evaluate(() => window.__ascendant!.hand(['reflect', 'substitute']));
    for (const m of ['reflect', 'substitute']) await page.evaluate(play(m));
    await page.evaluate(() => {
      window.__ascendant!.intend('light-screen', true);
      window.__ascendant!.dispatch({ type: 'end-turn' });
    });
    // Three chips on your Lead for the dial check: the Substitute stands, a fresh Guard and Counter.
    await page.evaluate(() => window.__ascendant!.hand(['withdraw', 'counter']));
    for (const m of ['withdraw', 'counter']) await page.evaluate(play(m));
    await expect(page.getByTestId('sides-enemy')).toBeVisible();
    const sides = await page.locator('[data-testid^="side-"]').all();
    const intents = await page.locator('[data-testid="intent-chip"], [data-testid="intent-chip-second"]').all();
    for (const s of sides) {
      const sb = await s.boundingBox();
      for (const i of intents) {
        const ib = await i.boundingBox();
        if (sb && ib) expect(overlap(sb, ib), 'a side chip over an intent chip').toBe(false);
      }
    }
    const dial = await page.locator('[data-testid="squad"] [data-testid="rhythm-dial"]').first().boundingBox();
    if (dial) {
      for (const chip of await page.getByTestId('squad').locator('[data-testid^="keyword-"]').all()) {
        if (!(await chip.isVisible())) continue;
        const box = await chip.boundingBox();
        if (box) expect(overlap(box, dial), 'a keyword chip under the rhythm dial').toBe(false);
      }
    }
    await page.screenshot({ path: 'playtest/keywords-group-720.png' });
  });

  test('after Hyper Beam the Lead recharges: its cards are locked and say why', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.__ascendant!.hand(['hyper-beam']));
    await page.evaluate(play('hyper-beam'));
    await expect(page.getByTestId('keyword-recharge')).toBeVisible();
    await page.evaluate(() => window.__ascendant!.dispatch({ type: 'end-turn' }));
    await page.evaluate(() => window.__ascendant!.hand(['ember']));
    await expect(page.getByTestId('card-ember')).toHaveAttribute('data-state', 'recharging');
    await page.screenshot({ path: 'playtest/keywords-recharge.png' });
  });

  test('an enemy stance reads as one: Protect is up now, and its card says what that means', async ({ page }) => {
    await open(page);
    // A hurt wild with only Protect: it raises it at the next declaration (§5.3.1).
    await page.evaluate(() => {
      const a = window.__ascendant!;
      const e = a.state()!.enemies[0]!;
      a.setHp(e.uid, Math.floor(e.maxHp * 0.3));
      a.intend('protect');
      // The debug intent is played on turn 1, so Protect cannot go up on turn 2 (§3.11.2): it is up on turn 3.
      a.dispatch({ type: 'end-turn' });
      a.dispatch({ type: 'end-turn' });
    });
    const enemy = page.locator('[data-enemy-uid]').first();
    await expect(enemy.getByTestId('keyword-protect')).toBeVisible();
    await page.getByTestId('intent-chip').first().hover();
    const tip = page.getByRole('tooltip');
    await expect(tip).toContainText('Up now');
    await expect(tip).not.toContainText('this is the turn to hit it');
    await page.screenshot({ path: 'playtest/keywords-stance.png' });
  });
});

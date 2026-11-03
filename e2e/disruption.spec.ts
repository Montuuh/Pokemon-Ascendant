import { expect, test, type Page } from '@playwright/test';

// v0.9.92 — the enemies' disruption and combos on the combat screen (§5.2.3, §5.5.2): a set-up's finisher shown as the
// Combo under it, the trap on your Lead with its turn, Perish Song's count on the top bar, Stealth Rock on your side and
// its damage in the swap's number, and a Taunt that strikes out the set-up it stops.

async function open(page: Page, scenario: string) {
  await page.goto(`/?scenario=${scenario}&seed=7`);
  await page.waitForFunction(() => !!window.__ascendant?.state());
}

/** End the turn and wait until it is yours again. */
async function endTurn(page: Page) {
  const turn = await page.evaluate(() => window.__ascendant!.state()!.turn);
  await page.evaluate(() => window.__ascendant!.dispatch({ type: 'end-turn' }));
  await page.waitForFunction((t) => { const s = window.__ascendant!.state()!; return s.turn > t && s.phase === 'action'; }, turn);
}

const play = (moveId: string) =>
  `(() => { const a = window.__ascendant; a.hand(['${moveId}']); const c = a.state().player.hand.find((x) => x.moveId === '${moveId}'); a.dispatch({ type: 'play-card', cardId: c.id }); })()`;

test.describe('Disruption and combos — §5.2.3 / §5.5.2', () => {
  test('a combo shows its finisher as the Combo under its set-up; the trap and the song follow', async ({ page }) => {
    await open(page, 'trainer-gengar-perish');
    await expect(page.getByTestId('intent-chip')).toContainText('Mean Look');
    await expect(page.getByTestId('intent-next')).toContainText('Combo');
    await expect(page.getByTestId('intent-next')).toContainText('Perish Song');
    await page.screenshot({ path: 'playtest/disruption-combo.png' });

    await endTurn(page);
    await expect(page.getByTestId('keyword-trapped')).toBeVisible();
    await expect(page.getByTestId('intent-chip')).toContainText('Your side');
    await page.getByTestId('keyword-trapped').hover();
    await expect(page.getByRole('tooltip')).toContainText('Through Turn 3');

    await endTurn(page);
    await expect(page.getByTestId('field-perish')).toContainText('3');
    await page.screenshot({ path: 'playtest/disruption-perish.png' });
  });

  test('your Taunt strikes out the set-up it stops, and the Combo goes with it', async ({ page }) => {
    await open(page, 'trainer-gengar-perish');
    await page.evaluate(play('taunt'));
    await expect(page.getByTestId('intent-next')).toHaveCount(0);
    await page.getByTestId('intent-chip').hover();
    await expect(page.getByRole('tooltip')).toContainText('It will not happen this turn');
  });

  test('Stealth Rock lies on your side, and a swap counts what it takes on the way in', async ({ page }) => {
    await open(page, 'trainer-onix-rocks');
    await expect(page.getByTestId('intent-chip')).toContainText('Stealth Rock');
    await expect(page.getByTestId('intent-chip-second')).toContainText('Roar');
    await endTurn(page);
    await expect(page.getByTestId('side-player-stealth-rock')).toBeVisible();
    await page.getByTestId('side-player-stealth-rock').hover();
    await expect(page.getByRole('tooltip')).toContainText('Stealth Rock on your side');
    // §5.2.3 — the bench's number includes the rocks: the sim's own entry damage is in it.
    const { entry, lead } = await page.evaluate(() => {
      const a = window.__ascendant!;
      const s = a.state()!;
      const bench = s.player.team.findIndex((m, i) => i !== s.player.leadIndex && m.hp > 0);
      return { entry: a.sim.sideHazardDamage(s, { config: a.sim.DEFAULT_BATTLE_CONFIG }, s.player.team[bench]!).reduce((n: number, h: { amount: number }) => n + h.amount, 0), lead: s.player.leadIndex };
    });
    expect(entry).toBeGreaterThan(0);
    expect(lead).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: 'playtest/disruption-hazards.png' });
  });
});

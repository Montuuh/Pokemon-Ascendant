import { expect, test, type Page } from '@playwright/test';

// §2.1.6 / §5.11 / §5.12 — the League on the screen: five doors in the map's place, the next one lit and the rest
// ahead; a door's preview hides the team as a Gym's does; the Champion's promises his signature; between doors the
// micro-rest. Screenshots to playtest/league-*.png.

/** A run of three at the League's first door. */
async function atTheLeague(page: Page) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    a.run.fill(3);
    a.run.league();
  });
  await expect(page.getByTestId('league-hall')).toBeVisible();
}

/** Win the next door through the reducer, resolving any evolution it owes. */
async function winNextDoor(page: Page) {
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
    a.run.dispatch({ type: 'begin-combat' });
    const s = a.run.state()!;
    a.run.dispatch({ type: 'finish-combat', report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp: 20, status: null, fainted: false })), caught: null, ballsLeft: 0, turns: 6 } });
    a.run.dispatch({ type: 'claim-reward' });
    for (let g = 0; g < 6 && a.run.state()!.phase === 'evolution'; g++) {
      const e = a.run.state()!.pendingEvolutions[0]!;
      a.run.dispatch({ type: 'choose-branch', uid: e.uid, branchId: e.branchIds[0]! });
    }
    a.goTo('map');
  });
}

test.describe('The League — §2.1.6', () => {
  test('five doors in the map’s place: the first lit, the rest ahead, the Champion last', async ({ page }) => {
    await atTheLeague(page);
    await expect(page.getByRole('heading', { name: 'Pokémon League' })).toBeVisible();
    await expect(page.locator('[data-testid^="league-door-"]')).toHaveCount(5);
    await expect(page.getByTestId('league-door-0')).toHaveAttribute('data-state', 'next');
    await expect(page.getByTestId('league-door-4')).toHaveAttribute('data-state', 'ahead');
    await expect(page.getByTestId('league-door-4')).toContainText('Blue');
    await expect(page.getByTestId('league-hall')).toContainText('Champion');
    await expect(page.getByTestId('fork-banner')).toHaveCount(0);
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="league-hall"] img')].every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
    await page.getByTestId('map-screen').screenshot({ path: 'playtest/league-hall.png' });
  });

  test('a door’s preview hides the team; a beaten door is ticked and the micro-rest heals the standing', async ({ page }) => {
    await atTheLeague(page);
    await page.getByTestId('league-door-0').click();
    const preview = page.getByTestId('node-preview');
    await expect(preview).toContainText('Elite Four');
    await expect(preview).toContainText('Bruno');
    // Hidden as a Gym's: a count of Poké Balls, never who.
    await expect(preview.getByTestId('preview-team-size')).toBeVisible();
    await page.getByTestId('btn-cancel-node').click();
    await expect(preview).toBeHidden();

    await winNextDoor(page);
    await expect(page.getByTestId('league-door-0')).toHaveAttribute('data-state', 'beaten');
    await expect(page.getByTestId('league-door-1')).toHaveAttribute('data-state', 'next');
    // 20 HP carried out, then the micro-rest on top.
    const hp = await page.evaluate(() => {
      const s = window.__ascendant!.run.state()!;
      return s.box.find((m) => m.uid === s.activeUids[0])!.hp;
    });
    expect(hp).toBeGreaterThan(20);
  });

  test("the Champion's preview promises Full Team Synergy, and beating him wins the run", async ({ page }) => {
    await atTheLeague(page);
    for (let i = 0; i < 4; i++) await winNextDoor(page);
    await page.getByTestId('league-door-4').click();
    const preview = page.getByTestId('node-preview');
    await expect(preview.getByTestId('rule-chip')).toHaveAttribute('data-rule', 'synergy');
    await preview.screenshot({ path: 'playtest/league-champion-preview.png' });
    await page.keyboard.press('Escape');
    await winNextDoor(page);
    await expect(page.getByTestId('victory-screen')).toBeVisible();
  });
});

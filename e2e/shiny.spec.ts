import { expect, test, type Page } from '@playwright/test';

// §5.14 / §6.8.1 — the shiny on the screen and the Bond in the run: a shiny's entrance and its mark in a fight, the
// catch's reward card, the Bond a won fight pays each line, and the Pokédex's collection. Screenshots to
// playtest/shiny-*.png.

type Ascendant = {
  run: { new: (starter: string, seed?: number) => void; state: () => RunLike; dispatch: (a: unknown) => void };
  meta: { record: (events: unknown[]) => void };
  goTo: (screen: string) => void;
};
type RunLike = { reachable: string[]; map: { nodes: Record<string, { kind: string }> }; activeUids: string[]; phase: string };

async function fresh(page: Page): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!(window as unknown as { __ascendant?: unknown }).__ascendant);
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('Shiny and Bond — §5.14, §6.8.1', () => {
  test('a shiny takes the field in its palette, and both sides mark theirs', async ({ page }) => {
    await page.goto('/?scenario=wild-shiny');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    const foe = page.getByTestId('arena-enemy').locator('img');
    await expect(foe).toHaveAttribute('data-shiny', 'true');
    await expect(foe).toHaveAttribute('src', /caterpie-shiny\.gif$/);
    await expect(page.getByTestId('shiny-mark')).toHaveCount(2);
    // The player's own shiny Lead fights in its palette too.
    await expect(page.locator('img[data-shiny][src*="squirtle-shiny-back"]')).toHaveCount(1);
    await expect(page.getByTestId('portrait-lead-squirtle')).toHaveAttribute('aria-label', /shiny/);
    await settle(page);
    await page.screenshot({ path: 'playtest/shiny-combat.png' });
  });

  test('a shiny catch shows its palette on the reward card, and a trainer win pays each line its Bond', async ({ page }) => {
    await fresh(page);
    await page.evaluate(() => {
      const A = (window as unknown as { __ascendant: Ascendant }).__ascendant;
      A.run.new('squirtle', 7);
      const s = A.run.state();
      const wild = s.reachable.find((id) => s.map.nodes[id]!.kind === 'wild')!;
      A.run.dispatch({ type: 'enter-node', nodeId: wild });
      A.run.dispatch({ type: 'begin-combat' });
      const t = A.run.state();
      A.run.dispatch({ type: 'finish-combat', report: { outcome: 'caught', team: t.activeUids.map((uid) => ({ uid, hp: 18, status: null, fainted: false })), caught: { speciesId: 'pidgey', level: 6, shiny: true }, ballsLeft: 0, turns: 3 } });
      A.goTo('map');
    });
    await expect(page.getByTestId('reward-catch-shiny')).toBeVisible();
    await expect(page.getByTestId('reward-catch-bond')).toContainText('+10 Bond');
    await settle(page);
    await page.screenshot({ path: 'playtest/shiny-reward.png' });

    await page.getByTestId('btn-claim').click();
    await page.evaluate(() => {
      const A = (window as unknown as { __ascendant: Ascendant }).__ascendant;
      const s = A.run.state();
      const trainer = s.reachable.find((id) => s.map.nodes[id]!.kind === 'trainer') ?? Object.keys(s.map.nodes).find((id) => s.map.nodes[id]!.kind === 'trainer')!;
      A.run.dispatch({ type: 'enter-node', nodeId: trainer });
      A.run.dispatch({ type: 'begin-combat' });
      const t = A.run.state();
      A.run.dispatch({ type: 'finish-combat', report: { outcome: 'victory', team: t.activeUids.map((uid) => ({ uid, hp: 18, status: null, fainted: false })), caught: null, ballsLeft: 0, turns: 4, leadTurns: { squirtle: 4 } } });
    });
    await expect(page.getByTestId('bond-squirtle')).toContainText('+2 Bond');
    await expect(page.getByTestId('bond-pidgey')).toContainText('+1 Bond');
    await expect(page.getByTestId('xp-pidgey').getByTestId('shiny-mark')).toBeVisible();
    await settle(page);
    await page.screenshot({ path: 'playtest/bond-reward.png' });
  });

  test('the Pokédex keeps the collection: the legend counts it, the card marks it, the sheet wears it', async ({ page }) => {
    await fresh(page);
    await page.evaluate(() => {
      const A = (window as unknown as { __ascendant: Ascendant }).__ascendant;
      A.meta.record([{ t: 'recruit', speciesId: 'pidgey', boxFull: false, firstThisRun: true, shiny: true }]);
    });
    await page.goto('/?screen=hub');
    await page.getByTestId('kiosk-pc').click();
    await expect(page.getByTestId('dex-legend')).toContainText('1 shiny');
    await expect(page.getByTestId('dex-pidgey').getByTestId('shiny-mark')).toBeVisible();
    await settle(page);
    await page.screenshot({ path: 'playtest/shiny-dex.png' });
    await page.getByTestId('dex-pidgey').click();
    await expect(page.getByTestId('dex-stat-shiny')).toContainText('1');
    await settle(page);
    await page.screenshot({ path: 'playtest/shiny-dex-sheet.png' });
  });
});

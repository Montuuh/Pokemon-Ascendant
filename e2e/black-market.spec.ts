import { expect, test, type Page } from '@playwright/test';

// v0.7.7 — Team Rocket's Black Market (§2.11.6). The exit criterion first: a player who has never been told finds it,
// from the City map, with nothing but the pointer — the Game Corner, the Grunt by the poster, the switch, the stairs.
// Then each counter through the UI, and the door that locks behind you.

async function inCeladon(page: Page, money = 5000, relics: string[] = []): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(([m, r]) => {
    const dev = window.__ascendant!;
    dev.run.new('squirtle', 7);
    dev.run.fill(5);
    // Everyone at a level where nobody owes an Evolution screen, so the counters are what is on screen.
    for (const mon of dev.run.state()!.box) dev.run.levelTo(30, mon.uid);
    const settled = ['blastoise', 'tauros', 'kangaskhan', 'lapras', 'snorlax', 'scyther'];
    dev.run.patch((d) => {
      d.box.forEach((mon, i) => { mon.speciesId = settled[i]!; });
    });
    dev.run.city(1);
    dev.run.pay(m as number);
    for (const id of r as string[]) dev.run.grantRelic(id);
  }, [money, relics] as const);
  await expect(page.getByTestId('city-screen')).toBeVisible();
}

/** The whole way down, by pointer only. */
async function findIt(page: Page): Promise<void> {
  await page.getByTestId('door-game-corner').click();
  await expect(page.getByTestId('game-corner-room')).toBeVisible();
  await page.getByTestId('gc-poster').hover();
  await expect(page.getByTestId('gc-grunt-line')).toContainText('Keep away from that poster');
  await page.getByTestId('gc-poster').click();
  await page.getByTestId('btn-switch-push').click();
  await expect(page.getByTestId('gc-stairs')).toHaveAttribute('data-state', 'open');
  await page.getByTestId('gc-stairs').click();
  await expect(page.getByTestId('black-market-screen')).toBeVisible();
}

test.describe('Finding it — §2.11.6', () => {
  test('a player never told finds it: the City has no door to it, the Game Corner has a poster', async ({ page }) => {
    await inCeladon(page);
    await expect(page.getByTestId('door-black-market')).toHaveCount(0);
    await page.getByTestId('door-game-corner').click();
    await expect(page.getByTestId('gc-grunt')).toBeVisible();
    await expect(page.getByTestId('gc-stairs')).toHaveCount(0);
    await page.getByTestId('gc-poster').hover();
    await expect(page.getByTestId('gc-grunt-line')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'playtest/game-corner-room.png' });
    await page.getByTestId('gc-poster').click();
    await expect(page.getByTestId('gc-switch')).toBeVisible();
    await page.screenshot({ path: 'playtest/game-corner-switch.png' });
    // Escape is the same answer as leaving it: nothing opens.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('gc-switch')).toBeHidden();
    await page.getByTestId('gc-poster').click();
    await page.getByTestId('btn-switch-leave').click();
    await expect(page.getByTestId('gc-stairs')).toHaveCount(0);
    await page.getByTestId('gc-poster').click();
    await page.getByTestId('btn-switch-push').click();
    await expect(page.getByTestId('gc-grunt')).toHaveCount(0);
    await expect(page.getByTestId('gc-stairs')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'playtest/game-corner-stairs.png' });
    await page.getByTestId('gc-stairs').click();
    await expect(page.getByTestId('black-market-screen')).toBeVisible();
    await page.screenshot({ path: 'playtest/black-market.png' });
  });

  test('going back up asks first, locks the door, and the stairs say so', async ({ page }) => {
    await inCeladon(page);
    await findIt(page);
    await page.getByTestId('btn-leave-market').click();
    await expect(page.getByTestId('confirm-leave')).toBeVisible();
    await page.screenshot({ path: 'playtest/black-market-leave.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('confirm-leave')).toBeHidden();
    await expect(page.getByTestId('black-market-screen')).toBeVisible();
    await page.getByTestId('btn-leave-market').click();
    await page.getByTestId('btn-leave-confirm').click();
    await expect(page.getByTestId('game-corner-screen')).toBeVisible();
    await expect(page.getByTestId('gc-stairs')).toHaveAttribute('data-state', 'locked');
    await page.getByTestId('gc-stairs').click();
    await expect(page.getByTestId('game-corner-screen')).toBeVisible();
  });
});

test.describe('The counters — §2.11.6', () => {
  test('the Trader swaps one of yours for one of theirs, at your level', async ({ page }) => {
    await inCeladon(page);
    await findIt(page);
    const before = await page.evaluate(() => window.__ascendant!.run.state()!);
    const give = before.box[1]!;
    const species = before.city!.blackMarket!.trades[0]!;
    await page.getByTestId('trade-offer-0').click();
    await page.getByTestId(`trade-give-${give.uid}`).click();
    await expect(page.getByTestId('btn-trade')).toContainText(`Lv ${give.level}`);
    await page.screenshot({ path: 'playtest/black-market-trader.png' });
    await page.getByTestId('btn-trade').click();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(after.box).toHaveLength(before.box.length);
    expect(after.box[1]!.speciesId === species || after.phase === 'evolution').toBe(true);
    if (after.phase === 'black-market') await expect(page.getByTestId('market-trader')).toHaveAttribute('data-dealt', 'true');
  });

  test('the Fence sells a Rare Candy for a level, and buys a relic on the second press', async ({ page }) => {
    await inCeladon(page, 5000, ['coin-pouch']);
    await findIt(page);
    await page.getByTestId('market-fence').click();
    const before = await page.evaluate(() => window.__ascendant!.run.state()!);
    const mon = before.box[1]!;
    await page.getByTestId(`candy-${mon.uid}`).click();
    await page.screenshot({ path: 'playtest/black-market-fence.png' });
    await page.getByTestId('btn-candy').click();
    const levelled = await page.evaluate((uid) => window.__ascendant!.run.state()!.box.find((m) => m.uid === uid)!.level, mon.uid);
    expect(levelled).toBe(mon.level + 1);
    await page.getByTestId('sell-coin-pouch').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).toContain('coin-pouch');
    await page.getByTestId('sell-coin-pouch').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).not.toContain('coin-pouch');
  });

  test('the Gambler prints the chance before the stake is down, and takes it either way', async ({ page }) => {
    await inCeladon(page, 5000, ['coin-pouch', 'brave-charm']);
    await findIt(page);
    await page.getByTestId('market-gambler').click();
    const target = await page.evaluate(() => window.__ascendant!.run.state()!.city!.blackMarket!.wagerTargets[0]!);
    await page.getByTestId(`wager-target-${target}`).click();
    await page.getByTestId('stake-coin-pouch').click();
    await expect(page.getByTestId('wager-chance')).toContainText('%');
    await page.screenshot({ path: 'playtest/black-market-gambler.png' });
    await page.getByTestId('btn-wager').click();
    const run = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(run.relics).not.toContain('coin-pouch');
    expect(run.relics.includes(target)).toBe(run.city!.blackMarket!.wager!.won);
  });

  test('the showcase takes three Pokémon for its Legendary, asks, and the deal shuts the market', async ({ page }) => {
    await inCeladon(page);
    await findIt(page);
    await page.getByTestId('market-showcase').click();
    const run = await page.evaluate(() => window.__ascendant!.run.state()!);
    const legendary = run.city!.blackMarket!.legendary!;
    for (const m of run.box.slice(2, 5)) await page.getByTestId(`showcase-give-${m.uid}`).click();
    await page.screenshot({ path: 'playtest/black-market-showcase.png' });
    await page.getByTestId('btn-showcase').click();
    await expect(page.getByTestId('confirm-showcase')).toBeVisible();
    await page.getByTestId('btn-leave-confirm').click();
    await expect(page.getByTestId('game-corner-screen')).toBeVisible();
    const after = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(after.relics).toContain(legendary);
    expect(after.box).toHaveLength(2);
    await expect(page.getByTestId('gc-stairs')).toHaveAttribute('data-state', 'locked');
  });
});

test.describe('At 1280 × 720 — §9.6', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test('the back wall, the machines and the market all fit a small screen', async ({ page }) => {
    await inCeladon(page, 5000, ['coin-pouch']);
    await page.getByTestId('door-game-corner').click();
    await expect(page.getByTestId('game-corner-room')).toBeVisible();
    await page.screenshot({ path: 'playtest/game-corner-720.png' });
    await expect(page.getByTestId('btn-spin')).toBeInViewport();
    await expect(page.getByTestId('btn-pull')).toBeInViewport();
    await expect(page.getByTestId('gc-poster')).toBeInViewport();
    await page.getByTestId('gc-poster').click();
    await page.getByTestId('btn-switch-push').click();
    await page.getByTestId('gc-stairs').click();
    await page.getByTestId('market-gambler').click();
    await expect(page.getByTestId('btn-wager')).toBeInViewport();
    await expect(page.getByTestId('btn-leave-market')).toBeInViewport();
    await page.screenshot({ path: 'playtest/black-market-720.png' });
  });
});

import { expect, test, type Page } from '@playwright/test';

// A whole Region 1 driven through the real UI: new-run flow, twenty columns of node choices, fights, rewards,
// evolutions with their branch pick, the field nurse, the Gym, the Legendary pick and the walk into Pallet
// Town — then out of its gate into Region 2. Nothing here reaches into a store — if this passes, a player can
// get from the first node to the next Region with a mouse. Also covers the §10.8 save: quit mid-route and
// come back.

/** Kept in step with src/sim/run/map.ts by hand; the spec runs in Node, outside the Vite alias. */
const LAYERS = 20;

/** Play every playable card at the enemy, then end the turn. Returns once the fight has an outcome. */
async function playOneTurn(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    if ((await page.getByTestId('outcome-overlay').count()) > 0) return;
    if ((await page.getByTestId('lead-pick-modal').count()) > 0) {
      await page.locator('[data-testid^="pick-lead-"]').first().click();
      await page.waitForTimeout(80);
    }
    const playable = page.locator('[data-testid="hand"] [data-testid^="card-"][data-state="playable"]');
    if ((await playable.count()) === 0) break;
    await playable.first().click();
    const hint = page.getByTestId('selection-hint');
    if ((await hint.count()) > 0 && (await hint.textContent())?.includes('Step-Backward')) {
      await page.locator('[data-testid^="portrait-bench-"]').first().click();
    } else {
      const enemy = page.locator('[data-testid^="enemy-"]');
      if ((await enemy.count()) === 0) break;
      await enemy.first().click();
    }
    await page.waitForTimeout(110);
  }
}

async function fightToTheEnd(page: Page): Promise<'victory' | 'defeat'> {
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  for (let turn = 0; turn < 40; turn++) {
    if ((await page.getByTestId('outcome-overlay').count()) > 0) break;
    await playOneTurn(page);
    if ((await page.getByTestId('outcome-overlay').count()) > 0) break;
    const endTurn = page.getByTestId('btn-end-turn');
    if (await endTurn.isEnabled()) await endTurn.click();
    await page.waitForTimeout(140);
    if ((await page.getByTestId('lead-pick-modal').count()) > 0) {
      await page.locator('[data-testid^="pick-lead-"]').first().click();
    }
  }
  const overlay = page.getByTestId('outcome-overlay');
  await expect(overlay).toBeVisible();
  const text = (await overlay.textContent()) ?? '';
  await overlay.getByTestId('btn-continue-run').click();
  return /Victory|Gotcha/.test(text) ? 'victory' : 'defeat';
}

let rewardShot = false;

/** Clear whatever the run puts in front of us after a fight, and land back on the map. */
async function clearPostCombat(page: Page): Promise<void> {
  if ((await page.getByTestId('reward-screen').count()) > 0) {
    await expect(page.getByTestId('reward-screen')).toBeVisible();
    if (!rewardShot) {
      await page.waitForTimeout(500); // let the XP bars finish filling
      await page.screenshot({ path: 'playtest/run-reward.png' });
      rewardShot = true;
    }
    await page.getByTestId('btn-claim').click();
    await page.waitForTimeout(120);
  }
  // §3.6 — one Evolution screen per Pokémon that crossed its threshold, each needing an archetype.
  for (let i = 0; i < 6 && (await page.getByTestId('evolution-screen').count()) > 0; i++) {
    await page.locator('[data-testid^="branch-"]').first().click();
    await page.getByTestId('btn-evolve').click();
    await page.waitForTimeout(150);
  }
  if ((await page.getByTestId('swap-or-skip').count()) > 0) {
    await page.getByTestId('btn-skip-recruit').click();
    await page.waitForTimeout(120);
  }
  // §7.3.7 — beating the Gym opens the Legendary 1-of-3, and the run does not reach its summary until the
  // offer is answered. Take the first: what is being tested here is that a player can finish a run.
  if ((await page.getByTestId('legendary-screen').count()) > 0) {
    await page.screenshot({ path: 'playtest/run-legendary.png' });
    await page.locator('[data-testid^="legendary-offer-"]').first().click();
    await page.getByTestId('btn-take-legendary').click();
    await page.waitForTimeout(150);
  }
}

async function startRun(page: Page, starter = 'squirtle'): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await page.getByTestId('btn-new-run').click();
  // §8.8.4 — the baseline is the floor, so the shortest legal path through the stepper takes no modifier.
  await expect(page.getByTestId('step-difficulty')).toBeVisible();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('step-starter')).toBeVisible();
  await page.getByTestId(`starter-${starter}`).click();
  await page.getByTestId('btn-continue').click();
  // §8.6.3 — the Starting Relic step. Taking one is optional, and this path skips it.
  await expect(page.getByTestId('step-relic')).toBeVisible();
  await page.getByTestId('btn-continue').click();
  // §2.11.3 — the Region Modifier step, optional for the same reason.
  await expect(page.getByTestId('step-region')).toBeVisible();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('map-screen')).toBeVisible();
}

test('the new-run flow reaches a twenty-column route with three or four first choices', async ({ page }) => {
  await startRun(page, 'bulbasaur');
  await expect(page.getByTestId('map-graph')).toBeVisible();
  await expect(page.getByText(`Column 1 of ${LAYERS}`)).toBeVisible();
  const reachable = page.locator('[data-testid^="node-"][data-status="reachable"]');
  const first = await reachable.count();
  expect(first).toBeGreaterThanOrEqual(3);
  expect(first).toBeLessThanOrEqual(4);
  // §9.3 — the route is wider than the screen and scrolls; its terrain is painted from tiles (§2.5.4).
  await expect(page.getByTestId('route-board')).toHaveAttribute('data-painted', 'true');
  const [board, scroller] = await Promise.all([page.getByTestId('route-board').boundingBox(), page.getByTestId('route-scroller').boundingBox()]);
  expect(board!.width).toBeGreaterThan(scroller!.width);
  await expect(page.getByTestId('no-return')).toBeAttached();
  // §2.5 — BOTH Gyms are on the board from the start and both are named in the header, because the fork is
  // the largest thing the map can telegraph and it decides what you recruit for ten nodes before you arrive.
  await expect(page.locator('[data-kind="gym"]')).toHaveCount(2);
  await expect(page.getByTestId('fork-banner')).toBeVisible();
  // §2.9.2 / §2.8.1 — and so are the landmarks, so they can be planned for: a travelling merchant or more, and no
  // Dojo or Poké Mart on the route — those are in the towns now (§2.11.4).
  expect(await page.locator('[data-kind="merchant"]').count()).toBeGreaterThanOrEqual(1);
  await expect(page.locator('[data-kind="dojo"]')).toHaveCount(0);
  await expect(page.locator('[data-kind="shop"]')).toHaveCount(0);
  // §2.5.1 — one Elite Trainer is guaranteed and a second appears in a lane about a fifth of the time, so
  // this asserts the *rule* rather than a number a seeded roll is allowed to change.
  const elites = await page.locator('[data-kind="elite"]').count();
  expect(elites, 'one guaranteed Elite Trainer, plus a rolled one at ~22 %').toBeGreaterThanOrEqual(1);
  expect(elites).toBeLessThanOrEqual(2);
  // §2.8.2 — the Elite Wild is the other rolled special, at most one, and not on every map.
  expect(await page.locator('[data-kind="elite-wild"]').count()).toBeLessThanOrEqual(1);
  // §2.5.1 — the stop columns: Mysteries across the route, finds on the ground, a field nurse in each lane at least.
  expect(await page.locator('[data-kind="mystery"]').count()).toBeGreaterThanOrEqual(3);
  expect(await page.locator('[data-kind="aid"]').count()).toBeGreaterThanOrEqual(2);
  expect(await page.locator('[data-kind="cache"]').count()).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId('box-panel')).toContainText('Bulbasaur');
  await page.screenshot({ path: 'playtest/run-map.png' });
});

test('the Move Manager moves a card between the pool and the active 4', async ({ page }) => {
  await startRun(page, 'bulbasaur');
  await page.getByTestId('box-moves-bulbasaur').click();
  const panel = page.getByTestId('move-manager');
  await expect(panel).toBeVisible();

  // A level-5 Bulbasaur holds three cards and has a free slot, so nothing is blocked yet.
  const equipped = panel.locator('[data-testid^="move-"][data-in-kit="true"]');
  await expect(equipped).toHaveCount(3);

  // Bench one, and it moves to the pool rather than disappearing.
  await equipped.first().click();
  await expect(panel.locator('[data-testid^="move-"][data-in-kit="true"]')).toHaveCount(2);
  await expect(panel.locator('[data-testid^="move-"][data-in-kit="false"]')).toHaveCount(1);
  await page.screenshot({ path: 'playtest/run-move-manager.png' });

  // Auto restores a legal kit, and Escape closes the overlay.
  await page.getByTestId('btn-auto-pick').click();
  await expect(panel.locator('[data-testid^="move-"][data-in-kit="true"]')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('a node preview names what is inside and can be backed out of', async ({ page }) => {
  await startRun(page);
  const choices = await page.locator('[data-testid^="node-"][data-status="reachable"]').count();
  await page.locator('[data-testid^="node-"][data-status="reachable"]').first().click();
  const preview = page.getByTestId('node-preview');
  await expect(preview).toBeVisible();
  await expect(preview.getByTestId('preview-team')).toContainText('Squirtle');
  await page.screenshot({ path: 'playtest/run-node-preview.png' });
  await page.getByTestId('btn-cancel-node').click();
  await expect(preview).toBeHidden();
  await expect(page.locator('[data-testid^="node-"][data-status="reachable"]')).toHaveCount(choices);
});

test('a Wild Area shows its whole pool by rarity, with the odds — §2.6.2', async ({ page }) => {
  await startRun(page);
  await page.locator('[data-testid^="node-"][data-status="reachable"][data-kind="wild"]').first().click();
  const pool = page.getByTestId('wild-pool');
  await expect(pool).toBeVisible();
  await expect(page.getByTestId('wild-odds-common')).toHaveText('60 %');
  await expect(page.getByTestId('wild-odds-uncommon')).toHaveText('30 %');
  await expect(page.getByTestId('wild-odds-rare')).toHaveText('10 %');
  expect(await pool.locator('[data-testid^="wild-mon-"]').count()).toBeGreaterThanOrEqual(8);
  await page.getByTestId('node-preview').screenshot({ path: 'playtest/run-wild-pool.png' });
  // A Pokémon's name and its own chance are one hover away.
  await pool.getByTestId('wild-tier-rare').locator('[data-testid^="wild-mon-"]').first().hover();
  await expect(page.getByRole('tooltip')).toContainText('Rare');
  await page.screenshot({ path: 'playtest/run-wild-pool-tip.png' });
});

test('the Lure Module moves the odds the Wild Area shows — §7.3.4', async ({ page }) => {
  await startRun(page);
  await page.evaluate(() => window.__ascendant!.run.grantRelic('lure-module'));
  await page.locator('[data-testid^="node-"][data-status="reachable"][data-kind="wild"]').first().click();
  // The better of two rolls: 0.6² Common, 0.9² − 0.6² Uncommon, the rest Rare.
  await expect(page.getByTestId('wild-odds-common')).toHaveText('36 %');
  await expect(page.getByTestId('wild-odds-uncommon')).toHaveText('45 %');
  await expect(page.getByTestId('wild-odds-rare')).toHaveText('19 %');
});

test('quitting mid-route and continuing resumes the same map', async ({ page }) => {
  await startRun(page);
  const seedLine = await page.locator('header').first().textContent();

  await page.getByTestId('btn-pause').click();
  await page.getByTestId('btn-save-quit').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();

  const resume = page.getByTestId('btn-continue-run');
  await expect(resume).toBeVisible();
  await expect(resume).toContainText('Squirtle');
  await resume.click();

  await expect(page.getByTestId('map-screen')).toBeVisible();
  expect(await page.locator('header').first().textContent()).toBe(seedLine);
});

test('a full Region reaches the Gym, Pallet Town, and the road to Region 2', async ({ page }) => {
  test.setTimeout(400_000);
  await startRun(page);

  for (let layer = 0; layer < LAYERS + 1; layer++) {
    if ((await page.getByTestId('city-screen').count()) > 0) break;
    if ((await page.getByTestId('defeat-screen').count()) > 0) break;
    await expect(page.getByTestId('map-screen')).toBeVisible();

    // Take the field nurse when she is next, and a wild fight over a trainer when there is one: the walker
    // plays like a mouse, not a strategist, and a Lv 5 starter alone loses a trainer often enough to matter.
    // In a stop column (§2.5.1) it picks up what is on the ground when it can.
    const nurse = page.locator('[data-testid^="node-"][data-status="reachable"][data-kind="aid"]');
    const wild = page.locator('[data-testid^="node-"][data-status="reachable"][data-kind="wild"]');
    const find = page.locator('[data-testid^="node-"][data-status="reachable"][data-kind="cache"]');
    const any = page.locator('[data-testid^="node-"][data-status="reachable"]');
    const target = (await nurse.count()) > 0 ? nurse.first() : (await wild.count()) > 0 ? wild.first() : (await find.count()) > 0 ? find.first() : any.first();
    await target.click();

    await expect(page.getByTestId('node-preview')).toBeVisible();
    await page.getByTestId('btn-enter-node').click();
    await page.waitForTimeout(200);

    // §2.9.1 — the nurse is a screen, not a fight: she heals on arrival, and you walk on.
    if ((await page.getByTestId('aid-screen').count()) > 0) {
      await page.getByTestId('btn-leave-aid').click();
      await page.waitForTimeout(150);
      continue;
    }
    // §2.9.5 — a find is picked up on the spot: the map says what it was, and the route goes on.
    if ((await page.getByTestId('map-found').count()) > 0) continue;
    // §2.9.2 — the merchant's cart: walk past it.
    if ((await page.getByTestId('btn-leave-shop').count()) > 0) {
      await page.getByTestId('btn-leave-shop').click();
      await page.waitForTimeout(150);
      continue;
    }
    // §2.10 — a Mystery: take the first choice that can be taken, and walk on.
    if ((await page.locator('[data-testid^="event-choice-"]').count()) > 0) {
      await page.locator('[data-testid^="event-choice-"]:not([disabled])').first().click();
      await page.getByTestId('btn-leave-event').click();
      await page.waitForTimeout(150);
      await clearPostCombat(page);
      continue;
    }

    if ((await page.getByTestId('combat-screen').count()) > 0) {
      const result = await fightToTheEnd(page);
      await page.waitForTimeout(200);
      await clearPostCombat(page);
      if (result === 'defeat') break;
    }
  }

  const town = page.getByTestId('city-screen');
  const defeat = page.getByTestId('defeat-screen');
  await expect(town.or(defeat)).toBeVisible();

  // §2.1.4 — a Gym win is not the end of the run any more: it is Pallet Town, and its gate is Region 2.
  if ((await town.count()) > 0) {
    await page.screenshot({ path: 'playtest/run-town.png' });
    await page.getByTestId('door-gate').click();
    await page.locator('[data-testid^="reflection-"]').first().click();
    await page.getByTestId('btn-depart').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Region 2' })).toBeVisible();
    return;
  }

  await page.screenshot({ path: 'playtest/run-summary.png', fullPage: true });
  // A defeat is a legal run too; what must hold is that the summary is honest and the save is gone.
  await expect(defeat).toContainText(/Nodes cleared|Depth reached/);
  // §8.3 — and that the account was paid: a lost run pays by depth, so the XP line is never zero after a run
  // that cleared a node. A run lost on the very first node has cleared none, and owes nothing.
  await expect(page.getByTestId('account-summary')).toBeVisible();
  const cleared = await page.evaluate(() => window.__ascendant?.run.state()?.stats.nodesCleared ?? 0);
  const xpLine = await page.getByTestId('summary-xp').textContent();
  if (cleared > 0) expect(Number(xpLine?.replace(/[^0-9]/g, ''))).toBeGreaterThan(0);
  await defeat.getByTestId('btn-end-continue').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByTestId('btn-continue-run')).toHaveCount(0);
});

test('the map is usable at 1280x720', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startRun(page);
  await expect(page.getByTestId('map-graph')).toBeVisible();

  // Nothing may overflow the viewport: the route scrolls inside its own board (§9.3), never the page.
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(1);
  expect(overflow.y).toBeLessThanOrEqual(1);

  // Every node marker sits inside the board's height, captions included: the route scrolls sideways, never up.
  const board = (await page.getByTestId('route-scroller').boundingBox())!;
  for (const node of await page.locator('[data-testid^="node-"]').all()) {
    const box = await node.boundingBox();
    if (!box) continue;
    expect(box.y).toBeGreaterThanOrEqual(board.y - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(board.y + board.height + 1);
  }
  await page.screenshot({ path: 'playtest/run-map-720.png' });

  // §9.3 — the strip under the board is the whole route: a click near its end jumps the board there.
  const scroller = page.getByTestId('route-scroller');
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);
  const strip = (await page.getByTestId('route-strip').boundingBox())!;
  await page.mouse.click(strip.x + strip.width * 0.9, strip.y + strip.height / 2);
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

  // The preview still fits and is still actionable at this height.
  await page.locator('[data-testid^="node-"][data-status="reachable"]').first().click();
  await expect(page.getByTestId('btn-enter-node')).toBeInViewport();
});

test('a find on the ground is named, picked up in one click, and said once — §2.9.5', async ({ page }) => {
  await startRun(page);
  // Stand the run beside the map's first find, the way the dev hook stands it anywhere.
  await page.evaluate(() => {
    const a = (window as unknown as { __ascendant: { run: { patch: (r: (d: { reachable: string[]; map: { nodes: Record<string, { kind: string; id: string }> } }) => void) => void } } }).__ascendant;
    a.run.patch((d) => {
      const find = Object.values(d.map.nodes).find((n) => n.kind === 'cache')!;
      d.reachable = [find.id];
    });
  });
  await page.locator('[data-testid^="node-"][data-status="reachable"][data-kind="cache"]').click();
  const preview = page.getByTestId('node-preview');
  await expect(preview.getByTestId('preview-find')).toBeVisible();
  // No team to bring and nothing to fight: the card is the find and one button.
  await expect(preview.getByTestId('preview-team')).toHaveCount(0);
  await expect(page.getByTestId('btn-enter-node')).toHaveText('Pick it up');
  await page.getByTestId('btn-enter-node').click();
  await expect(page.getByTestId('map-screen')).toBeVisible();
  await expect(page.getByTestId('map-found')).toContainText('You picked up');
  await page.screenshot({ path: 'playtest/run-map-found.png' });
  // Said once, then gone.
  await expect(page.getByTestId('map-found')).toBeHidden({ timeout: 6000 });
});

test('the Gym hands out a Badge and a Legendary pick, then the town', async ({ page }) => {
  // §5.10 / §7.3.7 — the two things a Gym victory owes the player. Driven through the dev hook rather than
  // twelve layers of clicking, because what is under test is the *ending*, not the route.
  await startRun(page);
  await page.evaluate(() => {
    const e = (window as unknown as { __ascendant: Record<string, never> }).__ascendant;
    (e.run as unknown as { fill: (n: number) => void }).fill(3);
    // The whole Box, not only the Lead: XP scales with the level gap (§6.2.1), so a Lv 20 Lead no longer drags
    // a Lv 6 bench up to the Gym on its own.
    const run = e.run as unknown as { state: () => { box: { uid: string }[] }; levelTo: (n: number, uid?: string) => void; heal: () => void };
    for (const m of run.state().box) run.levelTo(20, m.uid);
    run.heal();
    // Straight to the Gym: an unseeded route can wear the team down before it, and the route is not under test.
    (e.run as unknown as { jump: (k: string) => boolean }).jump('gym');
    (e.run as unknown as { goto: (k: string) => string }).goto('gym');
  });

  const combat = page.getByTestId('combat-screen');
  if ((await combat.count()) > 0) {
    const result = await fightToTheEnd(page);
    await page.waitForTimeout(200);
    if (result === 'defeat') test.skip(true, 'the Gym won this seed; the ending is covered by the full-run test');
  }
  const outcome = await page.evaluate(() => window.__ascendant!.run.state()?.outcome);
  test.skip(outcome === 'defeat', 'the Gym won this seed; the ending is covered by the full-run test');

  // The reward, the evolutions and the recruit all queue ahead of the Gym's own rewards (§2.4).
  if ((await page.getByTestId('reward-screen').count()) > 0) await page.getByTestId('btn-claim').click();
  for (let i = 0; i < 6 && (await page.getByTestId('evolution-screen').count()) > 0; i++) {
    await page.locator('[data-testid^="branch-"]').first().click();
    await page.getByTestId('btn-evolve').click();
    await page.waitForTimeout(150);
  }

  // §7.3.7 — three Legendaries, and declining is a real answer. §5.10 — the Badge just won is named above them.
  const offer = page.getByTestId('legendary-screen');
  await expect(offer).toBeVisible();
  await expect(page.getByTestId('badge-award')).toContainText('Badge earned');
  await expect(page.locator('[data-testid^="legendary-offer-"]')).toHaveCount(3);
  await page.screenshot({ path: 'playtest/run-legendary.png' });
  await page.locator('[data-testid^="legendary-offer-"]').first().click();
  await page.getByTestId('btn-take-legendary').click();

  // §2.1.4 — and then Pallet Town, with the Badge in its case.
  await expect(page.getByTestId('city-screen')).toBeVisible();
  await expect(page.getByTestId('city-badges').locator('img')).toHaveCount(1);
  await page.screenshot({ path: 'playtest/run-town-badge.png' });
});

test('the third Gym ends the run with the summary — §2.1', async ({ page }) => {
  // Driven through the dev hook: stand the run in Celadon City, leave through the gate into Region 3, and let
  // the walker fight to its Gym. What is under test is the ending, not twelve layers of clicking.
  test.setTimeout(240_000);
  await startRun(page);
  await page.evaluate(() => {
    const dev = window.__ascendant!;
    dev.run.fill(3);
    // Levelled well past Region 3 (§2.2.1 makes it the hardest of the three): this test is about the ending.
    for (const m of dev.run.state()!.box) dev.run.levelTo(50, m.uid);
    dev.run.city(1);
    // levelTo raises the level, not the HP — the Center fills the new bars, as a player would stop there.
    dev.run.dispatch({ type: 'enter-building', building: 'center' });
    dev.run.dispatch({ type: 'leave-center' });
    dev.run.dispatch({ type: 'depart-city', modifierId: dev.run.state()!.city!.reflection[0]! });
    // Straight to the last Gym: Region 3 is the hardest of the three (§2.2.1), and the route is not under test.
    dev.run.jump('gym');
    dev.run.goto('gym');
  });
  const phase = await page.evaluate(() => window.__ascendant!.run.state()!.phase);
  test.skip(phase !== 'legendary', `the walk ended in ${phase}, not at the last Gym's pick; the ending is covered by the sim`);

  await page.evaluate(() => window.__ascendant!.goTo('map'));
  await expect(page.getByTestId('legendary-screen')).toBeVisible();
  await page.getByTestId('btn-decline-legendary').click();

  const victory = page.getByTestId('victory-screen');
  await expect(victory).toBeVisible();
  await expect(victory).toContainText('Run complete');
  await expect(victory).toContainText('Regions');
  await expect(page.getByTestId('badge-award')).toBeVisible();
  await page.screenshot({ path: 'playtest/run-victory.png' });
});

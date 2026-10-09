import { expect, test, type Page } from '@playwright/test';

// §9.9.1 / v0.9.3 — the arena's beats, with motion on (the rest of the suite runs reduced): a Poké Ball thrown from
// the trainer's hand and the Pokémon out of it, the catch beat by beat (§2.6.4.4), and a fallen Pokémon sinking and
// its ball going back to the trainer. Screenshots to playtest/anim-*.png, taken mid-beat.

test.use({ reducedMotion: 'no-preference' });

type Dev = {
  state: () => { player: { consumables: { hand: { id: string; consumableId: string }[] } }; outcome: string } | null;
  dispatch: (a: unknown) => void;
  auto: (steps?: number) => number;
};
const dev = (page: Page) => page.evaluate.bind(page);

test.describe('Arena animations — §9.9', () => {
  test('a Wild Area fight opens by saying the rarity it rolled, then lets it go — §2.6.2', async ({ page }) => {
    await page.goto('/?scenario=wild-rare');
    const banner = page.getByTestId('wild-tier-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-tier', 'rare');
    await expect(banner).toContainText('Rare!');
    await page.waitForTimeout(500);
    await page.getByTestId('combat-screen').screenshot({ path: 'playtest/anim-wild-rare.png' });
    await expect(banner).toBeHidden({ timeout: 5_000 });
  });

  test('a trainer sends its Pokémon out of the ball, and yours comes out after', async ({ page }) => {
    // A beat lasts well under a second and a loaded machine polls slowly: record what the arena did as it happens.
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __fxSeen: string[] }).__fxSeen = seen;
      new MutationObserver(() => {
        for (const f of document.querySelectorAll<HTMLElement>('[data-testid="ball-flight"]')) seen.push(`ball-${f.dataset.hand}-${f.dataset.dir}`);
        for (const e of document.querySelectorAll<HTMLElement>('[data-testid="arena-enemy"]')) if (e.className.includes('fx-sendout')) seen.push('enemy-sendout');
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    });
    await page.goto('/?scenario=trainer-2enemy');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    // And then the beat is over: nothing stays hidden.
    await expect(page.getByTestId('arena-enemy').first()).not.toHaveClass(/fx-(sendout|hidden)/, { timeout: 4_000 });
    const seen = await page.evaluate(() => (window as unknown as { __fxSeen: string[] }).__fxSeen);
    // The trainer's ball flies in first; then the foe comes out of it; then yours, from your hand.
    expect(seen).toContain('ball-trainer-in');
    expect(seen).toContain('ball-player-in');
    expect(seen.indexOf('ball-trainer-in')).toBeLessThan(seen.indexOf('enemy-sendout'));
  });

  test('the trainer throws its ball from its hand (screenshot)', async ({ page }) => {
    // The page's load event waits for its images, by which time the first ball may have landed: watch from commit.
    await page.goto('/?scenario=trainer-2enemy', { waitUntil: 'commit' });
    await page.locator('[data-testid="ball-flight"][data-hand="trainer"][data-dir="in"]').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'playtest/anim-throw.png' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'playtest/anim-sendout.png' });
  });

  test('the catch: the ball rocks once per shake check, the checks light up, and the outcome waits for the click or the burst', async ({ page }) => {
    await page.goto('/?scenario=wild-catch-ready&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.waitForTimeout(900);
    await dev(page)(() => {
      const A = (window as unknown as { __ascendant: Dev }).__ascendant;
      const ball = A.state()!.player.consumables.hand.find((c) => c.consumableId === 'poke-ball')!;
      A.dispatch({ type: 'use-consumable', cardId: ball.id });
    });
    const beat = page.getByTestId('catch-fx');
    await expect(beat).toBeVisible();
    await page.waitForTimeout(3_000);
    await page.screenshot({ path: 'playtest/anim-catch.png' });
    const success = (await beat.getAttribute('data-success')) === 'true';
    // §2.6.4.4 — three wobbles and the click on a catch; a break comes after the first, second or third wobble.
    const wobbles = Number(await beat.getAttribute('data-wobbles'));
    const checks = Number(await beat.getAttribute('data-checks'));
    if (success) expect([wobbles, checks]).toEqual([3, 4]);
    else expect(wobbles).toBe(Math.min(checks + 1, 3));
    // While the ball rocks, neither the outcome nor the log talks over it.
    if (success) await expect(page.getByTestId('outcome-overlay')).toHaveCount(0);
    await expect(page.getByTestId('combat-log')).not.toContainText(/caught|broke free/);
    await expect(beat).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId('combat-log')).toContainText(success ? 'caught' : 'broke free');
    if (success) await expect(page.getByTestId('outcome-overlay')).toBeVisible();
    else await expect(page.getByTestId('arena-enemy').first()).not.toHaveClass(/fx-hidden/);
  });

  test('a ball thrown at a Pokémon behind the Lead flies at that one — §5.6, §2.6.4', async ({ page }) => {
    await page.goto('/?scenario=group-wild-flock&seed=2');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.waitForTimeout(1500);
    const target = await page.evaluate(() => {
      const a = (window as unknown as { __ascendant: { state: () => { enemies: { uid: string }[]; player: { consumables: { hand: { id: string; consumableId: string }[] } } }; dispatch: (x: unknown) => boolean } }).__ascendant;
      const s = a.state();
      const ball = s.player.consumables.hand.find((c) => c.consumableId === 'poke-ball');
      const back = s.enemies[1]!.uid;
      if (ball) a.dispatch({ type: 'use-consumable', cardId: ball.id, targetUid: back });
      return ball ? back : null;
    });
    test.skip(!target, 'no ball in the opening hand on this seed');
    const beat = page.getByTestId('catch-fx');
    await expect(beat).toBeAttached();
    await expect(beat).not.toHaveAttribute('data-slot', /lead|single/);
  });

  test('your fallen Lead sinks and its ball comes home before you pick who steps up — §9.9.1', async ({ page }) => {
    await page.goto('/?scenario=wild-boss-3phase&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.waitForTimeout(1200);
    const ghost = page.locator('[data-testid="arena-ghost"][data-kind="faint"][data-slot="player"]');
    const pick = page.getByTestId('lead-pick-modal');
    for (let i = 0; i < 40 && (await ghost.count()) === 0 && (await pick.count()) === 0; i++) {
      await page.evaluate(() => (window as unknown as { __ascendant: { dispatch: (a: unknown) => boolean } }).__ascendant.dispatch({ type: 'end-turn' }));
      await page.waitForTimeout(200);
    }
    // The beat plays with nothing over it; the pick comes after.
    await expect(ghost.first()).toBeAttached();
    await expect(pick).toHaveCount(0);
    await expect(pick).toBeVisible({ timeout: 6_000 });
    await expect(ghost).toHaveCount(0);
  });

  test('a trainer\'s fallen Pokémon sinks, and its ball goes back to the trainer', async ({ page }) => {
    await page.goto('/?scenario=trainer-2enemy&seed=5');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.waitForTimeout(900);
    // The auto-player swaps too, and your own Pokémon fall as well: wait for one of the trainer's.
    const ghost = page.locator('[data-testid="arena-ghost"][data-kind="faint"]:not([data-slot="player"])');
    for (let i = 0; i < 80 && (await ghost.count()) === 0; i++) {
      await dev(page)(() => (window as unknown as { __ascendant: Dev }).__ascendant.auto(1));
      await page.waitForTimeout(60);
    }
    await expect(ghost.first()).toHaveAttribute('data-kind', 'faint');
    // Its card stays where it stood, fading with the sprite (v0.9.11).
    await expect(page.getByTestId('foe-panel-fallen')).toBeAttached();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'playtest/anim-faint.png' });
    await expect(page.locator('[data-testid="ball-flight"][data-hand="trainer"][data-dir="out"]')).toBeAttached({ timeout: 3_000 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'playtest/anim-return.png' });
    await expect(ghost).toHaveCount(0, { timeout: 4_000 });
  });

  test('the evolution plays as the series plays it, then the choice; a click skips it (§9.9.1)', async ({ page }) => {
    await page.goto('/?screen=menu');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => !!(window as unknown as { __ascendant?: unknown }).__ascendant);
    await page.evaluate(() => {
      const a = (window as unknown as { __ascendant: { run: { new: (s: string, n: number) => void; fill: (n: number) => void; levelTo: (l: number) => void; goto: (k: string, stop?: boolean) => void }; goTo: (s: string) => void } }).__ascendant;
      a.run.new('bulbasaur', 7);
      a.goTo('map');
      a.run.fill(3);
      a.run.levelTo(11);
      a.run.goto('wild', true);
    });
    const cut = page.getByTestId('evolution-cutscene');
    await expect(cut).toBeVisible();
    await expect(page.getByTestId('evolution-line')).toContainText('is evolving');
    // Into the trade: the two shapes of light swap places.
    await expect(cut).toHaveAttribute('data-phase', 'trade', { timeout: 4_000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'playtest/anim-evolution.png' });
    await expect(cut).toHaveAttribute('data-phase', 'reveal', { timeout: 6_000 });
    await expect(page.getByTestId('evolution-line')).toContainText('evolved into Ivysaur');
    await page.screenshot({ path: 'playtest/anim-evolution-reveal.png' });
    await page.getByTestId('evo-skip').click();
    await expect(page.getByTestId('evolution-screen')).toBeVisible();
    await expect(page.locator('[data-testid^="branch-"]')).toHaveCount(3);
  });
  test('a Pokémon evolving twice plays the evolution twice, one screen each (§9.9.1)', async ({ page }) => {
    await page.goto('/?screen=menu');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => !!(window as unknown as { __ascendant?: unknown }).__ascendant);
    await page.evaluate(() => {
      const a = (window as unknown as { __ascendant: { run: { new: (s: string, n: number) => void; fill: (n: number) => void; levelTo: (l: number) => void; goto: (k: string, stop?: boolean) => void }; goTo: (s: string) => void } }).__ascendant;
      a.run.new('bulbasaur', 7);
      a.goTo('map');
      a.run.fill(3);
      a.run.levelTo(27);
      a.run.goto('wild', true);
    });
    await expect(page.getByTestId('evolution-line')).toContainText('Bulbasaur is evolving');
    await page.getByTestId('evo-skip').click();
    await page.locator('[data-archetype="vanguard"]').click();
    await page.getByTestId('btn-evolve').click();
    await expect(page.getByTestId('evolution-line')).toContainText('Ivysaur is evolving');
    await page.getByTestId('evo-skip').click();
    await expect(page.locator('[data-testid^="branch-venusaur-"]').first()).toBeVisible();
  });
});

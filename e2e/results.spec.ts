import { expect, test, type Page } from '@playwright/test';

// §9.4.5 (v0.9.30) — the fight's end on the fight's own stage: the reveal with motion on (the level-up panel beside its
// card, the bars' sounds, Skip), an evolution kept as a surprise, a Gym's Badge and its pick on the same stage, and the
// way on reachable at 720 p. Fights are finished through the run's reducer with a report, as the shiny spec does.
// Screenshots to playtest/results-*.png.

type Fight = { starter: string; seed: number; level?: number; xpShare?: 1; kind: string; outcome: string; hp: number[]; caught?: { speciesId: string; level: number } };

/** A run of three at `level`, `xpShare` of the way to the next level, a fight of `kind` finished, its result open. */
async function finish(page: Page, f: Fight): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate((f) => {
    const a = window.__ascendant!;
    a.run.new(f.starter, f.seed);
    a.run.fill(3);
    if (f.level) for (const m of a.run.state()!.box) a.run.levelTo(f.level, m.uid);
    // One XP short of the next level (§6.2.1: 12 + 4 a level), so any win levels the team.
    if (f.xpShare) a.run.patch((d) => { for (const m of d.box) m.xp = 12 + (m.level - 1) * 4 - 1; });
    a.run.heal();
    a.run.dispatch({ type: 'set-active', uids: a.run.state()!.box.slice(0, 3).map((m) => m.uid) });
    a.goTo('map');
    a.run.jump(f.kind as never);
    a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
    a.run.dispatch({ type: 'begin-combat' });
    const s = a.run.state()!;
    const team = s.activeUids.map((uid, i) => ({ uid, hp: f.hp[i] ?? f.hp[0]!, status: null, fainted: (f.hp[i] ?? f.hp[0]!) <= 0 }));
    a.run.dispatch({ type: 'finish-combat', report: { outcome: f.outcome as 'victory', team, caught: f.caught ?? null, ballsLeft: 0, turns: 4 } });
    a.goTo('results');
  }, f);
  await expect(page.getByTestId('fight-results')).toBeVisible();
}

test.describe('The fight\'s end — §9.4.5', () => {
  test.describe('with motion on', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('a level gained stops on its panel beside the card, with the fanfare; Skip goes to the end', async ({ page }) => {
      await finish(page, { starter: 'charmander', seed: 11, level: 8, kind: 'trainer', outcome: 'victory', hp: [14, 30, 22] });
      const results = page.getByTestId('fight-results');
      // The reveal plays: the way on is Skip until it ends.
      await expect(page.getByTestId('btn-skip-results')).toBeVisible();
      await expect(results).not.toHaveAttribute('data-done', 'true');
      // The first level gained: its panel stands beside its card, in the series' words.
      const panel = page.locator('[data-testid^="levelup-panel-"]').first();
      await expect(panel).toBeVisible({ timeout: 8_000 });
      await expect(panel).toContainText('grew to Lv');
      await expect(panel).toContainText('Attack');
      await page.screenshot({ path: 'playtest/results-levelup.png' });
      // The bars and the level were heard.
      const heard = await page.evaluate(() => window.__ascendant!.audio.recent());
      expect(heard).toContain('exp-fill');
      expect(heard).toContain('level-up');
      // Escape skips to the end: Continue takes the focus, the panel is gone, the level tag's door shows it again.
      await page.keyboard.press('Escape');
      await expect(results).toHaveAttribute('data-done', 'true');
      await expect(page.getByTestId('btn-claim')).toBeFocused();
      await expect(page.locator('[data-testid^="levelup-panel-"]')).toHaveCount(0);
      // A second press straight after the skip claims nothing unseen (D8): still the result.
      await page.keyboard.press('Enter');
      await expect(results).toBeVisible();
    });

    test('an evolution is a surprise: nothing on the result says one is coming, then it plays', async ({ page }) => {
      // Bulbasaur one XP short of 16, where it evolves (§6.2.4): the win carries it over.
      await finish(page, { starter: 'bulbasaur', seed: 7, level: 15, xpShare: 1, kind: 'wild', outcome: 'victory', hp: [50, 40, 30] });
      expect(await page.evaluate(() => window.__ascendant!.run.state()!.pendingEvolutions.length)).toBeGreaterThan(0);
      await page.getByTestId('btn-skip-results').click();
      await expect(page.getByTestId('fight-results')).toHaveAttribute('data-done', 'true');
      // Nothing says it is coming: no flag, no Evolve button — Continue is just Continue.
      await expect(page.getByTestId('fight-results')).not.toContainText(/evolv/i);
      await expect(page.getByTestId('btn-claim')).toHaveText('Continue');
      // Continue takes no press for a moment after a skip lands it under the pointer (RESULT_MS.arm).
      await page.waitForTimeout(400);
      await page.getByTestId('btn-claim').click();
      await expect(page.getByTestId('evolution-cutscene')).toBeVisible();
      await expect(page.getByTestId('evolution-line')).toContainText('is evolving');
    });
  });

  test('a Gym win shows its Badge in its case, then the pick on the same stage', async ({ page }) => {
    await finish(page, { starter: 'squirtle', seed: 5, level: 14, kind: 'gym', outcome: 'victory', hp: [40, 0, 25] });
    await expect(page.getByTestId('badge-award')).toContainText('Badge');
    await expect(page.getByTestId('results-voice')).toContainText('Received the');
    await expect(page.getByTestId('btn-claim')).toHaveText('Choose a relic');
    await page.screenshot({ path: 'playtest/results-gym.png' });
    await page.getByTestId('btn-claim').click();
    await page.evaluate(() => {
      const a = window.__ascendant!;
      for (let i = 0; i < 8 && a.run.state()!.phase === 'evolution'; i++) {
        const p = a.run.state()!.pendingEvolutions[0]!;
        a.run.dispatch({ type: 'choose-branch', uid: p.uid, branchId: p.branchIds[0]! });
      }
    });
    await expect(page.getByTestId('gym-relic-pick')).toBeVisible();
    await expect(page.getByTestId('badge-award')).toBeVisible();
    await expect(page.locator('[data-testid^="legendary-offer-"]')).toHaveCount(3);
    await expect(page.getByTestId('btn-take-legendary')).toBeDisabled();
    await page.locator('[data-testid^="legendary-offer-"]').first().click();
    await page.screenshot({ path: 'playtest/results-gym-pick.png' });
    await page.getByTestId('btn-take-legendary').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
  });

  test('a catch stands where it was caught; a defeat leads to the run end', async ({ page }) => {
    await finish(page, { starter: 'squirtle', seed: 7, kind: 'wild', outcome: 'caught', hp: [40, 50, 30], caught: { speciesId: 'nidoran-f', level: 6 } });
    await expect(page.getByTestId('results-ribbon')).toHaveText('Gotcha!');
    await expect(page.getByTestId('reward-catch')).toContainText('Nidoran');
    await page.screenshot({ path: 'playtest/results-catch.png' });

    await finish(page, { starter: 'squirtle', seed: 9, kind: 'wild', outcome: 'defeat', hp: [0] });
    await expect(page.getByTestId('results-ribbon')).toHaveText('Wiped out…');
    await page.getByTestId('btn-claim').click();
    await expect(page.getByTestId('defeat-screen')).toBeVisible();
  });

  test('at 720 p the way on and every spoil are on the screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await finish(page, { starter: 'squirtle', seed: 5, level: 14, kind: 'gym', outcome: 'victory', hp: [40, 0, 25] });
    await expect(page.getByTestId('btn-claim')).toBeInViewport({ ratio: 1 });
    for (const card of await page.getByTestId('reward-spoils').locator('[data-kind], [data-testid="reward-money"]').all()) await expect(card).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: 'playtest/results-gym-720.png' });
  });
});

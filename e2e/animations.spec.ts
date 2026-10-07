import { expect, test, type Page } from '@playwright/test';

// §9.9 / v0.9.3 — the arena's beats, with motion on (the rest of the suite runs reduced): a Pokémon sent out of its
// ball, a wild one stepping in, the catch beat by beat, and a fallen Pokémon's ghost. Screenshots to
// playtest/anim-*.png, taken mid-beat.

test.use({ reducedMotion: 'no-preference' });

type Dev = {
  state: () => { player: { consumables: { hand: { id: string; consumableId: string }[] } }; outcome: string } | null;
  dispatch: (a: unknown) => void;
  auto: (steps?: number) => number;
};
const dev = (page: Page) => page.evaluate.bind(page);

test.describe('Arena animations — §9.9', () => {
  test('a trainer sends its Pokémon out of the ball, and yours comes out after', async ({ page }) => {
    await page.goto('/?scenario=trainer-2enemy');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    // The foe is out of its ball first; for a beat it whitens and grows.
    await expect(page.getByTestId('arena-enemy').first()).toHaveClass(/fx-sendout/, { timeout: 2_000 });
    await page.screenshot({ path: 'playtest/anim-sendout.png' });
    // And then the beat is over: nothing stays hidden.
    await expect(page.getByTestId('arena-enemy').first()).not.toHaveClass(/fx-(sendout|hidden)/, { timeout: 3_000 });
  });

  test('the catch: the ball rocks, the odds light up, and the outcome waits for the click or the burst', async ({ page }) => {
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
    await page.waitForTimeout(1_300);
    await page.screenshot({ path: 'playtest/anim-catch.png' });
    const success = (await beat.getAttribute('data-success')) === 'true';
    // A catch rocks three times; a Pokémon that breaks free, fewer.
    const wobbles = Number(await beat.getAttribute('data-wobbles'));
    expect(success ? wobbles === 3 : wobbles < 3).toBe(true);
    // While the ball rocks, neither the outcome nor the log talks over it.
    if (success) await expect(page.getByTestId('outcome-overlay')).toHaveCount(0);
    await expect(page.getByTestId('combat-log')).not.toContainText(/caught|broke free/);
    await expect(beat).toHaveCount(0, { timeout: 6_000 });
    await expect(page.getByTestId('combat-log')).toContainText(success ? 'caught' : 'broke free');
    if (success) await expect(page.getByTestId('outcome-overlay')).toBeVisible();
    else await expect(page.getByTestId('arena-enemy').first()).not.toHaveClass(/fx-hidden/);
  });

  test('a trainer\'s fallen Pokémon drops and goes back into its ball', async ({ page }) => {
    await page.goto('/?scenario=trainer-2enemy&seed=5');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.waitForTimeout(900);
    // The auto-player swaps too, and a swap's recall is a ghost of its own: wait for one that fell.
    const ghost = page.locator('[data-testid="arena-ghost"][data-kind^="faint"]');
    for (let i = 0; i < 80 && (await ghost.count()) === 0; i++) {
      await dev(page)(() => (window as unknown as { __ascendant: Dev }).__ascendant.auto(1));
      await page.waitForTimeout(60);
    }
    await expect(ghost.first()).toHaveAttribute('data-kind', 'faint-recall');
    await page.screenshot({ path: 'playtest/anim-faint.png' });
    await expect(ghost).toHaveCount(0, { timeout: 4_000 });
  });
});

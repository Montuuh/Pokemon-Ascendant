import { expect, test, type Page } from '@playwright/test';

// §9.9.2 — a move, animated, with motion on (the rest of the suite runs reduced): a Melee move dashes its user across
// the field (its sprite waits unseen in its card), a Ranged one is thrown, a stream is a beam, the great moves fill the
// stage (Earthquake shakes it), and a foe's moves play the same way back. Under reduced motion none of it plays.
// Screenshots to playtest/move-*.png, taken mid-beat.

test.use({ reducedMotion: 'no-preference' });

/** A beat lasts under a second and a loaded machine polls slowly: record what the arena drew as it happened. */
async function recordFx(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __mvSeen: string[] }).__mvSeen = seen;
    new MutationObserver(() => {
      for (const f of document.querySelectorAll<HTMLElement>('[data-testid="move-fx"]')) seen.push(`${f.dataset.move}:${f.dataset.kind}${f.dataset.style ? `:${f.dataset.style}` : ''}`);
      if (document.querySelector('[data-fx-stage].fx-quake')) seen.push('stage:quake');
      if (document.querySelector('.fx-dashing')) seen.push('dashing');
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  });
}
const seen = (page: Page) => page.evaluate(() => (window as unknown as { __mvSeen: string[] }).__mvSeen);

/** The boss fixture, its Pokémon out of their balls, the hand made this one move. */
async function ready(page: Page) {
  await page.goto('/?scenario=wild-boss-3phase&seed=7');
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  await page.waitForTimeout(3200);
}
async function play(page: Page, moveId: string) {
  await page.evaluate((id) => {
    const a = window.__ascendant!;
    a.hand([id]);
    const s = a.state()!;
    a.dispatch({ type: 'play-card', cardId: s.player.hand[0]!.id, targetUid: s.enemies[0]!.uid });
  }, moveId);
}

test.describe('Move animations — §9.9.2', () => {
  test('a Melee move dashes its user across the field, its own sprite waiting in its card', async ({ page }) => {
    await recordFx(page);
    await ready(page);
    await play(page, 'tackle');
    await page.waitForTimeout(250);
    await page.locator('[data-fx-stage]').screenshot({ path: 'playtest/move-melee.png', animations: 'allow' });
    await expect.poll(() => seen(page)).toContain('tackle:melee');
    expect(await seen(page)).toContain('dashing');
    // The beat ends: the double gone, the sprite back.
    await expect(page.getByTestId('move-fx')).toHaveCount(0, { timeout: 3_000 });
    await expect(page.locator('.fx-dashing')).toHaveCount(0);
  });

  test('a Ranged move is thrown, a stream is a beam, lightning a bolt', async ({ page }) => {
    await recordFx(page);
    await ready(page);
    await play(page, 'ember');
    await page.waitForTimeout(1200);
    await play(page, 'hydro-pump');
    await page.waitForTimeout(1200);
    await play(page, 'thunderbolt');
    await expect.poll(() => seen(page)).toEqual(expect.arrayContaining(['ember:projectile:flame', 'hydro-pump:beam', 'thunderbolt:bolt']));
  });

  test('Surf rolls across the whole stage, and Earthquake shakes it', async ({ page }) => {
    await recordFx(page);
    await ready(page);
    await play(page, 'surf');
    await page.waitForTimeout(420);
    await page.screenshot({ path: 'playtest/move-surf.png', clip: (await page.locator('[data-fx-stage]').boundingBox())! });
    await page.waitForTimeout(1000);
    await play(page, 'earthquake');
    await expect.poll(() => seen(page)).toEqual(expect.arrayContaining(['surf:area:wave', 'earthquake:area:quake', 'stage:quake']));
    await expect(page.locator('[data-fx-stage].fx-quake')).toHaveCount(0, { timeout: 3_000 });
  });

  test('the HP waits for the move to land, and the numbers rise over the move', async ({ page }) => {
    await recordFx(page);
    await ready(page);
    const hp = page.getByTestId('foe-panel').first().getByTestId('foe-hp');
    const was = (await hp.textContent())!;
    await play(page, 'ember');
    // In the air: the card still says what the foe had.
    expect(await hp.textContent()).toBe(was);
    await expect.poll(() => seen(page)).toContain('ember:projectile:flame');
    await expect(hp).not.toHaveText(was, { timeout: 2_000 });
    // Its number rises on the field's overlay, drawn after the move's layer — over it — not inside the card.
    await expect(page.getByTestId('floats').first()).toBeAttached();
    expect(await page.getByTestId('foe-panel').first().getByTestId('floats').count()).toBe(0);
  });

  test("a foe's move plays back across the field the same way", async ({ page }) => {
    await recordFx(page);
    await ready(page);
    await page.evaluate(() => {
      const a = window.__ascendant!;
      a.intend('tackle');
      a.dispatch({ type: 'end-turn' });
    });
    await expect.poll(() => seen(page)).toContain('tackle:melee');
    // The foe's card stands while its double dashes: only its sprite waits.
    await expect(page.locator('[data-testid="arena-enemy"]').first()).toBeVisible();
  });
});

test.describe('Move animations under reduced motion — §9.9', () => {
  test.use({ reducedMotion: 'reduce' });
  test('nothing dashes, flies or fills the stage', async ({ page }) => {
    await recordFx(page);
    await page.goto('/?scenario=wild-boss-3phase&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await play(page, 'surf');
    await page.waitForTimeout(800);
    expect(await seen(page)).toEqual([]);
  });
});

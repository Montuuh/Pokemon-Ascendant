import { expect, test, type Page } from '@playwright/test';
import { MOTION_MS } from '../src/ui/moveMotion';

// §9.9.2 — a move is drawn with FireRed's own battle-animation sprites: Flamethrower pours pret's embers, Bite
// closes its teeth on the foe, Psychic washes the stage in its background. Each beat is frozen just after its impact
// and screenshot to playtest/move-sprite-<id>.png; a move the GBA draws without sprites keeps the drawn shapes.

test.use({ reducedMotion: 'no-preference' });

async function ready(page: Page) {
  await page.goto('/?scenario=wild-boss-3phase&seed=7');
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  await page.waitForTimeout(3200);
}

/** Play the move, wait for its beat to start, let it run `ms`, then freeze every animation on the page. */
async function frozen(page: Page, moveId: string, ms: number) {
  await page.evaluate((id) => {
    const a = window.__ascendant!;
    a.hand([id]);
    const s = a.state()!;
    a.dispatch({ type: 'play-card', cardId: s.player.hand[0]!.id, targetUid: s.enemies[0]!.uid });
  }, moveId);
  const fx = page.locator(`[data-testid="move-fx"][data-move="${moveId}"]`);
  await expect(fx).toHaveCount(1, { timeout: 3_000 });
  await page.waitForTimeout(ms);
  await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
  return fx;
}
async function settle(page: Page) {
  await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  await expect(page.getByTestId('move-fx')).toHaveCount(0, { timeout: 4_000 });
  await page.waitForTimeout(400);
}

const after = (impact: number) => impact + MOTION_MS.frames.flicker;
const CASES: { id: string; kind: string; ms: number; sprite?: string; bg?: string }[] = [
  { id: 'flamethrower', kind: 'beam', ms: MOTION_MS.beam.cast + MOTION_MS.beam.grow, sprite: 'small-ember' },
  { id: 'bite', kind: 'melee', ms: after(MOTION_MS.melee.windup + MOTION_MS.melee.dash), sprite: 'sharp-teeth' },
  { id: 'mega-kick', kind: 'melee', ms: after(MOTION_MS.melee.windup + MOTION_MS.melee.dash), sprite: 'hands-and-feet', bg: 'none' },
  { id: 'ember', kind: 'projectile', ms: MOTION_MS.projectile.cast + MOTION_MS.projectile.travel / 2, sprite: 'small-ember' },
  { id: 'thunderbolt', kind: 'bolt', ms: after(MOTION_MS.bolt.cast + MOTION_MS.bolt.strike) },
  { id: 'psychic', kind: 'area', ms: MOTION_MS.area.build + MOTION_MS.area.peak, bg: 'psychic' },
  { id: 'night-slash', kind: 'melee', ms: after(MOTION_MS.melee.windup + MOTION_MS.melee.dash), sprite: 'slash@dark', bg: 'none' },
  { id: 'rock-slide', kind: 'area', ms: MOTION_MS.area.build + MOTION_MS.area.peak, sprite: 'rocks' },
  { id: 'energy-ball', kind: 'projectile', ms: MOTION_MS.projectile.cast + MOTION_MS.projectile.travel / 2, sprite: 'shadow-ball@grass' },
];

test.describe('Move animation sprites — §9.9.2', () => {
  test('each move is drawn with its own pret sprites, and its background where the GBA fades one in', async ({ page }) => {
    test.setTimeout(90_000);
    await ready(page);
    for (const c of CASES) {
      const fx = await frozen(page, c.id, c.ms);
      await expect(fx).toHaveAttribute('data-kind', c.kind);
      await expect(fx).toHaveAttribute('data-sprites', 'pret');
      if (c.sprite) await expect(fx.locator(`[data-fx-sprite="${c.sprite}"]`).first()).toBeAttached();
      // Only a heavy move washes the stage in its background: a routine hit keeps it (D12).
      if (c.bg) await expect(page.getByTestId('move-fx-bg')).toHaveCount(c.bg === 'none' ? 0 : 1);
      await page.locator('[data-fx-stage]').screenshot({ path: `playtest/move-sprite-${c.id}.png`, animations: 'allow' });
      await settle(page);
    }
  });

  test('a move the GBA draws without sprites keeps the drawn shapes', async ({ page }) => {
    await ready(page);
    const fx = await frozen(page, 'agility', 100);
    await expect(fx).toHaveAttribute('data-sprites', 'drawn');
    await expect(fx.locator('[data-fx-sprite]')).toHaveCount(0);
  });

  test('Bite lands on the foe from where its user stands; a volley waits unseen until it leaves', async ({ page }) => {
    await ready(page);
    // The GBA does not move Bite's user: no double crosses the field and the user's own sprite never hides.
    const bite = await frozen(page, 'bite', after(MOTION_MS.melee.windup + MOTION_MS.melee.dash));
    await expect(bite.locator('[data-fx-sprite="sharp-teeth"]').first()).toBeAttached();
    await expect(page.locator('.fx-dashing')).toHaveCount(0);
    await settle(page);
    // Swift as its first star leaves (no drawn charge before a sprite move): the later stars have not left, so they
    // are not drawn stacked on their user.
    const swift = await frozen(page, 'swift', MOTION_MS.projectile.volley / 2);
    // The stars in flight (the impact waits at the foe): each one's flight, unseen while it waits.
    const shown = await swift.locator('[data-fx-sprite]').evaluateAll((els) =>
      els.map((e) => e.closest('[class*=flight]')).filter((f): f is Element => !!f).map((f) => Number(getComputedStyle(f).opacity)),
    );
    expect(shown.length).toBe(3);
    expect(shown.slice(1).every((o) => o === 0)).toBe(true);
  });
});

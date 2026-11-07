import { expect, test, type Page } from '@playwright/test';
import { MOTION_MS } from '../src/ui/moveMotion';

// §9.9.2 — a move is drawn with FireRed's own battle-animation sprites: Flamethrower pours pret's embers, Bite
// closes its teeth on the foe, Psychic washes the stage in its background. Each beat is frozen just after its impact
// and screenshot to playtest/move-sprite-<id>.png; a move the GBA plays on the Pokémon itself moves its sprite.

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
  // Bite replays its FRLG script from where its user stands: its jaws close and its splat lands a few frames in.
  { id: 'bite', kind: 'melee', ms: MOTION_MS.frames.flicker * 2, sprite: 'sharp-teeth' },
  { id: 'mega-kick', kind: 'melee', ms: after(MOTION_MS.melee.windup + MOTION_MS.melee.dash), sprite: 'hands-and-feet', bg: 'none' },
  { id: 'ember', kind: 'projectile', ms: MOTION_MS.projectile.cast + MOTION_MS.projectile.travel / 2, sprite: 'small-ember' },
  { id: 'thunderbolt', kind: 'bolt', ms: after(MOTION_MS.bolt.cast + MOTION_MS.bolt.strike) },
  { id: 'psychic', kind: 'area', ms: MOTION_MS.area.build + MOTION_MS.area.peak, bg: 'psychic' },
  // Its FRLG script's two slashes, a beat apart, from where its user stands (no dash): caught as the second lands.
  { id: 'night-slash', kind: 'melee', ms: MOTION_MS.frames.flicker, sprite: 'slash@dark', bg: 'none' },
  { id: 'rock-slide', kind: 'area', ms: MOTION_MS.area.build + MOTION_MS.area.peak, sprite: 'rocks' },
  // Energy Ball throws as Shadow Ball's script does: caught in flight.
  { id: 'energy-ball', kind: 'projectile', ms: MOTION_MS.frames.flicker * 2, sprite: 'shadow-ball@grass' },
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

  test('a move the GBA plays on the Pokémon itself moves its sprite, with no drawn rings', async ({ page }) => {
    await ready(page);
    const fx = await frozen(page, 'agility', 100);
    await expect(fx).toHaveAttribute('data-sprites', 'mon');
    await expect(fx.locator('[data-fx-sprite]')).toHaveCount(0);
    // Agility rushes its user with afterimages: the user's sprite takes the beats, the field draws no rings.
    await expect(fx.locator('*')).toHaveCount(0);
    await expect(page.locator('[data-fx-slot="player"] .fx-mon-trace')).toHaveCount(1);
  });

  test('Bite lands on the foe from where its user stands; a volley waits unseen until it leaves', async ({ page }) => {
    await ready(page);
    // The GBA does not move Bite's user: no double crosses the field and the user's own sprite never hides.
    const bite = await frozen(page, 'bite', MOTION_MS.frames.flicker * 2);
    await expect(bite.locator('[data-fx-sprite="sharp-teeth"]').first()).toBeAttached();
    await expect(page.locator('.fx-dashing')).toHaveCount(0);
    await settle(page);
    // Swift replays its FRLG script: five stars in a wave, a few frames apart. Early in it the first are on their way
    // and the later ones are unseen until their moment — never drawn stacked on their user.
    const swift = await frozen(page, 'swift', MOTION_MS.frames.flicker * 2);
    const shown = await swift.locator('[data-fx-path="wave"]').evaluateAll((els) => els.map((e) => Number(getComputedStyle(e).opacity)));
    expect(shown.length).toBe(5);
    expect(shown.some((o) => o > 0)).toBe(true);
    expect(shown.at(-1)).toBe(0);
  });

  test("a move's small sprites are drawn at twice its Pokémon's pixel, its big ones within its target's box", async ({ page }) => {
    await ready(page);
    const fx = await frozen(page, 'swift', MOTION_MS.frames.flicker * 2);
    const [sprite, mon] = await Promise.all([
      fx.locator('[data-fx-sprite="yellow-star"]').first().evaluate((e) => e.getBoundingClientRect().width),
      page.evaluate(() => {
        const px = (slot: string) => {
          const img = document.querySelector<HTMLImageElement>(`[data-fx-slot="${slot}"] img`)!;
          return img.offsetWidth / img.naturalWidth;
        };
        return (px('player') + px('single')) / 2;
      }),
    ]);
    // Swift's star is a 32-px frame crossing the field: at twice the Pokémon's pixel (to the half step), unless one and
    // a half times its target's box caps it.
    const box = await page.locator('[data-fx-slot="single"]').evaluate((e) => e.getBoundingClientRect().height);
    expect(sprite).toBeGreaterThanOrEqual(Math.min(32 * 2 * (Math.floor(mon * 2) / 2), Math.floor((box * 1.5) / 32 / 0.5) * 0.5 * 32) - 0.5);
    await settle(page);
    // Bite's jaws are 64-px frames: they close on the foe within its box, never over its whole card.
    const bite = await frozen(page, 'bite', MOTION_MS.frames.flicker);
    const jaw = await bite.locator('[data-fx-sprite="sharp-teeth"]').first().evaluate((e) => e.getBoundingClientRect().height);
    expect(jaw).toBeLessThanOrEqual(box);
  });

  test.describe('at 720p, the worst case', () => {
    test.use({ viewport: { width: 1280, height: 720 } });
    test("Bite's jaws stay within the foe's box, or at their own 1× where the box is smaller; Swift's stars still double", async ({ page }) => {
      await ready(page);
      const bite = await frozen(page, 'bite', MOTION_MS.frames.flicker);
      const [jaw, box] = await Promise.all([
        bite.locator('[data-fx-sprite="sharp-teeth"]').first().evaluate((e) => e.getBoundingClientRect().height),
        page.locator('[data-fx-slot="single"]').evaluate((e) => e.getBoundingClientRect().height),
      ]);
      // Pixel art is never drawn below its own pixel (D9): a 64-px jaw stands at 1× on a box under 64 px.
      expect(jaw).toBeLessThanOrEqual(Math.max(box, 64) + 0.5);
      await settle(page);
      // A star crossing the open field is not capped by the card it lands on: twice its 32-px frame.
      const swift = await frozen(page, 'swift', MOTION_MS.frames.flicker * 2);
      const star = await swift.locator('[data-fx-sprite="yellow-star"]').first().evaluate((e) => e.getBoundingClientRect().width);
      expect(star).toBeGreaterThanOrEqual(64 - 0.5);
    });
  });
});

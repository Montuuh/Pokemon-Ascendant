import { expect, test } from '@playwright/test';

// The tooltip layer (src/ui/tooltip) and the About screen. Both arrived on 2026-09-21 with the same brief:
// short text on the screen, the explanation on hover. These pin the mechanics — delay, focus, dismissal,
// content — rather than the prose, which is meant to change.

test.describe('Tooltips', () => {
  test('a move card explains itself on hover, after a delay, and closes on leave', async ({ page }) => {
    await page.goto('/?scenario=full-hand-3mon&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    const card = page.locator('[data-testid="hand"] [data-testid^="card-"]').nth(1);

    // Not immediately: a pointer crossing the hand must not fire five bubbles.
    await card.hover();
    await page.waitForTimeout(120);
    await expect(page.getByTestId('tooltip')).toHaveCount(0);
    // After the delay, with the facts a player wants: type, range, cost, power, and the damage preview.
    await page.waitForTimeout(600);
    const tip = page.getByTestId('tooltip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText(/Melee|Ranged/);
    await expect(tip).toContainText(/\d AP/);
    await expect(tip).toContainText(/Against this target|Locked/);

    await page.mouse.move(5, 5);
    await expect(tip).toHaveCount(0);
  });

  test('focus opens a tooltip at once and Escape closes it', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.locator('[data-testid="hand"] [data-testid^="card-"]').first().focus();
    // No delay on focus — a keyboard user asked for it.
    await expect(page.getByTestId('tooltip')).toBeVisible({ timeout: 300 });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tooltip')).toHaveCount(0);
  });

  test('the catch pill is the chance, the ball is always throwable, and the tooltip says what moves the odds', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    // §2.6.4 (2026-09-21) — the pill prints the real chance: a low one at full HP.
    await expect(page.getByTestId('catch-pill')).toContainText(/\d+%/);
    const chance = Number(await page.getByTestId('catch-pill').getAttribute('data-chance'));
    expect(chance).toBeGreaterThanOrEqual(1);
    expect(chance).toBeLessThan(20);
    // The ball is a real card at any odds; the throw is the player's call.
    const ball = page.getByTestId('consumable-poke-ball');
    await expect(ball).toBeVisible();
    await expect(ball).toHaveAttribute('data-state', 'playable');
    await page.getByTestId('catch-pill').hover();
    await page.waitForTimeout(700);
    await expect(page.getByTestId('tooltip')).toContainText('to catch');
    await expect(page.getByTestId('tooltip')).toContainText('Sleep and Freeze');
  });

  test('an enemy type badge tells you what it is weak to', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.locator('[data-testid^="enemy-"] [aria-label]').first().hover();
    await page.waitForTimeout(700);
    await expect(page.getByTestId('tooltip')).toContainText(/Weak to/);
  });

  test('the combat header has one menu and no dead buttons', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    // 2026-09-21 — the back arrow (to the practice picker, from inside a run) and the restart are gone.
    await expect(page.getByTestId('btn-menu')).toHaveCount(0);
    await expect(page.getByTestId('btn-restart-top')).toHaveCount(0);
    await page.getByTestId('btn-pause').click();
    await expect(page.getByTestId('pause-menu')).toBeVisible();
    // Outside a run: a way out, and nothing about a run that does not exist.
    await expect(page.getByTestId('btn-save-quit')).toContainText('Quit to menu');
    await expect(page.getByTestId('btn-abandon')).toHaveCount(0);
    await page.getByTestId('btn-resume').click();
    await expect(page.getByTestId('pause-menu')).toBeHidden();
  });
});

test.describe('About', () => {
  test('shows the version from the build and the roadmap from the design docs', async ({ page }) => {
    await page.goto('/?screen=menu');
    // The menu is five entries: the developer doors came off on 2026-09-21.
    for (const id of ['btn-how-to-play', 'btn-combat', 'btn-scenarios']) await expect(page.getByTestId(id)).toHaveCount(0);
    await page.getByTestId('btn-about').click();
    await expect(page.getByTestId('about-screen')).toBeVisible();

    await expect(page.getByTestId('about-version')).toHaveText(/^v\d+\.\d+\.\d+/);
    // One row per version in docs/roadmap.md — fourteen since the backlog was placed (2026-09-24), and growing.
    const rows = page.locator('[data-testid^="roadmap-v"]');
    await expect(rows).toHaveCount(14);
    await expect(page.getByTestId('roadmap-v1.2')).toBeVisible();
    await expect(page.getByTestId('roadmap-v0.1')).toHaveAttribute('data-status', 'done');
    await expect(page.getByTestId('roadmap-v1.0')).toHaveAttribute('data-status', 'planned');
    // At most one "building now" — none between versions, as after v0.6 shipped — and it names itself without a hover.
    const active = page.locator('[data-testid^="roadmap-v"][data-status="active"]');
    expect(await active.count()).toBeLessThanOrEqual(1);
    if ((await active.count()) === 1) await expect(active).toContainText(/w+/);

    // A shipped row keeps its claim behind a hover.
    await page.getByTestId('roadmap-v0.2').hover();
    await page.waitForTimeout(700);
    await expect(page.getByTestId('tooltip')).toContainText('Shipped');
    await expect(page.getByTestId('about-repo')).toHaveAttribute('href', /github\.com/);
    await page.screenshot({ path: 'playtest/about.png' });
  });
});

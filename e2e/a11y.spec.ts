import { expect, test, type Page } from '@playwright/test';

// Accessibility invariants, per docs/design/09-presentation.md §9.6. These are the "always true from v0.1"
// items plus the architectural commitment that every interactive element carries a label. They are cheap to
// keep and expensive to retrofit, which is exactly why they are asserted rather than trusted.

/** Every button a sighted player can press must announce itself as something. */
async function everyControlIsNamed(page: Page) {
  const unnamed = await page.evaluate(() => {
    const name = (el: Element) =>
      (el.getAttribute('aria-label') ?? '').trim() ||
      (el.getAttribute('title') ?? '').trim() ||
      (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    return Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .filter((el) => name(el).length === 0)
      .map((el) => el.outerHTML.slice(0, 120));
  });
  expect(unnamed, 'controls with no accessible name').toEqual([]);
}

async function startRun(page: Page) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await page.getByTestId('btn-new-run').click();
  // Three steps since v0.4: difficulty (§8.8), starter, Starting Relic (§8.6.3). Taking neither a modifier
  // nor a relic is the baseline path, and it is the one this fixture walks.
  await page.getByTestId('btn-continue').click();
  await page.getByTestId('starter-squirtle').click();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('step-relic')).toBeVisible();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('step-region')).toBeVisible();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('map-screen')).toBeVisible();
}

test('every control on every screen has an accessible name', async ({ page }) => {
  await page.goto('/?screen=menu');
  await everyControlIsNamed(page);

  await page.goto('/?screen=scenarios');
  await everyControlIsNamed(page);

  await page.goto('/?scenario=wild-basic');
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  await everyControlIsNamed(page);

  await startRun(page);
  await everyControlIsNamed(page);
});

test('the combat board narrates itself to a screen reader', async ({ page }) => {
  await page.goto('/?scenario=wild-basic');
  const announcer = page.getByTestId('combat-announcer');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  // It carries words, not just a number: the log line is the only place a hit is ever stated in text.
  await expect(announcer).not.toBeEmpty();

  // A card reads as a sentence rather than as a pile of icons.
  const label = await page.locator('[data-testid^="card-"]').first().getAttribute('aria-label');
  expect(label).toMatch(/AP/);
  expect(label).toMatch(/card \d+ of \d+/);
});

test('a fight can be played from the keyboard alone', async ({ page }) => {
  await page.goto('/?scenario=wild-basic');
  await expect(page.getByTestId('combat-screen')).toBeVisible();

  // 1 selects the first card…
  await page.keyboard.press('1');
  await expect(page.locator('[data-testid^="card-"][aria-pressed="true"]')).toHaveCount(1);

  // …Escape drops the selection…
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid^="card-"][aria-pressed="true"]')).toHaveCount(0);

  // …and E ends the turn without touching the mouse.
  const turn = await page.getByTestId('combat-screen').getAttribute('data-turn');
  await page.keyboard.press('e');
  await expect(page.getByTestId('combat-screen')).not.toHaveAttribute('data-turn', turn!);
});

test('a modal keeps focus inside itself and gives it back', async ({ page }) => {
  await startRun(page);
  await page.getByTestId('btn-pause').click();
  const modal = page.getByTestId('pause-menu');
  await expect(modal).toBeVisible();

  // The first control takes focus on open, so a keyboard player is already inside the dialog.
  await expect(page.getByTestId('btn-resume')).toBeFocused();

  // Tabbing past the last control wraps instead of escaping into the map behind.
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => {
    const dialog = document.querySelector('[data-testid="pause-menu"]');
    return !!dialog && dialog.contains(document.activeElement);
  });
  expect(inside, 'focus stayed inside the dialog').toBe(true);

  await page.getByTestId('btn-resume').click();
  await expect(modal).toBeHidden();
});

test('nothing unplayable is hidden, only marked', async ({ page }) => {
  await page.goto('/?scenario=full-hand-3mon');
  await expect(page.getByTestId('combat-screen')).toBeVisible();
  const cards = page.locator('[data-testid^="card-"]');
  const total = await cards.count();
  expect(total).toBeGreaterThan(0);
  // Every card in hand is on screen regardless of whether it can be played (the §9.6 / ui.md invariant).
  for (let i = 0; i < total; i++) await expect(cards.nth(i)).toBeVisible();
});

test('looping motion stops under prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?scenario=wild-basic');
  await expect(page.getByTestId('combat-screen')).toBeVisible();

  const looping = await page.evaluate(() =>
    Array.from(document.querySelectorAll('*')).filter((el) => {
      const count = getComputedStyle(el).animationIterationCount;
      return count.split(',').some((c) => c.trim() === 'infinite');
    }).length,
  );
  expect(looping, 'elements still animating forever').toBe(0);
});

test('the rules are one click away from the map and from a fight', async ({ page }) => {
  // §9.6.1 — a first-time player meets six unfamiliar systems at once. The panel came off the main menu on
  // 2026-09-21 (the rules are taught in place now, not as a wall before the first click), so "one click away"
  // means from the pause menu — on the map, and inside a fight, which is where you are when you need it.
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await startRun(page);
  await page.getByTestId('btn-pause').click();
  await page.getByTestId('btn-help').click();
  const panel = page.getByTestId('how-to-play');
  await expect(panel).toBeVisible();
  // Six fight rules and four route rules, in two headed groups. Six is the number a player needs before
  // their first turn; the route four keep until their first Poké Mart, which is why they are separated.
  await expect(panel.locator('li')).toHaveCount(10);
  // Each rule is a heading and a paragraph, not an icon the player has to decode.
  for (const rule of await panel.locator('li').all()) {
    expect(((await rule.textContent()) ?? '').length).toBeGreaterThan(80);
  }
  // The ideas a newcomer cannot infer from the board.
  await expect(panel).toContainText('Action Points');
  await expect(panel).toContainText('Lead');
  await expect(panel).toContainText('Ranged');
  await expect(panel).toContainText('Move Manager');
  // …and the four v0.4 added, which a player meets on the map rather than in a fight.
  await expect(panel).toContainText('Poké Dollars');
  await expect(panel).toContainText('Trauma');
  await expect(panel).toContainText('relic');

  await everyControlIsNamed(page);
  await page.getByTestId('btn-close-how-to-play').click();
  await expect(panel).toBeHidden();

  // And from inside a fight, through the same menu — the combat screen's only exit as of 2026-09-21.
  await page.getByTestId('btn-resume').click();
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await page.locator('[data-testid^="node-"][data-status="reachable"]').first().click();
  await page.getByTestId('btn-enter-node').click();
  await page.waitForTimeout(200);
  if ((await page.getByTestId('combat-screen').count()) > 0) {
    await page.getByTestId('btn-pause').click();
    await page.getByTestId('btn-help').click();
    await expect(page.getByTestId('how-to-play')).toBeVisible();
  }
});

test('the fan-project disclaimer is reachable at every supported size', async ({ page }) => {
  // The project carries the trademark in its title as of 2026-09-20, which makes the unaffiliated-fan-work
  // line on the menu load-bearing rather than decorative. It only has to be *reachable* — scrolling to it
  // is fine — but it must never be clipped away, and 150 % text on a 720p window is where it went first.
  for (const [w, h, scale] of [[1920, 1080, 1], [1280, 720, 1], [1280, 720, 1.5]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/?screen=menu');
    await page.evaluate((s) => localStorage.setItem('ascendant.settings.v1', JSON.stringify({ textScale: s, motion: 'system' })), scale);
    await page.goto('/?screen=menu');

    const disclaimer = page.getByText('not affiliated with Nintendo');
    await disclaimer.scrollIntoViewIfNeeded();
    await expect(disclaimer, `${w}x${h} @ ${scale * 100} %`).toBeInViewport();

    // Nothing may push the page sideways; the vista is a backdrop, not a canvas to pan.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${w}x${h} @ ${scale * 100} % overflows horizontally`).toBeLessThanOrEqual(1);
  }
});

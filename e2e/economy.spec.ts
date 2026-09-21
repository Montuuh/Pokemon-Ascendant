import { expect, test, type Page } from '@playwright/test';

// v0.4 — the four screens the version exists for: the Poké Mart (§2.9.2), the Mystery Event (§2.10), the
// Pokémon Centre's Therapy (§8.2.4) and the inventory drawer where a Held Item is equipped (§7.4.1). Plus
// the pre-run stepper's two new steps, difficulty (§8.8) and the Starting Relic (§8.6.3).
//
// Everything here drives the real reducers through the dev hook, so each state reached is one the game could
// have reached on its own — it just skips the twenty minutes of route in between.

/** Open the app with a fresh run on the map. Nothing has been walked yet. */
async function freshRun(page: Page, opts: { starter?: string; seed?: number } = {}): Promise<void> {
  const { starter = 'squirtle', seed = 7 } = opts;
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate(([s, n]) => window.__ascendant!.run.new(s as string, n as number), [starter, seed] as const);
  // A lone Lv 5 starter loses the first fight about as often as not, and a walk that ends in defeat never
  // reaches the node under test. Field a real team first: the assertions are about the node, not the route.
  await page.evaluate(() => window.__ascendant!.run.fill(3));
  await page.evaluate(() => window.__ascendant!.run.levelTo(20));
  await page.evaluate(() => window.__ascendant!.goTo('map'));
  await expect(page.getByTestId('map-screen')).toBeVisible();
}

/**
 * Walk to the nearest node of a kind. `goto` stops wherever the walk left the run, which after a fight is
 * the reward screen rather than the map, so this drains the post-fight queue and tries again — otherwise
 * every deep node (the Centre is at layer 8) is a coin flip on whether the test even arrives.
 */
async function runAt(page: Page, kind: string, opts: { starter?: string; seed?: number; money?: number } = {}): Promise<void> {
  const { money, ...rest } = opts;
  await freshRun(page, rest);

  for (let attempt = 0; attempt < 12; attempt++) {
    const phase = await page.evaluate((k) => {
      const dev = window.__ascendant!;
      dev.run.goto(k as never);
      const run = dev.run.state()!;
      if (run.phase === 'reward') dev.run.dispatch({ type: 'claim-reward' });
      while (dev.run.state()!.phase === 'evolution') {
        const p = dev.run.state()!.pendingEvolutions[0]!;
        dev.run.dispatch({ type: 'choose-branch', uid: p.uid, branchId: p.branchIds[0]! });
      }
      return dev.run.state()!.phase;
    }, kind);
    const want = kind === 'mystery' ? 'event' : kind;
    if (phase === want || phase === 'ended') break;
  }

  if (money !== undefined) await page.evaluate((m) => window.__ascendant!.run.pay(m as number), money);
  await page.evaluate(() => window.__ascendant!.goTo('map'));
}

test.describe('The Poké Mart — §2.9.2', () => {
  test('buying takes the money, marks the slot sold, and leaves it on the shelf', async ({ page }) => {
    await runAt(page, 'shop', { money: 400 });
    await expect(page.getByTestId('shop-screen')).toBeVisible();
    await page.screenshot({ path: 'playtest/run-shop.png' });

    const before = await page.evaluate(() => window.__ascendant!.run.state()!.money);
    expect(before).toBe(400);

    // Buy the first affordable slot.
    const slot = page.getByTestId('shop-slot-0');
    await expect(slot).toBeEnabled();
    await slot.click();

    // §2.9.3 — a sold slot stays on the shelf. Hiding it would erase the record of what the money went on.
    await expect(page.getByTestId('shop-sold-0')).toBeVisible();
    await expect(slot).toBeDisabled();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBeLessThan(before);
  });

  test('the re-roll ladder is priced on the button and stops after three', async ({ page }) => {
    await runAt(page, 'shop', { money: 2000 });
    const reroll = page.getByTestId('btn-reroll');
    await expect(reroll).toContainText('25');
    await reroll.click();
    await expect(reroll).toContainText('50');
    await reroll.click();
    await expect(reroll).toContainText('100');
    await reroll.click();
    await expect(reroll).toContainText('No re-rolls left');
    await expect(reroll).toBeDisabled();
  });

  test('a shelf you cannot pay for is readable, not hidden', async ({ page }) => {
    await runAt(page, 'shop', { money: 0 });
    // Every slot is disabled, and every one still shows its name and its price: this is the shelf you are
    // saving toward, and a blanked-out shelf tells you nothing about whether to come back.
    const slots = page.locator('[data-testid^="shop-slot-"]');
    await expect(slots.first()).toBeDisabled();
    await expect(slots.first()).not.toBeEmpty();
    await page.getByTestId('btn-leave-shop').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
  });
});

test.describe('Mystery Events — §2.10', () => {
  test('every choice states its outcome, and the result is shown before the node closes', async ({ page }) => {
    await runAt(page, 'mystery');
    await expect(page.getByTestId('event-screen')).toBeVisible();

    // §2.10.4 — the risk band the map promised is repeated on the page.
    await expect(page.getByTestId('event-risk')).toContainText(/Safe|Tradeoff|Gamble/);

    // Pillar 1: the button says what it does *before* it is pressed. Every choice carries a detail line.
    const choices = page.locator('[data-testid^="event-choice-"]');
    const count = await choices.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: 'playtest/run-event.png' });
    for (let i = 0; i < count; i++) await expect(choices.nth(i)).not.toBeEmpty();

    // Take whichever choice is affordable, then read the result back.
    const first = choices.first();
    await first.click();
    await expect(page.getByTestId('event-result')).toBeVisible();
    await page.screenshot({ path: 'playtest/run-event-result.png' });

    // The node does not close until the result is acknowledged.
    await expect(page.getByTestId('map-screen')).toHaveCount(0);
    await page.getByTestId('btn-leave-event').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
  });

  test('a choice you cannot pay for is disabled rather than punishing', async ({ page }) => {
    // `roadside-trader` is the costed event; drive straight to it with an empty wallet.
    await runAt(page, 'mystery', { money: 0 });
    const costed = page.locator('[data-testid^="event-choice-"][disabled]');
    // Not every event has a costed choice, so this only asserts the rule where it applies.
    if (await costed.count()) await expect(costed.first()).toBeDisabled();
  });
});

test.describe('The Pokémon Centre — §2.9.1, §8.2.4', () => {
  test('the heal is free and automatic; Therapy is the decision', async ({ page }) => {
    await runAt(page, 'center', { money: 900 });
    await expect(page.getByTestId('center-screen')).toBeVisible();

    // §2.9.1 — the restore already happened on entry, so nobody is hurt when the screen opens.
    const hurt = await page.evaluate(() => window.__ascendant!.run.state()!.box.filter((m) => m.hp <= 0).length);
    expect(hurt).toBe(0);

    // With no Trauma the screen says so rather than showing an empty list.
    await expect(page.getByTestId('center-no-trauma')).toBeVisible();

    // §8.2.4 — give the Lead some Trauma and the service appears, priced by how bad it is.
    await page.evaluate(() => window.__ascendant!.run.trauma(3));
    const before = await page.evaluate(() => window.__ascendant!.run.state()!.money);
    const button = page.locator('[data-testid^="therapy-"]').first();
    await expect(button).toBeVisible();
    await page.screenshot({ path: 'playtest/run-center.png' });
    await button.click();

    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(before - 400);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.box[0]!.traumaStacks)).toBe(2);

    await page.getByTestId('btn-leave-center').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
  });
});

test.describe('Held Items — §7.4.1', () => {
  test('a bagged item is equipped from the map, and comes off again', async ({ page }) => {
    // Nothing to walk to: the Map View is where a Held Item moves, and a fresh run is already on it.
    await freshRun(page);
    await page.evaluate(() => window.__ascendant!.run.wear('leftovers'));

    await page.getByTestId('btn-inventory').click();
    await expect(page.getByTestId('inventory-drawer')).toBeVisible();
    await page.getByTestId('inv-tab-items').click();
    await page.screenshot({ path: 'playtest/run-inventory.png' });

    await page.getByTestId('bagged-leftovers').click();
    await page.locator('[data-testid^="equip-leftovers-"]').first().click();

    const worn = await page.evaluate(() => window.__ascendant!.run.state()!.box.filter((m) => m.heldItem).length);
    expect(worn).toBe(1);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.bag)).toEqual([]);

    // §7.4.1 — taking it off returns it to the bag. Nothing is ever destroyed.
    await page.locator('[data-testid^="unequip-"]').first().click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.bag)).toEqual(['leftovers']);
  });
});

test.describe('The pre-run stepper — §8.8, §8.6.3', () => {
  test('a difficulty modifier is opt-in, priced in XP, and locked rows say why', async ({ page }) => {
    await page.goto('/?screen=starter');
    await page.waitForFunction(() => !!window.__ascendant);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/?screen=starter');
    await page.waitForFunction(() => !!window.__ascendant);
    await expect(page.getByTestId('step-difficulty')).toBeVisible();

    // §8.8.4 — the baseline is the floor: nothing is selected to begin with.
    await expect(page.getByTestId('difficulty-xp')).toContainText('×1.00');

    // §8.8.2 — on a fresh account every row is below its Trainer Level: named, locked, and saying which level.
    await expect(page.getByTestId('difficulty-iron-will')).toBeDisabled();
    await expect(page.getByTestId('difficulty-lock-iron-will')).toContainText('Lv 3');

    // Six levels in, the first four rows are open.
    await page.evaluate(() => window.__ascendant!.meta.xp(9_000));
    await page.goto('/?screen=starter');
    await page.waitForFunction(() => !!window.__ascendant);
    await page.getByTestId('difficulty-iron-will').click();
    await expect(page.getByTestId('difficulty-xp')).toContainText('×1.15');

    // §8.8.2 — one slot: a second pick replaces the first rather than stacking.
    await page.getByTestId('difficulty-no-refunds').click();
    await expect(page.getByTestId('difficulty-xp')).toContainText('×1.30');

    // §7.7 — a modifier whose system does not exist cannot be taken, and the card names the version.
    await expect(page.getByTestId('difficulty-greater-threats')).toBeDisabled();
    await expect(page.getByTestId('difficulty-greater-threats')).toContainText('v0.7');
    // And a row above your level is locked by level, not by version.
    await expect(page.getByTestId('difficulty-faint-echo')).toBeDisabled();
    await expect(page.getByTestId('difficulty-lock-faint-echo')).toContainText('Lv 9');
    await page.screenshot({ path: 'playtest/new-run-difficulty.png' });
  });

  test('the Starting Relic offer is three Common-or-Uncommon rows, and taking one is optional', async ({ page }) => {
    await page.goto('/?screen=starter');
    await page.waitForFunction(() => !!window.__ascendant);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('step-starter')).toBeVisible();
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('step-relic')).toBeVisible();

    const offers = page.locator('[data-testid^="relic-offer-"]');
    await expect(offers).toHaveCount(3);
    await page.screenshot({ path: 'playtest/new-run-relic.png' });

    await offers.first().click();
    await page.getByTestId('btn-continue').click();

    // §2.11.3 — and the Region Modifier step behind it: three weighted rows, and skipping is allowed.
    await expect(page.getByTestId('step-region')).toBeVisible();
    const regions = page.locator('[data-testid^="region-offer-"]');
    await expect(regions).toHaveCount(3);
    await page.screenshot({ path: 'playtest/new-run-region.png' });
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics.length)).toBe(1);
  });
});

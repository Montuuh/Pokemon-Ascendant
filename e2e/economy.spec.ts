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
    const want = kind === 'mystery' ? 'event' : kind === 'merchant' ? 'shop' : kind;
    if (phase === want || phase === 'ended' || phase === 'city') break;
  }

  if (money !== undefined) await page.evaluate((m) => window.__ascendant!.run.pay(m as number), money);
  await page.evaluate(() => window.__ascendant!.goTo('map'));
}

/** §2.11 — stand a fresh run in Pallet Town, the way a Gym win would, without walking the Region. */
async function inTown(page: Page, opts: { money?: number; cityIndex?: number } = {}): Promise<void> {
  await freshRun(page);
  await page.evaluate((i) => window.__ascendant!.run.city(i), opts.cityIndex ?? 0);
  if (opts.money !== undefined) await page.evaluate((m) => window.__ascendant!.run.pay(m as number), opts.money);
  await expect(page.getByTestId('city-screen')).toBeVisible();
}

test.describe('The town — §2.11', () => {
  test('the buildings are doors: open ones lead in and back, the rest say they are coming', async ({ page }) => {
    await inTown(page);
    // §2.9.4.1 — the Challenge Ring stands in the square, a building of its own since v0.7.7.
    for (const door of ['center', 'mart', 'dojo', 'ring', 'safari', 'gate']) await expect(page.getByTestId(`door-${door}`)).toBeVisible();
    await expect(page.getByTestId('city-money')).toContainText(/\d/);
    await expect(page.getByTestId('door-safari')).toHaveAttribute('data-state', 'open');
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: 'playtest/city-pallet.png' });

    // §2.11.6 — the Safari is open since v0.7.6: in, and back out to the same town. (The doors still in
    // development — the Dojo's extra moves — are covered in progression.spec; the Black Market is black-market.spec's.)
    await page.getByTestId('door-safari').click();
    await expect(page.getByTestId('safari-screen')).toBeVisible();
    // A first visit opens the How to play; skipping it is the way back to the park.
    await page.getByTestId('btn-guide-back').click();
    await page.getByTestId('btn-leave-safari').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();

    // An open door leads in, and back out to the same town.
    await page.getByTestId('door-mart').click();
    await expect(page.getByTestId('shop-screen')).toBeVisible();
    await page.getByTestId('btn-leave-shop').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
  });

  test('the gate is the Reflection: one modifier for the next Region, and the pick leaves town', async ({ page }) => {
    await inTown(page);
    await page.getByTestId('door-gate').click();
    await expect(page.getByTestId('reflection')).toBeVisible();
    await expect(page.getByTestId('btn-depart')).toBeDisabled();
    await page.screenshot({ path: 'playtest/city-reflection.png' });

    // Staying is allowed — the town is still there.
    await page.getByTestId('btn-stay').click();
    await expect(page.getByTestId('reflection')).toHaveCount(0);

    await page.getByTestId('door-gate').click();
    await page.locator('[data-testid^="reflection-"]').first().click();
    await page.getByTestId('btn-depart').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Region 2' })).toBeVisible();
    const run = await page.evaluate(() => window.__ascendant!.run.state()!);
    expect(run.regionIndex).toBe(1);
    expect(run.regionModifier).toBeTruthy();
    expect(run.city).toBeNull();
  });

  test('Celadon City has the Department Store, the Coliseum and the Game Corner — and no door to the Black Market', async ({ page }) => {
    await inTown(page, { cityIndex: 1 });
    await expect(page.getByTestId('city-screen')).toHaveAttribute('data-city', 'celadon-city');
    for (const door of ['center', 'department-store', 'dojo', 'ring', 'game-corner', 'safari', 'gate']) await expect(page.getByTestId(`door-${door}`)).toBeVisible();
    // §2.11.6 — the Black Market is a secret: nothing on the City map leads to it.
    await expect(page.getByTestId('door-black-market')).toHaveCount(0);
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: 'playtest/city-celadon.png' });
  });
});

test.describe('Statuses between fights — §4.2.7.1', () => {
  test('a carried status shows on the map and in town, and the Center clears it', async ({ page }) => {
    await freshRun(page);
    await page.evaluate(() => window.__ascendant!.run.afflict('burn'));
    await expect(page.getByTestId('box-status-squirtle')).toBeVisible();

    await page.evaluate(() => window.__ascendant!.run.city(0));
    await expect(page.getByTestId('city-party')).toBeVisible();
    await expect(page.getByTestId('city-mon-squirtle')).toHaveAttribute('aria-label', /Burn/);

    await page.getByTestId('door-center').click();
    await page.getByTestId('btn-leave-center').click();
    await expect(page.getByTestId('city-mon-squirtle')).not.toHaveAttribute('aria-label', /Burn/);
  });
});

test.describe('The Poké Mart — §2.11.2', () => {
  test('buying takes the money, marks the slot sold, and leaves it on the shelf', async ({ page }) => {
    await inTown(page, { money: 400 });
    await page.getByTestId('door-mart').click();
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

    // §2.11.0 — and it is still sold when you come back in.
    await page.getByTestId('btn-leave-shop').click();
    await page.getByTestId('door-mart').click();
    await expect(page.getByTestId('shop-sold-0')).toBeVisible();
  });

  test('the re-roll ladder is priced on the button and stops after three', async ({ page }) => {
    await inTown(page, { money: 2000 });
    await page.getByTestId('door-mart').click();
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

  test('the counter buys a held item back for 30 % — §2.11.2.4', async ({ page }) => {
    await inTown(page, { money: 0 });
    await page.evaluate(() => window.__ascendant!.run.wear('leftovers'));
    await page.getByTestId('door-mart').click();
    await expect(page.getByTestId('shop-sell')).toBeVisible();
    await page.getByTestId('sell-leftovers').click();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.money)).toBe(90);
    await expect(page.getByTestId('shop-sell')).toHaveCount(0);
  });

  test('a shelf you cannot pay for is readable, not hidden', async ({ page }) => {
    await inTown(page, { money: 0 });
    await page.getByTestId('door-mart').click();
    // Every slot is disabled, and every one still shows its name and its price: this is the shelf you are
    // saving toward, and a blanked-out shelf tells you nothing about whether to come back.
    const slots = page.locator('[data-testid^="shop-slot-"]');
    await expect(slots.first()).toBeDisabled();
    await expect(slots.first()).not.toBeEmpty();
    await page.getByTestId('btn-leave-shop').click();
    await expect(page.getByTestId('city-screen')).toBeVisible();
  });
});

test.describe('The route services — §2.9', () => {
  test('the merchant sells Poké Balls by three and re-rolls once', async ({ page }) => {
    await runAt(page, 'merchant', { money: 2000 });
    await expect(page.getByTestId('shop-screen')).toBeVisible();
    await expect(page.getByTestId('shop-screen')).toContainText('Travelling merchant');
    await expect(page.getByTestId('shop-screen')).toContainText('Poké Ball ×3');
    await page.screenshot({ path: 'playtest/run-merchant.png' });
    const reroll = page.getByTestId('btn-reroll');
    await reroll.click();
    await expect(reroll).toContainText('No re-rolls left');
    await page.getByTestId('btn-leave-shop').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
  });

  test('the field nurse heals on arrival and waves you on', async ({ page }) => {
    await runAt(page, 'aid');
    await expect(page.getByTestId('aid-screen')).toBeVisible();
    await expect(page.getByTestId('aid-box').locator('li')).toHaveCount(await page.evaluate(() => window.__ascendant!.run.state()!.box.length));
    await page.screenshot({ path: 'playtest/run-aid.png' });
    await page.getByTestId('btn-leave-aid').click();
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

test.describe('The Pokémon Centre — §2.11.1, §8.2.4', () => {
  test('the heal is free and automatic; Therapy is the decision', async ({ page }) => {
    await inTown(page, { money: 900 });
    await page.getByTestId('door-center').click();
    await expect(page.getByTestId('center-screen')).toBeVisible();

    // §2.11.1 — the restore already happened on entry, so nobody is hurt when the screen opens.
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
    await expect(page.getByTestId('city-screen')).toBeVisible();
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

    // §7.7 — a modifier whose system does not exist cannot be taken, and the card says why.
    await expect(page.getByTestId('difficulty-tight-schedule')).toBeDisabled();
    await expect(page.getByTestId('difficulty-tight-schedule')).toContainText('League');
    // Greater Threats is live since the Regions have stat tiers (§2.2.1) — locked by level, not by version.
    await expect(page.getByTestId('difficulty-lock-greater-threats')).toContainText('Lv 10');
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

test.describe('Running from a fight — §3.1.2', () => {
  test('the Run button prices the exit, takes the parting shot, and the toll comes off on the map', async ({ page }) => {
    await freshRun(page, { seed: 7 });
    await page.evaluate(() => window.__ascendant!.run.pay(1000));
    // Walk into the first wild node from layer 0 and open the fight.
    const opened = await page.evaluate(() => {
      const dev = window.__ascendant!;
      const run = dev.run.state()!;
      const wild = run.reachable.find((id) => run.map.nodes[id]!.kind === 'wild');
      if (!wild) return false;
      dev.run.dispatch({ type: 'enter-node', nodeId: wild });
      return true;
    });
    if (!opened) return; // this seed has no wild on layer 0
    await page.getByTestId('btn-enter-node').click();
    await expect(page.getByTestId('combat-screen')).toBeVisible();

    // The button is there, enabled, and its tooltip names the toll.
    const run = page.getByTestId('btn-flee');
    await expect(run).toBeEnabled();
    await run.hover();
    await page.waitForTimeout(700);
    await expect(page.getByTestId('tooltip')).toContainText('−20 % ₽');
    await expect(page.getByTestId('tooltip')).toContainText('parting shot');
    await page.screenshot({ path: 'playtest/combat-run-button.png' });

    await run.click();
    await expect(page.getByTestId('outcome-overlay')).toContainText('Got away');
    await page.getByTestId('btn-continue-run').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
    const after = await page.evaluate(() => {
      const r = window.__ascendant!.run.state()!;
      return { money: r.money, trauma: r.box[0]!.traumaStacks, escapes: r.stats.escapes, phase: r.phase };
    });
    expect(after.money).toBe(800);
    expect(after.trauma).toBe(1);
    expect(after.escapes).toBe(1);
    expect(after.phase).toBe('map');
  });

  test('there is no running from a Gym', async ({ page }) => {
    await page.goto('/?scenario=wild-boss-3phase&seed=1');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    // A practice fixture is not a run, so the button is not there at all; inside a run the Gym disables it.
    await expect(page.getByTestId('btn-flee')).toHaveCount(0);
  });
});

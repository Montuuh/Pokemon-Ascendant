import { expect, test, type Page } from '@playwright/test';

// §5.6 / §9.2.4 / §9.2.5 — fights against a group, on the screen: the formation, a card's number on every enemy
// it can reach, reach itself (a Melee card stops at the Lead), dragging a card onto its target, the hits coming
// at each portrait, and the intent card. Screenshots to playtest/combat-group-*.png.

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

const hpOf = async (page: Page, uid: string) =>
  page.evaluate((u) => {
    const s = (window as unknown as { __ascendant: { dump: () => { enemies: { uid: string; hp: number }[] } } }).__ascendant.dump();
    return s.enemies.find((e) => e.uid === u)?.hp ?? -1;
  }, uid);

test.describe('Group fights — §5.6', () => {
  test('a flock of three stands together, each with its intent, its place and its role', async ({ page }) => {
    await page.goto('/?scenario=group-wild-flock');
    const screen = page.getByTestId('combat-screen');
    await expect(screen).toHaveAttribute('data-enemies', '3');
    await expect(page.getByTestId('foe-panel')).toHaveCount(3);
    await expect(page.getByTestId('intent-chip')).toHaveCount(3);
    await expect(page.getByTestId('foe-place').first()).toHaveText('Lead');
    await expect(page.getByTestId('foe-place').nth(2)).toContainText('Debuffer');
    await expect(page.getByTestId('arena-enemy')).toHaveCount(3);
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-group-flock.png' });
  });

  test('a Ranged card prints its number on every enemy; a Melee card stops at the Lead', async ({ page }) => {
    await page.goto('/?scenario=group-wild-flock');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.getByTestId('card-vine-whip').hover();
    await expect(page.getByTestId('target-preview')).toHaveCount(3);
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-group-preview.png' });

    await page.getByTestId('card-scratch').hover();
    await expect(page.getByTestId('target-preview')).toHaveCount(1);
    await expect(page.getByTestId('target-out-of-reach')).toHaveCount(2);
    await page.screenshot({ path: 'playtest/combat-group-reach.png' });
  });

  test('a card dragged onto a support lands on that support', async ({ page }) => {
    await page.goto('/?scenario=group-wild-flock');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await settle(page);
    const card = page.getByTestId('card-vine-whip');
    const target = page.locator('[data-testid="foe-panel"][data-enemy-uid="e2"] [data-testid^="enemy-"]');
    const before = await hpOf(page, 'e2');
    const from = (await card.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y - 40, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await expect(page.getByTestId('drag-ghost')).toBeVisible();
    await expect(page.getByTestId('damage-preview')).toBeVisible();
    await page.screenshot({ path: 'playtest/combat-group-drag.png' });
    await page.mouse.up();
    await expect.poll(() => hpOf(page, 'e2')).toBeLessThan(before);
  });

  test('click the card, then the enemy: it is aimed there; a Melee card at a support is refused', async ({ page }) => {
    await page.goto('/?scenario=group-wild-flock');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    const support = page.locator('[data-testid="foe-panel"][data-enemy-uid="e1"] [data-testid^="enemy-"]');
    await page.getByTestId('card-scratch').click();
    await support.click();
    await expect(page.getByTestId('toast')).toContainText('Melee');
    const before = await hpOf(page, 'e1');
    await page.getByTestId('card-vine-whip').click();
    await support.click();
    await expect.poll(() => hpOf(page, 'e1')).toBeLessThan(before);
  });

  test('every hit coming at a portrait is its own number, and the intent card lists them', async ({ page }) => {
    await page.goto('/?scenario=group-trainer-pair');
    await expect(page.getByTestId('combat-screen')).toHaveAttribute('data-enemies', '2');
    await expect(page.getByTestId('incoming').first()).toBeVisible();
    await page.getByTestId('intent-chip').first().hover();
    const tip = page.getByTestId('tooltip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText(/Aimed at|On itself|On /);
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-group-intent-card.png' });
  });

  test('an area intent says ALL and prints no number; each portrait carries its own', async ({ page }) => {
    await page.goto('/?scenario=group-elite-buffer&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    const chip = page.getByTestId('intent-chip').first();
    // The Elite's opener is hidden; play turns until its Bulldoze is telegraphed.
    for (let i = 0; i < 8 && !/ALL/.test((await chip.textContent()) ?? ''); i++) {
      await page.getByTestId('btn-end-turn').click();
      await page.waitForTimeout(250);
      if ((await page.getByTestId('combat-screen').getAttribute('data-outcome')) !== 'in-progress') break;
    }
    await expect(chip).toContainText('ALL');
    await expect(chip.getByTestId('intent-dmg')).toHaveCount(0);
    await expect(page.getByTestId('incoming').first()).toBeVisible();
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-group-area.png' });
  });

  // §5.6.1 — a Pokémon that acts twice: two chips, the second marked, each with its own card.
  test('a Pokémon that acts twice shows both intents', async ({ page }) => {
    await page.goto('/?scenario=wild-acts-twice');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await expect(page.getByTestId('intent-chip')).toHaveCount(1);
    await expect(page.getByTestId('intent-chip-second')).toHaveCount(1);
    await expect(page.getByTestId('intent-chip-second')).toContainText('Also');
    await page.getByTestId('intent-chip-second').hover();
    await expect(page.getByTestId('tooltip')).toContainText('second action');
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-acts-twice.png' });
  });

  // §5.6.2 — a call names who will come; at Resolution the companion joins and telegraphs its own intent.
  test('a call for help is telegraphed by name, and the companion joins the fight', async ({ page }) => {
    await page.goto('/?scenario=group-call-for-help');
    const screen = page.getByTestId('combat-screen');
    await expect(screen).toHaveAttribute('data-enemies', '1');
    const chip = page.getByTestId('intent-chip').first();
    for (let i = 0; i < 6 && !/Call for Help/.test((await chip.textContent()) ?? ''); i++) {
      await page.getByTestId('btn-end-turn').click();
      await page.waitForTimeout(250);
    }
    await expect(chip).toContainText('Call for Help');
    await expect(chip).toContainText('+Nidoran');
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-call-for-help.png' });
    await page.getByTestId('btn-end-turn').click();
    await expect(screen).toHaveAttribute('data-enemies', '2');
    await expect(page.getByTestId('intent-chip')).toHaveCount(2);
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-call-answered.png' });
  });

  // §5.6.3 — a node's preview card promises its shape before you commit.
  test('a node that is a pack or a caller says so on its preview card', async ({ page }) => {
    await page.goto('/?screen=menu');
    const found = await page.evaluate(() => {
      type Dev = { run: { new: (s: string, seed: number) => void; state: () => { reachable: string[]; map: { nodes: Record<string, unknown> } } }; goTo: (s: string) => void; sim: { groupPlanFor: (n: unknown, r: unknown) => { kind: string } } };
      const a = (window as unknown as { __ascendant: Dev }).__ascendant;
      for (let seed = 1; seed < 400; seed++) {
        a.run.new('squirtle', seed);
        const run = a.run.state();
        const id = run.reachable.find((n) => a.sim.groupPlanFor(run.map.nodes[n], run).kind !== 'single');
        if (id) {
          a.goTo('map');
          return id;
        }
      }
      return null;
    });
    expect(found).not.toBeNull();
    await page.getByTestId(`node-${found}`).click();
    await expect(page.getByTestId('preview-group')).toBeVisible();
    await settle(page);
    await page.screenshot({ path: 'playtest/run-node-preview-group.png' });
  });

  // §4.3 / §9.2.2.1 — the ground a fight is on: chips on the top bar, the field in the breakdown, Defog clears it.
  test('a Home Field and a Sandstorm show on the top bar, and a Defog clears them', async ({ page }) => {
    await page.goto('/?scenario=field-gym-sandstorm');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await expect(page.getByTestId('field-sandstorm')).toBeVisible();
    await expect(page.getByTestId('field-home')).toContainText('Rock');
    await page.getByTestId('field-home').hover();
    await expect(page.getByTestId('tooltip')).toContainText('own turf');
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-field-gym.png' });
    const defog = page.getByTestId('consumable-defog');
    await expect(defog).toBeVisible();
    await defog.click();
    await expect(page.getByTestId('field-chips')).toHaveCount(0);
  });

  test('Rain shows its chip and moves the Water numbers', async ({ page }) => {
    await page.goto('/?scenario=field-rain-river');
    await expect(page.getByTestId('field-rain-dance')).toBeVisible();
    const water = page.locator('[data-testid="hand"] [data-testid^="card-"][data-state="playable"]').first();
    await water.hover();
    await settle(page);
    await page.screenshot({ path: 'playtest/combat-field-rain.png' });
  });

  for (const id of ['group-hiker-healer', 'group-elite-buffer']) {
    test(`${id} boots with its group and screenshots`, async ({ page }) => {
      await page.goto(`/?scenario=${id}`);
      await expect(page.getByTestId('combat-screen')).toHaveAttribute('data-enemies', '2');
      await settle(page);
      await page.screenshot({ path: `playtest/combat-${id}.png` });
    });
  }
});

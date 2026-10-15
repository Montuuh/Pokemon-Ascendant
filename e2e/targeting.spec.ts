import { expect, test, type Page } from '@playwright/test';

// §5.6 / §9.2.2.4 / §9.2.5 (v0.9.16) — a card is played onto its target, never cast at nothing: a card that lands on the
// foe only onto an enemy, a card for your own side only onto one of the Pokémon it acts on. The AP capsule shows what
// the card under the pointer would spend; the HP bars show what is coming; the arrows say whom.

/** The AP left — not the preview the capsule shows while a card is under the pointer. */
const ap = async (page: Page) => Number(await page.getByTestId('ap-pips').getAttribute('data-ap'));

/** Deal a card of `moveId`, owned by the Lead, into the first place of the hand (the live store, layout only). */
async function deal(page: Page, moveId: string) {
  await page.evaluate(async (m) => {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((u) => u.includes('/src/app/combatStore'))!;
    const { useCombatStore } = await import(/* @vite-ignore */ url);
    const s = useCombatStore.getState().state;
    const lead = s.player.team[s.player.leadIndex];
    useCombatStore.setState({ state: { ...s, player: { ...s.player, hand: [{ id: 'dealt', moveId: m, ownerUid: lead.uid }, ...s.player.hand.slice(1)] } } });
  }, moveId);
}

test.describe('Playing a card onto its target — §5.6', () => {
  test('a foe card: let go of on open ground it goes back; a second click puts it down; onto an enemy it is played', async ({ page }) => {
    await page.goto('/?scenario=group-wild-flock&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.waitForTimeout(500);
    const start = await ap(page);
    const card = page.getByTestId('card-vine-whip');
    // The AP capsule shows what it would spend while the pointer rests on it.
    await card.hover();
    await expect(page.getByTestId('ap-pips')).toHaveAttribute('data-preview', '1');
    await expect(page.getByTestId('ap-pips')).toContainText(`${start - 1} AP`);
    // Dragged out and let go over open ground (the top of the field, between the sides): nothing is played.
    const from = (await card.boundingBox())!;
    const stage = (await page.locator('section').first().boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y - 60, { steps: 4 });
    await page.mouse.move(stage.x + stage.width / 2, stage.y + 20, { steps: 8 });
    await expect(page.getByTestId('drag-ghost-card')).toBeVisible();
    await page.mouse.up();
    await expect(page.getByTestId('toast')).toContainText('enemy');
    expect(await ap(page)).toBe(start);
    // Clicked twice, it is put down — not cast.
    await card.click();
    await expect(page.getByTestId('selection-hint')).toHaveAttribute('data-target', 'foe');
    await card.click();
    await expect(page.getByTestId('selection-hint')).toHaveCount(0);
    expect(await ap(page)).toBe(start);
    // Clicked, then the enemy: played.
    await card.click();
    await page.locator('[data-testid="foe-panel"][data-enemy-uid="e0"] [data-testid="arena-enemy"]').click();
    await expect.poll(() => ap(page)).toBe(start - 1);
  });

  test('a card for your own side is played onto the Pokémon it acts on, and nowhere else', async ({ page }) => {
    await page.goto('/?scenario=group-wild-flock&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await page.waitForTimeout(500);
    await deal(page, 'harden');
    const start = await ap(page);
    const card = page.getByTestId('card-harden');
    await card.click();
    await expect(page.getByTestId('selection-hint')).toHaveAttribute('data-target', 'ally');
    // Only its owner, the Lead, lights up; an enemy does not take it.
    await expect(page.locator('[data-testid^="portrait-"][data-selectable]')).toHaveCount(1);
    await expect(page.locator('[data-testid^="portrait-lead-"]')).toHaveAttribute('data-selectable', 'true');
    await page.locator('[data-testid="foe-panel"][data-enemy-uid="e0"] [data-testid="arena-enemy"]').click();
    await expect(page.getByTestId('toast')).toContainText('Play it onto');
    await expect(card).toHaveCount(1);
    // Onto its owner: played (Harden is free, so it is the card leaving the hand that says so).
    await page.locator('[data-testid^="portrait-lead-"]').click();
    await expect(card).toHaveCount(0);
    expect(await ap(page)).toBe(start);
  });

  test('what is coming is drawn: the HP about to go striped, the arrows in the intent\'s colour, the hovered target forward', async ({ page }) => {
    await page.goto('/?scenario=group-trainer-pair&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    // Vine Whip at your Lead: the part of its bar it will take, striped, and its HP after.
    const loss = page.locator('[data-testid^="portrait-lead-"] [data-testid="hp-loss"]');
    await expect(loss).toBeVisible();
    // The Vine Whip is a hit (red), the Poison Powder a condition (violet).
    await expect(page.locator('[data-testid="intent-arrow"][data-kind="hit"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="intent-arrow"][data-kind="status"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="intent-chip"][data-kind="status"]')).toHaveCount(1);
    // Resting on your Lead brings forward the arrows aimed at it.
    await page.locator('[data-testid^="portrait-lead-"]').hover();
    await expect(page.locator('[data-testid="intent-arrow"][data-to="lead"]').first()).toHaveClass(/focus/);
    await page.screenshot({ path: 'playtest/combat-targeting.png' });
  });
});

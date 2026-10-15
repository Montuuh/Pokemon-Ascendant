import { expect, test } from '@playwright/test';

// §5.6.5 — fights with another objective, on the screen: the runner's countdown on its card and its getaway, the
// fight ending as Fled; the hold-out's count on the top line, and a guard that carries no catch pill. Screenshots to
// playtest/objective-*.png.

test.describe('Fights with another objective — §5.6.5', () => {
  test('a runner counts down on its card, declares its getaway, and is gone', async ({ page }) => {
    await page.goto('/?scenario=flee-abra&seed=1');
    const foe = page.getByTestId('foe-panel').first();
    const chip = foe.getByTestId('objective-chip');
    await expect(chip).toHaveAttribute('data-kind', 'flee');
    await expect(chip).toHaveAttribute('data-left', '2');
    await expect(chip).toHaveAccessibleName(/Flees 2 turns/);
    // A runner can be caught: it wears the catch pill.
    await expect(foe.getByTestId('catch-pill')).toBeVisible();

    await page.getByTestId('btn-end-turn').click();
    await expect(chip).toHaveAttribute('data-left', '1');
    await expect(page.getByTestId('intent-chip').first()).toContainText('Teleport');
    await expect(page.getByTestId('intent-chip').first()).toContainText("gone at the turn's end");
    await page.getByTestId('combat-screen').screenshot({ path: 'playtest/objective-flee.png' });

    await page.getByTestId('btn-end-turn').click();
    await expect(page.getByTestId('outcome-overlay')).toContainText('Abra fled');
    await expect(page.getByTestId('outcome-overlay')).toContainText('no toll');
  });

  test('a hold-out counts its turns on the top line, and its guard is not for catching', async ({ page }) => {
    await page.goto('/?scenario=hold-primeape&seed=1');
    const chip = page.getByTestId('objective-chip');
    await expect(chip).toHaveCount(1);
    await expect(chip).toHaveAttribute('data-kind', 'hold');
    await expect(chip).toContainText('3 turns');
    await expect(page.getByTestId('foe-panel').first().getByTestId('catch-pill')).toHaveCount(0);
    // The bubble says what the race is.
    await chip.hover();
    await expect(page.getByTestId('tooltip')).toContainText('not for catching', { timeout: 5_000 });
    await page.getByTestId('combat-screen').screenshot({ path: 'playtest/objective-hold.png' });
  });
});

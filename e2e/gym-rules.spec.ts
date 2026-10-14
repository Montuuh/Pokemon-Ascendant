import { expect, test } from '@playwright/test';

// §5.9.5 — the Leader's rule, on the screen: the chip on the top bar with its count, the seal on a card, and the
// Leader standing behind a group for the whole fight. Screenshots to playtest/gym-rule-*.png.

test.describe("The Leader's rule — §5.9.5", () => {
  test('Mind Lock: the chip counts down to the seal, and the sealed card says so', async ({ page }) => {
    await page.goto('/?scenario=gym-sabrina-rule&seed=3');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    // The Leader stands on stage while two of hers fight.
    await expect(page.getByTestId('combat-screen')).toHaveAttribute('data-enemies', '2');
    await expect(page.getByTestId('arena-trainer')).toBeVisible();

    const chip = page.getByTestId('rule-chip');
    await expect(chip).toHaveAttribute('data-rule', 'mind-lock');
    await expect(page.getByTestId('rule-count')).toHaveText('seal next turn');
    await page.screenshot({ path: 'playtest/gym-rule-turn1.png' });

    await page.getByRole('button', { name: 'End Turn' }).click();
    await expect(page.getByTestId('combat-screen')).toHaveAttribute('data-turn', '2');
    await expect(page.getByTestId('rule-count')).toHaveText('sealed this turn');
    // Exactly one card is sealed, shown (never hidden) with its lock.
    const sealed = page.locator('[data-testid^="card-"][data-state="sealed"]');
    await expect(sealed).toHaveCount(1);
    await expect(sealed).toContainText('Sealed');
    await page.screenshot({ path: 'playtest/gym-rule-sealed.png' });
  });
});

import { expect, test } from '@playwright/test';

// §9.6.2 — the hardware-acceleration notice: shown when the (forced) verdict is software, closable for the
// visit, dismissed for good, mirrored in Settings, and silent in an automated browser by default.

test.describe('§9.6.2 graphics acceleration notice', () => {
  test('forcedSoftware_ShowsOnce_DismissPersists_AndSettingsMirrorsIt', async ({ page }) => {
    await page.goto('/?screen=menu&gpu=software');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/?screen=menu&gpu=software');

    const notice = page.getByTestId('gpu-notice');
    await expect(notice).toBeVisible({ timeout: 8000 });
    await expect(notice).toContainText('without hardware acceleration');
    await expect(page.getByTestId('gpu-notice-path')).toContainText('Settings');
    await page.screenshot({ path: 'playtest/gpu-notice.png' });

    // The ✕ closes it for this visit only.
    await page.getByTestId('gpu-notice-close').click();
    await expect(notice).toHaveCount(0);
    await page.goto('/?screen=menu&gpu=software');
    await expect(page.getByTestId('gpu-notice')).toBeVisible({ timeout: 8000 });

    // Settings shows the state and not the notice.
    await page.goto('/?screen=settings&gpu=software');
    await expect(page.getByTestId('settings-gpu')).toHaveAttribute('data-verdict', 'software', { timeout: 8000 });
    await expect(page.getByTestId('gpu-notice')).toHaveCount(0);

    // Don't show again: gone now and after a reload.
    await page.goto('/?screen=menu&gpu=software');
    await page.getByTestId('gpu-notice-dismiss').click();
    await expect(page.getByTestId('gpu-notice')).toHaveCount(0);
    expect(await page.evaluate(() => window.localStorage.getItem('ascendant.gpu-notice-dismissed'))).toBe('1');
    await page.goto('/?screen=menu&gpu=software');
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('gpu-notice')).toHaveCount(0);
  });

  test('reduceMotion_SetsTheExistingMotionOverride', async ({ page }) => {
    await page.goto('/?screen=menu&gpu=software');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/?screen=menu&gpu=software');
    await page.getByTestId('gpu-notice-reduce').click({ timeout: 8000 });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.getByTestId('gpu-notice-reduce')).toHaveCount(0);
  });

  test('escapeCloses_TheNotice', async ({ page }) => {
    await page.goto('/?screen=menu&gpu=software');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/?screen=menu&gpu=software');
    await expect(page.getByTestId('gpu-notice')).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('gpu-notice')).toHaveCount(0);
  });

  test('anAutomatedBrowser_IsNotNagged_WithoutTheOverride', async ({ page }) => {
    await page.goto('/?screen=menu');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/?screen=menu');
    await page.waitForTimeout(1800);
    await expect(page.getByTestId('gpu-notice')).toHaveCount(0);
  });
});

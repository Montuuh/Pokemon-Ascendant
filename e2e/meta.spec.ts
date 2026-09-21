import { expect, test, type Page } from '@playwright/test';

// §8.3 / §8.4 / §8.6 / §8.7 / §9.6 — the screens that live outside a run: the Hub's four open kiosks, the
// account they read, the medals, and the settings that have to survive a reload.

async function menu(page: Page): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
}

/** A fight the account can count: a clean win with a Pidgey knocked out and Squirtle leading. */
const win = () => ({
  t: 'combat-end', outcome: 'victory', kind: 'wild', damageTaken: 4, manualSwaps: 0, faints: 0,
  defeated: ['pidgey'], activeSpecies: ['squirtle'], leadTurns: { squirtle: 3 },
  tally: { crits: 0, reshuffles: 0, statusesApplied: [], statusesTaken: 0, statusesCured: 0, riderFizzles: 0, maxApMove: 2, peakHandAtTurnEnd: 5 },
  leadHpFraction: 0.8,
});

test.describe('The Trainer Hub — §8.4', () => {
  test('a fresh account opens on the Trainer Card at Level 1, and the locked kiosks say what opens them', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-hub').click();
    await expect(page.getByTestId('hub-screen')).toBeVisible();
    await expect(page.getByTestId('hub-level')).toContainText('1');
    await expect(page.getByTestId('trainer-card')).toBeVisible();
    await expect(page.getByTestId('trainer-xp')).toContainText('0 / 1515');

    // §8.3.5 — the whole track is visible: 29 rows, level 2 is next, nothing claimed.
    await expect(page.locator('[data-testid^="track-"]')).toHaveCount(29);
    await expect(page.getByTestId('track-2')).toHaveAttribute('data-state', 'next');
    await expect(page.getByTestId('track-4')).toContainText('Pikachu');

    // §8.4.1 — three kiosks open from the start; the Daycare Lady needs Level 3 and the Door is post-launch.
    for (const id of ['card', 'pc', 'mart']) await expect(page.getByTestId(`kiosk-${id}`)).toBeEnabled();
    await expect(page.getByTestId('kiosk-daycare')).toBeDisabled();
    await expect(page.getByTestId('kiosk-daycare')).toContainText('Level 3');
    await expect(page.getByTestId('kiosk-door')).toBeDisabled();

    // §8.7 — the medal case: twenty-four rows, all visible, none earned; a hidden row keeps its description.
    await page.getByTestId('kiosk-pc').click();
    await page.getByTestId('pc-tab-medals').click();
    await expect(page.locator('[data-testid^="achievement-"]')).toHaveCount(24);
    await expect(page.getByTestId('pc-tab-medals')).toContainText('0 / 24');
    await expect(page.getByTestId('achievement-full-house')).toContainText('???');
    await expect(page.getByTestId('achievement-full-house')).toContainText('hidden');

    // §5.13 — and the Pokédex: every species listed, every one unknown.
    await page.getByTestId('pc-tab-dex').click();
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-tier', '0');
    await page.screenshot({ path: 'playtest/hub.png' });
  });

  test('fights pay XP, cross levels, discover relics and fill the Pokédex — and it all survives a reload', async ({ page }) => {
    await menu(page);
    // §8.3.2 — 303 clean wins is 1 515 XP (level 2) plus the first-win medal's 75; §8.6.1 discovers Barrier
    // Charm on the first no-faint win and Lucky Egg at fifty; §5.13.1 takes Pidgey all the way to Master (50).
    await page.evaluate((w) => {
      window.__ascendant!.meta.record(Array.from({ length: 303 }, () => w) as never[]);
    }, win());
    await page.getByTestId('btn-hub').click();
    await expect(page.getByTestId('hub-level')).toContainText('2');
    await expect(page.getByTestId('track-2')).toHaveAttribute('data-state', 'claimed');
    await expect(page.getByTestId('track-3')).toHaveAttribute('data-state', 'next');

    await page.getByTestId('kiosk-pc').click();
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-tier', '3');
    // §5.13.1 Master opens the line's Mastery Move: Pidgey's fifth card is Brave Bird.
    await expect(page.getByTestId('dex-pidgey')).toContainText('Brave Bird');
    await page.getByTestId('pc-tab-medals').click();
    await expect(page.getByTestId('achievement-first-blood')).toContainText('Earned');

    await page.getByTestId('kiosk-mart').click();
    await expect(page.getByTestId('discovery-barrier-charm')).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId('discovery-lucky-egg-token')).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId('discovery-steady-aim')).toHaveAttribute('data-state', 'locked');
    await page.screenshot({ path: 'playtest/hub-mart.png' });

    // A reload is the real test: the account lives in its own key, beside the run save and not inside it.
    await page.reload();
    await page.goto('/?screen=hub');
    await expect(page.getByTestId('hub-level')).toContainText('2');
    await page.getByTestId('kiosk-pc').click();
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-tier', '3');
  });

  test('the Poké Mart sells a Tier-3 relic for five Tokens from Level 10, and not before', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-hub').click();
    await page.getByTestId('kiosk-mart').click();
    // Level 1: the shelf is visible, priced, and locked.
    await expect(page.getByTestId('mart-sages-tome')).toBeVisible();
    await expect(page.getByTestId('mart-price-sages-tome')).toContainText('Lv 10');

    // §8.3.4 — Level 10 with Tokens in hand: the buy goes through and the Tokens come off.
    await page.evaluate(() => {
      window.__ascendant!.meta.xp(20_000);
      window.__ascendant!.meta.tokens(7);
    });
    await page.goto('/?screen=hub');
    await page.getByTestId('kiosk-mart').click();
    await expect(page.getByTestId('mart-tokens')).toContainText('7');
    await page.getByTestId('mart-sages-tome').click();
    await expect(page.getByTestId('mart-notice')).toContainText("Sage's Tome joins your pool");
    await expect(page.getByTestId('mart-tokens')).toContainText('2');
    await expect(page.getByTestId('mart-price-sages-tome')).toContainText('In your pool');
    // A second Tier-3 is now unaffordable, and the shelf says so without hiding it.
    await page.getByTestId('mart-crown-of-echoes').click();
    await expect(page.getByTestId('mart-notice')).toContainText('Five Tokens each');

    // §8.4.1 — and at Level 10 the Daycare Lady is open, listing the starters the track has handed out.
    await page.getByTestId('kiosk-daycare').click();
    await expect(page.getByTestId('daycare-starter-eevee')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('daycare-starter-magikarp')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('daycare-starter-pikachu')).toHaveAttribute('data-state', 'waiting');
    await page.screenshot({ path: 'playtest/hub-daycare.png' });
  });
});

test.describe('Settings — §9.6', () => {
  test('text size scales the whole game and survives a reload', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-settings').click();
    await expect(page.getByTestId('settings-screen')).toBeVisible();

    const sampleSize = async () =>
      parseFloat(await page.getByTestId('settings-sample').evaluate((el) => getComputedStyle(el).fontSize));

    const normal = await sampleSize();
    await page.getByTestId('text-scale-150').click();
    const largest = await sampleSize();
    expect(largest).toBeGreaterThan(normal * 1.4);
    await page.screenshot({ path: 'playtest/settings-150.png' });

    // §9.6 — the layouts were built to hold at 150 %, so the menu behind it must still fit on screen.
    await page.getByTestId('btn-settings-back').click();
    await expect(page.getByTestId('main-menu')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'the menu overflows horizontally at 150 % text').toBeLessThanOrEqual(1);

    // It is a setting, so it has to be there next time.
    await page.reload();
    await page.goto('/?screen=settings');
    await expect(page.getByTestId('text-scale-150')).toHaveAttribute('aria-pressed', 'true');
    expect(await sampleSize()).toBeGreaterThan(normal * 1.4);
  });

  test('the motion override writes the attribute the stylesheet reads', async ({ page }) => {
    await menu(page);
    await page.goto('/?screen=settings');
    await page.getByTestId('motion-reduced').click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.getByTestId('motion-full').click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
    // "System" removes it entirely rather than writing a third value, so the media query is back in charge.
    await page.getByTestId('motion-system').click();
    expect(await page.locator('html').getAttribute('data-motion')).toBeNull();
  });
});

test('a medal case from before the rename becomes the first account, paid what it was worth', async ({ page }) => {
  // §10.8 — the project was renamed on 2026-09-20 and the localStorage keys moved with it; then v0.6 folded
  // the medal case into the account. A player who updates across both keeps the medal *and* its XP.
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('evoline.achievements.v1', JSON.stringify({ counts: { 'first-blood': 1 }, species: ['pidgey'], winStreak: 2, unlocked: ['first-blood'] }));
    localStorage.setItem('evoline.settings.v1', JSON.stringify({ textScale: 1.25, motion: 'reduced' }));
  });
  await page.goto('/?screen=hub');

  // The medal survived, the account holds it, and the pre-account keys are gone.
  await page.getByTestId('kiosk-pc').click();
  await page.getByTestId('pc-tab-medals').click();
  await expect(page.getByTestId('achievement-first-blood')).toContainText('Earned');
  const keys = await page.evaluate(() => ({
    account: localStorage.getItem('ascendant.account.v1'),
    ach: localStorage.getItem('ascendant.achievements.v1'),
    oldAch: localStorage.getItem('evoline.achievements.v1'),
    newSet: localStorage.getItem('ascendant.settings.v1'),
  }));
  expect(keys.account).toContain('first-blood');
  // §8.7.0 — First Blood is Bronze: 75 XP, back-paid.
  expect(JSON.parse(keys.account!).account.xp).toBeGreaterThan(0);
  expect(keys.ach, 'the medal case is folded into the account and then removed').toBeNull();
  expect(keys.oldAch, 'the pre-rename key should be cleared once it is carried').toBeNull();
  expect(keys.newSet).toContain('1.25');

  // And the setting it carried is actually in force, not merely stored.
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
});

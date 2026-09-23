import { expect, test, type Page } from '@playwright/test';

// §8.3 / §8.4 / §8.6 / §8.7 / §9.6 — the screens that live outside a run: the Hub's four open kiosks, the
// account they read, the medals, and the settings that have to survive a reload.

async function menu(page: Page): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
}

/** A fight the account can count: a clean win with a Pidgey knocked out (by Squirtle, for 12) and Squirtle leading. */
const win = () => ({
  t: 'combat-end', outcome: 'victory', kind: 'wild', damageTaken: 4, manualSwaps: 0, faints: 0,
  defeated: ['pidgey'], enemies: ['pidgey'], activeSpecies: ['squirtle'], leadTurns: { squirtle: 3 },
  tally: { crits: 0, reshuffles: 0, statusesApplied: [], statusesTaken: 0, statusesCured: 0, riderFizzles: 0, maxApMove: 2, peakHandAtTurnEnd: 5, catchFails: 0, koBy: { squirtle: 1 }, faintsOf: {}, damageBy: { squirtle: 12 } },
  leadHpFraction: 0.8,
});

test.describe('The Trainer Hub — §8.4', () => {
  test('a fresh account opens on the Trainer Card at Level 1, and the locked kiosks say what opens them', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-hub').click();
    await expect(page.getByTestId('hub-screen')).toBeVisible();
    await expect(page.getByTestId('hub-level')).toHaveAttribute('data-level', '1');
    await expect(page.getByTestId('trainer-card')).toBeVisible();
    await expect(page.getByTestId('level-ring-caption').first()).toHaveAttribute('data-span', '1515');

    // §8.3.5 — the whole road is there: 29 stops, level 2 is next and is the one explained, nothing claimed.
    await expect(page.locator('li[data-testid^="track-"]')).toHaveCount(29);
    await expect(page.getByTestId('track-2')).toHaveAttribute('data-state', 'next');
    await expect(page.getByTestId('track-detail')).toContainText('Level 2');
    await expect(page.getByTestId('track-detail')).toContainText('+2 Tokens');
    // Clicking a stop explains it; the storefront stops say which shelf they open.
    await page.getByTestId('track-3').getByRole('button').click();
    await expect(page.getByTestId('track-3')).toHaveAttribute('data-opens', 'starters');
    await expect(page.getByTestId('track-detail')).toContainText('Starters shelf opens');
    await expect(page.getByTestId('track-detail')).toContainText('Magikarp, Eevee and Pikachu');

    // §8.4.1 — three kiosks open from the start; the Daycare Lady needs Level 3 and the Door is post-launch.
    for (const id of ['card', 'pc', 'mart']) await expect(page.getByTestId(`kiosk-${id}`)).toBeEnabled();
    await expect(page.getByTestId('kiosk-daycare')).toBeDisabled();
    await expect(page.getByTestId('kiosk-daycare')).toContainText('Level 3');
    await expect(page.getByTestId('kiosk-door')).toBeDisabled();

    // §5.13 / §8.9 — the PC Terminal opens on the Pokédex: number, silhouette, name, the line's pips; every
    // species listed, none met, no line played.
    await page.getByTestId('kiosk-pc').click();
    await expect(page.getByTestId('dex-legend')).toContainText('0 of 73 met');
    await expect(page.getByTestId('dex-legend')).toContainText('0 of 33 lines played');
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-met', 'false');
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-rank', '0');
    await expect(page.getByTestId('dex-pidgey')).toContainText('#016');
    await expect(page.getByTestId('dex-pidgey')).not.toContainText('KO');
    // §6.8 — the line is the sheet's third tab: its stages, the ladder with this line's names, how Bond grows.
    await page.getByTestId('dex-squirtle').click();
    await page.getByTestId('dex-sheet-tab-line').click();
    await expect(page.getByTestId('line-sheet')).toHaveAttribute('data-line', 'squirtle');
    await expect(page.getByTestId('line-sheet-ladder')).toContainText('Aqua Tail');
    await expect(page.getByTestId('line-sheet-ladder')).toContainText('Shiny');
    // How Bond grows is a door, not a paragraph: the InfoDot by the Bond heading carries it.
    await page.getByTestId('line-sheet').getByRole('button', { name: 'More about this' }).first().hover();
    await expect(page.getByTestId('tooltip')).toContainText('Play the line');
    // A stage opens that species' sheet on the same tab; Back returns.
    await page.getByTestId('line-stage-wartortle').click();
    await expect(page.getByTestId('dex-sheet')).toHaveAttribute('data-species', 'wartortle');
    await expect(page.getByTestId('line-sheet')).toBeVisible();
    await page.getByTestId('pc-sheet-back').click();
    await expect(page.getByTestId('dex-sheet')).toHaveAttribute('data-species', 'squirtle');
    await page.getByTestId('pc-sheet-close').click();
    await expect(page.getByTestId('pc-sheet')).toHaveCount(0);
    // The cards fade in over ~0.6 s; the screenshot is of the finished picture.
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'playtest/hub-pokedex.png' });
    // Its sheet: the record at zero, the knowledge line counting to Familiar, the kit on the second tab.
    await page.getByTestId('dex-pidgey').click();
    await expect(page.getByTestId('dex-sheet')).toHaveAttribute('data-met', 'false');
    await expect(page.getByTestId('dex-stat-ko')).toContainText('0');
    await expect(page.getByTestId('dex-sheet-knowledge')).toContainText('10 more knock-outs to Familiar');
    await page.getByTestId('dex-sheet-tab-kit').click();
    await expect(page.getByTestId('dex-sheet')).toContainText('Gust');
    await page.getByTestId('dex-sheet-evolves-pidgeotto').click();
    await expect(page.getByTestId('dex-sheet')).toHaveAttribute('data-species', 'pidgeotto');
    await page.screenshot({ path: 'playtest/hub-pokedex-sheet.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('pc-sheet')).toHaveCount(0);

    // §8.7 — the medal case: twenty-four rows, all visible, none earned; a hidden row keeps its description.
    await page.getByTestId('pc-tab-medals').click();
    await expect(page.locator('[data-testid^="achievement-"]')).toHaveCount(24);
    await expect(page.getByTestId('pc-tab-medals')).toContainText('0 / 24');
    await expect(page.getByTestId('achievement-full-house')).toContainText('???');
    await expect(page.getByTestId('achievement-full-house')).toContainText('hidden');

    await page.getByTestId('pc-tab-dex').click();
    await page.getByTestId('kiosk-card').click();
    // The road staggers its stops in over ~0.6 s; the screenshot is of the finished picture.
    await page.waitForTimeout(800);
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
    await expect(page.getByTestId('hub-level')).toHaveAttribute('data-level', '2');
    await expect(page.getByTestId('track-2')).toHaveAttribute('data-state', 'claimed');
    await expect(page.getByTestId('track-3')).toHaveAttribute('data-state', 'next');

    // §6.8 — 303 wins leading with Squirtle is 606 Bond: five pips on every card of the line, "By Bond" puts
    // the line first, and every rung is lit on the sheet.
    await page.getByTestId('kiosk-pc').click();
    await expect(page.getByTestId('dex-squirtle')).toHaveAttribute('data-rank', '5');
    await expect(page.getByTestId('dex-blastoise')).toHaveAttribute('data-rank', '5');
    await expect(page.getByTestId('dex-legend')).toContainText('1 of 33 lines played');
    await page.getByTestId('dex-order-bond').click();
    await expect(page.locator('[data-testid="dex-grid"] li').first()).toContainText('Squirtle');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'playtest/hub-pokedex-by-bond.png' });
    await page.getByTestId('dex-squirtle').click();
    await page.getByTestId('dex-sheet-tab-line').click();
    await expect(page.getByTestId('line-sheet')).toHaveAttribute('data-rank', '5');
    await expect(page.getByTestId('line-sheet')).toContainText('Can start a run');
    await expect(page.locator('[data-testid="line-sheet-ladder"] li[data-on="true"]')).toHaveCount(5);
    await page.screenshot({ path: 'playtest/hub-line-sheet.png' });
    await page.keyboard.press('Escape');
    await page.getByTestId('dex-order-dex').click();
    // §5.13 / §8.9 — Pidgey, met and knocked out 303 times, is Familiar; the record kept every number.
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-tier', '1');
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-met', 'true');
    await page.getByTestId('dex-pidgey').click();
    await expect(page.getByTestId('dex-sheet-knowledge')).toContainText('Familiar');
    await expect(page.getByTestId('dex-stat-met')).toContainText('303');
    await expect(page.getByTestId('dex-stat-ko')).toContainText('303');
    await page.keyboard.press('Escape');
    // Squirtle's own record: the knock-outs it landed and the damage it dealt, from the fight tally.
    await page.getByTestId('dex-squirtle').click();
    await expect(page.getByTestId('dex-stat-kos')).toContainText('303');
    await expect(page.getByTestId('dex-stat-dmg')).toContainText('3636');
    await expect(page.getByTestId('dex-stat-lead')).toContainText('909');
    await page.screenshot({ path: 'playtest/hub-pokedex-record.png' });
    await page.keyboard.press('Escape');
    await page.getByTestId('pc-tab-medals').click();
    await expect(page.getByTestId('achievement-first-blood')).toContainText('Earned');

    // §8.6.1 — the discoveries, on the PC Terminal beside the rest of what the account knows.
    await page.getByTestId('pc-tab-relics').click();
    await expect(page.getByTestId('discovery-barrier-charm')).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId('discovery-lucky-egg-token')).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId('discovery-steady-aim')).toHaveAttribute('data-state', 'locked');
    await page.screenshot({ path: 'playtest/hub-pc.png' });

    // A reload is the real test: the account lives in its own key, beside the run save and not inside it.
    await page.reload();
    await page.goto('/?screen=hub');
    await expect(page.getByTestId('hub-level')).toHaveAttribute('data-level', '2');
    await page.getByTestId('kiosk-pc').click();
    await expect(page.getByTestId('dex-squirtle')).toHaveAttribute('data-rank', '5');
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-tier', '1');
    await page.getByTestId('dex-squirtle').click();
    await expect(page.getByTestId('dex-stat-kos')).toContainText('303');
  });

  test('the Poké Mart opens a shelf per level and sells for Tokens — cosmetics from Level 1, the Mastery lane from 10', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-hub').click();
    await page.getByTestId('kiosk-mart').click();
    // Level 1: the Trainer's Corner is open, the other four shelves are tabs that say their level, and a
    // closed shelf is still readable — priced, with a banner that says what opens it.
    await expect(page.getByTestId('mart-tab-corner')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('mart-tab-mastery')).toHaveAttribute('data-open', 'false');
    await expect(page.getByTestId('mart-tab-mastery')).toContainText('Lv 10');
    await expect(page.getByTestId('mart-banner')).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId('mart-title-veteran')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('mart-price-title-veteran')).toHaveAttribute('aria-disabled', 'true');
    await page.getByTestId('mart-tab-mastery').click();
    await expect(page.getByTestId('mart-banner')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('mart-banner')).toContainText('opens at Trainer Level 10');
    await expect(page.getByTestId('mart-sages-tome')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('mart-price-sages-tome')).toHaveAttribute('aria-label', /Opens at Level 10/);
    await page.screenshot({ path: 'playtest/hub-mart-locked.png' });

    // §8.4.4 — seven Tokens at Level 1 buy a title, an avatar and a frame at the Corner; the Trainer Card
    // wears each the moment it is bought, and a second title is a Wear button away.
    await page.evaluate(() => window.__ascendant!.meta.tokens(9));
    await page.goto('/?screen=hub');
    await page.getByTestId('kiosk-mart').click();
    await expect(page.getByTestId('mart-tokens')).toHaveAttribute('data-tokens', '9');
    await expect(page.getByTestId('mart-title-veteran')).toHaveAttribute('data-state', 'buyable');
    await page.getByTestId('mart-price-title-veteran').click();
    await expect(page.getByTestId('mart-notice')).toContainText('Veteran is yours');
    await expect(page.getByTestId('mart-title-veteran')).toHaveAttribute('data-state', 'owned');
    await expect(page.getByTestId('mart-title-veteran')).toContainText('Wearing');
    await page.getByTestId('mart-price-avatar-hiker').click();
    await page.getByTestId('mart-price-frame-great').click();
    await page.getByTestId('mart-price-title-ace-trainer').click();
    await expect(page.getByTestId('mart-tokens')).toHaveAttribute('data-tokens', '0');
    await expect(page.getByTestId('mart-title-ace-trainer')).toContainText('Wearing');
    await expect(page.getByTestId('mart-wear-title-veteran')).toBeVisible();
    await page.screenshot({ path: 'playtest/hub-mart-corner.png' });
    await page.getByTestId('mart-wear-title-veteran').click();
    await expect(page.getByTestId('mart-title-veteran')).toContainText('Wearing');
    await page.getByTestId('kiosk-card').click();
    await expect(page.getByTestId('card-title')).toHaveText('Veteran');
    await expect(page.getByTestId('card-avatar')).toBeVisible();
    await expect(page.getByTestId('card-head')).toHaveAttribute('data-frame', 'frame-great');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'playtest/hub-card-worn.png' });

    // §8.3.4 — Level 10 with Tokens in hand: the Mart opens on the newest shelf, the Mastery lane sells a
    // Tier-3 for five, the Starters shelf sells Eevee for six, and the Tokens come off each time.
    await page.evaluate(() => {
      window.__ascendant!.meta.xp(20_000);
      window.__ascendant!.meta.tokens(13);
    });
    await page.goto('/?screen=hub');
    await page.getByTestId('kiosk-mart').click();
    await expect(page.getByTestId('mart-tab-mastery')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('mart-banner')).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId('mart-tokens')).toHaveAttribute('data-tokens', '13');
    await expect(page.getByTestId('mart-sages-tome')).toHaveAttribute('data-state', 'buyable');
    await page.getByTestId('mart-price-sages-tome').click();
    await expect(page.getByTestId('mart-notice')).toContainText("Sage's Tome is in your pool");
    await expect(page.getByTestId('mart-tokens')).toHaveAttribute('data-tokens', '8');
    await expect(page.getByTestId('mart-sages-tome')).toHaveAttribute('data-state', 'owned');
    await page.screenshot({ path: 'playtest/hub-mart.png' });
    await page.getByTestId('mart-tab-starters').click();
    await expect(page.getByTestId('mart-eevee')).toHaveAttribute('data-state', 'buyable');
    await page.getByTestId('mart-price-eevee').click();
    await expect(page.getByTestId('mart-notice')).toContainText('Eevee can start your next run');
    await expect(page.getByTestId('mart-tokens')).toHaveAttribute('data-tokens', '2');
    // Magikarp at four is now unaffordable, and the shelf says so without hiding it; so is Pikachu at six, whose
    // kit shipped with Region 2 (v0.7.3) — sold, just not to a wallet of two.
    await expect(page.getByTestId('mart-price-magikarp')).toHaveAttribute('aria-label', /Not enough Tokens/);
    await expect(page.getByTestId('mart-magikarp')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('mart-price-pikachu')).toHaveAttribute('aria-label', /Not enough Tokens/);
    await page.screenshot({ path: 'playtest/hub-mart-starters.png' });

    // §8.4.1 — and the Daycare Lady lists what was bought as ready, and prices what was not.
    await page.getByTestId('kiosk-daycare').click();
    await expect(page.getByTestId('daycare-starter-eevee')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('daycare-starter-magikarp')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('daycare-starter-magikarp')).toContainText('4');
    await expect(page.getByTestId('daycare-starter-pikachu')).toHaveAttribute('data-state', 'locked');
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

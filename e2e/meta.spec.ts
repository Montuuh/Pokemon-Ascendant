import { expect, test, type Page } from '@playwright/test';

// §8.3 / §8.4 / §8.6 / §8.7 / §9.6 — the screens that live outside a run: the Hub's kiosks as the rank brings
// them, the account they read, the Journal, and the settings that have to survive a reload.

async function menu(page: Page): Promise<void> {
  await page.goto('/?screen=menu');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
}

/** §8.4 — a door in the Hub's lobby: back to the lobby first if a kiosk is open over it. */
async function openKiosk(page: Page, id: 'pc' | 'mart' | 'card' | 'guide' | 'aide' | 'kit'): Promise<void> {
  const lobby = page.getByTestId('btn-hub-lobby');
  if (await lobby.isVisible()) await lobby.click();
  await page.getByTestId(`kiosk-${id}`).click();
  await expect(page.getByTestId(`hub-panel-${id}`)).toBeVisible();
}

/** A fight the account can count: a clean trainer win (a wild one pays no Bond, §6.8.1) with a Pidgey knocked out (by Squirtle, for 12) and Squirtle leading. */
const win = () => ({
  t: 'combat-end', outcome: 'victory', kind: 'trainer', damageTaken: 4, manualSwaps: 0, faints: 0,
  defeated: ['pidgey'], enemies: ['pidgey'], activeSpecies: ['squirtle'], leadTurns: { squirtle: 3 },
  tally: { crits: 0, reshuffles: 0, statusesApplied: [], statusesTaken: 0, statusesCured: 0, riderFizzles: 0, maxApMove: 2, peakHandAtTurnEnd: 5, catchFails: 0, koBy: { squirtle: 1 }, faintsOf: {}, damageBy: { squirtle: 12 } },
  leadHpFraction: 0.8,
});

test.describe('The Trainer Hub — §8.4', () => {
  test('a fresh account opens on the lobby as a Newcomer, and the nurse keeps the Trainer Card', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-hub').click();
    await expect(page.getByTestId('hub-screen')).toBeVisible();
    await expect(page.getByTestId('hub-level')).toHaveAttribute('data-level', '1');
    await expect(page.getByTestId('hub-lobby')).toBeVisible();
    await openKiosk(page, 'card');
    await expect(page.getByTestId('trainer-card')).toBeVisible();
    await expect(page.getByTestId('level-ring-caption').first()).toHaveAttribute('data-span', '300');
    await expect(page.getByTestId('card-rank')).toHaveText('Newcomer');
    // §8.15 — four stars, none earned; §8.14 — twelve places in the Badge Case, none won.
    await expect(page.locator('[data-testid^="star-"][data-got="false"]')).toHaveCount(4);
    await expect(page.locator('[data-testid^="case-"][data-won="false"]')).toHaveCount(12);

    // §8.3.5 — the whole road is there: eight stops, Rookie is next and is the one explained, nothing reached.
    await expect(page.locator('li[data-testid^="track-"]')).toHaveCount(8);
    await expect(page.getByTestId('track-2')).toHaveAttribute('data-state', 'next');
    await expect(page.getByTestId('track-detail')).toContainText('Rookie');
    await expect(page.getByTestId('track-detail')).toContainText("Professor Oak's aide");
    await expect(page.getByTestId('track-detail')).toContainText('+5');

    // §8.4.6 — the first day's lobby: the nurse (the Trainer Card), the PC, the Item Guide, the door to a run, the
    // doormat out. The aide, the Mart's clerk and the Kit table are not there yet.
    await page.getByTestId('btn-hub-lobby').click();
    for (const id of ['card', 'pc', 'guide', 'run']) await expect(page.getByTestId(`kiosk-${id}`)).toBeVisible();
    for (const id of ['aide', 'mart', 'kit']) await expect(page.getByTestId(`kiosk-${id}`)).toHaveCount(0);
    await expect(page.getByTestId('hub-exit')).toBeVisible();
    await page.screenshot({ path: 'playtest/hub-lobby.png' });

    // §5.13 / §8.9 — the PC Terminal opens on the Pokédex: number, silhouette, name, the line's pips; every
    // species listed, none met, no line played.
    await openKiosk(page, 'pc');
    await expect(page.getByTestId('dex-legend')).toContainText('0 of 155 met');
    await expect(page.getByTestId('dex-legend')).toContainText('0 of 79 lines played');
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-met', 'false');
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-rank', '0');
    await expect(page.getByTestId('dex-pidgey')).toContainText('#016');
    await expect(page.getByTestId('dex-pidgey')).not.toContainText('KO');
    // §8.9.2 — not met: a silhouette and ???, no name and no types, and its sheet keeps its kit to itself.
    await expect(page.getByTestId('dex-pidgey')).toContainText('???');
    await expect(page.getByTestId('dex-pidgey')).not.toContainText('Pidgey');
    await expect(page.getByTestId('dex-pidgey').locator('img[alt]').first()).toHaveAttribute('alt', '???');
    // §6.8 — the line is the sheet's third tab: its stages, the ladder, how Bond grows. §8.9.2 — nothing of the
    // line is met yet, so the ladder says what each rank opens without naming the line's own moves.
    await page.getByTestId('dex-squirtle').click();
    await page.getByTestId('dex-sheet-tab-line').click();
    await expect(page.getByTestId('line-sheet')).toHaveAttribute('data-line', 'squirtle');
    await expect(page.getByTestId('line-sheet-ladder')).toContainText('Shiny Charm');
    await expect(page.locator('[data-testid="line-sheet-ladder"] li')).toHaveCount(6);
    // §6.8.5 — and the four Ribbons, none pinned.
    await expect(page.locator('[data-testid="line-sheet-ribbons"] li[data-on="false"]')).toHaveCount(4);
    await expect(page.getByTestId('line-sheet-ladder')).not.toContainText('Aqua Tail');
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
    // §8.9.2 — its sheet keeps everything to itself: no record, no Familiar count (it would give the rarity
    // away), a locked kit, and a line tab without names or evolution levels.
    await page.getByTestId('dex-pidgey').click();
    await expect(page.getByTestId('dex-sheet')).toHaveAttribute('data-met', 'false');
    await expect(page.getByTestId('dex-sheet-record-empty')).toBeVisible();
    await expect(page.getByTestId('dex-sheet-knowledge')).toContainText('Knock it out to start toward Familiar');
    // §8.9.2 — an unmet species keeps its kit to itself; its line's stages are still doors, as silhouettes.
    await page.getByTestId('dex-sheet-tab-kit').click();
    await expect(page.getByTestId('dex-sheet-kit-locked')).toBeVisible();
    await expect(page.getByTestId('dex-sheet')).not.toContainText('Gust');
    await page.getByTestId('dex-sheet-tab-line').click();
    await expect(page.getByTestId('line-sheet')).not.toContainText('Lv 12');
    await expect(page.getByTestId('line-sheet')).toContainText('Hidden ability, assignable at the Dojo');
    await page.getByTestId('line-stage-pidgeotto').click();
    await expect(page.getByTestId('dex-sheet')).toHaveAttribute('data-species', 'pidgeotto');
    await page.screenshot({ path: 'playtest/hub-pokedex-sheet.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('pc-sheet')).toHaveCount(0);

    // §8.15 — the Hall of Fame is the PC's second tab, and empty.
    await page.getByTestId('pc-tab-hall').click();
    await expect(page.getByTestId('hall-empty')).toBeVisible();
    await page.getByTestId('pc-tab-dex').click();

    await openKiosk(page, 'card');
    // The road staggers its stops in over ~0.6 s; the screenshot is of the finished picture.
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'playtest/hub.png' });
  });

  test('the Item Guide on the lobby table opens every item, whole — §8.4, v0.9.9', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-hub').click();
    await openKiosk(page, 'guide');
    const guide = page.getByTestId('item-guide');
    // Relics first; the first one is open beside the list.
    await expect(guide.locator('[data-testid^="guide-item-"]').first()).toBeVisible();
    await expect(page.getByTestId('guide-detail')).toBeVisible();
    // Items: the Master Ball, never sold, and where it turns up.
    await page.getByTestId('guide-tab-consumable').click();
    await page.getByTestId('guide-search').fill('master');
    await page.getByTestId('guide-item-master-ball').click();
    const detail = page.getByTestId('guide-detail');
    await expect(detail).toHaveAttribute('data-item', 'master-ball');
    await expect(detail).toContainText('Never sold');
    await expect(detail).toContainText('Regions 2, 3');
    await page.screenshot({ path: 'playtest/hub-item-guide.png' });
    // Held items, Evolution Items and TMs are there too.
    for (const k of ['held-item', 'stone', 'tm']) {
      await page.getByTestId(`guide-tab-${k}`).click();
      await page.getByTestId('guide-search').fill('');
      await expect(guide.locator('[data-testid^="guide-item-"]').first()).toBeVisible();
    }
    await page.getByTestId('guide-tab-relic').click();
    await page.screenshot({ path: 'playtest/hub-item-guide-relics.png' });
  });

  test('the Pokédex shows every evolution path and the kit each one leaves — §6.3, v0.9.9', async ({ page }) => {
    await menu(page);
    await page.evaluate(() => window.__ascendant!.meta.meet('mankey', 'primeape'));
    await page.getByTestId('btn-hub').click();
    await openKiosk(page, 'pc');
    // An evolved form's Kit tab: its own learnset once (v0.9.11), then one row per path with what that path leaves it.
    await page.getByTestId('dex-primeape').click();
    await page.getByTestId('dex-sheet-tab-kit').click();
    const paths = page.getByTestId('dex-sheet-kit-paths');
    await expect(paths.locator('li')).toHaveCount(2);
    await expect(paths).toContainText('Karate Chop+');
    await expect(paths).not.toContainText('Submission');
    await expect(page.getByTestId('dex-sheet')).toContainText('Submission');
    await expect(page.getByTestId('dex-sheet')).not.toContainText('Low Kick');
    await page.screenshot({ path: 'playtest/hub-pokedex-kit-paths.png' });
    // The line tab carries the paths themselves: what each changes, learns and forgets.
    await page.getByTestId('dex-sheet-tab-line').click();
    const evo = page.getByTestId('line-sheet-evolutions');
    await expect(evo.locator('[data-testid^="dex-branch-"]')).toHaveCount(2);
    await expect(page.getByTestId('dex-branch-primeape-vanguard')).toContainText('Submission');
    await expect(page.getByTestId('dex-branch-primeape-vanguard')).toContainText('Low Kick');
    await page.screenshot({ path: 'playtest/hub-pokedex-evolutions.png' });
  });

  test('fights pay XP, cross ranks, write Field Notes and fill the Pokédex — and it all survives a reload', async ({ page }) => {
    await menu(page);
    // §8.3.2 — 303 clean wins is 1 515 XP plus the Journal's — Trainer, rank 3; §8.7.1 writes Barrier Charm's Field
    // Note on the first no-faint win and Lucky Egg Token's at fifty; §5.13.1 takes Pidgey to Familiar.
    await page.evaluate((w) => {
      window.__ascendant!.meta.record(Array.from({ length: 303 }, () => w) as never[]);
    }, win());
    await page.getByTestId('btn-hub').click();
    await expect(page.getByTestId('hub-level')).toHaveAttribute('data-level', '3');
    await openKiosk(page, 'card');
    await expect(page.getByTestId('track-3')).toHaveAttribute('data-state', 'claimed');
    await expect(page.getByTestId('track-4')).toHaveAttribute('data-state', 'next');

    // §6.8 — 303 wins leading with Squirtle is 606 Bond: all six pips on every card of the line, "By Bond" puts
    // the line first, and every rung is lit on the sheet.
    await openKiosk(page, 'pc');
    await expect(page.getByTestId('dex-squirtle')).toHaveAttribute('data-rank', '6');
    await expect(page.getByTestId('dex-blastoise')).toHaveAttribute('data-rank', '6');
    await expect(page.getByTestId('dex-legend')).toContainText('1 of 79 lines played');
    await page.getByTestId('dex-order-bond').click();
    await expect(page.locator('[data-testid="dex-grid"] li').first()).toContainText('Squirtle');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'playtest/hub-pokedex-by-bond.png' });
    await page.getByTestId('dex-squirtle').click();
    await page.getByTestId('dex-sheet-tab-line').click();
    await expect(page.getByTestId('line-sheet')).toHaveAttribute('data-rank', '6');
    // Squirtle was a starter already: its Soulbound strikes the run and promises the palette.
    await expect(page.getByTestId('line-sheet')).toContainText('Always shiny');
    await expect(page.getByTestId('rung-struck')).toContainText('The line can start a run');
    await expect(page.getByTestId('line-sheet-ladder')).toContainText('Your starter will always be shiny');
    await expect(page.locator('[data-testid="line-sheet-ladder"] li[data-on="true"]')).toHaveCount(6);
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
    await page.screenshot({ path: 'playtest/hub-pc.png' });

    // §8.7 — the Journal is kept by Professor Oak's aide, who arrived at Rookie: the medal is done, both Field
    // Notes are written, and Barrier Charm has left the vault.
    await openKiosk(page, 'aide');
    await page.getByTestId('aide-tab-journal').click();
    await expect(page.getByTestId('achievement-first-blood')).toHaveAttribute('data-done', 'true');
    await expect(page.getByTestId('note-barrier-charm')).toHaveAttribute('data-done', 'true');
    await expect(page.getByTestId('note-lucky-egg-token')).toHaveAttribute('data-done', 'true');
    expect(await page.evaluate(() => window.__ascendant!.meta.account().unlocks)).toEqual(expect.arrayContaining(['relic:barrier-charm', 'relic:lucky-egg-token']));
    // §8.7.2 — an open entry can be pinned, three at most, and the pin is kept.
    await page.getByTestId('pin-champion').click();
    await expect(page.getByTestId('achievement-champion')).toHaveAttribute('data-pinned', 'true');
    await page.screenshot({ path: 'playtest/hub-journal.png' });

    // A reload is the real test: the account lives in its own key, beside the run save and not inside it.
    await page.reload();
    await page.goto('/?screen=hub');
    await expect(page.getByTestId('hub-level')).toHaveAttribute('data-level', '3');
    await openKiosk(page, 'pc');
    await expect(page.getByTestId('dex-squirtle')).toHaveAttribute('data-rank', '6');
    await expect(page.getByTestId('dex-pidgey')).toHaveAttribute('data-tier', '1');
    await page.getByTestId('dex-squirtle').click();
    await expect(page.getByTestId('dex-stat-kos')).toContainText('303');
    expect(await page.evaluate(() => window.__ascendant!.meta.account().pins)).toEqual(['champion']);
  });

  test('the Poké Mart arrives at Trainer, opens the Kit shelf at Challenger, and sells for Tokens', async ({ page }) => {
    await menu(page);
    // §8.4.6 — no clerk before Trainer: the counter is furniture.
    await page.goto('/?screen=hub');
    await expect(page.getByTestId('kiosk-mart')).toHaveCount(0);
    await page.evaluate(() => window.__ascendant!.meta.rank(3));
    await page.goto('/?screen=hub');
    await openKiosk(page, 'mart');
    // Trainer: Starters, Services and the Corner are open; the Kit shelf is a tab that says its rank, and a closed
    // shelf is still readable — priced, with a banner that says what opens it.
    for (const shelf of ['starters', 'hub', 'corner']) await expect(page.getByTestId(`mart-tab-${shelf}`)).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('mart-tab-kit')).toHaveAttribute('data-open', 'false');
    await expect(page.getByTestId('mart-tab-kit')).toContainText('Rank 4');
    await page.getByTestId('mart-tab-kit').click();
    await expect(page.getByTestId('mart-banner')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('mart-banner')).toContainText('opens at Challenger');
    await expect(page.getByTestId('mart-moms-allowance')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('mart-price-moms-allowance')).toHaveAttribute('aria-label', /Opens at rank 4/);
    // §8.9.3 — a perk Oak's aide hands over is not on the shelf at all.
    await expect(page.getByTestId('mart-exp-share')).toHaveCount(0);
    await page.screenshot({ path: 'playtest/hub-mart-locked.png' });
    // §8.9.2 — a starter never met is the Pokédex's silhouette on the shelf too: no name, no blurb.
    await page.getByTestId('mart-tab-starters').click();
    await expect(page.getByTestId('mart-magikarp')).toContainText('???');
    await expect(page.getByTestId('mart-magikarp')).not.toContainText('Magikarp');
    await page.screenshot({ path: 'playtest/hub-mart-starters-unmet.png' });

    // §8.4.4 — twenty Tokens buy two titles and an avatar at the Corner; the Trainer Card wears each the moment
    // it is bought, and the first title is a Wear button away. A Journal trophy is not on the shelf.
    await page.evaluate(() => window.__ascendant!.meta.tokens(20));
    await page.goto('/?screen=hub');
    await openKiosk(page, 'mart');
    await expect(page.getByTestId('hub-tokens')).toHaveAttribute('data-tokens', '20');
    // B28 — one wallet: the header's. The Mart repeats no balance of its own beside the shelf.
    await expect(page.getByTestId('hub-tokens')).toHaveCount(1);
    await expect(page.getByTestId('poke-mart').getByText('You have', { exact: true })).toHaveCount(0);
    await page.getByTestId('mart-tab-corner').click();
    await expect(page.getByTestId('mart-title-veteran')).toHaveCount(0);
    await expect(page.getByTestId('mart-title-ace-trainer')).toHaveAttribute('data-state', 'buyable');
    await page.getByTestId('mart-price-title-ace-trainer').click();
    await expect(page.getByTestId('mart-notice')).toContainText('Ace Trainer is yours');
    await expect(page.getByTestId('mart-title-ace-trainer')).toHaveAttribute('data-state', 'owned');
    await expect(page.getByTestId('mart-title-ace-trainer')).toContainText('Wearing');
    await page.getByTestId('mart-price-avatar-gambler').click();
    await page.getByTestId('mart-price-title-collector').click();
    await expect(page.getByTestId('hub-tokens')).toHaveAttribute('data-tokens', '0');
    await expect(page.getByTestId('mart-title-collector')).toContainText('Wearing');
    await expect(page.getByTestId('mart-wear-title-ace-trainer')).toBeVisible();
    await page.screenshot({ path: 'playtest/hub-mart-corner.png' });
    await page.getByTestId('mart-wear-title-ace-trainer').click();
    await expect(page.getByTestId('mart-title-ace-trainer')).toContainText('Wearing');
    await openKiosk(page, 'card');
    await expect(page.getByTestId('card-title')).toHaveText('Ace Trainer');
    await expect(page.getByTestId('card-avatar')).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'playtest/hub-card-worn.png' });

    // §8.3.4 — Ace with Tokens in hand: the Mart opens on the newest shelf (the Trainer Kit), a perk bought there
    // is packed at the Kit table, and the Starters shelf sells Eevee for thirty-five.
    await page.evaluate(() => {
      window.__ascendant!.meta.rank(5);
      window.__ascendant!.meta.tokens(60);
    });
    await page.goto('/?screen=hub');
    await openKiosk(page, 'mart');
    await expect(page.getByTestId('mart-tab-kit')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('mart-banner')).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId('mart-moms-allowance')).toHaveAttribute('data-state', 'buyable');
    await page.getByTestId('mart-price-moms-allowance').click();
    await expect(page.getByTestId('mart-notice')).toContainText('Pack it at the Trainer Kit desk');
    await expect(page.getByTestId('hub-tokens')).toHaveAttribute('data-tokens', '40');
    await page.screenshot({ path: 'playtest/hub-mart.png' });
    await page.getByTestId('mart-tab-starters').click();
    await expect(page.getByTestId('mart-eevee')).toHaveAttribute('data-state', 'buyable');
    await page.getByTestId('mart-price-eevee').click();
    await expect(page.getByTestId('mart-notice')).toContainText('Eevee can start your next run');
    await expect(page.getByTestId('hub-tokens')).toHaveAttribute('data-tokens', '5');
    // Magikarp at twenty-five is now unaffordable, and the shelf says so without hiding it; so is Pikachu.
    await expect(page.getByTestId('mart-price-magikarp')).toHaveAttribute('aria-label', /Not enough Tokens/);
    await expect(page.getByTestId('mart-magikarp')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('mart-price-pikachu')).toHaveAttribute('aria-label', /Not enough Tokens/);
    await page.screenshot({ path: 'playtest/hub-mart-starters.png' });

    // §8.4.5 — the Kit table: two slots at Ace, the third still shut; the perk packs with a click, and the new-run
    // screen names it.
    await openKiosk(page, 'kit');
    await expect(page.getByTestId('trainer-kit')).toHaveAttribute('data-slots', '2');
    await expect(page.getByTestId('kit-slot-3')).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('kit-perk-moms-allowance')).toHaveAttribute('data-state', 'ready');
    await page.getByTestId('kit-perk-moms-allowance').click();
    // A packed perk is in its slot and nowhere else; the slot is the button that takes it out again.
    await expect(page.getByTestId('kit-slot-1')).toHaveAttribute('data-state', 'packed');
    await expect(page.getByTestId('kit-slot-1')).toContainText("Mom's Allowance");
    await expect(page.getByTestId('kit-perk-moms-allowance')).toHaveCount(0);
    await page.getByTestId('kit-unpack-moms-allowance').click();
    await expect(page.getByTestId('kit-slot-1')).toHaveAttribute('data-state', 'empty');
    await page.getByTestId('kit-perk-moms-allowance').click();
    await expect(page.getByTestId('kit-perk-exp-share')).toHaveAttribute('data-state', 'missing');
    await page.screenshot({ path: 'playtest/hub-kit.png' });

    // §8.4.1 — and the door to the Elite Four is the way into a run, where the starters wait.
    await page.getByTestId('btn-hub-lobby').click();
    await page.getByTestId('kiosk-run').click();
    await expect(page.getByTestId('starter-select')).toBeVisible();
    await expect(page.getByTestId('run-kit')).toContainText("Mom's Allowance");
  });

  test("Oak's Parcels open the vault a card at a time — §8.6.2", async ({ page }) => {
    await menu(page);
    await page.evaluate(() => {
      window.__ascendant!.meta.rank(2);
      window.__ascendant!.meta.parcels(2);
    });
    await page.goto('/?screen=hub');
    // The aide's plate counts the parcels waiting.
    await expect(page.getByTestId('kiosk-aide')).toContainText('2');
    await openKiosk(page, 'aide');
    await expect(page.getByTestId('parcel-offer')).toHaveAttribute('data-waiting', '2');
    const cards = page.locator('[data-testid^="parcel-card-"]');
    await expect(cards).toHaveCount(3);
    await expect(page.getByTestId('vault-count')).toContainText('0 / 55');
    await page.screenshot({ path: 'playtest/hub-parcel.png' });
    const taken = (await cards.first().getAttribute('data-testid'))!.replace('parcel-card-', '');
    await cards.first().click();
    await expect(page.getByTestId('parcel-notice')).toContainText('can now turn up in a run');
    await expect(page.getByTestId('vault-count')).toContainText('1 / 55');
    expect(await page.evaluate(() => window.__ascendant!.meta.account().unlocks)).toEqual([taken]);
    // The card just taken has the screen until the player asks for the next parcel: a new offer, without it.
    await expect(page.getByTestId('parcel-offer')).toHaveCount(0);
    await page.getByTestId('btn-next-parcel').click();
    await expect(page.getByTestId('parcel-offer')).toHaveAttribute('data-waiting', '1');
    await expect(page.getByTestId(`parcel-card-${taken}`)).toHaveCount(0);
    await cards.first().click();
    await expect(page.getByTestId('btn-next-parcel')).toHaveCount(0);
    await expect(page.getByTestId('parcel-empty')).toBeVisible();
    // §8.6.2 — and the run's pool grew by exactly those two: what is still locked never turns up.
    const locked = await page.evaluate(() => {
      const a = window.__ascendant!;
      a.run.new('bulbasaur', 7, { vault: true });
      return a.run.state()!.perks.locked!.length;
    });
    expect(locked).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.perks.locked!.includes(window.__ascendant!.meta.account().unlocks[0]!))).toBe(false);
  });
});

test.describe('The Field Report — §8.3.6', () => {
  test('a lost run is paid on the screen: the tally, a parcel, the rank, and the ₽ as Tokens', async ({ page }) => {
    await menu(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate((w) => {
      const A = window.__ascendant!;
      A.run.new('squirtle', 7);
      A.meta.record([...Array.from({ length: 6 }, () => w), { t: 'badge-awarded', badgeId: 'cascade-badge', activeSpecies: ['squirtle'] }, { t: 'run-end', won: false, catches: 0, badges: 1, layersCleared: 4, moneyLeft: 540, activeSpecies: ['squirtle'] }] as never[]);
      A.run.patch((d) => {
        d.box.forEach((m) => { m.hp = 0; });
        d.phase = 'ended';
        d.outcome = 'defeat';
      });
      A.goTo('defeat');
    }, win());
    const report = page.getByTestId('field-report');
    await expect(report).toBeVisible();
    // The six panels are all on the screen at rest.
    for (const id of ['tally', 'research', 'rank', 'bond', 'earned', 'next']) await expect(page.getByTestId(`report-${id}`)).toBeVisible();
    await expect(page.getByTestId('report-tally')).toContainText('Fights won');
    await expect(page.getByTestId('report-tally')).toContainText('Distance covered');
    // §8.3.4 — the Tokens are one figure, and its bubble is the sum: 540 ₽ is five of them.
    await page.getByTestId('report-tokens').hover();
    await expect(page.getByTestId('tooltip')).toContainText('5 from the 540 ₽');
    await page.mouse.move(0, 0);
    // §8.3.3 — the run crossed Rookie, and the panel says who that brings.
    await expect(page.getByTestId('report-rank-up')).toContainText('Rookie');
    await expect(page.getByTestId('report-prize-rank2')).toHaveAttribute('aria-label', /Professor Oak's aide/);
    // §8.14 — the Leader's first Badge is on the wall and their TM is in the world: a tile each, named.
    await expect(page.getByTestId('report-prize-badgecascade-badge')).toHaveAttribute('aria-label', /Cascade Badge/);
    await expect(page.locator('[data-testid^="report-prize-open"][aria-label*="Surf"]')).toHaveCount(1);
    // Nothing on the report scrolls: every panel ends inside the screen.
    expect(await report.evaluate((el) => [...el.querySelectorAll('[data-testid^="report-"]')].every((p) => p.getBoundingClientRect().bottom <= window.innerHeight && p.scrollHeight <= p.clientHeight + 1))).toBe(true);
    // §6.8 — Squirtle's row: the Bond it earned and the rank it crossed.
    await expect(page.getByTestId('report-bond-squirtle')).toHaveAttribute('data-crossed', 'true');
    // §8.7.2 — what to chase next: three entries.
    await expect(page.locator('[data-testid^="report-goal-"]')).toHaveCount(3);
    await page.screenshot({ path: 'playtest/run-end-report.png' });

    // §8.6.2 — the parcel is opened here, without a trip to the Hub.
    await expect(page.getByTestId('report-parcels')).toBeVisible();
    await page.getByTestId('btn-open-parcel').click();
    await expect(page.getByTestId('parcel-sheet')).toBeVisible();
    await page.locator('[data-testid^="parcel-card-"]').first().click();
    await expect(page.getByTestId('parcel-notice')).toContainText('can now turn up in a run');
    await page.screenshot({ path: 'playtest/run-end-parcel.png' });
    await page.getByTestId('btn-parcel-later').click();
    await expect(page.getByTestId('parcel-sheet')).toHaveCount(0);
    // The run's own numbers are still one door away.
    await page.getByTestId('btn-run-record').click();
    await expect(page.getByTestId('run-record')).toBeVisible();
  });
});

test.describe('The Field Report in motion — §8.3.6', () => {
  test('Skip lands every panel at once, and leaves when there is nothing left to skip', async ({ page }) => {
    await menu(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      const A = window.__ascendant!;
      A.run.new('squirtle', 7);
      A.run.patch((d) => {
        d.box.forEach((m) => { m.hp = 0; });
        d.phase = 'ended';
        d.outcome = 'defeat';
      });
      A.goTo('defeat');
    });
    const report = page.getByTestId('field-report');
    await expect(report).toHaveAttribute('data-fast', 'false');
    await page.getByTestId('btn-report-skip').click();
    await expect(report).toHaveAttribute('data-fast', 'true');
    await expect(page.getByTestId('btn-report-skip')).toHaveCount(0);
    for (const id of ['tally', 'research', 'rank', 'bond', 'earned', 'next']) await expect(page.getByTestId(`report-${id}`)).toBeVisible();
  });
});

test.describe('The League Ladder — §8.8.5', () => {
  test('the first Champion opens rung one: a card of its own, picked whole, its stack in the bubble', async ({ page }) => {
    await menu(page);
    await page.goto('/?screen=starter');
    await expect(page.getByTestId('step-difficulty')).toBeVisible();
    await expect(page.getByTestId('difficulty-ladder')).toHaveCount(0);
    await page.evaluate(() => window.__ascendant!.meta.patch((d) => { d.stats.wins = 1; }));
    const card = page.getByTestId('difficulty-ladder');
    await expect(card).toHaveAttribute('data-rung', '1');
    await card.hover();
    await expect(page.getByTestId('tooltip')).toContainText('Win it to open the next rung');
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('The lobby — §8.4', () => {
  test('a door opens its kiosk with the keyboard, Escape closes it, and focus comes back to the door', async ({ page }) => {
    await menu(page);
    await page.getByTestId('btn-hub').click();
    await page.getByTestId('kiosk-card').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('hub-panel-card')).toBeVisible();
    await expect(page.getByTestId('btn-hub-lobby')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('hub-lobby')).toBeVisible();
    await expect(page.getByTestId('kiosk-card')).toBeFocused();
    await page.screenshot({ path: 'playtest/hub-lobby-focus.png' });
  });
});

test.describe('The lobby fills — §8.4.6', () => {
  test('a Leader you have beaten stands in the room, and says which Badge it was', async ({ page }) => {
    await menu(page);
    await page.evaluate(() => window.__ascendant!.meta.patch((d) => { d.badges = ['cascade-badge']; }));
    await page.goto('/?screen=hub');
    const misty = page.getByTestId('hub-lobby').getByRole('img', { name: 'Leader Misty' });
    await expect(misty).toBeVisible();
    await misty.hover();
    await expect(page.getByTestId('tooltip')).toContainText('Cascade Badge');
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

  test('both switches collapse the motion tokens, and Full brings them back — §9.6, D11', async ({ page }) => {
    const base = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--motion-base').trim());
    await menu(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?screen=settings');
    expect(await base()).toBe('220ms');
    await page.getByTestId('motion-reduced').click();
    expect(await base(), 'Settings → Reduced stops token-timed transitions').toBe('0ms');
    await page.getByTestId('motion-full').click();
    expect(await base()).toBe('220ms');

    // The system asks for less: System obeys it, Full overrides it.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByTestId('motion-system').click();
    expect(await base()).toBe('0ms');
    await page.getByTestId('motion-full').click();
    expect(await base(), 'Settings → Full wins over the system preference').toBe('220ms');
    // Loops too: the blanket cap that plays a loop once must not reach a page under Full.
    const loops = () => page.evaluate(() => {
      const el = document.createElement('div');
      el.style.animation = 'none 1s infinite';
      document.body.append(el);
      const count = getComputedStyle(el).animationIterationCount;
      el.remove();
      return count;
    });
    expect(await loops(), 'Settings → Full keeps a loop looping').toBe('infinite');
    await page.getByTestId('motion-system').click();
    expect(await loops(), 'the system preference caps a loop at one play').toBe('1');
  });
});

test('an account from before the rework starts again, and the settings it carried stay — §8.10', async ({ page }) => {
  // §8.10 — account v4 is a reset (v0.9.110, the user's call): the vault changes what a first run holds, so an
  // older account — and the medal case that predates accounts — starts again as a Newcomer. §10.8 — the settings
  // key, renamed on 2026-09-20, is still carried.
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ascendant.account.v1', JSON.stringify({ account: { version: 3, xp: 12_000, tokens: 40, hub: ['twin-run'], relics: ['barrier-charm'] } }));
    localStorage.setItem('evoline.achievements.v1', JSON.stringify({ counts: { 'first-blood': 1 }, species: ['pidgey'], winStreak: 2, unlocked: ['first-blood'] }));
    localStorage.setItem('evoline.settings.v1', JSON.stringify({ textScale: 1.25, motion: 'reduced' }));
  });
  await page.goto('/?screen=hub');
  await expect(page.getByTestId('hub-level')).toHaveAttribute('data-level', '1');
  await expect(page.getByTestId('hub-tokens')).toHaveAttribute('data-tokens', '0');
  const keys = await page.evaluate(() => ({
    account: JSON.parse(localStorage.getItem('ascendant.account.v1')!).account,
    ach: localStorage.getItem('ascendant.achievements.v1'),
    oldAch: localStorage.getItem('evoline.achievements.v1'),
    newSet: localStorage.getItem('ascendant.settings.v1'),
  }));
  expect(keys.account.version).toBe(4);
  expect(keys.account.xp).toBe(0);
  expect(keys.account.hub).toEqual([]);
  expect(keys.account.salt).toBeGreaterThan(0);
  expect(keys.ach, 'the medal case goes with the reset').toBeNull();
  expect(keys.oldAch, 'the pre-rename key should be cleared once it is carried').toBeNull();
  expect(keys.newSet).toContain('1.25');

  // And the setting it carried is actually in force, not merely stored.
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
});

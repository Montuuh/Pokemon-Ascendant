import { expect, test, type Page } from '@playwright/test';

// §5.8.3 / §9.2.2.3 — a boss's phases read from the sim: the active chip does not advance when the bar crosses a notch;
// a dashed "→ N next turn" says what is coming; the next turn enters it with one banner; a Phase-3 ace then declares
// its signature on an ordinary intent card marked Signature, with its answer in the bubble.

/** Nothing spills: a chip on the HP row sits inside the enemy's card, whatever the text size. */
async function expectInsideCard(page: Page, testId: string) {
  const inside = await page.getByTestId(testId).evaluate((el) => {
    const c = el.closest('button')!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return r.right <= c.right + 1 && r.left >= c.left - 1;
  });
  expect(inside, `${testId} inside the card`).toBe(true);
}

async function hitFoeTo(page: Page, fraction: number) {
  await page.evaluate((f) => {
    const a = window.__ascendant!;
    const foe = a.state()!.enemies[0]!;
    // Just above the target, then a real hit carries it across: the latch runs on a hit, as in a fight.
    a.setHp(foe.uid, Math.ceil(foe.maxHp * f) + 3);
    a.hand(['water-gun']);
    a.dispatch({ type: 'play-card', cardId: 'dbg-0-water-gun', targetUid: foe.uid });
  }, fraction);
}

for (const size of [
  { name: '1080', width: 1920, height: 1080, scale: 1 },
  { name: '720-150', width: 1280, height: 720, scale: 1.5 },
]) {
  test(`BossPhases_PendingThenCommit_ThenSignature_${size.name} — §9.2.2.3`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?scenario=ace-phases&seed=7');
    await page.waitForFunction(() => !!window.__ascendant?.state());
    await page.evaluate((scale) => document.documentElement.style.setProperty('--text-scale', String(scale)), size.scale);

    const chip = page.getByTestId('phase-chip');
    await expect(chip).toHaveText('Phase 1/3');
    await expect(page.getByTestId('phase-pending')).toHaveCount(0);

    // Crossing 50 %: the chip stays at 1; the pending cue says 2 is next turn.
    await hitFoeTo(page, 0.5);
    await expect(chip).toHaveAttribute('data-phase', '1');
    await expect(chip).toHaveText('1/3 → 2');
    await expect(chip).toHaveAttribute('aria-label', 'Phase 1 of 3; Phase 2 next turn');
    await expectInsideCard(page, 'phase-chip');
    await chip.focus();
    await expect(page.getByText('Phase 2 next turn.')).toBeVisible();
    await page.screenshot({ path: `playtest/boss-phase-pending-${size.name}.png` });
    await chip.blur();

    // The next turn's start enters it.
    await page.evaluate(() => window.__ascendant!.dispatch({ type: 'end-turn' }));
    await expect(chip).toHaveText('Phase 2/3');
    await expect(page.getByTestId('phase-pending')).toHaveCount(0);

    // Crossing 20 %, then the turn: Phase 3, and the signature declared on the intent, never hidden.
    await hitFoeTo(page, 0.2);
    await expect(page.getByTestId('phase-pending')).toHaveText('→ 3');
    await page.evaluate(() => window.__ascendant!.dispatch({ type: 'end-turn' }));
    await expect(chip).toHaveText('Phase 3/3');
    const sig = page.getByTestId('intent-signature');
    await expect(sig).toHaveText('Signature');
    await expect(page.getByTestId('intent-chip')).toContainText('Rock Slide');
    await page.getByTestId('intent-chip').focus();
    await expect(page.getByText(/^Answer: Rock-resistant Lead/)).toBeVisible();
    await page.screenshot({ path: `playtest/boss-phase-signature-${size.name}.png` });

    await expectInsideCard(page, 'phase-chip');
  });
}

test('BossPhases_SignatureWaiting_SaysWhyAndIsNotAnAction — §9.2.2.3', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?scenario=ace-phases&seed=7');
  await page.waitForFunction(() => !!window.__ascendant?.state());
  await hitFoeTo(page, 0.2);
  // Asleep before the turn the signature opens: it waits, and says so.
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.hand(['sleep-powder']);
    a.dispatch({ type: 'play-card', cardId: 'dbg-0-sleep-powder', targetUid: a.state()!.enemies[0]!.uid });
    a.dispatch({ type: 'end-turn' });
  });
  const asleep = await page.evaluate(() => window.__ascendant!.state()!.enemies[0]!.status?.kind === 'sleep');
  test.skip(!asleep, 'Sleep Powder missed on this seed');
  // The intent chip above already says it is asleep: the waiting chip keeps the reason in its label and bubble.
  await expect(page.getByTestId('signature-waiting')).toHaveText('Signature waiting');
  await expect(page.getByTestId('signature-waiting')).toHaveAttribute('aria-label', 'Signature waiting — Asleep');
  await expect(page.getByTestId('intent-signature')).toHaveCount(0);
  await page.screenshot({ path: 'playtest/boss-phase-waiting.png' });
});

test('BossPhases_ChipWaitsForTheBanner_WithMotion — §9.2.2.3', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?scenario=ace-phases&seed=7');
  await page.waitForFunction(() => !!window.__ascendant?.state());
  await hitFoeTo(page, 0.5);
  await page.evaluate(() => window.__ascendant!.dispatch({ type: 'end-turn' }));
  // The sim has entered Phase 2; the screen keeps saying 1 (with 2 pending) until the banner names the change.
  expect(await page.evaluate(() => window.__ascendant!.state()!.enemies[0]!.phase)).toBe(2);
  await expect(page.getByTestId('phase-chip')).toHaveText('1/3 → 2');
  // Its Entrenchment (+2 Defence) is what the banner announces: it waits with the chip.
  await expect(page.getByText('Def +2')).toHaveCount(0);
  await expect(page.getByText(/Golem · Phase 2/)).toBeVisible({ timeout: 6000 });
  await expect(page.getByText('Def +2').first()).toBeVisible();
  await expect(page.getByTestId('phase-chip')).toHaveText('Phase 2/3');
});

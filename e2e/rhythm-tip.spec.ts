import { expect, test } from '@playwright/test';

// §4.1.3.1 — the critical rhythm's hover: the Speed its pace reads, what is moving that Speed now (a stage, Paralysis) and how long a full
// ring takes at that pace.

test.describe('The rhythm dial hover — §4.1.3.1', () => {
  test('an ally and a foe each get the Speed their pace reads and how long a full ring takes', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=7');
    const dials = page.getByTestId('rhythm-dial');
    await expect(dials.first()).toBeVisible();
    const n = await dials.count();
    expect(n).toBeGreaterThan(1);
    for (const i of [0, n - 1]) {
      await dials.nth(i).hover();
      const pace = page.getByTestId('rhythm-pace').last();
      await expect(pace).toBeVisible();
      await expect(pace).toContainText('Pace from');
      await expect(page.getByTestId('rhythm-acts').last()).toContainText('A full ring takes');
      if (i === 0) await page.screenshot({ path: 'playtest/rhythm-tip.png' });
      await page.mouse.move(5, 5);
    }
  });

  test('Agility on your Lead and Thunder Wave on the foe show in the hovers and move the acts', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=7');
    await page.waitForFunction(() => !!window.__ascendant?.state());
    const dials = page.getByTestId('rhythm-dial');
    const acts = async (i: number) => {
      await dials.nth(i).hover();
      const text = (await page.getByTestId('rhythm-acts').last().textContent()) ?? '';
      await page.mouse.move(5, 5);
      return Number(/(\d+\.\d)/.exec(text)![1]);
    };
    const n = await dials.count();
    const before = [] as number[];
    for (let i = 0; i < n; i++) before.push(await acts(i));
    await page.evaluate(() => {
      const a = window.__ascendant!;
      a.hand(['agility', 'thunder-wave']);
      const s = a.state()!;
      a.dispatch({ type: 'play-card', cardId: 'dbg-0-agility', targetUid: s.enemies[0]!.uid });
      a.dispatch({ type: 'play-card', cardId: 'dbg-1-thunder-wave', targetUid: s.enemies[0]!.uid });
    });
    const after = [] as number[];
    for (let i = 0; i < n; i++) after.push(await acts(i));
    // +2 Speed is ×1.2 the pace: one of your three (the Lead) needs fewer acts and none needs more. The paralysed foe needs twice as many.
    expect(after.slice(0, -1).some((v, i) => v < before[i]!)).toBe(true);
    expect(after.slice(0, -1).every((v, i) => v <= before[i]!)).toBe(true);
    expect(after.at(-1)!).toBeGreaterThan(before.at(-1)! * 1.9);
    await dials.last().hover();
    await expect(page.getByTestId('rhythm-pace').last().locator('[data-mod="paralysis"]')).toContainText('Paralysed');
    await page.mouse.move(5, 5);
    const lead = after.slice(0, -1).findIndex((v, i) => v < before[i]!);
    await dials.nth(lead).hover();
    await expect(page.getByTestId('rhythm-pace').last().locator('[data-mod="stage"]')).toContainText('Speed +2');
  });
});

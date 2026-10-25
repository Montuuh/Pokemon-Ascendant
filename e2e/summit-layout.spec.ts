import { expect, test, type Page } from '@playwright/test';
import catalogue from '../src/content/data/relics.json' with { type: 'json' };

// §2.12.4 / §9.6 — the Legendary decision survives large text, a full Box and every real offer.
const evidence = process.env.B13_EVIDENCE ?? 'playtest/art-review-2026-10-24/implementation/B13/e2e';
const legendary = catalogue.relics.filter((r) => r.rarity === 'legendary');
const longest = ['grandmasters-tempo', 'living-legend', 'apex-predator'];

async function arrive(page: Page, scale = 1.5) {
  await page.goto('/?screen=menu');
  await page.waitForFunction(() => !!window.__ascendant);
  await page.evaluate((scale) => {
    document.documentElement.style.setProperty('--text-scale', String(scale));
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    a.run.fill(6);
    a.run.victoryRoad();
    a.run.patch((d) => {
      d.perks.boxBonus = 2;
      while (d.box.length < 8) d.box.push({ ...d.box[1]!, uid: `b13-${d.box.length}` });
      d.reachable = [Object.values(d.map.nodes).find((n) => n.kind === 'summit')!.id];
    });
    a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
    a.run.dispatch({ type: 'begin-combat' });
    a.run.patch((d) => { d.pendingSummit!.relics = ['grandmasters-tempo', 'living-legend', 'apex-predator']; });
  }, scale);
  await expect(page.getByTestId('summit-screen')).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="summit-screen"]')!;
    const visible = (el: Element, halo = 0) => {
      const r = el.getBoundingClientRect();
      return r.top - halo >= 0 && r.left - halo >= 0 && r.bottom + halo <= innerHeight && r.right + halo <= innerWidth;
    };
    const cards = [...root.querySelectorAll<HTMLElement>('[data-testid^="summit-offer-"]')];
    const buttons = ['btn-take-summit-relic', 'btn-decline-summit-relic'].map((id) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`)!);
    // Text ranges catch wrapped descriptions or names escaping a card, rather than just its border box.
    const spill = cards.some((card) => {
      const bounds = card.getBoundingClientRect();
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        if ([...range.getClientRects()].some((r) => r.left < bounds.left || r.right > bounds.right || r.top < bounds.top || r.bottom > bounds.bottom)) return true;
      }
      return card.scrollWidth > card.clientWidth + 1;
    });
    const image = root.querySelector<HTMLImageElement>('img[src*="league/summit"]')!;
    return {
      choicesFit: buttons.every((el) => visible(el, 5)),
      cardsFit: cards.every((el) => visible(el, 5)),
      leagueFits: visible(root.querySelector('[data-testid="summit-league"]')!),
      scrollTop: root.scrollTop,
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      horizontalOverflow: root.scrollWidth > root.clientWidth,
      viewportOverflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      spill,
      font: getComputedStyle(buttons[0]!).fontSize,
      artScaleX: image.clientWidth / image.naturalWidth,
      artScaleY: image.clientHeight / image.naturalHeight,
      brokenImages: [...root.querySelectorAll<HTMLImageElement>('img')].filter((i) => !i.complete || !i.naturalWidth).length,
    };
  });
}

async function fits(page: Page, scale: number) {
  const g = await geometry(page);
  expect(g.choicesFit).toBe(true);
  expect(g.cardsFit).toBe(true);
  expect(g.leagueFits).toBe(true);
  expect(g.spill).toBe(false);
  expect(g.horizontalOverflow).toBe(false);
  expect(g.viewportOverflow).toBe(false);
  expect(g.scrollTop).toBe(0);
  expect(g.scrollHeight).toBeLessThanOrEqual(g.clientHeight);
  expect(g.font).toBe(`${17 * scale}px`);
  expect(g.artScaleX).toBe(g.artScaleY);
  expect(g.artScaleX * 2).toBe(Math.round(g.artScaleX * 2));
  expect(g.brokenImages).toBe(0);
}

test.describe('Summit decision layout — §2.12.4 / §9.6', () => {
  for (const [width, height] of [[1920, 1080], [1280, 720]] as const) {
    for (const scale of [1, 1.5]) {
      for (const motion of ['reduce', 'no-preference'] as const) {
        test(`Decision_${height}_${scale}_${motion}_AllRelicsRemainVisibleAndFocusable`, async ({ page }) => {
          await page.setViewportSize({ width, height });
          await page.emulateMedia({ reducedMotion: motion });
          const errors: string[] = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await arrive(page, scale);
          const take = page.getByTestId('btn-take-summit-relic');
          const decline = page.getByTestId('btn-decline-summit-relic');
          await expect(take).toBeDisabled();
          await expect(decline).toBeEnabled();
          await fits(page, scale);
          await page.screenshot({ path: `${evidence}/${height}-${scale}-${motion}-unselected.png` });

          // Tab alone reaches the League explanation, every offer and the available gate action.
          const visited: string[] = [];
          for (let i = 0; i < 16; i++) {
            await page.keyboard.press('Tab');
            const id = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');
            visited.push(id);
            if (id === 'btn-decline-summit-relic') break;
          }
          for (const id of longest) expect(visited).toContain(`summit-offer-${id}`);
          await expect(decline).toBeFocused();
          expect(await decline.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
          await page.keyboard.press('Shift+Tab');
          await expect(page.getByTestId('summit-offer-apex-predator')).toBeFocused();

          for (const relic of legendary) {
            await page.evaluate((id) => {
              const others = ['grandmasters-tempo', 'living-legend', 'apex-predator'].filter((r) => r !== id);
              window.__ascendant!.run.patch((d) => { d.pendingSummit!.relics = [id, ...others.slice(0, 2)]; });
            }, relic.id);
            const card = page.getByTestId(`summit-offer-${relic.id}`);
            await card.focus();
            await page.keyboard.press('Enter');
            await expect(card).toBeFocused();
            await expect(card).toContainText('Selected');
            await expect(take).toBeEnabled();
            await expect(take).toHaveText(`Take ${relic.name} & enter →`);
            await page.mouse.move(0, 0);
            await page.keyboard.press('Escape');
            await expect(page.getByRole('tooltip')).toHaveCount(0);
            await fits(page, scale);
            if (relic.id === 'grandmasters-tempo') await page.screenshot({ path: `${evidence}/${height}-${scale}-${motion}-selected.png` });
            await page.keyboard.press('Space');
            await expect(card).toBeFocused();
            await expect(card).not.toContainText('Selected');
            await expect(take).toBeDisabled();
            await fits(page, scale);
          }

          const card = page.getByTestId(`summit-offer-${legendary.at(-1)!.id}`);
          await card.hover();
          await expect(page.getByRole('tooltip')).toContainText(legendary.at(-1)!.description);
          await card.click();
          await page.mouse.move(0, 0);
          await page.keyboard.press('Escape');
          await expect(card).toContainText('Selected');
          await take.focus();
          await page.keyboard.press('Shift+Tab');
          await expect(page.locator('[data-testid^="summit-offer-"]').last()).toBeFocused();
          await take.focus();
          await page.screenshot({ path: `${evidence}/${height}-${scale}-${motion}-confirm-focus.png` });
          await page.keyboard.press('Tab');
          await expect(decline).toBeFocused();
          await page.screenshot({ path: `${evidence}/${height}-${scale}-${motion}-decline-focus.png` });
          expect(errors).toEqual([]);
        });
      }
    }
  }

  test('Gate_KeyboardConfirmAndPointerDecline_KeepOneWayChoice', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await arrive(page);
    const before = await page.evaluate(() => window.__ascendant!.run.state()!.relics);
    const card = page.getByTestId('summit-offer-grandmasters-tempo');
    await card.focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('btn-take-summit-relic').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('league-hall')).toBeVisible();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).toEqual([...before, 'grandmasters-tempo']);

    await arrive(page);
    const declined = await page.evaluate(() => window.__ascendant!.run.state()!.relics);
    await page.getByTestId('btn-decline-summit-relic').click();
    await expect(page.getByTestId('league-hall')).toBeVisible();
    expect(await page.evaluate(() => window.__ascendant!.run.state()!.relics)).toEqual(declined);
  });

  test('Scroll_ShorterWindow_KeyboardAndWheelRecoverEveryControl', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await arrive(page);
    const root = page.getByTestId('summit-screen');
    expect(await root.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await root.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
    await root.hover();
    await page.mouse.wheel(0, 800);
    await expect.poll(() => root.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await root.evaluate((el) => { el.scrollTop = 0; });
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press('Tab');
      if (await page.getByTestId('btn-decline-summit-relic').evaluate((el) => el === document.activeElement)) break;
    }
    await expect(page.getByTestId('btn-decline-summit-relic')).toBeFocused();
    expect(await root.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.screenshot({ path: `${evidence}/short-window-keyboard-scroll.png` });
  });
});

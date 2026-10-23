import { expect, test, type Page } from '@playwright/test';
import { MYSTERY_EVENTS, mysteryEvent, RISK_LABEL, STONE_CACHE } from '../src/sim/run/events';

const ids = [...MYSTERY_EVENTS.map((event) => event.id), STONE_CACHE];

async function openEvent(page: Page, id: string, money = 1000) {
  await page.evaluate(
    ({ eventId, cash }) => {
      const dev = window.__ascendant!;
      dev.run.new('squirtle', 7);
      dev.run.patch((draft) => {
        draft.phase = 'event';
        draft.pendingEvent = eventId;
        draft.pendingNodeId = Object.values(draft.map.nodes).find((node) => node.kind === 'mystery')!.id;
        draft.eventResult = null;
        draft.money = cash;
      });
      dev.goTo('map');
    },
    { eventId: id, cash: money },
  );
  await expect(page.getByTestId('event-screen')).toBeVisible();
  await expect(page.getByTestId('event-vignette')).toHaveAttribute('data-event', id);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode()));
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?screen=menu');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__ascendant);
});

for (const [width, height] of [
  [1280, 720],
  [1920, 1080],
] as const) {
  test(`§2.10 — every event has its own pixel scene and readable promises at ${height}p`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    for (const id of ids) {
      await openEvent(page, id);
      const event = mysteryEvent(id);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(event.title);
      await expect(page.getByTestId('event-risk')).toContainText(RISK_LABEL[event.risk]);
      const art = page.getByTestId('event-vignette').locator('img');
      await expect(art).toHaveAttribute('src', new RegExp(`/art/events/${id}\\.png$`));
      await expect(art).toHaveCSS('image-rendering', 'pixelated');
      const scale = await art.evaluate(
        (img) => img.getBoundingClientRect().width / (img as HTMLImageElement).naturalWidth,
      );
      expect(scale).toBe(height === 720 ? 2 : 3);
      for (const [index, choice] of event.choices.entries()) {
        const button = page.getByTestId(`event-choice-${index}`);
        await expect(button).toContainText(choice.label);
        await expect(button).toContainText(choice.detail);
        await expect(button).toBeInViewport();
        expect(
          await button.evaluate(
            (el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
          ),
        ).toBe(true);
        const expectedIcons = choice.outcomes.flatMap((outcome) => {
          if (outcome.kind === 'consumables') return outcome.ids;
          if (outcome.kind === 'balls') return Array.from({ length: outcome.amount }, () => 'poke-ball');
          if (outcome.kind === 'stone' && outcome.id) return [outcome.id];
          return [];
        });
        await expect(button.locator('img')).toHaveCount(expectedIcons.length);
        for (const [iconIndex, item] of expectedIcons.entries()) {
          await expect(button.locator('img').nth(iconIndex)).toHaveAttribute(
            'src',
            new RegExp(`/art/items/${item}\\.png$`),
          );
        }
      }
      expect(
        await page
          .getByTestId('event-screen')
          .evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight),
      ).toBe(true);
      await page.screenshot({ path: `playtest/a10-events/${id}-${height}.png` });
    }
  });

  test(`§2.10 — apothecary affordability, exact purchase and held result at ${height}p`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openEvent(page, 'traveling-apothecary', 100);
    await expect(page.getByTestId('event-choice-0')).toBeDisabled();
    await expect(page.getByTestId('event-choice-1')).toBeEnabled();
    const before = await page.evaluate(
      () => window.__ascendant!.run.state()!.consumables.filter((id) => id === 'ether').length,
    );
    await page.getByTestId('event-choice-1').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('event-result')).toBeVisible();
    await expect(page.getByTestId('map-screen')).toHaveCount(0);
    await expect(page.locator('[data-testid^="event-choice-"]')).toHaveCount(0);
    const after = await page.evaluate(() => {
      const run = window.__ascendant!.run.state()!;
      return { money: run.money, ethers: run.consumables.filter((id) => id === 'ether').length };
    });
    expect(after).toEqual({ money: 0, ethers: before + 2 });
    await expect(page.getByTestId('event-vignette')).toHaveAttribute('data-event', 'traveling-apothecary');
    expect(await page.getByTestId('event-screen').evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(
      true,
    );
    await page.screenshot({ path: `playtest/a10-events/apothecary-result-${height}.png` });
    await page.getByTestId('btn-leave-event').click();
    await expect(page.getByTestId('map-screen')).toBeVisible();
  });
}

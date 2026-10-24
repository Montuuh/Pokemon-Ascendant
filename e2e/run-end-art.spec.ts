import { expect, test, type Page } from '@playwright/test';

// A20 / §9.12.3 — the final team owns the ending; the complete record and account ledger remain accessible.
async function ending(page: Page, outcome: 'victory' | 'defeat', count = 6, badges = true) {
  await page.goto('/?screen=menu');
  await page.evaluate(
    ({ outcome, count, badges }) => {
      const a = window.__ascendant!;
      a.meta.reset();
      a.run.new('squirtle', 7);
      if (count > 6) a.run.grantRelic('box-expander');
      a.run.fill(count);
      a.run.fill(count);
      const species = [
        'blastoise',
        'charizard',
        'venusaur',
        'pikachu',
        'lapras',
        'dragonite',
        'mewtwo',
        'moltres',
      ];
      a.run.patch((d) => {
        d.box.forEach((m, i) => {
          m.speciesId = species[i]!;
          m.level = 28 + i * 3;
          m.hp = outcome === 'defeat' ? 0 : 30;
          m.traumaStacks = i % 2;
          m.shiny = i === 1;
        });
        d.badges = badges ? ['boulder-badge', 'thunder-badge', 'marsh-badge'] : [];
        d.regionIndex = 2;
        d.position = Object.values(d.map.nodes).find((n) => n.kind === 'gym')!.id;
        d.stats.nodesCleared = 41;
        d.stats.combatsWon = 24;
        d.stats.turnsPlayed = 137;
        d.stats.catches = 8;
        d.stats.faints = 6;
        d.phase = 'ended';
        d.outcome = outcome;
      });
      a.meta.record([
        {
          t: 'run-end',
          won: outcome === 'victory',
          catches: 8,
          badges: badges ? 3 : 0,
          layersCleared: 41,
          moneyLeft: 540,
        },
      ]);
      a.goTo(outcome);
    },
    { outcome, count, badges },
  );
  await expect(page.getByTestId(`${outcome}-screen`)).toBeVisible();
}
async function capture(page: Page, name: string) {
  await page.mouse.move(2, 2);
  await page.getByRole('heading').first().click();
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: `playtest/a19-a20/${name}.png` });
}
async function noOverflow(page: Page) {
  const clipped = await page
    .locator(
      '[data-testid="run-end-team-scene"], [data-testid^="run-end-mon-"], [data-testid="btn-run-record"], [data-testid="btn-end-continue"], [data-testid="btn-run-again"]',
    )
    .evaluateAll((els) =>
      els
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight;
        })
        .map((el) => el.getAttribute('data-testid')),
    );
  expect(clipped).toEqual([]);
}
async function badgesContained(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-testid^="run-end-badge-"] img')].every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  const spill = await page.locator('[data-testid^="run-end-badge-"]').evaluateAll((badges) =>
    badges.flatMap((badge) => {
      const painted = badge.getBoundingClientRect();
      const image = badge.querySelector('img')!.getBoundingClientRect();
      const row = badge.parentElement!.getBoundingClientRect();
      return image.left < painted.left ||
        image.top < painted.top ||
        image.right > painted.right ||
        image.bottom > painted.bottom ||
        painted.left < row.left ||
        painted.right > row.right ||
        painted.top < row.top ||
        painted.bottom > row.bottom
        ? [badge.getAttribute('data-testid')]
        : [];
    }),
  );
  expect(spill, 'Every badge image stays inside its painted frame and the wrapping badge row').toEqual([]);
}
async function commonPhysicalScale(page: Page) {
  const read = () =>
    page.locator('[data-testid^="run-end-mon-"] img').evaluateAll((images) =>
      images.map((node) => {
        const img = node as HTMLImageElement;
        const r = img.getBoundingClientRect();
        const cell = img.parentElement!.getBoundingClientRect();
        return {
          name: img.alt,
          nativeWidth: img.naturalWidth,
          nativeHeight: img.naturalHeight,
          width: r.width,
          height: r.height,
          cellWidth: cell.width,
          cellHeight: cell.height,
        };
      }),
    );
  // Wait for load measurements and React's shared fit to land, not merely for PNG/GIF transfer completion.
  await expect
    .poll(async () => {
      const images = await read();
      if (!images.every((i) => i.nativeWidth > 0)) return false;
      const scale = images[0]!.width / images[0]!.nativeWidth;
      return (
        images.every((i) => Math.abs(i.width / i.nativeWidth - scale) < 0.001) &&
        !images.every(
          (i) =>
            i.nativeWidth * (scale + 0.5) <= i.cellWidth && i.nativeHeight * (scale + 0.5) <= i.cellHeight,
        )
      );
    })
    .toBe(true);
  const images = await read();
  const scale = images[0]!.width / images[0]!.nativeWidth;
  expect(scale * 2).toBeCloseTo(Math.round(scale * 2));
  for (const img of images) {
    expect(img.width / img.nativeWidth).toBeCloseTo(scale);
    expect(img.height / img.nativeHeight).toBeCloseTo(scale);
    expect(img.width).toBeLessThanOrEqual(img.cellWidth);
    expect(img.height).toBeLessThanOrEqual(img.cellHeight);
  }
  expect(images.find((i) => i.name === 'Pikachu')!.height).toBeLessThan(
    images.find((i) => i.name === 'Dragonite')!.height,
  );
}
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test.describe(`Run end art ${viewport.width} — §9.12.3`, () => {
    test.use({ viewport });
    for (const outcome of ['victory', 'defeat'] as const)
      test(`${outcome}_FinalTeamAndBadges_RecordBehindDoor`, async ({ page }) => {
        await ending(page, outcome);
        await expect(page.locator('[data-testid^="run-end-mon-"]')).toHaveCount(6);
        await expect(page.locator('[data-testid^="run-end-badge-"]')).toHaveCount(3);
        await expect(page.getByTestId('account-summary')).toHaveCount(0);
        const shiny = page.locator('[data-testid^="run-end-mon-"][data-shiny="true"]');
        await expect(shiny.locator('img').first()).toHaveAttribute('src', /charizard-shiny\.png/);
        await noOverflow(page);
        await commonPhysicalScale(page);
        await badgesContained(page);
        await capture(page, `run-end-${outcome}-${viewport.width}`);
        await page.getByTestId('btn-run-record').focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('run-record')).toBeVisible();
        await expect(page.getByTestId('account-summary')).toContainText('540 left → 2 Tokens');
        await expect(page.getByTestId('run-record')).toContainText('Fights won');
        await expect(page.getByTestId('run-record')).toContainText('Trauma ×1');
        await capture(page, `run-end-${outcome}-record-${viewport.width}`);
        const lastMember = page
          .getByTestId('run-record')
          .getByRole('list')
          .last()
          .getByRole('listitem')
          .last();
        await lastMember.scrollIntoViewIfNeeded();
        await expect(lastMember).toBeInViewport();
        await expect(page.getByTestId('btn-close-run-record')).toBeInViewport();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('run-record')).toHaveCount(0);
        await expect(page.getByTestId('btn-run-record')).toBeFocused();
        await page.getByTestId('btn-run-record').click();
        await page.getByTestId('btn-close-run-record').click();
        await expect(page.getByTestId('btn-run-record')).toBeFocused();
        // §2.12: the Summit can add a fourth Badge to the three Gym rewards.
        await page.evaluate(() =>
          window.__ascendant!.run.patch((d) => {
            d.badges.push('cascade-badge');
          }),
        );
        await expect(page.locator('[data-testid^="run-end-badge-"]')).toHaveCount(4);
        await badgesContained(page);
        await noOverflow(page);
      });
    test('Defeat_EightMembersNoBadges_StaysHonestAndFits', async ({ page }) => {
      await ending(page, 'defeat', 8, false);
      await expect(page.locator('[data-testid^="run-end-mon-"]')).toHaveCount(8);
      await expect(page.getByTestId('badge-award')).toHaveCount(0);
      await noOverflow(page);
      await commonPhysicalScale(page);
      await capture(page, `run-end-defeat-eight-${viewport.width}`);
    });
  });
}
test('RunEnd_ExitAndRunAgain_PreserveAccountAndClearRun — §8.10', async ({ page }) => {
  await ending(page, 'defeat');
  const xp = await page.evaluate(() => window.__ascendant!.meta.account().xp);
  await page.getByTestId('btn-end-continue').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
  expect(await page.evaluate(() => window.__ascendant!.run.state())).toBeNull();
  expect(await page.evaluate(() => window.__ascendant!.meta.account().xp)).toBe(xp);
  await ending(page, 'victory');
  await page.getByTestId('btn-run-again').click();
  await expect(page.getByTestId('starter-select')).toBeVisible();
  expect(await page.evaluate(() => window.__ascendant!.run.state())).toBeNull();
});

test('RunEnd_WithoutRun_OffersTheMenuWithoutInventingATeam — §9.12.3', async ({ page }) => {
  await page.goto('/?screen=defeat');
  await expect(page.getByTestId('defeat-screen')).toBeVisible();
  await expect(page.getByTestId('run-end-team-scene')).toHaveCount(0);
  await expect(page.getByTestId('btn-run-record')).toHaveCount(0);
  await page.getByTestId('btn-end-continue').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
});

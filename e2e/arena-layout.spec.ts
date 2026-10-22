import { expect, test } from '@playwright/test';

// Per §9.2.1 / D8 — visibility alone passes for clipped cards. Compare the complete rectangles with the
// actual arena, including the intent above each enemy and the trainer's party at the far edge.
for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test.describe(`Arena formation — §9.2.1 — ${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport, reducedMotion: 'reduce' });

    for (const fixture of [
      { id: 'group-wild-flock', enemies: 3, trainer: false },
      { id: 'group-trainer-pair', enemies: 2, trainer: true },
      { id: 'gym-sabrina-rule', enemies: 2, trainer: true },
      { id: 'field-gym-sandstorm', enemies: 1, trainer: true },
      { id: 'league-champion', enemies: 1, trainer: true },
    ]) {
      test(`${fixture.id}: every card, intent, HP row and trainer fits`, async ({ page }) => {
        await page.goto(`/?scenario=${fixture.id}&seed=7`);
        await expect(page.getByTestId('combat-screen')).toBeVisible();
        await expect(page.getByTestId('squad').locator('[data-arrow-card]')).toHaveCount(3);
        await expect(page.getByTestId('foe-panel')).toHaveCount(fixture.enemies);
        await expect(page.getByTestId('arena-trainer')).toHaveCount(fixture.trainer ? 1 : 0);
        await expect(page.getByTestId('trainer-party')).toHaveCount(fixture.trainer ? 1 : 0);
        await page.waitForFunction(() => [...document.querySelectorAll('[data-fx-stage] img')]
          .every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0));

        for (const crowded of [false, true]) {
          // The public dev hook exercises the real UI with second actions and next-turn plans too.
          if (crowded) await page.evaluate(() => window.__ascendant!.crowd());
          const geometry = await page.locator('[data-fx-stage]').evaluate((stage) => {
            const bounds = stage.getBoundingClientRect();
            const relevant = stage.querySelectorAll<HTMLElement>([
              '[data-arrow-card]', '[data-testid="foe-panel"]', '[data-testid^="portrait-"]',
              '[data-testid^="intent-chip"]', '[data-testid="foe-place"]', '[class*="hpRow"]',
              '[data-testid="arena-trainer"]', '[data-testid="trainer-party"]',
            ].join(','));
            const outside = [...relevant].filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && (r.left < bounds.left - 0.5 || r.right > bounds.right + 0.5
                || r.top < bounds.top - 0.5 || r.bottom > bounds.bottom + 0.5);
            }).map((el) => ({ id: el.dataset.testid ?? el.className, rect: el.getBoundingClientRect().toJSON() }));
            const cards = [...stage.querySelectorAll<HTMLElement>('[data-arrow-card]')];
            const overlaps: string[] = [];
            for (let i = 0; i < cards.length; i++) {
              for (let j = i + 1; j < cards.length; j++) {
                const a = cards[i]!.getBoundingClientRect();
                const b = cards[j]!.getBoundingClientRect();
                if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
                  && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) {
                  overlaps.push(`${cards[i]!.dataset.testid} / ${cards[j]!.dataset.testid}`);
                }
              }
            }
            const widths = cards.map((el) => el.getBoundingClientRect().width);
            const allyLead = stage.querySelector<HTMLElement>('[data-arrow-card="lead"]')!.getBoundingClientRect();
            const allies = [...stage.querySelectorAll<HTMLElement>('[data-testid="squad"] [data-arrow-card]')];
            const foes = [...stage.querySelectorAll<HTMLElement>('[data-testid="foe-panel"] [data-arrow-card]')];
            const trainer = stage.querySelector<HTMLImageElement>('[data-testid="arena-trainer"]');
            const trainerRect = trainer?.getBoundingClientRect();
            return {
              outside,
              overlaps,
              widthDifference: Math.max(...widths) - Math.min(...widths),
              allyLeadForward: allies.filter((el) => el.dataset.arrowCard !== 'lead')
                .every((el) => el.getBoundingClientRect().right < allyLead.left),
              foeLeadForward: foes.slice(1).every((el) => foes[0]!.getBoundingClientRect().right < el.getBoundingClientRect().left),
              trainerAspectError: trainer && trainerRect
                ? Math.abs(trainerRect.width / trainerRect.height - trainer.naturalWidth / trainer.naturalHeight) : 0,
              trainerScale: trainer && trainerRect ? trainerRect.height / trainer.naturalHeight : 1,
            };
          });
          expect(geometry.outside, crowded ? 'Crowded formation stays inside arena' : 'Formation stays inside arena').toEqual([]);
          expect(geometry.overlaps, 'Every card has its own readable space').toEqual([]);
          expect(geometry.widthDifference, 'All Pokémon use the same card size').toBeLessThan(0.5);
          expect(geometry.allyLeadForward, 'Your Lead stands ahead of your bench').toBe(true);
          expect(geometry.foeLeadForward, 'Their Lead mirrors yours').toBe(true);
          expect(geometry.trainerAspectError, 'The trainer keeps its intrinsic proportions').toBeLessThan(0.01);
          expect(geometry.trainerScale, 'The trainer remains at a readable size').toBeGreaterThanOrEqual(1);
          expect(geometry.trainerScale * 2, 'Trainer art uses a whole or half pixel scale').toBeCloseTo(Math.round(geometry.trainerScale * 2), 2);
          await page.screenshot({ path: `playtest/a01-a02/${fixture.id}-${viewport.height}${crowded ? '-crowded' : ''}.png` });
        }
      });
    }
  });
}

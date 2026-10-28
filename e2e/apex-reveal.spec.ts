import { expect, test } from '@playwright/test';

// §8.4.2 — the Apex Pokémon Reveal: Region 3's route names the Legendary waiting on Victory Road once the account has the
// upgrade (the run carries `apexLegendary`); no other Region and no run without it shows the chip.

test.describe('The Apex Reveal — §8.4.2', () => {
  test('Region 3 names the Apex beside its title; Region 1 and a run without the upgrade do not', async ({ page }) => {
    await page.goto('/?screen=menu&seed=7');
    await page.waitForFunction(() => !!window.__ascendant);
    await page.evaluate(() => {
      const a = window.__ascendant!;
      a.run.new('squirtle', 7);
      a.run.patch((d) => { d.apexLegendary = 'articuno'; });
      a.goTo('map');
    });
    // Region 1 keeps its secret even with a name in hand.
    await expect(page.getByTestId('map-screen')).toBeVisible();
    await expect(page.getByTestId('apex-reveal')).toHaveCount(0);
    await page.evaluate(() => window.__ascendant!.run.patch((d) => { d.regionIndex = 2; }));
    await expect(page.getByTestId('apex-reveal')).toContainText('Articuno');
    await page.screenshot({ path: 'playtest/apex-reveal.png' });
    await page.evaluate(() => window.__ascendant!.run.patch((d) => { delete d.apexLegendary; }));
    await expect(page.getByTestId('apex-reveal')).toHaveCount(0);
  });
});

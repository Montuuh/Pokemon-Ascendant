import { expect, test, type Page } from '@playwright/test';

// §2.3 / §2.12.2 / §2.12.2.1 — the Legendaries on the screen: the Apex on Victory Road and its preview (the arena's
// rule, Mew's Metronome), a Legendary's arena fight with its rule counted on the top bar, and a Legendary's two places
// in the Active Team. Screenshots to playtest/legendary-*.png.

/** A run of two on Victory Road, the Apex made the only node in reach and walked into. */
async function atTheApex(page: Page) {
  await page.goto('/?screen=menu');
  await page.evaluate(() => {
    const a = window.__ascendant!;
    a.run.new('squirtle', 11);
    a.run.fill(2);
    a.run.victoryRoad();
    a.run.patch((d) => {
      d.reachable = [Object.values(d.map.nodes).find((n) => n.kind === 'apex')!.id];
    });
  });
  await page.locator('[data-testid^="node-"][data-status="reachable"][data-kind="apex"]').click();
  await expect(page.getByTestId('node-preview')).toBeVisible();
}

test.describe('The Legendaries — §2.3, §2.12.2', () => {
  test('the Apex is a Legendary on the map, and its preview promises its arena', async ({ page }) => {
    await atTheApex(page);
    const preview = page.getByTestId('node-preview');
    await expect(preview).toContainText('Legendary');
    await expect(preview.getByTestId('rule-chip')).toBeVisible();
    await expect(preview).toContainText('two places in the team');
    await page.getByTestId('node-preview').screenshot({ path: 'playtest/legendary-apex-preview.png' });
  });

  test('an arena fight counts its rule on the top bar', async ({ page }) => {
    await page.goto('/?scenario=legendary-mewtwo-barrier&seed=3');
    const chip = page.getByTestId('rule-chip');
    await expect(chip).toHaveAttribute('data-rule', 'barrier');
    // Turn 1, the Barrier every third turn: up at turn 3, two turns from now.
    await expect(chip.getByTestId('rule-count')).toHaveText('up in 2 turns');
    await page.screenshot({ path: 'playtest/legendary-arena-mewtwo.png' });
  });

  test("Mew's Metronome names the next field, a turn ahead", async ({ page }) => {
    await page.goto('/?scenario=legendary-mew-metronome&seed=3');
    await expect(page.getByTestId('rule-chip')).toHaveAttribute('data-rule', 'playful');
    await expect(page.getByTestId('metronome-next')).toContainText('next:');
  });

  test('a Legendary takes two places: the team is counted in places, and its card says so', async ({ page }) => {
    await page.goto('/?screen=menu');
    await page.evaluate(() => {
      const a = window.__ascendant!;
      a.run.new('squirtle', 11);
      a.run.fill(3);
      a.run.patch((d) => {
        const z = JSON.parse(JSON.stringify(d.box[1]!)) as typeof d.box[number];
        z.uid = 'legend-z';
        z.speciesId = 'zapdos';
        d.box.push(z);
      });
      a.goTo('map');
    });
    await expect(page.getByTestId('box-places-zapdos')).toHaveText('2 places');
    // Putting it in steps back whoever has stood there longest until the places fit: it and one partner.
    await page.getByTestId('box-row-zapdos').click();
    const team = await page.evaluate(() => window.__ascendant!.run.state()!.activeUids);
    expect(team).toHaveLength(2);
    expect(team).toContain('legend-z');
    await expect(page.getByTestId('box-panel')).toContainText('3/3');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="box-panel"] img')].every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
    await page.getByTestId('box-panel').screenshot({ path: 'playtest/legendary-two-places.png' });
  });
});

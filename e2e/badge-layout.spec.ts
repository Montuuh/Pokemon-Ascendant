import { expect, test } from '@playwright/test';

// §9.4.5 / D8 — the Badge's whole case owns its ground, even at the reveal spring's widest frame.
for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
 for (const scale of [1, 1.5]) {
  test.describe(`Gym Badge ground at ${viewport.width} × ${viewport.height}, text ${scale}`, () => {
    test.use({ viewport, reducedMotion: 'no-preference' });

    test('the animated case and name never cross the formation or defeated party', async ({ page }) => {
      test.setTimeout(40_000);
      await page.goto('/?screen=menu');
      await page.evaluate((textScale) => {
        window.localStorage.clear();
        localStorage.setItem('ascendant.settings.v1', JSON.stringify({ textScale, motion: 'full', musicVolume: 0, sfxVolume: 0 }));
      }, scale);
      await page.goto('/?screen=menu');
      await page.waitForFunction(() => !!window.__ascendant);
      await page.evaluate(() => {
        const a = window.__ascendant!;
        a.run.new('squirtle', 5);
        a.run.fill(3);
        // Cross Water Gun at Lv 8 so the temporary panel also contains a learned-move row.
        for (const m of a.run.state()!.box) a.run.levelTo(7, m.uid);
        a.run.dispatch({ type: 'set-active', uids: a.run.state()!.box.slice(0, 3).map((m) => m.uid) });
        a.goTo('map');
        a.run.jump('gym');
        a.run.dispatch({ type: 'enter-node', nodeId: a.run.state()!.reachable[0]! });
        a.run.dispatch({ type: 'begin-combat' });
        a.run.dispatch({ type: 'finish-combat', report: {
          outcome: 'victory',
          team: a.run.state()!.activeUids.map((uid, i) => ({ uid, hp: [40, 0, 25][i]!, status: null, fainted: i === 1 })),
          caught: null, ballsLeft: 0, turns: 9,
        } });
        a.goTo('results');
      });

      await expect(page.getByTestId('badge-award')).toBeAttached();
      const sampled = await page.evaluate(async () => {
        const badge = document.querySelector<HTMLElement>('[data-testid="badge-award"]')!;
        const results = document.querySelector<HTMLElement>('[data-testid="fight-results"]')!;
        const units = [...results.querySelectorAll<HTMLElement>('div[data-testid^="result-"][data-level]')];
        // The party is a semantic row of named Pokémon; use its actual painted wrapper, including its border.
        const party = results.querySelector<HTMLElement>('span[class*="_party_"]')!;
        if (!party || units.length !== 3) throw new Error('Expected the defeated party and all three formation cards');
        const violations: string[] = [];
        const panels = new Set<string>();
        let learnedMoveSeen = false;
        let frames = 0;
        let maxScale = 0;
        const start = performance.now();
        await new Promise<void>((resolve) => {
          const sample = () => {
            if (Number(getComputedStyle(badge).opacity) > 0) {
              frames++;
              const b = badge.getBoundingClientRect();
              maxScale = Math.max(maxScale, b.width / badge.offsetWidth);
              const panel = results.querySelector<HTMLElement>('[data-testid^="levelup-panel-"]');
              const voice = results.querySelector<HTMLElement>('[data-testid="results-voice"]')!;
              if (panel) {
                learnedMoveSeen ||= panel.textContent!.includes('Water Gun');
                panels.add(panel.dataset.testid!);
                const p = panel.getBoundingClientRect();
                for (const [i, other] of [...units, party, voice].entries()) {
                  const r = other.getBoundingClientRect();
                  if (p.left < r.right && p.right > r.left && p.top < r.bottom && p.bottom > r.top) violations.push(`panel overlaps neighbour ${i}`);
                }
              }
              for (const [i, other] of [...units, party, voice, ...(panel ? [panel] : [])].entries()) {
                const r = other.getBoundingClientRect();
                if (b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) violations.push(`frame ${frames}, neighbour ${i}`);
                if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) violations.push(`frame ${frames}, clipped neighbour ${i}: ${JSON.stringify(r.toJSON())}`);
              }
              if (b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight) violations.push(`frame ${frames}, clipped case`);
            }
            if (results.dataset.done === 'true' || performance.now() - start > 25_000) resolve();
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
        return { violations, frames, maxScale, panels: panels.size, learnedMoveSeen, done: results.dataset.done };
      });
      await page.screenshot({ path: `playtest/a01-a02/results-gym-${viewport.height}-${scale}.png` });
      expect(sampled.done).toBe('true');
      expect(sampled.frames).toBeGreaterThan(3);
      expect(sampled.panels).toBe(3);
      expect(sampled.learnedMoveSeen).toBe(true);
      expect(sampled.maxScale).toBeGreaterThan(1.06);
      expect(sampled.violations).toEqual([]);
      await expect(page.getByTestId('badge-award')).toContainText('Badge');
      // Continue deliberately ignores input for 350 ms after the reveal ends.
      await page.waitForTimeout(400);
      await page.getByTestId('btn-claim').click();
      await page.evaluate(() => {
        const a = window.__ascendant!;
        for (let i = 0; i < 8 && a.run.state()!.phase === 'evolution'; i++) {
          const p = a.run.state()!.pendingEvolutions[0]!;
          a.run.dispatch({ type: 'choose-branch', uid: p.uid, branchId: p.branchIds[0]! });
        }
      });
      await expect(page.getByTestId('gym-relic-pick')).toBeVisible();
      const badge = await page.getByTestId('badge-award').boundingBox();
      const instruction = await page.getByText('The Gym owes you something', { exact: true }).boundingBox();
      expect(instruction!.y + instruction!.height).toBeLessThan(badge!.y);
      await page.screenshot({ path: `playtest/a01-a02/results-pick-${viewport.height}-${scale}.png` });
    });
  });
 }
}

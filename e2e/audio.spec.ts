import { expect, test } from '@playwright/test';

// §9.5 — the sound, heard the only way a test can: every effect and every track rendered and measured
// (audible, never clipping), the right sounds asked for as a fight plays, the music following the screens, and the two
// volumes kept in Settings.

test.describe('Sound — §9.5', () => {
  test('every effect renders audible and below clipping', async ({ page }) => {
    await page.goto('/?screen=menu');
    const results = await page.evaluate(async () => {
      const a = window.__ascendant!.audio;
      const out: Record<string, { peak: number; rms: number }> = {};
      for (const id of a.ids()) out[id] = await a.render(id);
      return out;
    });
    expect(Object.keys(results).length).toBeGreaterThan(40);
    for (const [id, r] of Object.entries(results)) {
      expect(r.peak, id).toBeGreaterThan(0.01);
      expect(r.peak, id).toBeLessThanOrEqual(1);
    }
  });

  test('every track renders at the songbook’s loudness, below clipping, and long enough to loop', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/?screen=menu');
    const results = await page.evaluate(() => {
      const a = window.__ascendant!.audio;
      return Object.fromEntries(a.tracks().map((id) => [id, a.renderTrack(id)]));
    });
    expect(Object.keys(results).length).toBeGreaterThanOrEqual(26);
    for (const [id, r] of Object.entries(results)) {
      expect(r.rms, id).toBeGreaterThan(0.08);
      expect(r.rms, id).toBeLessThan(0.2);
      expect(r.peak, id).toBeLessThan(0.9);
      if (id.startsWith('battle-')) expect(r.tensionRms, id).toBeGreaterThan(0.005);
    }
  });

  test('a fight asks for its sounds, and the music follows the screen', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__ascendant!.audio.track())).toBe('battle-wild');
    // Play a damaging card on the enemy, then end the turn: its type's whoosh and a hit are asked for.
    // The first card the sim accepts: the hand is the kits' (v0.9.91's tracks changed which card leads it).
    await page.evaluate(() => {
      const a = window.__ascendant!;
      const s = a.state()!;
      s.player.hand.some((card) => a.dispatch({ type: 'play-card', cardId: card.id, targetUid: s.enemies[0]!.uid }));
    });
    await expect.poll(() => page.evaluate(() => window.__ascendant!.audio.recent().some((id) => id.startsWith('card-')))).toBe(true);
    await page.goto('/?screen=menu');
    await expect.poll(() => page.evaluate(() => window.__ascendant!.audio.track())).toBe('title');
  });

  test('Settings keeps the music and effects volumes', async ({ page }) => {
    await page.goto('/?screen=settings');
    await page.getByTestId('volume-music-0').click();
    await page.getByTestId('volume-sfx-100').click();
    await expect(page.getByTestId('volume-music-0')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByTestId('volume-music-0')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('volume-sfx-100')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('settings-screen').screenshot({ path: 'playtest/settings-sound.png' });
  });
});

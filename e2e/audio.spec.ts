import { expect, test } from '@playwright/test';

// §9.5 — the sound, heard the only way a test can: every effect and every track's bar rendered offline and measured
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

  test('every track’s bar renders audible and below clipping, with its tension layer or without', async ({ page }) => {
    await page.goto('/?screen=menu');
    const results = await page.evaluate(async () => {
      const a = window.__ascendant!.audio;
      const ids = ['title', 'region-1', 'region-2', 'region-3', 'city', 'victory-road', 'league', 'combat', 'boss', 'champion'];
      const out: Record<string, { calm: { peak: number; rms: number }; tense: { peak: number; rms: number } }> = {};
      for (const id of ids) out[id] = { calm: await a.renderBar(id), tense: await a.renderBar(id, true) };
      return out;
    });
    for (const [id, r] of Object.entries(results)) {
      expect(r.calm.rms, id).toBeGreaterThan(0.005);
      expect(r.calm.peak, id).toBeLessThanOrEqual(1);
      expect(r.tense.peak, id).toBeLessThanOrEqual(1);
      expect(r.tense.rms, id).toBeGreaterThan(0.005);
    }
  });

  test('a fight asks for its sounds, and the music follows the screen', async ({ page }) => {
    await page.goto('/?scenario=wild-basic&seed=7');
    await expect(page.getByTestId('combat-screen')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__ascendant!.audio.track())).toBe('combat');
    // Play a damaging card on the enemy, then end the turn: its type's whoosh and a hit are asked for.
    await page.evaluate(() => {
      const a = window.__ascendant!;
      const s = a.state()!;
      const card = s.player.hand[0]!;
      a.dispatch({ type: 'play-card', cardId: card.id, targetUid: s.enemies[0]!.uid });
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

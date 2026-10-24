import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const evidence = process.env.B04_OUT ?? 'playtest/art-review-2026-10-24/implementation/B04';

async function ending(page: Page, outcome: 'victory' | 'defeat') {
  await page.goto('/?screen=menu');
  await page.evaluate((outcome) => {
    const a = window.__ascendant!;
    a.meta.reset();
    a.run.new('squirtle', 7);
    a.run.fill(6);
    a.run.patch((d) => {
      const species = ['blastoise', 'charizard', 'venusaur', 'pikachu', 'lapras', 'dragonite'];
      d.box.forEach((mon, i) => {
        mon.speciesId = species[i]!;
        mon.shiny = i === 1;
        mon.level = 35;
        mon.hp = outcome === 'defeat' ? 0 : 30;
      });
      d.phase = 'ended';
      d.outcome = outcome;
      d.badges = ['boulder-badge', 'thunder-badge', 'marsh-badge'];
    });
    a.goTo(outcome);
  }, outcome);
  await ready(page);
}

async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
  // Shared fit updates on load, so wait for native scale rather than transfer alone.
  await expect.poll(() => page.locator('[data-testid^="run-end-mon-"] img').evaluateAll((nodes) => {
    const images = nodes as HTMLImageElement[];
    const scale = images[0]!.getBoundingClientRect().width / images[0]!.naturalWidth;
    return images.every((img) => Math.abs(img.getBoundingClientRect().width / img.naturalWidth - scale) < 0.001);
  })).toBe(true);
}

async function sources(page: Page, extension: 'png' | 'gif') {
  const urls = await page.locator('[data-testid^="run-end-mon-"] img').evaluateAll((nodes) => nodes.map((n) => (n as HTMLImageElement).src));
  expect(urls).toHaveLength(6);
  expect(urls.every((src) => src.endsWith(`.${extension}`))).toBe(true);
  expect(urls[1]).toMatch(new RegExp(`charizard-shiny\\.${extension}$`));
  expect(urls[0]).toMatch(new RegExp(`blastoise\\.${extension}$`));
}

async function geometry(page: Page) {
  return page.locator('[data-testid^="run-end-mon-"] img').evaluateAll((nodes) => nodes.map((node) => {
    const img = node as HTMLImageElement;
    const r = img.getBoundingClientRect();
    const cell = img.parentElement!.getBoundingClientRect();
    return { name: img.alt, width: r.width, height: r.height, bottom: r.bottom, cellBottom: cell.bottom, scale: r.width / img.naturalWidth };
  }));
}

async function pixels(page: Page, name: string, animated: boolean) {
  await ready(page);
  await page.mouse.move(0, 0);
  const team = page.locator('[data-testid^="run-end-mon-"] img');
  const bounds = await team.evaluateAll((nodes) => nodes.map((node) => {
    const r = node.getBoundingClientRect();
    return { left: Math.floor(r.left), top: Math.floor(r.top), width: Math.ceil(r.right) - Math.floor(r.left), height: Math.ceil(r.bottom) - Math.floor(r.top) };
  }));
  const sample = async (suffix: string) => {
    const screenshot = await page.screenshot({ path: `${evidence}/${name}-${suffix}.png` });
    return Promise.all(bounds.map((r) => sharp(screenshot).extract(r).ensureAlpha().raw().toBuffer()));
  };
  const first = await sample('a');
  const changes = Array<number>(6).fill(0);
  // Several different intervals avoid accepting a GIF only because two samples hit the same frame.
  for (const delay of [110, 170, 230]) {
    await page.waitForTimeout(delay);
    const current = await sample(String(delay));
    current.forEach((bytes, i) => { changes[i]! += bytes.reduce((n, b, j) => n + (b !== first[i]![j] ? 1 : 0), 0); });
  }
  if (animated) expect(changes[1], 'Shiny Charizard must visibly animate').toBeGreaterThan(0);
  else expect(changes, 'Every normal and shiny final-team sprite must stay still').toEqual(Array(6).fill(0));
  return changes;
}

// Use the exact module URL already loaded by Vite, including its current cache key.
// This changes the live store without navigating away or remounting the final team.
async function liveSetting(page: Page, motion: 'system' | 'reduced' | 'full') {
  await page.evaluate(async (motion) => {
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((url) => new URL(url).pathname === '/src/app/settingsStore.ts');
    if (!url) throw new Error('Loaded settings module URL missing');
    const { useSettingsStore } = await import(/* @vite-ignore */ url);
    useSettingsStore.getState().set({ motion });
  }, motion);
  if (motion === 'system') await expect(page.locator('html')).not.toHaveAttribute('data-motion');
  else await expect(page.locator('html')).toHaveAttribute('data-motion', motion);
}

// B04 / §9.6 — real pixels, palette, live OS/settings changes and shared native geometry.
for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
  for (const outcome of ['victory', 'defeat'] as const) {
    test(`FinalTeam_${outcome}_${viewport.width}_MotionAndLiveChanges — §9.6`, async ({ page }) => {
      mkdirSync(evidence, { recursive: true });
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await ending(page, outcome);
      await page.getByTestId('btn-run-record').evaluate((el) => el.setAttribute('data-b04-mount', 'retained'));
      const name = `${outcome}-${viewport.width}`;
      await sources(page, 'png');
      const initial = await geometry(page);
      initial.forEach((g) => { expect(g.bottom).toBe(g.cellBottom); expect(g.scale * 2).toBe(Math.round(g.scale * 2)); });
      const system = await pixels(page, `after-${name}-system-reduced`, false);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect.poll(() => page.locator('[data-testid^="run-end-mon-"] img').first().getAttribute('src')).toMatch(/\.gif$/);
      await sources(page, 'gif');
      const full = await pixels(page, `after-${name}-system-full`, true);
      expect(await geometry(page)).toEqual(initial);
      await liveSetting(page, 'reduced');
      await sources(page, 'png');
      const reduced = await pixels(page, `after-${name}-setting-reduced`, false);
      expect(await geometry(page)).toEqual(initial);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await liveSetting(page, 'full');
      await sources(page, 'gif');
      const override = await pixels(page, `after-${name}-setting-full`, true);
      await liveSetting(page, 'system');
      await sources(page, 'png');
      await expect(page.getByTestId('btn-run-record')).toHaveAttribute('data-b04-mount', 'retained');
      // Pointer and keyboard doors continue to work while the source changes.
      const member = page.locator('[data-testid^="run-end-mon-"]').nth(1);
      await member.hover();
      await expect(page.getByRole('tooltip')).toContainText('Charizard');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('tooltip')).toBeHidden();
      await page.mouse.move(0, 0);
      await member.focus();
      await expect(member).toBeFocused();
      await expect(page.getByRole('tooltip')).toContainText('Charizard');
      await page.keyboard.press('Escape');
      await page.getByTestId('btn-run-record').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('run-record')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('btn-run-record')).toBeFocused();
      expect(errors).toEqual([]);
      writeFileSync(`${evidence}/${name}-pixels.json`, JSON.stringify({ system, full, reduced, override, geometry: initial, errors }, null, 2));
    });
  }
}

test('FinalTeam_SettingsPointerAndKeyboard_150Percent — §9.6', async ({ page }) => {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/?screen=settings');
    await page.getByTestId('text-scale-150').click();
    await page.getByTestId('motion-reduced').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('motion-reduced')).toHaveAttribute('aria-pressed', 'true');
    for (const outcome of ['victory', 'defeat'] as const) {
      await ending(page, outcome);
      await sources(page, 'png');
      const outside = await page.locator('[data-testid^="run-end-mon-"], [data-testid="run-end-team-scene"], [data-testid="btn-run-record"]').evaluateAll((els) => els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight;
      }).map((el) => el.getAttribute('data-testid')));
      expect(outside).toEqual([]);
      await page.screenshot({ path: `${evidence}/after-${outcome}-${viewport.width}-150.png` });
    }
  }
});

test('BattleStills_AllRosterVariants_ExactFirstFrameAndCanvas — §9.6', async () => {
  const { readFileSync } = await import('node:fs');
  const manifest = JSON.parse(readFileSync('public/art/pokemon/battle/stills-manifest.json', 'utf8')) as { entries: { name: string }[] };
  expect(manifest.entries).toHaveLength(604);
  for (const { name } of manifest.entries) {
    const gif = await sharp(`public/art/pokemon/battle/${name}.gif`, { page: 0, pages: 1 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const png = await sharp(`public/art/pokemon/battle/${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(png.info, name).toEqual(gif.info);
    expect(png.data.equals(gif.data), name).toBe(true);
  }
});

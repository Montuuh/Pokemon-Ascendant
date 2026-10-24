import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = 'playtest/art-review-2026-10-24/implementation/B04';
const phase = process.argv[2] ?? 'before';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
for (const outcome of ['victory', 'defeat']) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  await page.goto('http://localhost:5173/?screen=menu');
  await page.evaluate((outcome) => {
    const a = window.__ascendant;
    a.meta.reset(); a.run.new('squirtle', 7); a.run.fill(6);
    a.run.patch((d) => {
      const species = ['blastoise', 'charizard', 'venusaur', 'pikachu', 'lapras', 'dragonite'];
      d.box.forEach((m, i) => { m.speciesId = species[i]; m.shiny = i === 1; m.level = 35; m.hp = outcome === 'defeat' ? 0 : 30; });
      d.badges = ['boulder-badge', 'thunder-badge', 'marsh-badge'];
      d.phase = 'ended'; d.outcome = outcome;
    }); a.goTo(outcome);
  }, outcome);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${phase}-${outcome}-1920.png` });
  const sprite = page.locator('[data-testid^="run-end-mon-"][data-shiny="true"] img').first();
  const a = await sprite.screenshot({ path: `${out}/${phase}-${outcome}-sprite-a.png` });
  await page.waitForTimeout(220);
  const b = await sprite.screenshot({ path: `${out}/${phase}-${outcome}-sprite-b.png` });
  const rawA = await sharp(a).ensureAlpha().raw().toBuffer();
  const rawB = await sharp(b).ensureAlpha().raw().toBuffer();
  results.push({ outcome, prefersReduced: true, src: await sprite.getAttribute('src'), changedChannelBytes: rawA.reduce((n, v, i) => n + (v !== rawB[i] ? 1 : 0), 0) });
  await page.close();
}
writeFileSync(`${out}/${phase}-pixels.json`, JSON.stringify(results, null, 2));
console.log(results);
await browser.close();

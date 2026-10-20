// §9.3 — the Wild Areas' landmarks in place: one crop of a Wild node per habitat, across the three Regions and a few
// seeds, laid side by side at 3× (review after `npm run art:habitats`; the dev server must be up on :5173).
// Usage: node scripts/habitat-gallery.mjs [out.png]   → playtest/habitat-gallery.png
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const out = process.argv[2] ?? 'playtest/habitat-gallery.png';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const shots = new Map();
for (const seed of [7, 11, 23, 42]) {
  for (const region of [0, 1, 2]) {
    await page.goto('http://localhost:5173/?screen=menu');
    await page.evaluate(({ seed, region }) => {
      const a = window.__ascendant;
      a.run.new('squirtle', seed);
      for (let r = 0; r < region; r++) {
        a.run.city(r);
        a.run.dispatch({ type: 'depart-city', modifierId: a.run.state().city.reflection[0] ?? null });
      }
      a.goTo('map');
    }, { seed, region });
    await page.waitForSelector('[data-testid="route-board"][data-painted="true"]');
    const wilds = await page.evaluate(() => Object.values(window.__ascendant.run.state().map.nodes).filter((n) => n.kind === 'wild').map((n) => ({ id: n.id, icon: n.preview.icon })));
    for (const { id, icon } of wilds) {
      const key = `r${region + 1}-${icon}`;
      if (shots.has(key)) continue;
      const el = page.getByTestId(`node-${id}`);
      await el.evaluate((e) => e.scrollIntoView({ block: 'center', inline: 'center' }));
      await page.waitForTimeout(150);
      const b = await el.boundingBox();
      if (!b) continue;
      const clip = { x: Math.max(0, b.x - 40), y: Math.max(0, b.y - 24), width: b.width + 104, height: b.height + 56 };
      shots.set(key, await page.screenshot({ clip }));
    }
  }
}
await browser.close();
const keys = [...shots.keys()].sort();
const S = 3;
const tiles = await Promise.all(keys.map(async (k) => {
  const m = await sharp(shots.get(k)).metadata();
  return { k, w: m.width * S, h: m.height * S, buf: await sharp(shots.get(k)).resize(m.width * S, m.height * S, { kernel: 'nearest' }).png().toBuffer() };
}));
const perRow = 6;
const cw = Math.max(...tiles.map((t) => t.w));
const chh = Math.max(...tiles.map((t) => t.h));
const rows = Math.ceil(tiles.length / perRow);
await sharp({ create: { width: cw * perRow, height: chh * rows, channels: 4, background: '#222' } })
  .composite(tiles.map((t, i) => ({ input: t.buf, left: (i % perRow) * cw, top: Math.floor(i / perRow) * chh })))
  .png()
  .toFile(out);
console.log(keys.join('\n'));

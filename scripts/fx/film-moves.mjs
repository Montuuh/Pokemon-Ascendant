#!/usr/bin/env node
// Every move's animation, filmed in real time in combat: the move-animation report's evidence. For each base move (the
// `-plus` cards are drawn as their base) it plays the card at the foe, records the beat with the DevTools screencast,
// and writes an 8-frame strip (`<id>.jpg`) and a looping animated WebP (`<id>.webp`) of the stage, plus `films.json`
// with what each beat was drawn with. The dev server must be up and be this game's.
// node scripts/fx/film-moves.mjs [--only id,id] [--workers 4] [--out playtest/fx-report]
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertOurServer, devBase } from '../lib/dev-server.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const out = resolve(opt('out', 'playtest/fx-report'));
const only = opt('only', '') ? opt('only').split(',') : null;
const workers = Number(opt('workers', 4));
const STRIP = 8, CELL_W = 480, ANIM_W = 640;
mkdirSync(resolve(out, 'film'), { recursive: true });
await assertOurServer(devBase);

const SCENARIO = '/?scenario=wild-boss-3phase&seed=7';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(devBase + SCENARIO);
  await page.waitForSelector('[data-testid="combat-screen"]');
  await page.waitForTimeout(3000);
  return page;
}

// The move list and what each is drawn with, read from the game's own modules through Vite.
const listPage = await openPage();
const moves = await listPage.evaluate(async () => {
  const { getContent } = await import('/src/content/registry.ts');
  const fx = await import('/src/ui/fx/moveFx.ts');
  const mm = await import('/src/ui/moveMotion.ts');
  const c = getContent();
  return c
    .allMoves()
    .filter((m) => !/-plus$/.test(m.id))
    .map((m) => {
      const motion = mm.motionOf(m, 1, fx.fxCastOf(m.id));
      return { id: m.id, name: m.name, type: m.type, power: m.power ?? 0, range: m.range ?? null, kind: motion.kind, style: motion.style ?? null, totalMs: motion.totalMs, impactMs: motion.impactMs, recipe: fx.fxRecipeOf(m.id) ?? null, bg: fx.fxBgOf(m.id, motion.kind) ?? null, pret: fx.pretScriptOf(m.id) ? true : false };
    });
});
await listPage.close();
const todo = only ? moves.filter((m) => only.includes(m.id)) : moves;
console.log(`film-moves: ${todo.length} moves, ${workers} workers`);

async function film(page, m) {
  // Fresh bars on both sides, the move in hand, then the card played at the foe's Lead.
  const ok = await page.evaluate(async (id) => {
    const a = window.__ascendant;
    let s = a.state();
    if (!s || s.outcome !== 'in-progress') {
      a.start('wild-boss-3phase', 7);
      return 'restart';
    }
    const { useCombatStore } = await import('/src/app/combatStore.ts');
    const st = structuredClone(useCombatStore.getState().state);
    for (const p of [...st.player.team, ...st.enemies]) {
      if (p.maxHp) p.hp = p.maxHp;
      p.status = null;
    }
    useCombatStore.setState({ state: st });
    a.hand([id]);
    s = a.state();
    return s.player.hand.length ? 'ok' : 'no-hand';
  }, m.id);
  if (ok === 'restart') {
    await page.waitForTimeout(3000);
    return film(page, m);
  }
  // The band the beat plays in: the user's and the foe's Pokémon, with room above and below for what rises or falls.
  const box = await page.evaluate(() => {
    const r = [...document.querySelectorAll('[data-fx-slot="player"], [data-fx-slot="single"]')].map((e) => e.getBoundingClientRect());
    const x0 = Math.min(...r.map((b) => b.left)) - 60, x1 = Math.max(...r.map((b) => b.right)) + 60;
    const y0 = Math.min(...r.map((b) => b.top)), y1 = Math.max(...r.map((b) => b.bottom));
    const h = y1 - y0, top = Math.max(0, y0 - h * 0.9), bottom = Math.min(innerHeight, y1 + h * 0.6);
    return { x: Math.max(0, x0), y: top, width: Math.min(innerWidth, x1) - Math.max(0, x0), height: bottom - top };
  });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ at: f.metadata.timestamp * 1000, data: f.data });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
  await page.waitForTimeout(150);
  const t0 = await page.evaluate((id) => {
    const a = window.__ascendant;
    const s = a.state();
    const t = performance.timeOrigin + performance.now();
    a.dispatch({ type: 'play-card', cardId: s.player.hand[0].id, targetUid: s.enemies[0].uid });
    return t;
  }, m.id);
  const seen = await page.locator(`[data-testid="move-fx"][data-move="${m.id}"]`).waitFor({ state: 'attached', timeout: 1500 }).then(() => true, () => false);
  await page.waitForTimeout(m.totalMs + 350);
  await cdp.send('Page.stopScreencast');
  await cdp.detach().catch(() => {});
  if (!frames.length) return { ...m, filmed: false, reason: 'no frames' };
  // Frames are pushed when the screen changes: for time t, the last frame at or before it.
  const at = (t) => frames.reduce((best, f) => (f.at - t0 <= t ? f : best), frames[0]);
  const clip = { left: Math.round(box.x), top: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
  const cropped = async (f, w) => sharp(Buffer.from(f.data, 'base64')).extract(clip).resize(w).toBuffer();
  const times = Array.from({ length: STRIP }, (_, i) => Math.round(((i + 0.5) / STRIP) * (m.totalMs + 100)));
  const cells = await Promise.all(times.map((t) => cropped(at(t), CELL_W)));
  const ch = Math.round((clip.height / clip.width) * CELL_W);
  await sharp({ create: { width: CELL_W * 4 + 3 * 4, height: ch * 2 + 4, channels: 3, background: '#111' } })
    .composite(cells.map((c, i) => ({ input: c, left: (i % 4) * (CELL_W + 4), top: Math.floor(i / 4) * (ch + 4) })))
    .jpeg({ quality: 78 })
    .toFile(resolve(out, 'film', `${m.id}.jpg`));
  // The animation itself: every 40 ms from just before the cast to the end, then a held pause, looping.
  const step = 40;
  const anim = [];
  for (let t = -80; t <= m.totalMs + 200; t += step) anim.push(await sharp(await cropped(at(t), ANIM_W)).png().toBuffer());
  const delays = anim.map((_, i) => (i === anim.length - 1 ? 700 : step));
  await sharp(anim, { join: { animated: true } }).webp({ quality: 70, delay: delays, loop: 0 }).toFile(resolve(out, 'film', `${m.id}.webp`));
  return { ...m, filmed: true, fxSeen: seen, frames: frames.length, sampled: times };
}

const results = [];
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(workers, todo.length) }, async () => {
    const page = await openPage();
    while (next < todo.length) {
      const m = todo[next++];
      try {
        results.push(await film(page, m));
      } catch (e) {
        results.push({ ...m, filmed: false, reason: String(e.message ?? e).slice(0, 200) });
      }
      if (results.length % 20 === 0) console.log(`  ${results.length}/${todo.length}`);
    }
    await page.close();
  }),
);
await browser.close();
const file = resolve(out, 'films.json');
const prev = existsSync(file) && only ? JSON.parse(readFileSync(file, 'utf8')) : [];
const merged = [...prev.filter((p) => !results.some((r) => r.id === p.id)), ...results].sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(file, JSON.stringify(merged, null, 1));
const bad = results.filter((r) => !r.filmed || !r.fxSeen);
console.log(`film-moves: ${results.length - bad.length} filmed; ${bad.length} without a beat: ${bad.map((b) => `${b.id}(${b.reason ?? 'no fx'})`).join(', ')}`);

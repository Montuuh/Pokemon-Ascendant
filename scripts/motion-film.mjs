#!/usr/bin/env node
// The motion film — a moving beat, seen in real time, as one picture (docs/design/ui/motion-review.md §5).
//
// The browser pane throttles a hidden page, so motion read there is guessed from paused, stepped frames. This opens the
// screen in its own headless Chrome, which paints every frame, records it with the DevTools screencast (each frame
// stamped with its time), and lays the frames out as a contact sheet the reviewer reads like any screenshot: what
// moved, how far, and when. It does not judge; the ui-reviewer does.
//
// Usage: npm run ui:film -- --url "/?scenario=wild-basic&seed=7" --act "<js>" [--setup "<js>"] [--ms 1200]
//          [--clip x,y,w,h] [--every 2] [--cols 6] [--size 1280x720] [--motion no-preference|reduce] [--out <png>]
//   --setup / --act run in the page with `a` = window.__ascendant (setup first, then recording, then act).
//   --clip crops every frame to the region that moves; --every keeps one frame in n.
// The dev server must be up (PW_PORT, default 5173), and be this game's.
import { chromium } from '@playwright/test';
import { assertOurServer, devBase } from './lib/dev-server.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const BASE = devBase;
await assertOurServer(BASE).catch((e) => {
  console.error(`motion-film: ${e.message}`);
  process.exit(2);
});
const url = opt('url', '/?scenario=wild-basic&seed=7');
const setup = opt('setup', '');
const act = opt('act', '');
const ms = Number(opt('ms', 1200));
const every = Math.max(1, Number(opt('every', 1)));
const cols = Math.max(1, Number(opt('cols', 6)));
const [vw, vh] = opt('size', '1280x720').split('x').map(Number);
const motion = opt('motion', 'no-preference');
const clip = opt('clip', '') ? opt('clip').split(',').map(Number) : null;
const out = resolve(opt('out', 'playtest/motion-film/film.png'));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto(BASE + url);
  await page.waitForFunction(() => !!window.__ascendant);
  await page.waitForTimeout(1200);
  if (setup) await page.evaluate((code) => new Function('a', code)(window.__ascendant), setup);
  await page.waitForTimeout(300);

  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let t0 = null;
  cdp.on('Page.screencastFrame', async (f) => {
    const at = f.metadata.timestamp * 1000;
    if (t0 === null) t0 = at;
    frames.push({ at: at - t0, data: f.data });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: vw, maxHeight: vh, everyNthFrame: 1 });
  await page.waitForTimeout(100);
  const actAt = Date.now();
  if (act) await page.evaluate((code) => new Function('a', code)(window.__ascendant), act);
  await page.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  // Frames are pushed only when something changed on screen: their stamps are the times of change.
  const kept = frames.filter((_, i) => i % every === 0);
  console.log(`motion-film: ${frames.length} frames over ${Math.round(frames.at(-1)?.at ?? 0)} ms (act at +${Math.round(Date.now() - actAt - ms)} ms drift), ${kept.length} kept.`);

  // The contact sheet: the frames in a grid, each with its time, drawn by a blank page and screenshotted whole.
  const sheet = await browser.newPage();
  const cell = clip ? { w: clip[2], h: clip[3] } : { w: Math.round(vw / 3), h: Math.round(vh / 3) };
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#1d1a22;font:12px system-ui;color:#fff6ec">
    <div style="display:grid;grid-template-columns:repeat(${cols},${cell.w}px);gap:6px;padding:6px">
    ${kept.map((f) => `<figure style="margin:0"><div style="width:${cell.w}px;height:${cell.h}px;overflow:hidden;position:relative;background:#000">
      <img src="data:image/jpeg;base64,${f.data}" style="position:absolute;${clip ? `left:${-clip[0]}px;top:${-clip[1]}px;width:${vw}px;height:${vh}px` : `left:0;top:0;width:100%;height:100%`}"></div>
      <figcaption style="padding:2px 0">+${Math.round(f.at)} ms</figcaption></figure>`).join('')}
    </div></body>`;
  await sheet.setContent(html);
  await sheet.setViewportSize({ width: 12 + cols * (cell.w + 6), height: 600 });
  mkdirSync(dirname(out), { recursive: true });
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(`motion-film: ${out}`);
} finally {
  await browser.close();
}

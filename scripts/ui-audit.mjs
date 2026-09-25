#!/usr/bin/env node
// The UI audit — the measuring half of the UI review (docs/design/ui-doctrine.md). Opens each screen on the
// running dev server, screenshots it, and measures what a doctrine can be measured on: how much text is on the
// screen and where the long blocks are (D1), how many doors there are (D2), plain tables and text-only grids
// (D3), contrast failures (D5), native title= and unnamed controls (D2/D8), overflow (D8). Then the static
// half over the changed files: dead CSS classes, hex literals, title= in JSX (D6/D7).
//
// It does not judge. The ui-reviewer agent reads its report and the screenshots and judges.
//
// Usage: npm run ui:audit                       screens for the files changed since HEAD (+ untracked)
//        npm run ui:audit -- --screens hub,combat  named screens
//        npm run ui:audit -- --all
//        npm run ui:audit -- --files src/ui/screens/hub/PokeMart.tsx   (map these files to screens)
// Needs the dev server on http://localhost:5173 (npm run dev). Writes playtest/ui-audit/<screen>.{png,json}
// and playtest/ui-audit/report.md, and prints the report.
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname, basename } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'playtest/ui-audit');
const BASE = process.env.UI_AUDIT_BASE ?? 'http://localhost:5173';
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);

// ── Screens: how to reach each one, and which source files it is the picture of ──────────────────────────
// `setup` runs against window.__ascendant (the dev hook); `clicks` are data-testids pressed in order.
const SCREENS = {
  menu: { url: '/?screen=menu', match: [/screens\/MainMenu/, /App\.tsx/] },
  about: { url: '/?screen=about', match: [/screens\/AboutScreen/] },
  changelog: { url: '/?screen=changelog', match: [/screens\/ChangelogScreen/, /content\/changelog/] },
  settings: { url: '/?screen=settings', match: [/screens\/SettingsScreen/] },
  hub: { url: '/?screen=hub', match: [/screens\/HubScreen/, /hub\/(TrainerCard|LevelRing|RewardTrack|Hub\.module|trackText|TokenIcon)/] },
  'hub-pc': { url: '/?screen=hub', clicks: ['kiosk-pc'], match: [/hub\/(PcTerminal|BondBar|rankIcons|Hub\.module)/] },
  'hub-pc-sheet': { url: '/?screen=hub', setup: ['meta.record([{ t: "combat-end", outcome: "victory", kind: "wild", damageTaken: 0, manualSwaps: 0, faints: 0, defeated: ["pidgey"], enemies: ["pidgey"], activeSpecies: ["squirtle"], leadTurns: { squirtle: 3 } }])'], clicks: ['kiosk-pc', 'dex-squirtle'], match: [/hub\/(PcSheet|SpeciesSheet|LineSheet|usePcSheet)/] },
  'hub-mart': { url: '/?screen=hub', setup: ['meta.tokens(9)'], clicks: ['kiosk-mart'], match: [/hub\/(PokeMart|frames)/] },
  'hub-daycare': { url: '/?screen=hub', setup: ['meta.xp(3000)'], clicks: ['kiosk-daycare'], match: [/hub\/Daycare/] },
  starter: { url: '/?screen=starter', match: [/screens\/StarterSelect/] },
  combat: { url: '/?scenario=wild-basic&seed=7', match: [/screens\/CombatScreen/, /components\/(EnemyPanel|Portrait|MoveCard|HpBar|ConsumableCard|CombatLog|FloatingNumbers|SwapOrSkip|TypeBadge|OutcomeOverlay)/, /ui\/tooltip/, /ui\/tips/] },
  'combat-boss': { url: '/?scenario=wild-boss-3phase&seed=7', match: [/components\/EnemyPanel/, /combat\/boss/] },
  map: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'goTo("map")'], match: [/screens\/MapScreen/, /components\/(NodeMarker|NodePreviewCard|BoxPanel|InventoryDrawer|Money)/] },
  // §2.11 — the towns. `run.city(n)` stands the run in one (0 Pallet Town, 1 Celadon City); the buildings are clicks.
  city: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(4)', 'run.city(0)'], match: [/screens\/city\//, /ui\/strings/] },
  'city-celadon': { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.city(1)'], match: [/screens\/city\//] },
  'city-gate': { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.city(0)'], clicks: ['door-gate'], match: [/screens\/city\/CityScreen/] },
  dojo: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(3)', 'run.city(0)', 'run.pay(600)'], clicks: ['door-dojo'], match: [/screens\/DojoScreen/, /components\/MoveManager/] },
  center: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.city(0)', 'run.trauma(2)', 'run.pay(600)'], clicks: ['door-center'], match: [/screens\/CenterScreen/] },
  shop: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.city(0)', 'run.pay(600)', 'run.wear("leftovers")'], clicks: ['door-mart'], match: [/screens\/ShopScreen/, /components\/ItemCard/] },
  // v0.7.2 — the city: the Ring (§2.9.4.1; its own building since v0.7.7), its prize, the Game Corner (§2.11.5), the store's floors (§2.11.2).
  ring: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(3)', 'run.city(0)', 'run.pay(1000)'], clicks: ['door-ring'], match: [/screens\/RingScreen/, /components\/ConfirmLeave/] },
  'ring-climb': { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(3)', 'run.city(1)', 'run.pay(1000)'], clicks: ['door-ring', 'btn-ring-enter'], match: [/screens\/RingScreen/] },
  'ring-prize': {
    url: '/?screen=menu',
    setup: [
      'run.new("squirtle", 7)', 'run.fill(3)', 'run.city(0)', 'run.pay(1000)',
      'run.dispatch({ type: "enter-building", building: "ring" })', 'run.dispatch({ type: "enter-ring" })',
      ...[0, 1].flatMap(() => ['run.dispatch({ type: "ring-fight" })', 'run.dispatch({ type: "finish-combat", report: { outcome: "victory", team: a.run.state().activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: a.run.state().balls, turns: 5 } })']),
      'goTo("map")',
    ],
    match: [/screens\/RingPrizeScreen/, /components\/RelicOffer/, /screens\/LegendaryScreen/],
  },
  'game-corner': { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.city(1)', 'run.pay(1000)'], clicks: ['door-game-corner', 'btn-spin', 'btn-pull'], match: [/screens\/GameCornerScreen/, /screens\/GameCornerRoom/] },
  // v0.7.7 — Team Rocket's Black Market (§2.11.6): the Game Corner's back wall once the switch is pushed, and the
  // market's counters.
  'game-corner-open': { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.city(1)', 'run.pay(1000)'], clicks: ['door-game-corner', 'gc-poster', 'btn-switch-push'], match: [/screens\/GameCornerRoom/] },
  'black-market': { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(5)', 'run.city(1)', 'run.pay(3000)', 'run.dispatch({ type: "enter-building", building: "game-corner" })', 'run.dispatch({ type: "push-switch" })', 'run.dispatch({ type: "enter-black-market" })'], match: [/screens\/BlackMarketScreen/, /components\/ConfirmLeave/] },
  'black-market-gambler': { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(3)', 'run.city(1)', 'run.pay(3000)', 'run.grantRelic("coin-pouch")', 'run.grantRelic("brave-charm")', 'run.dispatch({ type: "enter-building", building: "game-corner" })', 'run.dispatch({ type: "push-switch" })', 'run.dispatch({ type: "enter-black-market" })'], clicks: ['market-gambler', 'stake-coin-pouch'], match: [/screens\/BlackMarketScreen/] },
  store: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(3)', 'run.city(1)', 'run.pay(3000)'], clicks: ['door-department-store'], match: [/screens\/ShopScreen/] },
  // v0.7.6 — the Safari Zone (§2.11.6): the entrance with today's lineup, and a stalk on its board.
  safari: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.city(0)', 'run.pay(1000)'], clicks: ['door-safari', 'btn-guide-back'], match: [/screens\/safari\//] },
  // The How to play opens by itself on a fresh browser, which is what the audit is: measure it on its third page.
  'safari-guide': { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.city(0)'], clicks: ['door-safari', 'btn-guide-next', 'btn-guide-next'], match: [/screens\/safari\/(SafariGuide|CellArt|tiles|Tiles)/] },
  'safari-stalk': {
    url: '/?screen=menu',
    setup: ['run.new("squirtle", 7)', 'run.city(1)', 'run.pay(1000)', 'run.dispatch({ type: "enter-building", building: "safari" })', 'run.dispatch({ type: "enter-safari" })', 'run.dispatch({ type: "safari-approach", spot: 3 })'],
    clicks: ['btn-guide-back'],
    match: [/screens\/safari\//],
  },
  merchant: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(3)', 'run.levelTo(20)', 'run.goto("merchant")', 'goTo("map")'], match: [/screens\/ShopScreen/] },
  aid: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.fill(3)', 'run.levelTo(20)', 'run.goto("aid")', 'goTo("map")'], match: [/screens\/AidScreen/] },
  mystery: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.goto("mystery")', 'goTo("map")'], match: [/screens\/EventScreen/] },
  evolution: { url: '/?screen=menu', setup: ['run.new("squirtle", 7)', 'run.goto("wild", true)', 'goTo("map")'], match: [/screens\/EvolutionScreen/] },
};

// ── Which screens? ───────────────────────────────────────────────────────────────────────────────────────
function changedFiles() {
  const list = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
  const files = new Set([...list('git diff --name-only HEAD'), ...list('git ls-files --others --exclude-standard')]);
  return [...files].filter((f) => /^src\/(ui|app)\/.*\.(tsx|ts|css)$/.test(f));
}
function screensFor(files) {
  const out = new Set();
  for (const f of files) for (const [id, s] of Object.entries(SCREENS)) if (s.match.some((re) => re.test(f))) out.add(id);
  return [...out];
}
const files = opt('--files') ? opt('--files').split(',') : changedFiles();
let screens = args.includes('--all') ? Object.keys(SCREENS) : opt('--screens') ? opt('--screens').split(',') : screensFor(files);
screens = screens.filter((s) => SCREENS[s]);

// ── In-page measurement ──────────────────────────────────────────────────────────────────────────────────
// Runs inside the page. Returns plain data; every number here maps to a doctrine id.
function measure() {
  const vis = (el) => {
    if (!(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  // Effective background: walk up, compositing translucent colours; a gradient or image makes it unknown.
  const bgOf = (el) => {
    let acc = null;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { unknown: true };
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? blend(acc, c) : c;
        if (acc.a >= 0.999) return acc;
      }
    }
    return acc ? blend(acc, { r: 255, g: 255, b: 255, a: 1 }) : { r: 255, g: 255, b: 255, a: 1 };
  };
  const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const where = (el) => {
    const t = el.closest('[data-testid]');
    return t ? t.getAttribute('data-testid') : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
  };

  // Text blocks: each element's own text nodes, merged.
  const blocks = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || !vis(el) || el.closest('[role="tooltip"]') || el.closest('script,style')) continue;
    blocks.set(el, ((blocks.get(el) ?? '') + ' ' + t).trim());
  }
  let totalChars = 0;
  const long = [];
  const contrastFails = [];
  const accentText = [];
  let unknownBg = 0;
  for (const [el, text] of blocks) {
    totalChars += text.length;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    if (text.length > 120) long.push({ chars: text.length, at: where(el), text: text.slice(0, 110) + '…' });
    const fg = parse(cs.color);
    const bg = bgOf(el);
    if (!fg) continue;
    if (bg.unknown) { unknownBg++; continue; }
    const ratio = contrast(fg.a < 1 ? blend(fg, bg) : fg, bg);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    if (ratio < (large ? 3 : 4.5)) contrastFails.push({ ratio: Math.round(ratio * 100) / 100, need: large ? 3 : 4.5, size: Math.round(size), at: where(el), text: text.slice(0, 60), fg: cs.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})` });
  }
  long.sort((a, b) => b.chars - a.chars);

  // Doors (D2): everything carrying a tooltip, and the InfoDots among them.
  const tipped = document.querySelectorAll('[aria-describedby="app-tooltip"]').length;
  const infoDots = [...document.querySelectorAll('button[aria-label="More about this"], button[aria-label^="More about"]')].filter(vis).length;
  const titles = [...document.querySelectorAll('[title]')].filter(vis).map((e) => ({ at: where(e), title: e.getAttribute('title') }));

  // Names (D8).
  const unnamed = [...document.querySelectorAll('button, a, input, select, textarea, [role="button"]')].filter(vis).filter((e) => {
    const name = (e.getAttribute('aria-label') || e.textContent || '').trim();
    return !name && !e.getAttribute('aria-labelledby') && !e.querySelector('img[alt]:not([alt=""])');
  }).map(where);

  // Plain grids (D3): tables, and lists of 8+ children with no picture in them.
  const tables = document.querySelectorAll('table').length;
  const textOnlyLists = [...document.querySelectorAll('ul, ol, [role="list"]')].filter(vis).filter((l) => {
    const kids = [...l.children].filter(vis);
    return kids.length >= 8 && kids.every((k) => !k.querySelector('img, svg, canvas, picture'));
  }).map((l) => ({ at: where(l), rows: [...l.children].filter(vis).length }));

  // Overflow (D8): anything sticking out of the viewport horizontally, and horizontal page scroll.
  const vw = document.documentElement.clientWidth;
  // Inside a scroller or a clipped box, sticking out is the design (a road you scroll), not a bug.
  const clipped = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
  const overflowing = [...document.querySelectorAll('body *')].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.right > vw + 1 && r.width < vw && !clipped(e); }).slice(0, 8).map(where);
  const pageScrollX = document.documentElement.scrollWidth > vw + 1;

  const interactive = [...document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(vis).length;
  return { totalChars, blocks: blocks.size, long: long.slice(0, 10), contrastFails: contrastFails.slice(0, 20), contrastUnknownBg: unknownBg, tipped, infoDots, titles, unnamed, tables, textOnlyLists, overflowing, pageScrollX, interactive, accentText };
}

// ── Static checks over the changed files (D6, D7, D2) ────────────────────────────────────────────────────
function staticChecks(fileList) {
  const out = { deadCss: [], hexLiterals: [], titleAttrs: [] };
  const srcFiles = [];
  (function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx|ts)$/.test(e.name)) srcFiles.push(p); } })(resolve(ROOT, 'src/ui'));
  (function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx|ts)$/.test(e.name)) srcFiles.push(p); } })(resolve(ROOT, 'src/app'));
  const srcText = new Map(srcFiles.map((p) => [p, readFileSync(p, 'utf8')]));
  for (const f of fileList) {
    const abs = resolve(ROOT, f);
    if (!existsSync(abs)) continue;
    const raw = readFileSync(abs, 'utf8');
    // Comments blanked to the same length, so a word like `screens.md` in a note is not read as a class and a
    // hex in a note is not a literal — and line numbers still point at the right line.
    const text = f.endsWith('.css') ? raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')) : raw;
    if (f.endsWith('.module.css')) {
      const classes = [...new Set([...text.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map((m) => m[1]))];
      // Every TSX that imports this module, by file name.
      const name = basename(f);
      const users = [...srcText.entries()].filter(([, t]) => t.includes(`/${name}'`) || t.includes(`./${name}'`)).map(([, t]) => t);
      const used = new Set();
      const prefixes = [];
      for (const t of users) {
        for (const m of t.matchAll(/styles\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) used.add(m[1]);
        for (const m of t.matchAll(/styles\[`([a-zA-Z_][a-zA-Z0-9_]*)\$\{/g)) prefixes.push(m[1]);
        for (const m of t.matchAll(/styles\[['"]([a-zA-Z_][a-zA-Z0-9_-]*)['"]\]/g)) used.add(m[1]);
      }
      const dead = classes.filter((c) => !used.has(c) && !prefixes.some((p) => c.startsWith(p)) && !/^(theme-|sr-only$)/.test(c));
      if (dead.length) out.deadCss.push({ file: f, classes: dead, users: users.length });
      for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        if (!f.endsWith('tokens.css')) out.hexLiterals.push({ file: f, literal: m[0], line: text.slice(0, m.index).split('\n').length });
      }
    }
    if (f.endsWith('.tsx')) {
      // A `title=` on a JSX element (not the `title` prop of <Tip>, <Modal> or Dialog.Title, and not one on a
      // nested <Tip> inside an InfoDot's `tip=` — hence no `<` allowed between the tag and the attribute).
      for (const m of text.matchAll(/<(?!Tip\b|Dialog\.Title\b|Modal\b)[A-Za-z][\w.]*[^<>]*?\stitle=/g)) {
        out.titleAttrs.push({ file: f, line: text.slice(0, m.index).split('\n').length });
      }
      for (const m of text.matchAll(/(?:color|background|border)[^;\n]*?#[0-9a-fA-F]{3,8}\b/g)) {
        out.hexLiterals.push({ file: f, literal: m[0].slice(-7), line: text.slice(0, m.index).split('\n').length });
      }
    }
  }
  return out;
}

// ── Run ──────────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUT, { recursive: true });
  try {
    const r = await fetch(BASE);
    if (!r.ok) throw new Error(String(r.status));
  } catch {
    console.error(`ui-audit: no dev server at ${BASE} — start it (npm run dev) and run again.`);
    process.exit(2);
  }
  const report = [];
  const results = {};
  if (screens.length === 0) {
    report.push(`_No screen maps to the changed UI files (${files.length} file(s)). Pass --screens or --all._`);
  } else {
    const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
    for (const id of screens) {
      const s = SCREENS[id];
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message ?? e)));
      page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
      page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url().replace(BASE, '')}`); });
      await page.goto(BASE + '/?screen=menu');
      await page.evaluate(() => window.localStorage.clear());
      await page.goto(BASE + s.url);
      await page.waitForFunction(() => !!window.__ascendant);
      for (const step of s.setup ?? []) {
        await page.evaluate((code) => new Function('a', `return a.${code}`)(window.__ascendant), step);
        await page.waitForTimeout(150);
      }
      if (s.setup?.length) await page.waitForTimeout(400);
      for (const tid of s.clicks ?? []) {
        await page.getByTestId(tid).first().click();
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(900);
      const data = await page.evaluate(measure);
      const shot = `${id}.png`;
      await page.screenshot({ path: join(OUT, shot) });
      // A second pass at 720p for overflow only (D8).
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(300);
      const small = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const clipped = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
        const over = [...document.querySelectorAll('body *')].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.right > vw + 1 && r.width < vw && !clipped(e); }).slice(0, 8).map((e) => { const t = e.closest('[data-testid]'); return t ? t.getAttribute('data-testid') : e.tagName.toLowerCase(); });
        return { overflowing: over, pageScrollX: document.documentElement.scrollWidth > vw + 1 };
      });
      await page.screenshot({ path: join(OUT, `${id}-720.png`) });
      await page.close();
      const result = { screen: id, url: s.url, screenshot: shot, errors, ...data, at720: small };
      results[id] = result;
      writeFileSync(join(OUT, `${id}.json`), JSON.stringify(result, null, 2));
      report.push(`## ${id}  (${s.url}${s.clicks ? ' → ' + s.clicks.join(' → ') : ''})`);
      report.push(`- screenshot: \`playtest/ui-audit/${shot}\` (and \`${id}-720.png\`)`);
      report.push(`- **D1 text**: ${data.totalChars} chars in ${data.blocks} blocks · ${data.long.length} block(s) over 120 chars`);
      for (const l of data.long) report.push(`  - ${l.chars} chars @ \`${l.at}\`: “${l.text}”`);
      report.push(`- **D2 doors**: ${data.tipped} tooltip carriers, ${data.infoDots} InfoDots, ${data.interactive} interactive elements${data.titles.length ? ` · ⚠ ${data.titles.length} native title= (${data.titles.map((t) => t.at).join(', ')})` : ''}`);
      report.push(`- **D3 shape**: ${data.tables} table(s), ${data.textOnlyLists.length} text-only list(s) of 8+ rows${data.textOnlyLists.length ? ' (' + data.textOnlyLists.map((l) => `${l.at}: ${l.rows}`).join('; ') + ')' : ''}`);
      report.push(`- **D5 contrast**: ${data.contrastFails.length} failure(s)${data.contrastUnknownBg ? ` · ${data.contrastUnknownBg} block(s) on a gradient/image, unmeasured` : ''}`);
      for (const c of data.contrastFails) report.push(`  - ${c.ratio}:1 (needs ${c.need}) ${c.size}px @ \`${c.at}\` “${c.text}” fg ${c.fg} on ${c.bg}`);
      report.push(`- **D8 works**: ${data.unnamed.length} unnamed control(s)${data.unnamed.length ? ' (' + data.unnamed.join(', ') + ')' : ''} · overflow 1080p: ${data.overflowing.length ? data.overflowing.join(', ') : 'none'}${data.pageScrollX ? ' · page scrolls sideways' : ''} · overflow 720p: ${small.overflowing.length ? small.overflowing.join(', ') : 'none'}${small.pageScrollX ? ' · page scrolls sideways' : ''} · console errors: ${errors.length}`);
      for (const e of errors.slice(0, 5)) report.push(`  - ${e.slice(0, 160)}`);
      report.push('');
    }
    await browser.close();
  }

  const st = staticChecks(files);
  report.push('## Static (changed files)');
  report.push(`- files: ${files.length ? files.map((f) => `\`${f}\``).join(', ') : 'none'}`);
  report.push(`- **D7 dead CSS**: ${st.deadCss.length ? st.deadCss.map((d) => `\`${d.file}\` → ${d.classes.join(', ')}${d.users === 0 ? ' (module imported by nothing?)' : ''}`).join('; ') : 'none'}`);
  report.push(`- **D6 literals**: ${st.hexLiterals.length ? st.hexLiterals.map((h) => `\`${h.file}:${h.line}\` ${h.literal}`).join(', ') : 'none'}`);
  report.push(`- **D2 title=**: ${st.titleAttrs.length ? st.titleAttrs.map((t) => `\`${t.file}:${t.line}\``).join(', ') : 'none'}`);
  const md = `# UI audit — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n\nScreens: ${screens.join(', ') || '—'}\n\n${report.join('\n')}\n`;
  writeFileSync(join(OUT, 'report.md'), md);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify({ screens: results, static: st, files }, null, 2));
  console.log(md);
  console.log(`→ ${relative(ROOT, join(OUT, 'report.md'))}`);
}

main().catch((e) => {
  console.error('ui-audit failed:', e.message ?? e);
  process.exit(1);
});

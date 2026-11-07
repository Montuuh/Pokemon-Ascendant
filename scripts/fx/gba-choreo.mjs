#!/usr/bin/env node
// What each FRLG move's battle animation does, read from pret's script: the sprites it creates (template → the C
// callback that moves them), the visual tasks it runs (shakes, blends, slides), its backgrounds, and how long it lasts
// at least (the sum of its `delay`s, in GBA frames at 60 fps). The move-animation report compares our beat with it.
// node scripts/fx/gba-choreo.mjs [out.json]   (default playtest/fx-report/gba.json)
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const src = resolve(root, 'docs/art/sources/pret-battle-anims');
const out = resolve(root, process.argv[2] ?? 'playtest/fx-report/gba.json');

// Sprite templates → callback, sprite tag and size.
const templates = {};
for (const f of readdirSync(resolve(src, 'src')).filter((f) => f.endsWith('.c'))) {
  const text = readFileSync(resolve(src, 'src', f), 'utf8');
  for (const m of text.matchAll(/(?:const\s+)?struct\s+SpriteTemplate\s+(\w+)\s*=\s*\{([\s\S]*?)\};/g)) {
    const body = m[2];
    templates[m[1]] = {
      callback: body.match(/\.callback\s*=\s*(\w+)/)?.[1] ?? '?',
      tag: body.match(/\.tileTag\s*=\s*ANIM_TAG_(\w+)/)?.[1]?.toLowerCase().replace(/_/g, '-') ?? null,
      file: f.replace(/^battle_anim_|\.c$/g, ''),
    };
  }
}

// The script: labels → lines.
const lines = readFileSync(resolve(src, 'data/battle_anim_scripts.s'), 'utf8').split(/\r?\n/);
const labels = {};
let cur = null;
for (const raw of lines) {
  const l = raw.replace(/@.*$/, '');
  const lab = l.match(/^(\w+):/);
  if (lab) {
    cur = lab[1];
    labels[cur] = [];
    continue;
  }
  if (cur && l.trim()) labels[cur].push(l.trim());
}

function walk(label, acc, depth = 0, seen = new Set()) {
  if (!labels[label] || depth > 12) return;
  for (const l of labels[label]) {
    const [cmd, ...rest] = l.split(/\s+/);
    const args = rest.join(' ').split(',').map((s) => s.trim());
    if (cmd === 'createsprite') {
      const t = args[0];
      acc.sprites[t] = (acc.sprites[t] ?? 0) + 1;
    } else if (cmd === 'createvisualtask') {
      const t = args[0].replace(/^AnimTask_/, '');
      acc.tasks[t] = (acc.tasks[t] ?? 0) + 1;
    } else if (cmd === 'delay') acc.delay += Number(args[0]) || 0;
    else if (cmd === 'waitforvisualfinish') acc.waits++;
    else if (cmd === 'fadetobg' || cmd === 'changebg') acc.bgs.add(args[0].replace(/^BG_/, '').toLowerCase());
    else if (cmd === 'monbg') acc.monbg = true;
    else if (cmd === 'call') walk(args[0], acc, depth + 1, seen);
    else if (cmd === 'goto') {
      if (!seen.has(args[0])) {
        seen.add(args[0]);
        walk(args[0], acc, depth + 1, seen);
      }
      return;
    } else if (/^jump|^choosetwoturnanim/.test(cmd)) {
      // A branch (two-turn moves, contest variants): follow the first target once, so its sprites are counted.
      const t = args.find((a) => /^[A-Z]\w+_\w+|^\w+[A-Z]\w*$/.test(a) && labels[a]);
      if (t && !seen.has(t)) {
        seen.add(t);
        walk(t, acc, depth + 1, seen);
      }
    } else if (cmd === 'end' || cmd === 'return') return;
  }
}

const moves = {};
for (const label of Object.keys(labels).filter((k) => k.startsWith('Move_'))) {
  const acc = { sprites: {}, tasks: {}, delay: 0, waits: 0, bgs: new Set(), monbg: false };
  walk(label, acc);
  const key = label.slice(5).toLowerCase().replace(/_/g, '-');
  moves[key] = {
    sprites: Object.entries(acc.sprites).map(([t, n]) => ({ template: t, n, ...(templates[t] ?? { callback: '?', tag: null }) })),
    tasks: acc.tasks,
    // Each wait for the visuals is at least a few frames more than the delays add up to; ~12 is the common tail.
    frames: acc.delay + acc.waits * 12,
    bgs: [...acc.bgs],
    monbg: acc.monbg,
  };
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(moves, null, 1));
const cbs = {};
for (const m of Object.values(moves)) for (const s of m.sprites) cbs[s.callback] = (cbs[s.callback] ?? 0) + s.n;
console.log(`${Object.keys(moves).length} move scripts, ${Object.keys(templates).length} templates, ${Object.keys(cbs).length} distinct sprite callbacks → ${out}`);
console.log(Object.entries(cbs).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${k} ${v}`).join('\n'));

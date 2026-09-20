#!/usr/bin/env node
// Generate the whole art set in one run, then stop. Candidates land in playtest/artgen/; installing the ones
// you picked is a separate, deliberate step (scripts/install-art.mjs), because a model that got it wrong
// should not be able to overwrite a shipped asset.
//
//   node scripts/art-batch.mjs              everything that is missing
//   node scripts/art-batch.mjs scenes       just the 16:9 plates (the only group left)
//   node scripts/art-batch.mjs --force      regenerate even if a candidate already exists
//
// Runs one image at a time on purpose. The API rate-limits a burst, and gen-image already backs off.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';

const OUT = 'playtest/artgen';
const force = process.argv.includes('--force');
const groups = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const want = (g) => groups.length === 0 || groups.includes(g);

const prompts = await readdir('docs/art/prompts');
const has = (name) => prompts.includes(`${name}.txt`);

/** Every job: the prompt to use, the output stem, how many variants, and the shape. */
const jobs = [];

// The 16:9 plates are what the player stares at, so two variants each and full 2K.
if (want('scenes')) {
  for (const id of ['r1-route', 'r1-forest', 'r1-cave', 'gym-arena', 'menu-vista']) {
    if (has(id)) jobs.push({ id, aspect: '16:9', size: '2K', n: 2 });
  }
  // The map is pixel art, so it is generated small on purpose and scaled up with nearest-neighbour at
  // install time. Asking for 2K pixel art just gives you a smooth painting of some pixels.
  if (has('r1-map')) jobs.push({ id: 'r1-map', aspect: '16:9', size: '1K', n: 2, noRef: true });
}

// Icons are small on screen and the prompt is tightly specified, so one variant at 1K is enough.
if (want('items')) {
  for (const p of prompts.filter((f) => f.startsWith('item-'))) {
    jobs.push({ id: p.replace(/\.txt$/, ''), aspect: '1:1', size: '1K', n: 1 });
  }
}
if (want('nodes')) {
  for (const p of prompts.filter((f) => f.startsWith('node-'))) {
    jobs.push({ id: p.replace(/\.txt$/, ''), aspect: '1:1', size: '1K', n: 1 });
  }
}

// The route plate doubles as the style key for everything else, so it has to exist first.
const STYLE_KEY = `${OUT}/r1-route-1.png`;

const done = (job) => (job.n === 1 ? existsSync(`${OUT}/${job.id}.png`) : existsSync(`${OUT}/${job.id}-1.png`));

console.log(`${jobs.length} jobs\n`);
let ok = 0;
let skipped = 0;
let failed = 0;

for (const [i, job] of jobs.entries()) {
  if (!force && done(job)) {
    skipped++;
    console.log(`[${i + 1}/${jobs.length}] skip ${job.id}`);
    continue;
  }
  const args = [
    'scripts/gen-image.mjs',
    '--out', `${OUT}/${job.id}.png`,
    '--prompt-file', `docs/art/prompts/${job.id}.txt`,
    '--aspect', job.aspect,
    '--size', job.size,
    '--n', String(job.n),
  ];
  // Everything after the style key matches against it, so the set reads as one art department.
  // The pixel map deliberately does not match the cel-shaded style key.
  if (job.id !== 'r1-route' && !job.noRef && existsSync(STYLE_KEY)) args.push('--ref', STYLE_KEY);

  console.log(`[${i + 1}/${jobs.length}] ${job.id}  ${job.aspect} ${job.size} ×${job.n}`);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  for (const line of out.split('\n')) {
    if (/wrote|FAILED|rate limited/.test(line)) console.log(`   ${line.trim()}`);
  }
  if (r.status === 0) ok++;
  else failed++;
}

console.log(`\n${ok} generated · ${skipped} already there · ${failed} failed`);

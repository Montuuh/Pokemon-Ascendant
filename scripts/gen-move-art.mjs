#!/usr/bin/env node
// §9.2.3 (v0.9.15) — generate every Gen I move's card illustration, then install it as true pixel art.
//
//   node scripts/gen-move-art.mjs                 every move without art yet
//   node scripts/gen-move-art.mjs ember thunder   just these (regenerates them)
//   node scripts/gen-move-art.mjs --jobs 4        how many generations run at once (default 4)
//
// What each move shows is `docs/art/prompts/move-art.json` (the effect itself, never a creature). This wraps it in one
// style paragraph — FireRed-era pixel art on a flat background — and the move's type palette, so 161 illustrations
// read as one set. Sources land in playtest/artgen/moves/ (git-ignored); `install-move-art.mjs` keys the background
// out, finds the pixel grid and writes public/art/moves/<id>.png. Look at the contact sheet before shipping:
// `node scripts/gen-move-art.mjs --sheet` writes playtest/artgen/moves/sheet.png from what is installed.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const DESCRIBE = JSON.parse(readFileSync('docs/art/prompts/move-art.json', 'utf8'));
const MOVES = JSON.parse(readFileSync('src/content/data/moves.json', 'utf8')).moves;
const typeOf = Object.fromEntries(MOVES.map((m) => [m.id, m.type]));

/** Each type's palette in words, so a Normal move is not drawn in fire colours. */
const PALETTE = {
  normal: 'cream, white and warm soft grey',
  fire: 'warm orange, yellow and red',
  water: 'clear blues and white',
  grass: 'fresh leaf greens with a little yellow',
  electric: 'bright yellow and white with a pale blue glow',
  ice: 'pale cyan, icy blue and white',
  fighting: 'warm browns, tan and red',
  poison: 'purples and magenta',
  ground: 'earthy browns, tan and ochre',
  flying: 'sky blue and white',
  psychic: 'pinks, magenta and violet',
  bug: 'lime and yellow-green',
  rock: 'grey-brown stone and tan',
  ghost: 'deep purple and black with a pale glow',
  dragon: 'indigo, violet and blue',
};

const args = process.argv.slice(2);
const jobs = Number(args[args.indexOf('--jobs') + 1] || 4) || 4;
const named = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--jobs');

if (args.includes('--sheet')) {
  // A contact sheet of every installed illustration at 3×, eight a row, for judging the set at a glance.
  const ids = Object.keys(DESCRIBE).filter((k) => k !== '_note' && existsSync(`public/art/moves/${k}.png`));
  const CELL = { w: 220, h: 120 };
  const cols = 8;
  const rows = Math.ceil(ids.length / cols);
  const tiles = [];
  for (const [i, id] of ids.entries()) {
    const meta = await sharp(`public/art/moves/${id}.png`).metadata();
    const scale = Math.max(1, Math.min(3, Math.floor(Math.min((CELL.w - 8) / meta.width, (CELL.h - 20) / meta.height))));
    const img = await sharp(`public/art/moves/${id}.png`).resize({ width: meta.width * scale, kernel: 'nearest' }).toBuffer();
    tiles.push({ input: img, left: (i % cols) * CELL.w + 4, top: Math.floor(i / cols) * CELL.h + 4 });
    tiles.push({ input: Buffer.from(`<svg width="${CELL.w}" height="16"><text x="0" y="12" font-size="12" fill="#fff6ec" font-family="sans-serif">${id}</text></svg>`), left: (i % cols) * CELL.w + 4, top: Math.floor(i / cols) * CELL.h + CELL.h - 16 });
  }
  await sharp({ create: { width: cols * CELL.w, height: rows * CELL.h, channels: 4, background: '#2a2230' } }).composite(tiles).png().toFile('playtest/artgen/moves/sheet.png');
  console.log(`playtest/artgen/moves/sheet.png — ${ids.length} illustrations`);
  process.exit(0);
}

const todo = (named.length ? named : Object.keys(DESCRIBE).filter((k) => k !== '_note' && !existsSync(`public/art/moves/${k}.png`)));
mkdirSync('playtest/artgen/moves/prompts', { recursive: true });

const prompt = (id) => `A single card illustration for a cheerful creature-battling card game, in the exact style of 16-bit Game Boy Advance pixel art (Pokémon FireRed era): VERY LOW RESOLUTION — the whole picture is only about 64 pixels wide and 42 pixels tall, every pixel a big square block — crisp hard pixels, a limited palette of about 8 colours, 1-pixel dark outlines, no anti-aliasing, no gradients, no fine detail.

Subject: the effect of the move "${id.replace(/-/g, ' ')}" — ${DESCRIBE[id]}. Colours: ${PALETTE[typeOf[id]] ?? PALETTE.normal}.

Composition: landscape 3:2, the effect centred and large, filling most of the frame; plain flat background of one single soft dark plum colour. No creature, no animal, no character, no person, no text, no letters, no numbers, no border, no frame, no UI.`;

const run = (cmd, argv) =>
  new Promise((done) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => done({ code, out }));
  });

let next = 0;
const failed = [];
async function worker() {
  while (next < todo.length) {
    const id = todo[next++];
    if (!DESCRIBE[id]) {
      failed.push(`${id} (no description)`);
      continue;
    }
    const file = `playtest/artgen/moves/prompts/${id}.txt`;
    writeFileSync(file, prompt(id));
    const src = `playtest/artgen/moves/${id}.png`;
    const gen = await run(process.execPath, ['scripts/gen-image.mjs', '--out', src, '--prompt-file', file, '--aspect', '3:2', '--size', '1K', '--model', 'gemini-2.5-flash-image']);
    if (gen.code !== 0 || !existsSync(src)) {
      failed.push(`${id} (generation)`);
      console.log(`✗ ${id}: ${gen.out.split('\n').find((l) => /FAILED|no image/.test(l))?.trim() ?? gen.out.trim().split('\n').pop()}`);
      continue;
    }
    const inst = await run(process.execPath, ['scripts/install-move-art.mjs', src, id]);
    if (inst.code !== 0) failed.push(`${id} (install)`);
    console.log(`${inst.code === 0 ? '✓' : '✗'} ${inst.out.trim()}`);
  }
}
await Promise.all(Array.from({ length: jobs }, worker));
console.log(`done: ${todo.length - failed.length}/${todo.length}${failed.length ? ` · failed: ${failed.join(', ')}` : ''}`);

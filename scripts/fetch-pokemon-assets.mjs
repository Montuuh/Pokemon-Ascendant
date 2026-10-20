#!/usr/bin/env node
// Fetch map-marker emblems from Bulbagarden archives.
// Item, TM, stone, held-item and relic sprites are fetched as 24×24 GBA/DS pixel art by `scripts/fetch-item-icons.mjs`.
//
//   npm run art:pokemon            fetch everything missing
//   npm run art:pokemon -- --force re-download
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../playtest/artgen/official');
const force = process.argv.includes('--force');
const UA = 'PokemonAscendant/0.2 (non-commercial fan game; contact via project repo)';

/** Map-marker emblems, by Bulbagarden file title. */
const EMBLEMS = {
  'emblem-gym': 'File:Boulder Badge.png',
  'emblem-center': 'File:Pokémon Center HGSS.png',
  'emblem-wild': 'File:HGSS Long Grass.png',
  // §2.9.4 — the Dojo. The Saffron Fighting Dojo's overworld building, same era and scale as the Centre.
  'emblem-dojo': 'File:Fighting Dojo Exterior FRLG.png',
};

const exists = async (p) => access(p).then(() => true, () => false);

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 200) throw new Error('suspiciously small, probably an error page');
  await writeFile(dest, bytes);
  return bytes.length;
}

/** Bulbagarden file titles do not map to URLs predictably, so ask the API for them. */
async function resolveArchiveUrls(titles) {
  const q = new URL('https://archives.bulbagarden.net/w/api.php');
  q.searchParams.set('action', 'query');
  q.searchParams.set('format', 'json');
  q.searchParams.set('prop', 'imageinfo');
  q.searchParams.set('iiprop', 'url|size');
  q.searchParams.set('titles', titles.join('|'));
  const res = await fetch(q, { headers: { 'user-agent': UA } });
  const json = await res.json();
  const out = {};
  for (const page of Object.values(json.query?.pages ?? {})) {
    if (page.imageinfo?.[0]) out[page.title] = page.imageinfo[0];
  }
  return out;
}

await mkdir(OUT, { recursive: true });
let ok = 0;
let skip = 0;
let fail = 0;

console.log('emblems — Bulbagarden archives\n');
const resolved = await resolveArchiveUrls(Object.values(EMBLEMS));
for (const [id, title] of Object.entries(EMBLEMS)) {
  const dest = `${OUT}/${id}.png`;
  if (!force && (await exists(dest))) { skip++; console.log(`  skip ${id}`); continue; }
  const info = resolved[title];
  if (!info) { fail++; console.log(`  FAIL ${id.padEnd(16)} not found: ${title}`); continue; }
  try {
    const size = await download(info.url, dest);
    ok++;
    console.log(`  ok   ${id.padEnd(16)} ${info.width}×${info.height} ${Math.round(size / 1024)}KB`);
  } catch (e) {
    fail++;
    console.log(`  FAIL ${id.padEnd(16)} ${e.message}`);
  }
}

console.log(`\n${ok} downloaded · ${skip} already there · ${fail} failed`);
console.log(`→ ${OUT}`);
process.exit(fail ? 1 : 0);

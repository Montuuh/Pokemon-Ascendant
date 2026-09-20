#!/usr/bin/env node
// Fetch the *actual* Pokémon assets, not an impression of them.
//
// A generative model approximates an object; it cannot reproduce a specific one. For anything the player
// already knows by heart — a Potion, a Poké Ball, the Boulder Badge, a Pokémon Centre — an approximation
// reads as wrong no matter how well drawn it is. So those come from the real sources and generation is kept
// for the scenes, which have no canonical original to get wrong.
//
//   npm run art:pokemon            fetch everything missing
//   npm run art:pokemon -- --force re-download
//
// Sources, in the order we prefer them:
//   Serebii itemdex/sv  · the Scarlet & Violet item renders, 160², smooth and current
//   Bulbagarden archives · badges and overworld building/tile sprites, via the MediaWiki API
// Both are fan archives of Nintendo / Creatures / GAME FREAK artwork. Fan, non-commercial use only; the
// disclaimer and the per-family credits are in docs/art/ATTRIBUTION.md.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../playtest/artgen/official');
const force = process.argv.includes('--force');
const UA = 'PokemonAscendant/0.2 (non-commercial fan game; contact via project repo)';

/** Our consumable id → the name Serebii files it under. */
const ITEMS = {
  potion: 'potion',
  'super-potion': 'superpotion',
  antidote: 'antidote',
  'burn-heal': 'burnheal',
  'ice-heal': 'iceheal',
  awakening: 'awakening',
  'paralyze-heal': 'paralyzeheal',
  'full-heal': 'fullheal',
  ether: 'ether',
  'x-attack': 'xattack',
  'poke-ball': 'pokeball',
};

/** Map-marker emblems, by Bulbagarden file title. */
const EMBLEMS = {
  'emblem-gym': 'File:Boulder Badge.png',
  'emblem-center': 'File:Pokémon Center HGSS.png',
  'emblem-wild': 'File:HGSS Long Grass.png',
  // §2.9.4 — the Dojo. The Saffron Fighting Dojo's overworld building, same era and scale as the Centre.
  'emblem-dojo': 'File:Fighting Dojo Exterior FRLG.png',
};

/**
 * §6.4.1 — TM discs. A TM's colour is its move's type in the real games, so each of our three gets its own
 * disc rather than one generic icon, plus a Normal disc for the bag badge.
 */
const TMS = {
  'item-tm': 'File:Bag TM Normal SV Sprite.png',
  'item-tm-fire': 'File:Bag TM Fire SV Sprite.png',
  'item-tm-water': 'File:Bag TM Water SV Sprite.png',
  'item-tm-ground': 'File:Bag TM Ground SV Sprite.png',
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

console.log('items — Serebii Scarlet & Violet renders\n');
for (const [id, slug] of Object.entries(ITEMS)) {
  const dest = `${OUT}/item-${id}.png`;
  if (!force && (await exists(dest))) { skip++; console.log(`  skip ${id}`); continue; }
  try {
    const size = await download(`https://www.serebii.net/itemdex/sprites/sv/${slug}.png`, dest);
    ok++;
    console.log(`  ok   ${id.padEnd(16)} ${Math.round(size / 1024)}KB`);
  } catch (e) {
    fail++;
    console.log(`  FAIL ${id.padEnd(16)} ${e.message}`);
  }
}

console.log('\nemblems and TM discs — Bulbagarden archives\n');
const fromArchive = { ...EMBLEMS, ...TMS };
const resolved = await resolveArchiveUrls(Object.values(fromArchive));
for (const [id, title] of Object.entries(fromArchive)) {
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

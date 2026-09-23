#!/usr/bin/env node
// Fetch the real game assets behind the map's node badges, from the Bulbagarden Archives MediaWiki API.
// Usage: node scripts/fetch-map-emblems.mjs [--force]
//
// The badges are real assets on a cream disc, not illustrations of real assets — see docs/art/ATTRIBUTION.md.
// This script only downloads the source; `install-art badge` mounts it. Sources land in playtest/artgen/ so
// the raw file is never confused with the shipped one.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'playtest/artgen');
const force = process.argv.includes('--force');

// local name → Archives File: title. Keeping the HGSS set together is what makes the badges look like one
// map rather than a collage: the ? matches the HGSS era of the rest of the map's emblems.
const EMBLEMS = {
  'emblem-mystery': 'HGSS Question Mark Sprite.png',
  // §5.10 — the four Region 1 badges, one per Gym type, so the two ends of the fork are told apart by the
  // thing the player is actually choosing between rather than by a caption.
  'emblem-gym-rock': 'Boulder Badge.png',
  'emblem-gym-water': 'Cascade Badge.png',
  'emblem-gym-bug': 'Hive Badge.png',
  'emblem-gym-normal': 'Plain Badge.png',
  // v0.7.3 — the four Region 2 badges. Koga's Poison Gym gives the Soul Badge, as in Gen I (§5.10.2).
  'emblem-gym-fire': 'Volcano Badge.png',
  'emblem-gym-grass': 'Rainbow Badge.png',
  'emblem-gym-electric': 'Thunder Badge.png',
  'emblem-gym-poison': 'Soul Badge.png',
  // v0.7.4 — the four Region 3 badges (§5.10.3): Sabrina's Marsh Badge, Giovanni's Earth, the Knuckle Badge
  // (the games' Fighting-Gym badge) and Pryce's Glacier.
  'emblem-gym-psychic': 'Marsh Badge.png',
  'emblem-gym-ground': 'Earth Badge.png',
  'emblem-gym-fighting': 'Knuckle Badge.png',
  'emblem-gym-ice': 'Glacier Badge.png',
};

const API = 'https://archives.bulbagarden.net/w/api.php';
const UA = 'PokemonAscendant/0.4 (non-commercial fan project; art attribution in docs/art/ATTRIBUTION.md)';
const exists = async (p) => access(p).then(() => true, () => false);

async function directUrl(title) {
  const q = `${API}?action=query&titles=${encodeURIComponent(`File:${title}`)}&prop=imageinfo&iiprop=url&format=json`;
  const res = await fetch(q, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const pages = (await res.json()).query?.pages ?? {};
  const info = Object.values(pages)[0]?.imageinfo?.[0];
  if (!info?.url) throw new Error('no imageinfo');
  return info.url;
}

await mkdir(OUT, { recursive: true });
let ok = 0, skip = 0, fail = 0;
for (const [local, title] of Object.entries(EMBLEMS)) {
  const dest = resolve(OUT, `${local}.png`);
  if (!force && (await exists(dest))) { skip++; console.log(`skip ${local}`); continue; }
  try {
    const res = await fetch(await directUrl(title), { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(String(res.status));
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    ok++; console.log(`ok   ${local}  (${title})`);
  } catch (e) {
    fail++; console.log(`FAIL ${local}: ${e.message}`);
  }
}
console.log(`\n${ok} downloaded, ${skip} skipped, ${fail} failed`);
console.log('Next: node scripts/install-art.mjs badge playtest/artgen/emblem-gym-rock.png node-gym-rock');
process.exit(fail ? 1 : 0);

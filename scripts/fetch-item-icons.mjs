#!/usr/bin/env node
// Fetch relic and held-item icons from the PokéAPI sprite set into public/art/items.
// Usage: npm run art:items [-- --force]
//
// Every held item in §7.4 is a real Pokémon item, so all nineteen come straight off the shelf. Relics are
// ours, so most of them borrow the real item they are named after — Coin Pouch takes the Amulet Coin, Lucky
// Egg Token takes the Lucky Egg. Where nothing fits, the row maps to null and the UI draws a rarity glyph
// instead, which is honest: a made-up icon that looks official is worse than no icon at all.
//
// This is the same rule the rest of the pipeline follows (docs/art/ATTRIBUTION.md): generate a scene, fetch
// an object. Never invent an object that is supposed to be a real one.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/items');
const force = process.argv.includes('--force');

/** Held items (§7.4.4) — all nineteen are real items and keep their own names. */
// A few PokéAPI slugs differ from our ids; the map is only for those.
const HELD_SLUG = { nevermeltice: 'never-melt-ice' };

const HELD = [
  'charcoal', 'mystic-water', 'magnet', 'miracle-seed', 'nevermeltice', 'black-belt', 'sharp-beak',
  'twisted-spoon', 'splash-plate', 'flame-plate', 'zap-plate', 'meadow-plate', 'mind-plate',
  'leftovers', 'eviolite', 'focus-sash', 'choice-band', 'choice-scarf', 'thick-club',
];

/** Evolution Items (§6.3.2, §7.2.5) — the five Gen I stones, real items under their own names. */
const STONES = ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone'];

/** §2.11.6 — the Safari Zone's own ball, the real item. */
const SAFARI = ['safari-ball'];

/**
 * Relics (§7.3) — our id → the PokéAPI item whose icon it wears, or null for "no honest match".
 * A null here is a deliberate decision, not a gap: see the header.
 */
const RELIC_ICON = {
  'soft-sand': 'soft-sand',
  'mystic-water-charm': 'mystic-water',
  'charcoal-charm': 'charcoal',
  'miracle-seed-charm': 'miracle-seed',
  'hard-stone': 'hard-stone',
  'sharp-beak-charm': 'sharp-beak',
  'magnet-charm': 'magnet',
  'twisted-spoon-charm': 'twisted-spoon',
  'black-belt-charm': 'black-belt',
  // Pink Bow is a Gen II item with no sprite in the set; the Silk Scarf is its modern equivalent.
  'pink-bow': 'silk-scarf',
  'barrier-charm': 'light-clay',
  'berry-pouch': 'berry-pouch',
  'coin-pouch': 'amulet-coin',
  'cleanse-tag': 'cleanse-tag',
  'lucky-egg-token': 'lucky-egg',
  'exp-share': 'exp-share',
  'quick-draw': 'quick-powder',
  'brave-charm': 'expert-belt',
  'recycle-tag': 'macho-brace',
  'hikers-coat': 'rocky-helmet',
  'defense-curl-charm': 'metal-coat',
  'soothe-bell': 'soothe-bell',
  'wide-lens': 'wide-lens',
  'battle-hat': 'scope-lens',
  'quick-claw-charm': 'quick-claw',
  'choice-specs': 'choice-specs',
  'choice-band-relic': 'choice-band',
  'type-resonance': 'shell-bell',
  'adrenal-surge': 'life-orb',
  'reactor-core': 'power-herb',
  'pressure-plate': 'iron-plate',
  'vital-pendant': 'shell-bell',
  'tacticians-coin': 'smoke-ball',
  'steady-aim': 'zoom-lens',
  'status-lance': 'toxic-orb',
  'healers-kit': 'full-heal',
  'bond-bracelet': 'destiny-knot',
  'lure-module': 'honey',
  'cycle-cell': 'cell-battery',
  'move-echo': 'metronome',
  'trauma-salve': 'heal-powder',
  'hand-off-pouch': 'big-root',
  'battle-tracker': 'binding-band',

  // §7.3.5 Rare + §7.3.7 Legendary (v0.5). Same rule as above: the relic wears the real item it is named
  // after or shares a mechanic with, and a few icons are shared because two relics genuinely do the same
  // kind of thing — Type Mastery and Brave Charm both want the Expert Belt.
  'champions-crest': 'gold-bottle-cap',
  'phoenix-feather': 'sacred-ash',
  'sages-tome': 'wise-glasses',
  'crown-of-echoes': 'kings-rock',
  'master-ball-charm': 'master-ball',
  'time-spinner': 'adamant-orb',
  'soul-link': 'soul-dew',
  'flow-state': 'float-stone',
  'last-stand': 'focus-band',
  'type-mastery': 'expert-belt',
  'clear-mind': 'mental-herb',
  'evolutions-edge': 'moon-stone',
  'grandmasters-tempo': 'metronome',
  'living-legend': 'lucky-egg',
  'unbreakable-will': 'lum-berry',
  'apex-predator': 'razor-claw',
  'battle-hardened': 'assault-vest',
  // §8.6.1 Tier-3 lane (v0.6). Perfect Recall recycles the discard, Trainer's Instinct is a lens on the
  // enemy, the Catalyst is an evolution stone, the Expander is a bigger Box in spirit.
  'perfect-recall': 'reveal-glass',
  'trainers-instinct': 'scope-lens',
  'evolution-catalyst': 'dawn-stone',
  'box-expander': 'exp-share',
};

const url = (slug) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
const exists = async (p) => access(p).then(() => true, () => false);

// Fail loudly if the catalogue grows a row this table has not been told about: a relic with no entry here
// would silently ship iconless, and nobody would notice until it dropped in a playtest.
const relics = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/relics.json'), 'utf8')).relics;
const missing = relics.map((r) => r.id).filter((id) => !(id in RELIC_ICON));
if (missing.length) {
  console.error(`relics with no icon mapping: ${missing.join(', ')}`);
  process.exit(2);
}

const jobs = [
  ...HELD.map((id) => ({ id, slug: HELD_SLUG[id] ?? id })),
  ...STONES.map((id) => ({ id, slug: id })),
  ...SAFARI.map((id) => ({ id, slug: id })),
  ...Object.entries(RELIC_ICON).filter(([, slug]) => slug).map(([id, slug]) => ({ id, slug })),
];

await mkdir(OUT, { recursive: true });
let ok = 0, skip = 0, fail = 0;
for (const { id, slug } of jobs) {
  const dest = resolve(OUT, `${id}.png`);
  if (!force && (await exists(dest))) { skip++; continue; }
  try {
    const res = await fetch(url(slug));
    if (!res.ok) throw new Error(String(res.status));
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    ok++; console.log(`ok   ${id}  (${slug})`);
  } catch (e) {
    fail++; console.log(`FAIL ${id} ← ${slug}: ${e.message}`);
  }
}
console.log(`\n${ok} downloaded, ${skip} skipped, ${fail} failed`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
// Fetch consumable, TM, stone, held-item and relic pixel-art icons from the PokéAPI sprite set into public/art/items.
// Usage: npm run art:items [-- --force]
//
// Per D9 (docs/design/ui-doctrine.md) and docs/art/pipeline.md, every item, TM disc, stone, held item and relic
// uses a 24×24 GBA/DS pixel-art sprite from PokéAPI/sprites — never a 3D Scarlet & Violet render.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/items');
const force = process.argv.includes('--force');

/** Consumables (§7.2) — real Pokémon items plus Defog, which wears the pixel-art Smoke Ball. */
const CONSUMABLE_SLUG = { defog: 'smoke-ball' };
const CONSUMABLES = [
  'potion', 'super-potion', 'hyper-potion', 'max-potion', 'revive',
  'antidote', 'burn-heal', 'ice-heal', 'awakening', 'paralyze-heal', 'full-heal',
  'ether', 'x-attack', 'x-defense', 'poke-ball', 'defog',
];

/** §6.4.1 — TM discs by type (Normal is stored at tm.png). */
const TMS = [
  ['tm', 'tm-normal'],
  ['tm-fire', 'tm-fire'],
  ['tm-water', 'tm-water'],
  ['tm-grass', 'tm-grass'],
  ['tm-electric', 'tm-electric'],
  ['tm-ice', 'tm-ice'],
  ['tm-fighting', 'tm-fighting'],
  ['tm-poison', 'tm-poison'],
  ['tm-ground', 'tm-ground'],
  ['tm-flying', 'tm-flying'],
  ['tm-psychic', 'tm-psychic'],
  ['tm-bug', 'tm-bug'],
  ['tm-rock', 'tm-rock'],
  ['tm-ghost', 'tm-ghost'],
  ['tm-dragon', 'tm-dragon'],
  ['tm-dark', 'tm-dark'],
  ['tm-steel', 'tm-steel'],
];

/** Held items (§7.4) — all 32 are real Pokémon items and keep their own names. */
const HELD_SLUG = { nevermeltice: 'never-melt-ice' };

const HELD = [
  // §7.4.2 Unique type-boosters (11)
  'charcoal', 'mystic-water', 'magnet', 'miracle-seed', 'nevermeltice', 'black-belt', 'sharp-beak',
  'twisted-spoon', 'soft-sand', 'hard-stone', 'silk-scarf',
  // §7.4.3 Type Plates (14)
  'splash-plate', 'flame-plate', 'zap-plate', 'meadow-plate', 'mind-plate',
  'icicle-plate', 'fist-plate', 'earth-plate', 'sky-plate', 'stone-plate',
  'toxic-plate', 'insect-plate', 'spooky-plate', 'draco-plate',
  // Dark and Steel (v0.9.84): the Dark booster and the two plates
  'black-glasses', 'dread-plate', 'iron-plate',
  // §7.4.4–§7.4.6 Sustain, tempo, signatures (7)
  'leftovers', 'eviolite', 'focus-sash', 'power-bracer', 'choice-scarf', 'thick-club', 'light-ball',
];

/** Evolution Items (§6.3.2, §7.2.5) — the five Gen I stones, real items under their own names. */
const STONES = ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'metal-coat'];

/** §2.11.6 — the Safari Zone's own ball, the Black Market Fence's Rare Candy, and the Great and Ultra Balls (§7.2.5): real items all. */
const SAFARI = ['safari-ball', 'rare-candy', 'great-ball', 'ultra-ball', 'master-ball'];

/**
 * Relics (§7.3) — our id → the PokéAPI item whose pixel-art icon it wears.
 */
const RELIC_ICON = {
  // §7.3.3 Common Elemental Gems (10) — +10 % party-wide
  'ground-gem': 'ground-gem',
  'water-gem': 'water-gem',
  'fire-gem': 'fire-gem',
  'grass-gem': 'grass-gem',
  'rock-gem': 'rock-gem',
  'flying-gem': 'flying-gem',
  'electric-gem': 'electric-gem',
  'psychic-gem': 'psychic-gem',
  'fighting-gem': 'fighting-gem',
  'normal-gem': 'normal-gem',
  'dark-gem': 'dark-gem',
  'steel-gem': 'steel-gem',

  'barrier-charm': 'light-clay',
  'berry-pouch': 'berry-pouch',
  'coin-pouch': 'amulet-coin',
  'cleanse-tag': 'cleanse-tag',
  'lucky-egg-token': 'lucky-egg',
  'exp-share': 'exp-share',
  'quick-draw': 'quick-powder',
  'brave-charm': 'red-flute',
  'recycle-tag': 'macho-brace',
  'hikers-coat': 'rocky-helmet',
  'defense-curl-charm': 'metal-powder',
  'soothe-bell': 'soothe-bell',
  'wide-lens': 'wide-lens',
  'battle-hat': 'safety-goggles',
  'quick-claw-charm': 'quick-claw',
  'choice-specs': 'choice-specs',
  'choice-band': 'choice-band',
  'type-resonance': 'odd-keystone',
  'adrenal-surge': 'life-orb',
  'reactor-core': 'power-herb',
  'pressure-plate': 'pixie-plate',
  'vital-pendant': 'shell-bell',
  'tacticians-coin': 'relic-gold',
  'steady-aim': 'zoom-lens',
  'status-lance': 'toxic-orb',
  'healers-kit': 'heal-ball',
  'bond-bracelet': 'destiny-knot',
  'lure-module': 'honey',
  'cycle-cell': 'cell-battery',
  'move-echo': 'metronome',
  'trauma-salve': 'heal-powder',
  'hand-off-pouch': 'big-root',
  'battle-tracker': 'binding-band',

  // §7.3.5 Rare + §7.3.7 Legendary (v0.5).
  'champions-crest': 'gold-bottle-cap',
  'phoenix-feather': 'sacred-ash',
  'sages-tome': 'wise-glasses',
  'crown-of-echoes': 'kings-rock',
  'time-spinner': 'adamant-orb',
  'soul-link': 'soul-dew',
  'flow-state': 'float-stone',
  'last-stand': 'focus-band',
  'type-mastery': 'expert-belt',
  'clear-mind': 'mental-herb',
  'evolutions-edge': 'prism-scale',
  'grandmasters-tempo': 'griseous-orb',
  'living-legend': 'relic-crown',
  'unbreakable-will': 'lum-berry',
  'apex-predator': 'razor-claw',
  'battle-hardened': 'assault-vest',
  // §8.6.1 Tier-3 lane (v0.6).
  'perfect-recall': 'reveal-glass',
  'trainers-instinct': 'scope-lens',
  'evolution-catalyst': 'dawn-stone',
  'box-expander': 'storage-key',
};

const url = (slug) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
const exists = async (p) => access(p).then(() => true, () => false);

// Fail loudly if the catalogue grows a row this table has not been told about.
const relics = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/relics.json'), 'utf8')).relics;
const missingRelics = relics.map((r) => r.id).filter((id) => !(id in RELIC_ICON));
if (missingRelics.length) {
  console.error(`relics with no icon mapping: ${missingRelics.join(', ')}`);
  process.exit(2);
}

const heldItems = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/held-items.json'), 'utf8')).items;
const missingHeld = heldItems.map((i) => i.id).filter((id) => !HELD.includes(id));
if (missingHeld.length) {
  console.error(`held items with no icon mapping: ${missingHeld.join(', ')}`);
  process.exit(2);
}

const jobs = [
  ...CONSUMABLES.map((id) => ({ id, slug: CONSUMABLE_SLUG[id] ?? id })),
  ...TMS.map(([id, slug]) => ({ id, slug })),
  ...HELD.map((id) => ({ id, slug: HELD_SLUG[id] ?? id })),
  ...STONES.map((id) => ({ id, slug: id })),
  ...SAFARI.map((id) => ({ id, slug: id })),
  ...Object.entries(RELIC_ICON).filter(([, slug]) => slug).map(([id, slug]) => ({ id, slug })),
];

// Per D9 — every item, TM, stone, held item and relic must wear a distinct pixel-art sprite.
const seenSlugs = new Map();
for (const { id, slug } of jobs) {
  if (seenSlugs.has(slug)) {
    console.error(`duplicate item icon slug "${slug}" shared by ${seenSlugs.get(slug)} and ${id}`);
    process.exit(2);
  }
  seenSlugs.set(slug, id);
}

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

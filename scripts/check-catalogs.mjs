#!/usr/bin/env node
// Rot-guard for docs/design/catalogs: every backticked kebab-case id used in a catalog must be *defined*
// somewhere in the catalogs (as a table row's first column, or in a heading). Catches typos, renames and
// references to content that was talked about but never authored — the same guarantee the content tests give
// src/content/data, one layer earlier.
//
//   node scripts/check-catalogs.mjs          → report
//   node scripts/check-catalogs.mjs --strict → exit 1 on any unknown reference
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'docs/design/catalogs';
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

// Words that look like ids but are vocabulary, not content: hooks, effect kinds, tags, file stems, jargon.
const ALLOW = new Set([
  // structural / prose
  'kebab-case', 'rot-guard', 'catch-vs-kill', 'lead-only', 'always-crit', 'per-combat', 'per-run', 'boss-wild',
  'single-target', 'multi-hit', 'step-forward', 'step-backward', 'counter-pick', 'run-down', 'one-sided',
  'in-place', 'stage-aware', 'level-gated', 'type-boost', 'wearer-only', 'party-wide', 'opt-in', 'read-only',
  'single-stage', 'three-stage', 'two-stage', 'first-column', 'kebab', 'gen', 'dex',
  // sim field / effect kinds
  'heal-flat', 'cure', 'ap', 'stage', 'catch', 'status', 'draw', 'single', 'cleave', 'backstrike', 'none',
  'melee', 'ranged', 'offensive', 'defensive', 'utility', 'basic', 'stage1', 'stage2',
  'common', 'uncommon', 'rare', 'legendary', 'starter', 'wild', 'trainer', 'elite', 'boss',
  // ability hooks
  'low-hp-type-boost', 'range-boost', 'lead-flat-reduction', 'riders-always-apply', 'reveal-intents', 'sturdy-hook',
  'turn-end-bench-heal', 'start-stage', 'status-immunity', 'type-immunity', 'type-absorb', 'on-enter-lead',
  'on-faint-team', 'stab-multiplier', 'crit-on-crit-taken', 'dot-immunity', 'turn-start-ap', 'field-draw',
  'lead-aura', 'post-combat-loot', 'low-hp-damage-reduction', 'ignore-immunity', 'rider-force-plus-damage',
  'on-damaged', 'on-kill', 'swap-discount', 'stage-immunity', 'enemy-cooldown', 'suppress-move-tag', 'redirect',
  'super-effective-reduction',
  // badge / relic hooks
  'on-damage', 'on-damage-taken', 'on-swap', 'on-reshuffle', 'on-turn-start', 'on-turn-end', 'on-combat-start',
  'on-status-apply', 'on-ap-cost', 'on-card-played', 'on-heal', 'on-reward', 'on-xp', 'on-rider', 'on-kill-credit',
  // mystery-event effect vocabulary
  'grant-item', 'grant-relic', 'grant-money', 'grant-balls', 'heal-box', 'clear-trauma', 'add-trauma', 'recruit',
  'start-combat', 'reveal-map', 'stat-boost', 'swap-stats', 'upgrade-consumable', 'reroll-ability', 'reroll-relic',
  'modify-next-node', 'hand-size', 'xp-multiplier',
  // v0.6 field names on a relic / mastery row
  'tier', 'discovery', 'counters', 'null',
  // map / biome / region ids that live in biomes-regions.md headings
  'region-1', 'region-2', 'region-3',
  // art + tooling
  'gen5ani', 'itch', 'localstorage', 'indexeddb', 'tuned', 'owner',
  // hook/effect parameter names
  'amount', 'cards', 'chance', 'multiplier', 'percent', 'field', 'pool', 'range', 'stat', 'stages',
  'threshold', 'turn', 'type', 'types', 'while-statused', 'lead', 'card', 'combat', 'meta',
  // achievement trigger events
  'combat-end', 'combat-start', 'run-end', 'region-end', 'evolution', 'badge-awarded', 'relic-acquired',
  'status-applied', 'damage-dealt', 'card-played', 'dex-tier-up',
  // trainer sprite stems (Showdown asset names, not content ids)
  'bugcatcher', 'youngster', 'lass', 'hiker', 'swimmer', 'scientist', 'hexmaniac', 'acetrainer',
  'rocketgrunt', 'sailor',
  // ids deliberately reserved with no row yet
  'elite-four-1', 'elite-four-4', 'champion', 'weather-vane', 'riolu',
]);

const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
const defined = new Map(); // id -> file that defines it
const referenced = new Map(); // id -> Set<file>

for (const file of files) {
  const text = readFileSync(join(DIR, file), 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();

    // Definitions, in a table row:
    //   · any cell that is nothing but backticked ids (optionally separated by / · , or spaces)
    //   · `id` followed by a bare dex number, e.g. `tentacool` 72 → `tentacruel` 73
    if (line.startsWith('|')) {
      for (const cell of line.split('|').slice(1, -1)) {
        const c = cell.trim();
        if (c && /^(?:`[a-z0-9-]+`)(?:\s*(?:[/·,]|\s)\s*`[a-z0-9-]+`)*$/.test(c)) {
          for (const [, id] of c.matchAll(/`([a-z0-9-]+)`/g)) defined.set(id, file);
        }
        for (const [, id] of c.matchAll(/`([a-z0-9-]+)`\s+\d{1,3}(?:\b|-)/g)) defined.set(id, file);
      }
    }
    const h = /^#{2,4}\s+`([a-z0-9-]+)`/.exec(line);
    if (h) defined.set(h[1], file);

    // References: every backticked kebab token anywhere.
    for (const [, id] of line.matchAll(/`([a-z0-9-]+)`/g)) {
      if (!KEBAB.test(id) || id.length < 3) continue;
      if (!referenced.has(id)) referenced.set(id, new Set());
      referenced.get(id).add(file);
    }
  }
}

const unknown = [...referenced.entries()]
  .filter(([id]) => !defined.has(id) && !ALLOW.has(id))
  .sort(([a], [b]) => a.localeCompare(b));

console.log(`catalogs: ${files.length} files · ${defined.size} ids defined · ${referenced.size} ids referenced`);
if (unknown.length === 0) {
  console.log('✅ every referenced id resolves');
  process.exit(0);
}
console.log(`\n⚠ ${unknown.length} referenced id(s) with no definition:\n`);
for (const [id, where] of unknown) console.log(`  ${id.padEnd(26)} used in ${[...where].join(', ')}`);
console.log('\nEither add the row that defines it, fix the typo, or add it to ALLOW in this script.');
process.exit(process.argv.includes('--strict') ? 1 : 0);

#!/usr/bin/env node
// §6.9 — v0.9.96, the user's call: "the first levels are slow and hard with so few moves". Every starter walks in (Lv 5) with a
// third card at Lv 3 — the Lv 1 pair stays a pair (§6.9) — (its first move of its type, or the series' later Quick Attack for Pikachu), and the base forms met in the
// first Region that had no hit of their own type before Lv 10 get one around Lv 7 — Diglett and Sandshrew a Mud Shot,
// Onix-style walls their Rock Throw earlier. Each row is the level the series (or a later generation) puts the move at,
// or as near as the run's Region 1 needs it. Idempotent: a row at the target level is left alone. Usage: node scripts/v0996-early-hits.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const file = resolve(ROOT, 'src/content/data/species.json');
const json = JSON.parse(readFileSync(file, 'utf8'));
/** species → [move, level]: the row moves to the level, or is added there. */
const EARLY = {
  bulbasaur: [['vine-whip', 3]],
  charmander: [['ember', 3]],
  squirtle: [['bubble', 3]],
  pikachu: [['quick-attack', 3]],
  eevee: [['sand-attack', 3]],
  'nidoran-f': [['poison-sting', 7]],
  'nidoran-m': [['poison-sting', 7]],
  sandshrew: [['mud-shot', 9]],
  diglett: [['mud-shot', 7]],
  geodude: [['rock-throw', 7]],
  onix: [['rock-throw', 6]],
  grimer: [['acid', 7]],
  shellder: [['water-gun', 8]],
  seel: [['water-gun', 7]],
  voltorb: [['thunder-shock', 6]],
  exeggcute: [['bullet-seed', 11]],
};
let changed = 0;
for (const [id, rows] of Object.entries(EARLY)) {
  const s = json.species.find((x) => x.id === id);
  if (!s) throw new Error(`no species ${id}`);
  for (const [move, level] of rows) {
    const row = s.learnset.find((l) => l.move === move);
    if (row && row.level === level) continue;
    if (row) row.level = level;
    else s.learnset.push({ level, move });
    s.learnset.sort((a, b) => a.level - b.level);
    changed++;
  }
}
writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
console.log(`${changed} rows moved or added`);

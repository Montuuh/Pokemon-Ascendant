import fs from 'node:fs';
const D = 'docs/art/sources/pret-battle-anims';
const OUT = process.argv[2];
const s = fs.readFileSync(D + '/data/battle_anim_scripts.s', 'utf8').split(/\r?\n/);
const gfx = fs.readFileSync(D + '/src/graphics.c', 'utf8');
const tab = fs.readFileSync(D + '/src/data/battle_anim.h', 'utf8');
const labels = {};
let cur = null;
for (const l of s) {
  const m = /^(\w+):{1,2}\s*$/.exec(l);
  if (m) { cur = m[1]; labels[cur] = []; continue; }
  if (cur) labels[cur].push(l.trim());
}
const gfxFile = {};
for (const m of gfx.matchAll(/const u32 (gBattleAnimSpriteGfx_\w+)\[\]\s*=\s*INCBIN_U32\("([^"]+)"/g)) gfxFile[m[1]] = m[2];
const tagFile = {};
for (const m of tab.matchAll(/\{(gBattleAnimSpriteGfx_\w+),\s*0x\w+,\s*(ANIM_TAG_\w+)\}/g))
  tagFile[m[2]] = gfxFile[m[1]]?.replace(/\.4bpp.*$/, '').replace('graphics/battle_anims/', '') ?? m[2];
function walk(lbl, seen = new Set()) {
  const tags = new Set(), bgs = new Set();
  if (seen.has(lbl) || !labels[lbl]) return { tags, bgs };
  seen.add(lbl);
  for (const l of labels[lbl]) {
    let m;
    if ((m = /loadspritegfx (ANIM_TAG_\w+)/.exec(l))) tags.add(m[1]);
    for (const b of l.matchAll(/\b(BG_\w+)/g)) bgs.add(b[1].replace(/_(OPPONENT|PLAYER|CONTESTS)$/, ''));
    for (const t of l.split(/[\s,]+/).slice(1)) if (labels[t] && !t.startsWith('Move_')) { const r = walk(t, seen); r.tags.forEach((x) => tags.add(x)); r.bgs.forEach((x) => bgs.add(x)); }
    if ((m = /^goto (Move_\w+)/.exec(l))) { const r = walk(m[1], seen); r.tags.forEach((x) => tags.add(x)); r.bgs.forEach((x) => bgs.add(x)); }
  }
  return { tags, bgs };
}
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
const out = {};
for (const k of Object.keys(labels)) {
  if (!k.startsWith('Move_')) continue;
  const r = walk(k);
  out[norm(k.slice(5))] = { label: k, sprites: [...r.tags].map((t) => tagFile[t] ?? t), bgs: [...r.bgs] };
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(Object.keys(out).length);
for (const k of ['flamethrower', 'thunder', 'bite', 'tackle', 'surf', 'psychic', 'hijumpkick', 'faintattack']) console.log(k, JSON.stringify(out[k]));

import fs from 'node:fs';
const SP = process.argv[2];
const pret = JSON.parse(fs.readFileSync(SP + '/pret-moves.json', 'utf8'));
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIAS = { highjumpkick: 'hijumpkick', feintattack: 'faintattack', smellingsalts: 'smellingsalt' };
let all = [];
for (const f of ['moves', 'gen1-moves', 'later-moves']) {
  const j = JSON.parse(fs.readFileSync('src/content/data/' + f + '.json', 'utf8'));
  const a = Array.isArray(j) ? j : (j.moves ?? Object.values(j));
  all.push(...a.filter((x) => x && x.id));
}
const byId = new Map();
for (const m of all) if (!byId.has(m.id)) byId.set(m.id, m);
const rows = [];
for (const [id, m] of byId) {
  const base = id.replace(/(-plus)+$/, '');
  const key = ALIAS[norm(base)] ?? norm(base);
  const p = pret[key];
  rows.push({ id, base, name: m.name, type: m.type, role: m.role, range: m.range, power: m.power, plus: base !== id, pret: p ? p.label : null, sprites: p?.sprites ?? [], bgs: p?.bgs ?? [] });
}
fs.writeFileSync(SP + '/rows.json', JSON.stringify(rows, null, 1));
const bases = rows.filter((r) => !r.plus);
console.log('total', rows.length, 'bases', bases.length, 'plus', rows.length - bases.length);
console.log('base with pret', bases.filter((r) => r.pret).length, 'of which no sprite/bg', bases.filter((r) => r.pret && !r.sprites.length && !r.bgs.length).map((r) => r.id).join(' '));
console.log('GAPS:');
for (const r of bases.filter((r) => !r.pret)) console.log(r.id, '|', r.name, '|', r.type, '|', r.role, '|', r.range, '|', r.power);
const sprites = new Set(rows.flatMap((r) => r.sprites));
console.log('distinct pret sprites used', sprites.size);

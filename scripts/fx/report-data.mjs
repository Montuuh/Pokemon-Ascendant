#!/usr/bin/env node
// The move-animation report's data: per base move, what our beat draws (from films.json, written by film-moves.mjs),
// what FRLG's own script does (gba.json, from gba-choreo.mjs), the gaps between them, and the reviewer's verdict
// (verdicts.json, hand-written after looking at the films). → playtest/fx-report/site/data.json
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '../../playtest/fx-report');
const films = JSON.parse(readFileSync(resolve(dir, 'films.json'), 'utf8'));
const gba = JSON.parse(readFileSync(resolve(dir, 'gba.json'), 'utf8'));
const verdicts = existsSync(resolve(dir, 'verdicts.json')) ? JSON.parse(readFileSync(resolve(dir, 'verdicts.json'), 'utf8')) : {};

const PRET_NAME = { 'high-jump-kick': 'hi-jump-kick', 'feint-attack': 'faint-attack', 'smelling-salts': 'smellingsalt', 'vise-grip': 'vice-grip' };
const norm = (s) => s.replace(/[^a-z0-9]/g, '');
const byNorm = new Map(Object.keys(gba).map((k) => [norm(k), k]));
const gbaOf = (id) => gba[PRET_NAME[id] ?? id] ?? gba[byNorm.get(norm(PRET_NAME[id] ?? id))];
const CHATGPT = new Set(['wood-hammer', 'dragon-pulse', 'aura-sphere', 'dark-pulse', 'flash-cannon', 'gunk-shot', 'stone-edge', 'stealth-rock']);

// A pret sprite callback, as one of the motions the GBA moves its sprites in (Spanish, for the report).
const PRIMS = [
  ['golpe', /HitSplat|Impact|CrossImpact|KnockOff|ArmThrust|WhipHit|HornHit|BoneHit(?!Proj)|Stomp|Fang\b|Bite|Pincer|Claw|Slash|Slice|Cut|Scratch|FurySwipes|Lick|SuperFang|Chop/, 'aparece sobre el objetivo y golpea'],
  ['puño', /FistOrFoot|KickOrPunch|Kick|Punch|Hand|Foot/, 'puño o pie que se lanza contra el objetivo'],
  ['embestida', /Lunge|SlideMon|Dip|VerticalDip|BowMon|JumpKick|SlidingKick|RapidSpin|Tackle/, 'el Pokémon se mueve (embiste, se agacha, se desliza)'],
  ['tinte', /PaletteBlend|Blend/, 'tiñe de color al Pokémon o la pantalla'],
  ['onda', /SinWave|SineWave|Wavy|InSin/, 'chorro en onda del usuario al objetivo'],
  ['remolino', /Vortex|Orbit|Swirl|Spiral|Twister|Tornado|Ring\b|Rings|Halo/, 'gira alrededor del Pokémon'],
  ['absorber', /Absorption|Absorb|Drain|LeechLife|Ingrain|Swallow|Mimic/, 'orbes que vuelven del objetivo al usuario'],
  ['caída', /Falling|Fall|Rain|WeatherBallDown|Meteor|Eruption|Hail|Drop(?!let)/, 'cae desde arriba'],
  ['brote', /Plume|Rise|Rising|Endure|Up\b|FlyBallUp|Geyser|Spout|Raise/, 'brota desde los pies hacia arriba'],
  ['dispersión', /Scatter|Spread|Burst|Fragment|Puff|Particle(?!InVortex)|Droplet|Spray|Confetti/, 'se dispersa en partículas'],
  ['rayo', /Beam|Electricity|Lightning|Spark|Zap|Bolt|Shock|Thunder/, 'rayo o electricidad'],
  ['proyectil', /Projectile|Throw|Translate|ToTarget|Missile|Arc|Bubble|Orb|Ball|Stinger|Needle|Seed|Gust|Crescent|Leaf|Star|Thread|Web|Note|Heart|Sludge|Coin|Bonemerang|Pellet/, 'proyectil del usuario al objetivo'],
  ['sobre el Pokémon', /OnMon|SpriteOnMonPos|Mark|Sparkle|Wall|Protect|Guard|Shield|Spotlight|Eye|Question|Letter|Thought|Alert|Exclamation|Status|Angel|Devil|Sword|Spoon|Lock/, 'icono o efecto sobre un Pokémon'],
];
const primOf = (cb) => PRIMS.find(([, re]) => re.test(cb))?.[0] ?? 'propio';
// What our renderer draws, per motion kind.
const OURS = {
  melee: 'el Pokémon salta hasta el objetivo y vuelve; su sprite aparece al golpear',
  projectile: 'carga, un sprite vuela en línea recta y estalla',
  beam: 'carga y 8 sprites cruzan en línea recta',
  bolt: 'un rayo SVG dibujado y el sprite al final',
  drain: 'un tentáculo dibujado y 6 sprites que vuelven',
  area: '3 sprites sobre cada objetivo (o el dibujo antiguo)',
  aura: 'anillos dibujados y el sprite una vez sobre el Pokémon',
  hex: '3 sprites en línea recta y el sprite sobre el objetivo',
};
const TASKS = [
  [/^ShakeMon|ShakeTarget|HorizontalShake|ShakeAndSink|ShakeBattleTerrain/, 'sacude al Pokémon'],
  [/Blend|Invert|Grayscale|FadeScreen|HardwarePalette|MetallicShine|FlashAnimTag/, 'tiñe o destella'],
  [/Translate|Slide|Lunge|Rotate|Sway|Rock|Stretch|Scale|GrowAndShrink|Squish|Deform|PunchWithTrace/, 'mueve o deforma al Pokémon'],
  [/Background|SlidingBg|Spotlight/, 'cambia el fondo'],
];

const items = films.map((f) => {
  const g = gbaOf(f.id);
  const r = f.recipe;
  const source = CHATGPT.has(f.id) ? 'chatgpt' : !r ? 'dibujado' : g ? 'frlg' : 'compuesto';
  const sprites = (g?.sprites ?? []).map((s) => ({ n: s.n, tag: s.tag, callback: s.callback, prim: primOf(s.callback) }));
  const gbaSprites = sprites.filter((s) => s.tag).reduce((a, s) => a + s.n, 0);
  const tasks = Object.entries(g?.tasks ?? {})
    .map(([t, n]) => TASKS.find(([re]) => re.test(t))?.[1])
    .filter(Boolean);
  const gbaMs = g ? Math.round((g.frames / 60) * 1000) : null;
  const ourSprites = r?.main ? (f.kind === 'beam' ? 8 : f.kind === 'area' ? 3 : f.kind === 'drain' ? 6 : f.kind === 'hex' ? 4 : r.volley ?? 1) + (r.impact ? 1 : 0) : r?.impact ? 1 : 0;
  const usedTags = new Set([r?.main?.sprite?.split('@')[0], r?.impact?.sprite?.split('@')[0]].filter(Boolean));
  const unused = [...new Set(sprites.filter((s) => s.tag && !usedTags.has(s.tag) && !/^(round-shadow|item-bag)$/.test(s.tag)).map((s) => s.tag))];
  const gaps = [];
  if (gbaMs && gbaMs > f.totalMs * 1.8) gaps.push(`En la GBA dura ≈${(gbaMs / 1000).toFixed(1)} s; aquí ${(f.totalMs / 1000).toFixed(1)} s.`);
  if (gbaSprites >= ourSprites * 3 && gbaSprites >= 6) gaps.push(`La GBA crea ${gbaSprites} sprites; aquí ${ourSprites}.`);
  if (unused.length) gaps.push(`Sprites del script sin usar: ${unused.join(', ')}.`);
  const gPrims = [...new Set(sprites.filter((s) => s.tag).map((s) => s.prim))];
  const moves = sprites.some((s) => s.prim === 'embestida') || tasks.includes('mueve o deforma al Pokémon');
  if (moves && f.kind !== 'melee') gaps.push('En la GBA el Pokémon se mueve (embiste/se deforma); aquí no.');
  if (tasks.includes('tiñe o destella') || sprites.some((s) => s.prim === 'tinte')) gaps.push('En la GBA tiñe o hace destellar al Pokémon; aquí no hay tintes.');
  const pathMismatch = gPrims.find((p) => ['onda', 'remolino', 'absorber', 'caída', 'brote', 'dispersión'].includes(p));
  if (pathMismatch) gaps.push(`Trayectoria de la GBA: ${PRIMS.find(([k]) => k === pathMismatch)[2]}; aquí: ${OURS[f.kind]}.`);
  if (source === 'chatgpt') gaps.push('Sustituto de pret hasta que llegue la hoja de ChatGPT.');
  if (source === 'dibujado') gaps.push('La GBA no usa sprites: aquí siguen las formas dibujadas.');
  const v = verdicts[f.id] ?? {};
  return {
    id: f.id,
    name: f.name,
    type: f.type,
    power: f.power,
    kind: f.kind,
    style: f.style,
    source,
    ours: { ms: f.totalMs, main: r?.main?.sprite ?? null, impact: r?.impact?.sprite ?? null, bg: f.bg, volley: r?.volley ?? null, how: OURS[f.kind] },
    gba: g ? { ms: gbaMs, sprites: sprites.filter((s) => s.tag), mon: tasks, bgs: g.bgs } : null,
    gaps,
    verdict: v.v ?? (gaps.length >= 4 ? 'mal' : gaps.length >= 2 ? 'mejorable' : 'bien'),
    note: v.note ?? '',
    fix: v.fix ?? '',
    fixed: v.fixed ?? '',
    filmed: f.filmed,
  };
});
mkdirSync(resolve(dir, 'site'), { recursive: true });
writeFileSync(resolve(dir, 'site/data.json'), JSON.stringify(items));
const count = (k) => items.reduce((a, i) => ((a[i[k]] = (a[i[k]] ?? 0) + 1), a), {});
console.log(items.length, 'moves', count('verdict'), count('source'), count('kind'));

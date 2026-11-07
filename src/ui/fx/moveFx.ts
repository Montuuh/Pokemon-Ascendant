import { asset } from '@/content/paths';
import { MOTION_MS, type MotionKind } from '@/ui/moveMotion';
import anims from './pret-anims.json';

// §9.9.2 — what a move looks like, from FireRed / LeafGreen's own battle animations (pret/pokefirered, imported by
// scripts/fx/import-pret-fx.mjs). The motion kind (`moveMotion.ts`) is the choreography — the dash, the throw, the
// stream, the field filled — and this is the cast: the move's own sprite (`main`) and what lands on the target
// (`impact`), plus the background the GBA fades in behind some moves (Psychic, Thunder, the Dark moves). A move FRLG
// animates takes its sprites from its own script; the Gen IV moves are composed from pret's sprites, some re-paletted
// the way the GBA itself does (scripts/fx/variants.mjs). A move with no sprites (Agility, Harden…) keeps the drawn
// shapes, as the GBA only moves, tints or shakes the Pokémon.

export interface FxSpriteInfo {
  w: number;
  h: number;
  frames: number;
  /** pret draws it alpha-blended over the stage (a barrier, a sunbeam, a slash): see-through, as on the GBA. */
  blend?: boolean;
}

export interface FxPiece {
  sprite: string;
  /** Hold this one frame instead of playing the strip (a sheet of different pieces: the fist of Hands-and-Feet). */
  frame?: number;
}

export interface FxRecipe {
  /** The move's own sprite: thrown, streamed, scattered over the field, or struck on the target by a Melee move. */
  main?: FxPiece;
  /** What lands on the target. */
  impact?: FxPiece;
  /** A pret battle background, washed over the stage for the beat — drawn only for a heavy move (`fxBgOf`). */
  bg?: string;
  /** How many of `main` a thrown move throws (a volley: Pin Missile, Swift); one when unset. */
  volley?: number;
  /** `main` is one jaw of a pair: drawn twice, the second turned over (Bite, Clamp), as pret's scripts do. */
  pair?: boolean;
  /** A Gen IV move's choreography, borrowed from the FRLG move it moves like (Fire Fang bites as Bite does)… */
  like?: string;
  /** …with that script's sprites swapped for its own (Bite's teeth for the fangs, its splat for an ember). */
  swap?: Record<string, string>;
}

const SPRITES = anims.sprites as Record<string, FxSpriteInfo>;
const BGS = anims.bgs as Record<string, { w: number; h: number }>;
/** A sprite a script creates: `[frame, sprite, path, dx, dy, on, life, hit]` (scripts/fx/choreo.mjs) — `on` 'u' its
 *  user or 't' its target, `life` in GBA frames, `hit` 1 for the sprite that lands the blow. */
type PretEmit = [number, string, string, number, number, string, number, number];
/** A visual task on a Pokémon: `[frame, beat, on, life]` — `on` 'u' its user or 't' its target. */
type PretMon = [number, string, string, number];
const PRET = anims.moves as unknown as Record<string, { sprites: string[]; bgs: string[]; lunge?: boolean; choreo?: { frames: number; emits: PretEmit[]; mon?: PretMon[] } }>;
/** How long a sprite of each path lives, in GBA frames. */
const PATH_LIFE = anims.paths as Record<string, number>;

export const fxSprite = (key: string): FxSpriteInfo | undefined => SPRITES[key];
/** A re-palette's file: `slash@dark` → `slash_dark.png` (static servers do not all decode `%40`). */
export const fxSpriteFile = (key: string) => `${key.replace('@', '_')}.png`;
export const fxSpriteUrl = (key: string) => asset(`art/fx/pret/${fxSpriteFile(key)}`);
export const fxBgUrl = (key: string) => asset(`art/fx/bg/${key}.png`);

/** pret's burst sprites: what a script loads to land the hit, not the move's own picture. */
const IMPACTS = new Set(['impact', 'impact-2', 'hit', 'hit-2', 'hit-duplicate', 'water-impact', 'cross-impact', 'explosion', 'explosion-2', 'slam-hit', 'whip-hit', 'punch-impact', 'circle-impact']);
/** What a script loads that is not the move at all: a Poké Ball, the user's shadow, a sweat drop. */
const NOT_THE_MOVE = new Set(['round-shadow', 'item-bag', 'white-bag', 'tied-bag']);
/** Sheets of different pieces, not frames of one: held on a frame. */
const HOLD: Record<string, number> = { 'hands-and-feet': 0, orbs: 0, 'music-notes': 0, 'music-notes-2': 0, 'red-orb-2': 0, 'blue-orb': 0, 'gray-orb': 0, 'electric-orbs': 0, confetti: 0, rocks: 0, 'flat-rock': 0, 'ice-chunk': 0, 'pink-petal': 0, 'ice-crystals': 6 };

/** pret's names where ours differ (the series renamed them). */
const PRET_NAME: Record<string, string> = { 'high-jump-kick': 'hi-jump-kick', 'feint-attack': 'faint-attack', 'smelling-salts': 'smellingsalt', 'vise-grip': 'vice-grip' };
const norm = (s: string) => s.replace(/[^a-z0-9]/g, '');
const PRET_BY_NORM = new Map(Object.keys(PRET).map((k) => [norm(k), k]));

/** A sprite, held on its frame when its sheet is pieces (a re-palette holds as its base does). */
function piece(sprite: string, frame?: number): FxPiece {
  const held = frame ?? HOLD[sprite.split('@')[0]!];
  return { sprite, ...(held !== undefined ? { frame: held } : {}) };
}

/** Moves that throw a volley of their sprite: a multi-hit move, or one pret draws as many (Swift's stars). */
const VOLLEYS: Record<string, number> = { 'pin-missile': 4, twineedle: 2, 'spike-cannon': 4, barrage: 3, swift: 3, bubble: 3, 'razor-leaf': 2, 'leaf-storm': 4, 'ice-shard': 2, 'power-gem': 3, 'magnet-bomb': 2, 'seed-bomb': 2, 'stone-edge': 2, 'rock-throw': 2 };
/** Jaws pret draws twice, the second turned over. */
const PAIRED = new Set(['sharp-teeth', 'clamp']);
/**
 * §9.9.2 — the heavy moves that wash the stage in their pret background. A routine hit or a status card does not (the
 * stage itself is the heaviest channel, D12), whatever its FRLG script loads: field moves and the greatest blows only.
 */
const HEAVY_BG = new Set(['giga-impact', 'solar-beam', 'sky-attack', 'guillotine', 'horn-drill', 'fissure', 'thunder', 'blizzard', 'hyper-beam', 'psychic', 'dream-eater']);
/** The background a move washes the stage in, if it is heavy enough: a field move, or one of `HEAVY_BG`. */
export function fxBgOf(moveId: string, kind: string): string | undefined {
  const r = fxRecipeOf(moveId);
  return r?.bg && (kind === 'area' || HEAVY_BG.has(moveId.replace(/(-plus)+$/, ''))) ? r.bg : undefined;
}

/** Kicks show the foot of Hands-and-Feet, chops the open hand. */
const KICKS = new Set(['double-kick', 'mega-kick', 'jump-kick', 'high-jump-kick', 'rolling-kick', 'low-kick', 'stomp', 'blaze-kick', 'triple-kick']);
const CHOPS = new Set(['karate-chop', 'brick-break', 'cross-chop']);

/**
 * The Gen IV moves FRLG has no animation for, composed from pret's sprites; and the moves the user is drawing in
 * ChatGPT (docs/art/fx/move-fx-chatgpt.xlsx), held here with a pret stand-in until their sheets arrive.
 */
const COMPOSED: Record<string, FxRecipe> = {
  // FRLG moves whose script loads a sprite that is not the move itself first (Rock Tomb's X, Kinesis' alert mark,
  // Crush Claw's wall flash, Crabhammer's bubbles): drawn with the piece that is.
  'rock-tomb': { main: piece('rocks'), impact: piece('hit'), like: 'rock-throw' },
  kinesis: { main: piece('bent-spoon'), bg: 'psychic' },
  'crush-claw': { main: piece('claw-slash'), impact: piece('impact') },
  crabhammer: { main: piece('water-impact'), impact: piece('impact') },
  'vine-whip': { main: piece('vine'), impact: piece('whip-hit') },
  'call-for-help': { main: piece('alert') },
  cover: { main: piece('protect@gold'), like: 'protect', swap: { protect: 'protect@gold' } },
  snarl: { main: piece('noise-line@dark'), bg: 'dark', like: 'growl', swap: { 'noise-line': 'noise-line@dark' } },
  'night-slash': { main: piece('slash@dark'), impact: piece('impact@dark'), bg: 'dark', like: 'slash', swap: { slash: 'slash@dark' } },
  'bullet-punch': { main: piece('punch-impact'), impact: piece('hit'), like: 'mach-punch' },
  'magnet-bomb': { main: piece('metal-ball'), impact: piece('spark-2') },
  'iron-head': { main: piece('hit'), impact: piece('impact'), like: 'headbutt' },
  'aqua-ring': { main: piece('guard-ring@water'), like: 'safeguard', swap: { 'guard-ring': 'guard-ring@water' } },
  roost: { main: piece('white-feather'), like: 'feather-dance' },
  'u-turn': { main: piece('hit'), impact: piece('impact') },
  'giga-impact': { main: piece('impact'), impact: piece('explosion-2'), bg: 'highspeed' },
  'draco-meteor': { main: piece('meteor@draco'), impact: piece('explosion-2') },
  'leaf-storm': { main: piece('leaf'), impact: piece('hit'), like: 'razor-leaf' },
  'close-combat': { main: piece('hands-and-feet', 0), impact: piece('hit'), like: 'arm-thrust' },
  'flare-blitz': { main: piece('spinning-fire'), impact: piece('explosion-2'), like: 'flame-wheel' },
  'wood-hammer': { main: piece('slam-hit'), impact: piece('impact') },
  'brave-bird': { main: piece('bird@brave'), impact: piece('hit'), like: 'sky-attack', swap: { bird: 'bird@brave' } },
  'dragon-pulse': { main: piece('purple-flame'), impact: piece('hit') },
  'shadow-claw': { main: piece('claw-slash@ghost'), impact: piece('impact@dark'), like: 'metal-claw', swap: { 'claw-slash': 'claw-slash@ghost' } },
  'shadow-sneak': { main: piece('white-shadow@shade'), impact: piece('impact@dark') },
  'seed-bomb': { main: piece('seed', 0), impact: piece('explosion-2'), like: 'egg-bomb', swap: { 'large-fresh-egg': 'seed', explosion: 'explosion-2' } },
  'energy-ball': { main: piece('shadow-ball@grass'), impact: piece('hit'), like: 'shadow-ball', swap: { 'shadow-ball': 'shadow-ball@grass' } },
  'power-whip': { main: piece('vine@power'), impact: piece('whip-hit') },
  'drain-punch': { main: piece('punch-impact'), impact: piece('hit') },
  'vacuum-wave': { main: piece('air-wave@vacuum'), impact: piece('hit'), like: 'sonic-boom', swap: { 'air-wave': 'air-wave@vacuum' } },
  'aura-sphere': { main: piece('bluegreen-orb'), impact: piece('hit') },
  'double-hit': { main: piece('impact'), impact: piece('hit'), like: 'double-slap' },
  'aqua-jet': { main: piece('water-column'), impact: piece('water-impact') },
  'aqua-tail': { main: piece('water-column'), impact: piece('water-impact') },
  'ice-shard': { main: piece('ice-chunk', 0), impact: piece('hit') },
  'ice-fang': { main: piece('fangs'), impact: piece('ice-chunk'), like: 'bite', swap: { 'sharp-teeth': 'fangs', impact: 'ice-chunk' } },
  'fire-fang': { main: piece('fangs'), impact: piece('small-ember'), like: 'bite', swap: { 'sharp-teeth': 'fangs', impact: 'small-ember' } },
  'lava-plume': { main: piece('fire-plume@lava'), impact: piece('explosion-2') },
  'thunder-fang': { main: piece('fangs'), impact: piece('electricity'), like: 'bite', swap: { 'sharp-teeth': 'fangs', impact: 'electricity' } },
  discharge: { main: piece('electricity'), impact: piece('spark-2'), like: 'spark' },
  'poison-jab': { main: piece('horn-hit@poison'), impact: piece('poison-bubble'), like: 'horn-attack', swap: { 'horn-hit': 'horn-hit@poison' } },
  'cross-poison': { main: piece('cross-impact@poison'), impact: piece('poison-bubble') },
  'gunk-shot': { main: piece('poison-bubble'), impact: piece('toxic-bubble') },
  'earth-power': { main: piece('fire-plume@earth'), impact: piece('flying-dirt') },
  'mud-bomb': { main: piece('brown-orb'), impact: piece('explosion@mud'), like: 'sludge-bomb', swap: { 'poison-bubble': 'brown-orb' } },
  'air-slash': { main: piece('air-slash'), impact: piece('hit') },
  'zen-headbutt': { main: piece('impact'), impact: piece('hit'), bg: 'psychic' },
  'psycho-cut': { main: piece('cut@psychic'), impact: piece('hit'), bg: 'psychic', like: 'cut', swap: { cut: 'cut@psychic' } },
  'x-scissor': { main: piece('cut'), impact: piece('cross-impact'), like: 'cut' },
  'bug-buzz': { main: piece('metal-sound-waves@bug'), bg: 'bug', like: 'metal-sound', swap: { 'metal-sound-waves': 'metal-sound-waves@bug' } },
  'stone-edge': { main: piece('rocks@stone'), impact: piece('hit') },
  'power-gem': { main: piece('sparkle-4'), impact: piece('hit') },
  'rock-polish': { main: piece('sparkle-1@stone') },
  'nasty-plot': { main: piece('devil') },
  payback: { main: piece('impact@dark'), impact: piece('hit'), bg: 'dark' },
  'sucker-punch': { main: piece('punch-impact@dark'), impact: piece('impact@dark'), bg: 'dark' },
  'stealth-rock': { main: piece('rocks@stone') },
  'wake-up-slap': { main: piece('humanoid-hand'), impact: piece('smellingsalt-effect') },
  'flash-cannon': { main: piece('gray-orb'), impact: piece('hit') },
  'dark-pulse': { main: piece('purple-ring'), impact: piece('impact@dark'), bg: 'dark' },
  brine: { main: piece('water-impact'), impact: piece('splash') },
  avalanche: { main: piece('ice-chunk'), impact: piece('hit'), like: 'rock-throw', swap: { rocks: 'ice-chunk' } },
};

/** One sprite of a move's choreography: when it shows and for how long (ms), the piece, its path and its offset. */
export interface FxEmit {
  at: number;
  life: number;
  piece: FxPiece;
  path: FxPath;
  /** Its offset from where it starts or plays, in GBA pixels (x toward the target's side). */
  dx: number;
  dy: number;
  /** Where it plays or starts when it does not travel: on its user or on its target. */
  on: 'user' | 'target';
  /** Its place in the script, for what spreads (a scatter's direction). */
  i: number;
  /** Where in its circle an orbit starts, 0–1: the sprites a script starts together spread round it. */
  phase: number;
}
export type FxPath = 'on' | 'line' | 'wave' | 'arc' | 'fall' | 'rise' | 'scatter' | 'orbit' | 'absorb' | 'close' | 'out' | 'sway';
/** The paths that end where they land (a throw, a fall, jaws closing): the blow is their arrival, not their start. */
const ARRIVES = new Set<FxPath>(['line', 'wave', 'arc', 'fall', 'close', 'out']);

/**
 * §9.9.2 — a move's choreography: its FRLG script's own timeline of sprites (`choreo` in pret-anims.json), replayed —
 * each sprite when the script creates it, for as long as its callback runs, along its callback's path, on its user or
 * its target. A script's leading wait (a darkened stage, a bolt drawn by a task) is cut, and it is scaled to fit `cap`
 * (`choreoCapOf`: a routine card shorter than a heavy blow). It lands with its blow — the hit's splat it creates — or,
 * with none, the first sprite to arrive; never before `wait` (a dash's arrival, a bolt's stroke), which its sprites
 * wait for. A Gen IV move borrows the script of the FRLG move it moves `like`, its sprites swapped; one without keeps
 * the motion kind's own picture.
 */
export function fxChoreoOf(moveId: string, beat: { wait: number; cap: number } = { wait: 0, cap: MOTION_MS.choreo.max }): FxChoreo | undefined {
  const id = moveId.replace(/(-plus)+$/, '');
  const k = `${id}:${beat.wait}:${beat.cap}`;
  if (!CHOREO.has(k)) CHOREO.set(k, choreoOf(id, beat.wait, beat.cap));
  return CHOREO.get(k);
}
export interface FxChoreo {
  emits: FxEmit[];
  /** What it does to the Pokémon themselves, when (ms) and to whom. */
  mon: FxMonBeat[];
  impactMs: number;
  totalMs: number;
}
export type FxMonKind = 'trace' | 'sway' | 'shine' | 'grow' | 'shrink' | 'melt' | 'vanish' | 'hop' | 'gray' | 'tint' | 'shake';
export interface FxMonBeat {
  at: number;
  kind: FxMonKind;
  on: 'user' | 'target';
  /** How many times it plays back to back: the script's repeats of one beat, merged. */
  n: number;
}
/** What a beat plays on its sprite: its movement, its light, or both (an afterimage rush, a melt). */
const MON_CHANNELS: Record<FxMonKind, readonly ('move' | 'light')[]> = {
  trace: ['light'], sway: ['move'], shine: ['light'], grow: ['move'], shrink: ['move'],
  melt: ['move', 'light'], vanish: ['light'], hop: ['move'], gray: ['light'], tint: ['light'], shake: ['move'],
};
/**
 * §9.9.2 — a script's beats on the Pokémon, as they can play: the same beat on the same Pokémon again before it is over
 * (Growth swells twice, Spark lights six times) is one beat played `n` times back to back — at most three, so a light
 * never flashes more than three times a second (WCAG 2.3.1) — and a beat that would fight one already playing on the
 * same channel of the same Pokémon (a tint over a vanish) gives way to it.
 */
function mergeMonBeats(beats: FxMonBeat[]): FxMonBeat[] {
  const len = (b: FxMonBeat) => MOTION_MS.mon[b.kind] * b.n;
  const merged: FxMonBeat[] = [];
  for (const b of [...beats].sort((x, y) => x.at - y.at)) {
    const same = merged.find((m) => m.kind === b.kind && m.on === b.on && b.at <= m.at + len(m));
    if (same) {
      same.n = Math.min(3, Math.max(same.n, Math.ceil((b.at + MOTION_MS.mon[b.kind] - same.at) / MOTION_MS.mon[b.kind])));
      continue;
    }
    const clash = merged.some((m) => m.on === b.on && b.at < m.at + len(m) && MON_CHANNELS[m.kind].some((c) => MON_CHANNELS[b.kind].includes(c)));
    if (!clash) merged.push({ ...b });
  }
  return merged;
}
/** Each move's choreography, worked out once. */
const CHOREO = new Map<string, FxChoreo | undefined>();
function choreoOf(id: string, wait: number, cap: number): FxChoreo | undefined {
  const own = COMPOSED[id];
  if (own && !own.like) return undefined;
  const c = pretScriptOf(own?.like ?? id)?.choreo;
  const swap = own?.swap ?? {};
  const raw = (c?.emits ?? []).map((e): PretEmit => [e[0], swap[e[1]] ?? e[1], e[2], e[3], e[4], e[5], e[6], e[7]]).filter((e) => SPRITES[e[1]]);
  const monRaw = c?.mon ?? [];
  if (!c || (!raw.length && !monRaw.length)) return undefined;
  const C = MOTION_MS.choreo;
  const t0 = Math.min(...raw.map((e) => e[0]), ...monRaw.map((b) => b[0]));
  const frames = Math.max(...raw.map((e) => e[0] + (e[6] || PATH_LIFE[e[2]] || 0)), ...monRaw.map((b) => b[0] + b[3])) - t0;
  // The whole beat keeps to its cap, a dash's or a bolt's wait included (at least half the cap is the script's).
  const ms = C.frame * Math.min(1, Math.max(cap / 2, cap - wait) / (frames * C.frame));
  // An orbit's sprites started on the same frame spread evenly round their circle.
  const together = new Map<number, number>();
  const emits = raw.map(([t, sprite, path, dx, dy, on, life], i): FxEmit => {
    const rank = path === 'orbit' ? (together.get(t) ?? 0) : 0;
    if (path === 'orbit') together.set(t, rank + 1);
    return { at: (t - t0) * ms, life: Math.max(C.minLife, (life || PATH_LIFE[path] || 16) * ms), piece: piece(sprite), path: path as FxPath, dx, dy, on: on === 'u' ? 'user' : 'target', i, phase: rank };
  });
  for (const e of emits) if (e.path === 'orbit') e.phase /= together.get(raw[e.i]![0]) ?? 1;
  // It lands with its blow; with none, as the first sprite reaches its target or plays on it; only a move that plays
  // on its user alone (a raise) lands with its first sprite.
  const hit = emits.filter((e, k) => raw[k]![7] === 1).map((e) => e.at);
  const arrive = emits.filter((e) => ARRIVES.has(e.path) && e.path !== 'out').map((e) => e.at + e.life);
  const onTarget = emits.filter((e) => e.on === 'target' && !ARRIVES.has(e.path) && e.path !== 'absorb').map((e) => e.at);
  const first = (xs: number[]) => (xs.length ? Math.min(...xs) : undefined);
  const monAt = monRaw.map(([t, kind, on]): FxMonBeat => ({ at: (t - t0) * ms, kind: kind as FxMonKind, on: on === 'u' ? 'user' : 'target', n: 1 }));
  const lands = first(hit) ?? first(arrive) ?? first(onTarget) ?? first(emits.map((e) => e.at)) ?? first(monAt.filter((b) => b.on === 'target').map((b) => b.at)) ?? first(monAt.map((b) => b.at)) ?? 0;
  // A dash's arrival or a bolt's stroke comes first: what plays on or toward the target waits for it — and what plays
  // on the target before the blow (a horn, a fist) shows only as the user is about to arrive. What plays on the user
  // before the blow plays as it leaves, not later over its empty card.
  const late = Math.max(0, wait - lands);
  const lead = Math.max(0, wait - MOTION_MS.sprite.lead);
  for (const e of emits) {
    const userSide = e.on === 'user' && !ARRIVES.has(e.path) && e.path !== 'absorb' && e.at < lands;
    if (userSide) continue;
    e.at += late;
    if (wait > 0 && e.on === 'target' && e.at < lands + late) e.at = Math.max(e.at, lead);
  }
  // Nothing outlasts the cap: a sprite stretched to its shortest life, or moved to wait, is trimmed to it.
  for (const e of emits) {
    e.at = Math.min(e.at, cap - C.minLife);
    e.life = Math.min(e.life, cap - e.at);
  }
  // Where they play once the sprites have waited, within the cap; then merged, and their repeats kept within it too.
  for (const b of monAt) b.at = Math.max(0, Math.min(b.at + late, cap - MOTION_MS.mon[b.kind]));
  const mon = mergeMonBeats(monAt);
  for (const b of mon) b.n = Math.max(1, Math.min(b.n, Math.floor((cap - b.at) / MOTION_MS.mon[b.kind])));
  const end = Math.max(...emits.map((e) => e.at + e.life), ...mon.map((b) => b.at + MOTION_MS.mon[b.kind] * b.n), 0);
  return { emits, mon, impactMs: Math.min(lands + late, end), totalMs: end };
}

/** §9.9.2 — what a choreography waits for before it lands (a dash's arrival, lightning's stroke), and its longest. */
export function fxBeatOf(kind: MotionKind, dash: boolean, cap: number): { wait: number; cap: number } {
  const wait = kind === 'melee' && dash ? MOTION_MS.melee.windup + MOTION_MS.melee.dash : kind === 'bolt' ? MOTION_MS.bolt.strike : 0;
  return { wait, cap };
}

/** §9.9.2 — the Gen IV Melee moves whose user charges across the field, as pret's own lunging moves do. */
const COMPOSED_LUNGES = new Set(['aqua-jet', 'brave-bird', 'flare-blitz', 'giga-impact', 'iron-head', 'u-turn', 'zen-headbutt', 'bullet-punch', 'sucker-punch', 'wood-hammer', 'double-hit']);

/**
 * §9.9.2 — whether a Melee move's user dashes across to its target: only where the GBA moves the attacker (a lunge, a
 * slide, a jump — `lunge` in pret's script). Bite, Cut or Slash land their sprite on the target from where the user
 * stands. A move drawn without sprites keeps the dash, its only picture of the blow.
 */
export function fxLunges(moveId: string): boolean {
  const id = moveId.replace(/(-plus)+$/, '');
  if (!fxRecipeOf(id)) return true;
  if (COMPOSED[id] && !pretScriptOf(id)) return COMPOSED_LUNGES.has(id);
  return pretScriptOf(id)?.lunge === true;
}

/**
 * §9.9.2 — how a move is drawn, for its beat (`motionOf`): whether it is drawn with pret's sprites (its own, or — a
 * Melee move that does not dash — only its hit, Pound's splat), whether that includes its own sprite, whether its user
 * dashes, and its volley.
 */
export function fxCastOf(moveId: string, kind: MotionKind = 'projectile', cap: number = MOTION_MS.choreo.max): { sprites: boolean; own: boolean; dash: boolean; volley: number; choreo?: { impactMs: number; totalMs: number } } {
  const r = fxRecipeOf(moveId);
  const dash = fxLunges(moveId);
  const c = fxChoreoOf(moveId, fxBeatOf(kind, dash, cap));
  // A choreography sets the beat when it has sprites, or for a move played on the Pokémon alone (a raise, a hex); a
  // blow whose script only shakes or wobbles its Pokémon (Psychic, under its background) keeps its kind's beat.
  const times = c && (c.emits.length || kind === 'aura' || kind === 'hex');
  return { sprites: !!r?.main || (!dash && !!r?.impact), own: !!r?.main, dash, volley: r?.main ? (r.volley ?? 1) : 1, ...(times ? { choreo: { impactMs: c.impactMs, totalMs: c.totalMs } } : {}) };
}

/** The move's pret script, by our id. */
export function pretScriptOf(moveId: string): { sprites: string[]; bgs: string[]; lunge?: boolean; choreo?: { frames: number; emits: PretEmit[]; mon?: PretMon[] } } | undefined {
  const id = moveId.replace(/(-plus)+$/, '');
  return PRET[PRET_NAME[id] ?? id] ?? PRET[PRET_BY_NORM.get(norm(PRET_NAME[id] ?? id)) ?? ''];
}

/** §9.9.2 — the sprites a move is drawn with, or undefined for a move the GBA draws without any. */
export function fxRecipeOf(moveId: string): FxRecipe | undefined {
  const id = moveId.replace(/(-plus)+$/, '');
  if (COMPOSED[id]) return { ...COMPOSED[id], ...(VOLLEYS[id] ? { volley: VOLLEYS[id] } : {}) };
  const script = pretScriptOf(id);
  if (!script) return undefined;
  const sprites = script.sprites.filter((s) => SPRITES[s] && !NOT_THE_MOVE.has(s));
  const own = sprites.find((s) => !IMPACTS.has(s));
  const hit = sprites.find((s) => IMPACTS.has(s));
  const bg = script.bgs.find((b) => BGS[b]);
  if (!own && !hit && !bg) return undefined;
  const main = own ? piece(own, own === 'hands-and-feet' ? (KICKS.has(id) ? 2 : CHOPS.has(id) ? 3 : 0) : undefined) : undefined;
  return { ...(main ? { main } : {}), ...(hit ? { impact: piece(hit) } : {}), ...(bg ? { bg } : {}), ...(VOLLEYS[id] ? { volley: VOLLEYS[id] } : {}), ...(own && PAIRED.has(own) ? { pair: true } : {}) };
}

/** The composed recipes (Gen IV moves and the ChatGPT stand-ins), for the import guard. */
export const composedRecipes = (): Readonly<Record<string, FxRecipe>> => COMPOSED;

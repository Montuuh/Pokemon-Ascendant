import { asset } from '@/content/paths';
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
}

const SPRITES = anims.sprites as Record<string, FxSpriteInfo>;
const BGS = anims.bgs as Record<string, { w: number; h: number }>;
const PRET = anims.moves as Record<string, { sprites: string[]; bgs: string[]; lunge?: boolean }>;

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
  // Crush Claw's wall flash, Crabhammer's bubbles, Wing Attack's gust): drawn with the piece that is.
  'rock-tomb': { main: piece('rocks'), impact: piece('hit') },
  kinesis: { main: piece('bent-spoon'), bg: 'psychic' },
  'crush-claw': { main: piece('claw-slash'), impact: piece('impact') },
  crabhammer: { main: piece('water-impact'), impact: piece('impact') },
  'wing-attack': { main: piece('white-feather'), impact: piece('impact') },
  'steel-wing': { main: piece('white-feather'), impact: piece('impact') },
  'vine-whip': { main: piece('vine'), impact: piece('whip-hit') },
  'call-for-help': { main: piece('alert') },
  cover: { main: piece('protect@gold') },
  snarl: { main: piece('noise-line@dark'), bg: 'dark' },
  'night-slash': { main: piece('slash@dark'), impact: piece('impact@dark'), bg: 'dark' },
  'bullet-punch': { main: piece('punch-impact'), impact: piece('hit') },
  'magnet-bomb': { main: piece('metal-ball'), impact: piece('spark-2') },
  'iron-head': { main: piece('hit'), impact: piece('impact') },
  'aqua-ring': { main: piece('guard-ring@water') },
  roost: { main: piece('white-feather') },
  'u-turn': { main: piece('hit'), impact: piece('impact') },
  'giga-impact': { main: piece('impact'), impact: piece('explosion-2'), bg: 'highspeed' },
  'draco-meteor': { main: piece('meteor@draco'), impact: piece('explosion-2') },
  'leaf-storm': { main: piece('leaf'), impact: piece('hit') },
  'close-combat': { main: piece('hands-and-feet', 0), impact: piece('hit') },
  'flare-blitz': { main: piece('spinning-fire'), impact: piece('explosion-2') },
  'wood-hammer': { main: piece('slam-hit'), impact: piece('impact') },
  'brave-bird': { main: piece('bird@brave'), impact: piece('hit') },
  'dragon-pulse': { main: piece('purple-flame'), impact: piece('hit') },
  'shadow-claw': { main: piece('claw-slash@ghost'), impact: piece('impact@dark') },
  'shadow-sneak': { main: piece('white-shadow@shade'), impact: piece('impact@dark') },
  'seed-bomb': { main: piece('seed', 0), impact: piece('explosion-2') },
  'energy-ball': { main: piece('shadow-ball@grass'), impact: piece('hit') },
  'power-whip': { main: piece('vine@power'), impact: piece('whip-hit') },
  'drain-punch': { main: piece('punch-impact'), impact: piece('hit') },
  'vacuum-wave': { main: piece('air-wave@vacuum'), impact: piece('hit') },
  'aura-sphere': { main: piece('bluegreen-orb'), impact: piece('hit') },
  'double-hit': { main: piece('impact'), impact: piece('hit') },
  'aqua-jet': { main: piece('water-column'), impact: piece('water-impact') },
  'aqua-tail': { main: piece('water-column'), impact: piece('water-impact') },
  'ice-shard': { main: piece('ice-chunk', 0), impact: piece('hit') },
  'ice-fang': { main: piece('fangs'), impact: piece('ice-chunk') },
  'fire-fang': { main: piece('fangs'), impact: piece('small-ember') },
  'lava-plume': { main: piece('fire-plume@lava'), impact: piece('explosion-2') },
  'thunder-fang': { main: piece('fangs'), impact: piece('electricity') },
  discharge: { main: piece('electricity'), impact: piece('spark-2') },
  'poison-jab': { main: piece('horn-hit@poison'), impact: piece('poison-bubble') },
  'cross-poison': { main: piece('cross-impact@poison'), impact: piece('poison-bubble') },
  'gunk-shot': { main: piece('poison-bubble'), impact: piece('toxic-bubble') },
  'earth-power': { main: piece('fire-plume@earth'), impact: piece('flying-dirt') },
  'mud-bomb': { main: piece('brown-orb'), impact: piece('explosion@mud') },
  'air-slash': { main: piece('air-slash'), impact: piece('hit') },
  'zen-headbutt': { main: piece('impact'), impact: piece('hit'), bg: 'psychic' },
  'psycho-cut': { main: piece('cut@psychic'), impact: piece('hit'), bg: 'psychic' },
  'x-scissor': { main: piece('cut'), impact: piece('cross-impact') },
  'bug-buzz': { main: piece('metal-sound-waves@bug'), bg: 'bug' },
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
  avalanche: { main: piece('ice-chunk'), impact: piece('hit') },
};

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
export function fxCastOf(moveId: string): { sprites: boolean; own: boolean; dash: boolean; volley: number } {
  const r = fxRecipeOf(moveId);
  const dash = fxLunges(moveId);
  return { sprites: !!r?.main || (!dash && !!r?.impact), own: !!r?.main, dash, volley: r?.main ? (r.volley ?? 1) : 1 };
}

/** The move's pret script, by our id. */
export function pretScriptOf(moveId: string): { sprites: string[]; bgs: string[]; lunge?: boolean } | undefined {
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

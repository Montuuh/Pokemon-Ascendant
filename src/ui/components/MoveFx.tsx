import type { CSSProperties, ReactNode } from 'react';
import { spriteOf } from '@/ui/art';
import { fxBeatOf, fxBgOf, fxBgUrl, fxCastOf, fxChoreoOf, fxRecipeOf, fxSprite, fxSpriteUrl, type FxEmit, type FxPiece, type FxRecipe } from '@/ui/fx/moveFx';
import type { MoveFx, SlotBox, SpriteSlot } from '@/ui/hooks/useCombatFx';
import { MOTION_MS, spriteLandsAt, type AreaStyle, type ProjectileStyle } from '@/ui/moveMotion';
import { ArenaSprite } from './ArenaSprite';
import styles from './MoveFx.module.css';

// §9.9.2 — a move, drawn: the user's dash across the field and back (Melee), the charge and the throw (Ranged — an orb,
// a spray, a beam, a bolt, a drain), the stage filled (Surf, Earthquake, Blizzard…), a glow (a raise or a heal) or a hex
// thrown at the foe. A move with its own pret sprites is drawn with them alone, from its first frame: no charge, rings
// or tint, and its user dashes only where the GBA moves it. Every shape is positioned from the slots' measured boxes and coloured by the move's type; every
// beat's length is a custom property from `MOTION_MS`, so the picture lands when the hook lands the number. What happens
// in the ground itself (Earthquake's cracks and dust) is drawn on a floor layer, under the Pokémon's cards (`floor`).

type Point = { x: number; y: number };
type Boxes = Partial<Record<SpriteSlot, SlotBox>>;

/** The middle of a Pokémon in its box: a little below the box's centre, where its body is. */
const centre = (b: SlotBox): Point => ({ x: b.left + b.width / 2, y: b.top + b.height * 0.58 });
/** Where a sprite lands on a Pokémon: its body's middle, higher than the drawn shapes' centre so a jaw or a burst
 *  closes on the Pokémon and leaves its HP bar readable as it drains. */
const body = (b: SlotBox): Point => ({ x: b.left + b.width / 2, y: b.top + b.height * 0.44 });
const px = (n: number) => `${Math.round(n)}px`;
/** A spread that looks scattered and is the same every time: a value in [-1, 1] from an index. */
const spread = (i: number, salt = 1) => Math.sin((i + 1) * 12.9898 * salt) % 1;

/** Whether a move does anything in the ground itself, under the cards. */
const inTheGround = (m: MoveFx) => m.motion.kind === 'area' && m.motion.style === 'quake';

/**
 * The move's sprites at two pixel scales (D9: each a whole or half multiple of the sprite's own pixel), both from
 * `FX_ZOOM` times the mean scale its user and target are drawn at — so a small piece reads across our stage, far wider
 * than the GBA's 240 px, where at the Pokémon's own pixel the review found 118 of 307 moves whose sprite could not be
 * seen. What lands on a Pokémon (a jaw, a barrier, a splat) is capped so the move's biggest such piece stands within
 * `FX_FIT` of its target's box, and the card's name and HP stay readable; what travels across the open field between
 * them (an ember, a star, a drain's orbs) may stand up to `FX_FLY` of it, so a 32-px star still doubles where the
 * Pokémon themselves are drawn small. Before a Pokémon's sprite has loaded, the box's own scale stands in.
 */
const FX_STEP = 0.5;
const FX_ZOOM = 2;
const FX_FIT = 0.9;
const FX_FLY = 1.5;
const boxScale = (b: SlotBox) => Math.max(1, Math.floor(b.height / 64 / FX_STEP) * FX_STEP);
const step = (n: number) => Math.floor(n / FX_STEP) * FX_STEP;
function pixelScales(user: SlotBox, target: SlotBox, pieces: { lands: number; flies: number }): { scale: number; travel: number } {
  const of = (b: SlotBox) => b.pixel ?? boxScale(b);
  const zoom = Math.round(((of(user) + of(target)) / 2) / FX_STEP) * FX_STEP * FX_ZOOM;
  return {
    scale: Math.max(1, Math.min(zoom, step((target.height * FX_FIT) / pieces.lands))),
    travel: Math.max(1, Math.min(zoom, step((target.height * FX_FLY) / pieces.flies))),
  };
}
/** The paths that carry a sprite across the field, not onto a Pokémon. */
const FLIES = new Set(['line', 'wave', 'arc', 'absorb', 'out']);
/** The kinds whose `main` sprite flies (a throw, a stream, a drain's motes, a hex's motes); in the rest it lands. */
const THROWN = new Set(['projectile', 'beam', 'drain', 'hex']);
/** The tallest frame among the move's sprites that land and among those that fly, in GBA pixels. */
function biggestPieces(recipe: FxRecipe, kind: string, emits: readonly FxEmit[] | undefined): { lands: number; flies: number } {
  const h = (p: FxPiece | undefined) => (p ? (fxSprite(p.sprite)?.h ?? 16) : 16);
  const lands = [16, h(recipe.impact)];
  const flies = [16];
  if (emits) for (const e of emits) (FLIES.has(e.path) ? flies : lands).push(h(e.piece));
  else (THROWN.has(kind) ? flies : lands).push(h(recipe.main));
  return { lands: Math.max(...lands), flies: Math.max(...flies) };
}

/**
 * §9.9.2 — the beats of a move drawn with its own sprites, as `motionOf` times them: no charge before a throw, a stream,
 * a bolt, a hex or a drain, and a Melee move that does not dash and a drain land at `spriteLandsAt`.
 */
function spriteBeats(look: { own: boolean; dash: boolean }): Record<string, string> {
  return {
    '--mv-projectile-cast': '0ms',
    '--mv-beam-cast': '0ms',
    '--mv-bolt-cast': '0ms',
    '--mv-hex-cast': '0ms',
    '--mv-drain-cast': '0ms',
    '--mv-drain-travel': `${spriteLandsAt(look, 'drain')}ms`,
    ...(look.dash ? {} : { '--mv-melee-windup': '0ms', '--mv-melee-dash': `${spriteLandsAt(look, 'melee')}ms` }),
  };
}

/** What a move is drawn with: its pret sprites at its one pixel scale (`pixelScale`), and whose side throws it (the foe's are mirrored). */
interface Cast {
  recipe: FxRecipe;
  /** The scale of what lands on a Pokémon. */
  scale: number;
  /** The scale of what flies across the field (`pixelScales`). */
  travel: number;
  flip: boolean;
}
/** The same cast, for a sprite on its way across the field. */
const flying = (cast: Cast): Cast => ({ ...cast, scale: cast.travel });

export function MoveFxLayer({ moves, boxes, floor = false }: { moves: readonly MoveFx[]; boxes: Boxes; floor?: boolean }) {
  return (
    <>
      {moves.map((m) => {
        const found = fxRecipeOf(m.moveId);
        const bg = fxBgOf(m.moveId, m.motion.kind);
        // The background only for a heavy move: the recipe drawn carries it only then.
        const recipe = found && { ...found, bg };
        if (floor && !inTheGround(m) && !bg) return null;
        const fromBox = boxes[m.from];
        if (!fromBox) return null;
        const from = centre(fromBox);
        const targets = m.to.map((s) => boxes[s]).filter((b): b is SlotBox => !!b);
        const to = targets.map(found ? body : centre);
        const look = fxCastOf(m.moveId, m.motion.kind, m.cap);
        const choreo = fxChoreoOf(m.moveId, fxBeatOf(m.motion.kind, look.dash, m.cap));
        const vars = { '--mv-type': `var(--type-${m.type})`, '--mv-total': `${m.motion.totalMs}ms`, '--mv-impact-at': `${m.motion.impactMs}ms`, ...(look.sprites ? spriteBeats(look) : {}) } as CSSProperties;
        // A move the GBA plays on the Pokémon itself (Agility, Harden): that is its whole picture, no rings. A hex keeps
        // its rings on the foe unless its script plays something on the foe too (Tail Whip only sways its user).
        const onThePokemon = !recipe && !!choreo?.mon.length && (m.motion.kind === 'aura' || (m.motion.kind === 'hex' && choreo.mon.some((b) => b.on === 'target')));
        const cast = recipe ? { recipe, ...pixelScales(fromBox, targets[0] ?? fromBox, biggestPieces(recipe, m.motion.kind, choreo?.emits)), flip: m.side === 'enemy' } : undefined;
        return (
          <div
            key={m.id}
            className={styles.move}
            style={vars}
            {...(floor ? {} : { 'data-testid': 'move-fx', 'data-kind': m.motion.kind, 'data-style': m.motion.style, 'data-move': m.moveId, 'data-sprites': recipe && (recipe.main || recipe.impact || bg) ? 'pret' : onThePokemon ? 'mon' : 'drawn' })}
            aria-hidden="true"
          >
            {floor ? (
              <>
                {bg && <span className={styles.fxBg} data-testid="move-fx-bg" style={{ '--fx-bg': `url(${fxBgUrl(bg)})` } as CSSProperties} />}
                {inTheGround(m) && <Floor side={m.side} />}
              </>
            ) : cast && choreo?.emits.length ? (
              <Choreographed m={m} fromBox={fromBox} from={from} to={to} targets={targets} cast={cast} emits={choreo.emits} />
            ) : onThePokemon ? null : (
              draw(m, fromBox, from, to, targets, cast)
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * §9.9.2 One of the move's pret sprites, at the move's pixel scale: its frames played in steps (looping while it flies, or
 * once where it lands), or one frame held. Pixels are moved and mirrored, never turned or smoothed (D9).
 */
function Sprite({ piece, cast, at, delay = '0ms', once = false, hold = false, until, className }: { piece: FxPiece; cast: Cast; at?: Point; delay?: string; once?: boolean; hold?: boolean; until?: string; className?: string }) {
  const info = fxSprite(piece.sprite);
  if (!info) return null;
  const held = piece.frame !== undefined;
  const n = held ? 1 : info.frames;
  const scale = cast.scale;
  const vars = {
    '--fx-url': `url(${fxSpriteUrl(piece.sprite)})`,
    '--fx-w': px(info.w * scale),
    '--fx-h': px(info.h * scale),
    '--fx-sheet': px(info.h * info.frames * scale),
    '--fx-y0': px((piece.frame ?? 0) * info.h * scale),
    '--fx-n': n,
    '--fx-delay': delay,
    '--fx-flip': cast.flip ? -1 : 1,
    ...(until ? { '--fx-until': until } : {}),
    ...(at ? { left: px(at.x), top: px(at.y) } : {}),
  } as CSSProperties;
  // Played once: a strip runs off its last frame; a held piece of a sheet is hidden instead (past it is the next piece);
  // `hold`: played through once and kept on its last frame (Amnesia's question mark, once it has formed).
  const play = hold && n > 1 ? styles.fxHoldLast : once ? (held ? styles.fxHeld : styles.fxOnce) : '';
  // `until`: gone at that moment (Bite's teeth, closed, give way to the hit's splat at the impact).
  return <i className={`${styles.fxSprite} ${play} ${until && once && !hold ? styles.fxUntil : ''} ${info.blend ? styles.fxBlend : ''} ${className ?? ''}`} style={vars} data-fx-sprite={piece.sprite} />;
}

/** Where a move lands, drawn with its sprites: its impact (or its own sprite, if it has no impact) played once. */
function SpriteImpact({ cast, at, delay, withMain = false, mainAt }: { cast: Cast; at: Point; delay: string; withMain?: boolean; mainAt?: string }) {
  const { main, impact } = cast.recipe;
  // The move's own sprite (the foot, the teeth) lands first and stays on top; its burst follows a frame later, under it.
  // `mainAt`: the sprite is on the target before the blow (Bite's teeth from the first frame, closing as it lands).
  const own = mainAt ?? delay;
  return (
    <>
      {impact ? <Sprite piece={impact} cast={cast} at={at} delay={withMain && main ? `calc(${delay} + var(--mv-frames-flicker))` : delay} once /> : null}
      {main && (withMain || !impact) && <Sprite piece={main} cast={cast} at={at} delay={own} once {...(mainAt && impact ? { until: delay } : {})} className={cast.recipe.pair ? styles.fxJawUpper : undefined} />}
      {main && (withMain || !impact) && cast.recipe.pair && <Sprite piece={main} cast={cast} at={at} delay={own} once {...(mainAt && impact ? { until: delay } : {})} className={styles.fxJawLower} />}
    </>
  );
}

/**
 * §9.9.2 — a move replaying its FRLG script: every sprite the script creates, when it creates it, along its
 * callback's path (`fxChoreoOf`) — Flamethrower's embers in a wave, Fire Spin's circling its target, Rock Throw's
 * rocks dropping on it, Absorb's orbs flowing back. A move landing on several plays on each a stagger apart. A dash
 * (Tackle) still carries its user across, and lightning keeps its bolt: those the GBA draws with no sprite.
 */
function Choreographed({ m, fromBox, from, to, targets, cast, emits }: { m: MoveFx; fromBox: SlotBox; from: Point; to: Point[]; targets: SlotBox[]; cast: Cast; emits: FxEmit[] }) {
  const user = body(fromBox);
  return (
    <>
      {m.actor && <Melee m={m} box={fromBox} from={from} to={to[0] ?? user} dashOnly />}
      {m.motion.kind === 'bolt' && to[0] && <BoltLine from={from} to={to[0]} />}
      {to.map((t, k) => (
        <span key={k}>
          {emits.map((e) => (
            <Emit key={e.i} e={e} user={user} target={t} box={targets[k] ?? fromBox} cast={cast} stagger={k * MOTION_MS.impact.stagger} />
          ))}
        </span>
      ))}
    </>
  );
}

/** Where one sprite of a choreography starts and ends, in the stage's pixels, from its path and its GBA offset. */
function Emit({ e, user, target, box, cast: landing, stagger }: { e: FxEmit; user: Point; target: Point; box: SlotBox; cast: Cast; stagger: number }) {
  const cast = FLIES.has(e.path) ? flying(landing) : landing;
  // A GBA offset at the move's pixel scale, mirrored on the foe's side (x points toward the target).
  const off = { x: e.dx * cast.scale * (cast.flip ? -1 : 1), y: e.dy * cast.scale };
  const plus = (p: Point, q: Point = off): Point => ({ x: p.x + q.x, y: p.y + q.y });
  const h = box.height;
  // Where a sprite that does not travel plays: on its user or its target, as its callback places it.
  const at = e.on === 'user' ? user : target;
  let a: Point;
  let b: Point;
  switch (e.path) {
    case 'line':
    case 'wave':
    case 'arc':
      a = plus(user);
      b = target;
      break;
    case 'absorb':
      a = plus(target);
      b = user;
      break;
    case 'out':
      a = plus(user);
      b = plus({ x: user.x + (target.x - user.x) * 0.4, y: user.y + (target.y - user.y) * 0.4 });
      break;
    case 'close':
      a = plus(at);
      b = at;
      break;
    case 'fall':
      b = plus(at);
      a = { x: b.x, y: b.y - h * 1.1 };
      break;
    case 'rise':
      a = plus(at, { x: off.x, y: off.y + h * 0.2 });
      b = { x: a.x, y: a.y - h * 0.6 };
      break;
    case 'sway':
      // Drifting down from above its user, swaying as it falls (Petal Dance's flowers, a feather).
      a = plus(at, { x: off.x, y: off.y - h * 0.7 });
      b = { x: a.x, y: at.y + h * 0.25 };
      break;
    case 'scatter': {
      a = plus(at);
      const turn = e.i * 2.4;
      b = { x: a.x + Math.cos(turn) * h * 0.45, y: a.y + Math.sin(turn) * h * 0.3 };
      break;
    }
    case 'orbit':
      // Round its point itself: the offset is the orbit's reach, not where it sits.
      a = at;
      b = a;
      break;
    default:
      a = plus(at);
      b = a;
  }
  const vars = {
    '--x0': px(a.x),
    '--y0': px(a.y),
    '--x1': px(b.x),
    '--y1': px(b.y),
    '--at': `${Math.round(e.at + stagger)}ms`,
    '--life': `${Math.round(e.life)}ms`,
    // A wave's sway, an arc's or a drain's lift, an orbit's reach: from the target's size.
    '--amp': px(h * 0.14),
    '--lift': px(Math.max(h * 0.4, Math.abs(b.x - a.x) * 0.22)),
    '--r': px(h * 0.32),
    // An orbit starts where in its circle its script set it: its spin begins that far back in its turn.
    '--spin-at': `${Math.round(e.at + stagger - e.phase * e.life)}ms`,
  } as CSSProperties;
  const sprite = <Sprite piece={e.piece} cast={cast} delay={`${Math.round(e.at + stagger)}ms`} />;
  return (
    <span className={`${styles.cho} ${styles[`cho_${e.path}`] ?? ''}`} style={vars} data-fx-path={e.path}>
      {e.path === 'orbit' ? <span className={styles.choSpin}>{sprite}</span> : sprite}
    </span>
  );
}

/** Earthquake in the ground, under the cards: the floor splitting from the user's side, dust the width of the field. */
function Floor({ side }: { side: 'player' | 'enemy' }) {
  const dir = side === 'player' ? 1 : -1;
  return (
    <div className={styles.area} style={{ '--dir': dir } as CSSProperties}>
      {/* Drawn in the field's own percentages. */}
      <svg className={`${styles.svg} ${styles.crackField}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {[70, 80, 91].map((y, k) => {
          const a = { x: dir > 0 ? 2 : 98, y: y + k };
          const b = { x: dir > 0 ? 98 : 2, y: y - 2 + k };
          return <polyline key={k} className={styles.crack} style={{ '--i': k } as CSSProperties} points={zigzag(a, b, 14, 2.4)} pathLength={1} />;
        })}
      </svg>
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} className={styles.dust} style={{ left: `${Math.round(4 + i * 8.5)}%`, top: `${Math.round(78 + spread(i, 8) * 10)}%`, '--i': i } as CSSProperties} />
      ))}
    </div>
  );
}

function draw(m: MoveFx, fromBox: SlotBox, from: Point, to: Point[], targets: SlotBox[], cast?: Cast): ReactNode {
  const first = to[0];
  switch (m.motion.kind) {
    case 'melee':
      return first ? <Melee m={m} box={fromBox} from={from} to={first} cast={cast} /> : null;
    case 'projectile':
      return first ? <Projectile style={(m.motion.style as ProjectileStyle) ?? 'orb'} from={from} to={first} cast={cast} /> : null;
    case 'beam':
      return first ? <Beam from={from} to={first} cast={cast} /> : null;
    case 'bolt':
      return first ? <Bolt from={from} to={first} cast={cast} /> : null;
    case 'drain':
      return first ? <Drain from={from} to={first} cast={cast} /> : null;
    case 'hex':
      return first ? <Hex from={from} to={to} cast={cast} /> : null;
    case 'aura':
      return first ? <Aura at={first} box={targets[0]!} cast={cast} /> : null;
    case 'area':
      return <Area style={(m.motion.style as AreaStyle) ?? 'shockwave'} side={m.side} from={from} to={to} boxes={targets} cast={cast} />;
  }
}

/** The vector from one point to another, as the custom properties a flight reads. */
function flight(from: Point, to: Point): CSSProperties {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return { left: px(from.x), top: px(from.y), '--dx': px(dx), '--dy': px(dy), '--angle': `${Math.atan2(dy, dx)}rad`, '--dist': px(Math.hypot(dx, dy)) } as CSSProperties;
}

/** The burst where a move lands: a ring and sparks in its type's colour, at the impact. */
function Impact({ at, delay, big = false }: { at: Point; delay: string; big?: boolean }) {
  return (
    <span className={`${styles.impact} ${big ? styles.impactBig : ''}`} style={{ left: px(at.x), top: px(at.y), '--impact-at': delay } as CSSProperties}>
      <span className={styles.impactRing} />
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} className={styles.spark} style={{ '--i': i } as CSSProperties} />
      ))}
    </span>
  );
}

/** The charge before a throw: a glow gathering on the user. */
const Cast = ({ at, kind }: { at: Point; kind: 'projectile' | 'beam' | 'bolt' | 'drain' | 'hex' }) => (
  <span className={styles.cast} style={{ left: px(at.x), top: px(at.y), '--cast-ms': `var(--mv-${kind}-cast)` } as CSSProperties} />
);

/** §9.9.2 Melee — the user winds up, dashes across to its target, jabs, and comes back to its card. */
function Melee({ m, box, from, to, cast, dashOnly = false }: { m: MoveFx; box: SlotBox; from: Point; to: Point; cast?: Cast; dashOnly?: boolean }) {
  const landed = 'calc(var(--mv-melee-windup) + var(--mv-melee-dash))';
  // It stops short of the target, so the two touch rather than overlap.
  const reach = 0.78;
  return (
    <>
      {m.actor && (
        <div className={styles.double} style={{ left: box.left, top: box.top, width: box.width, height: box.height, '--dx': px((to.x - from.x) * reach), '--dy': px((to.y - from.y) * reach) } as CSSProperties}>
          <span className={styles.trail} />
          <span className={styles.jab}>
            <ArenaSprite src={spriteOf({ speciesId: m.actor.speciesId }, m.side === 'player' ? 'back' : 'front', m.actor.shiny)} />
          </span>
        </div>
      )}
      {/* Without a dash, the move's sprite is on the target from the first frame and its blow lands a lead later. */}
      {dashOnly ? null : cast ? <SpriteImpact cast={cast} at={to} delay={landed} withMain {...(m.actor ? {} : { mainAt: '0ms' })} /> : <Impact at={to} delay={landed} />}
    </>
  );
}

/** Petal Dance, Razor Wind, Pin Missile: what streams across the field. */
const STREAK: Partial<Record<AreaStyle, string>> = { petals: styles.streakPetals, gale: styles.streakGale, swarm: styles.streakSwarm };
const STREAK_COUNT = { petals: 40, gale: 18, swarm: 24 } as const;

const VOLLEY: Partial<Record<ProjectileStyle, number>> = { bubbles: 4, leaves: 3, shards: 3, rocks: 3, needles: 4, rings: 3, stars: 3, gust: 3 };

/** §9.9.2 Ranged — the charge, then the shape thrown along the line to the target: one orb, or a volley a beat apart;
 *  with its own sprite, thrown from the first frame and landing with its last shot. */
function Projectile({ style, from, to, cast }: { style: ProjectileStyle; from: Point; to: Point; cast?: Cast }) {
  const n = cast?.recipe.main ? (cast.recipe.volley ?? 1) : (VOLLEY[style] ?? 1);
  const landed = 'calc(var(--mv-projectile-cast) + var(--mv-projectile-travel))';
  if (cast?.recipe.main) {
    const last = `calc(${landed} + var(--mv-projectile-volley) * ${n - 1})`;
    return (
      <>
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={`${styles.flight} ${styles.spriteFlight}`} style={{ ...flight(from, to), '--i': i, '--off': px(n > 1 ? spread(i, 3) * 14 : 0) } as CSSProperties}>
            <span className={styles.upright}>
              <Sprite piece={cast.recipe.main!} cast={flying(cast)} />
            </span>
          </span>
        ))}
        {cast.recipe.impact ? <Sprite piece={cast.recipe.impact} cast={cast} at={to} delay={last} once /> : <Impact at={to} delay={last} />}
      </>
    );
  }
  return (
    <>
      <Cast at={from} kind="projectile" />
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={styles.flight} style={{ ...flight(from, to), '--i': i, '--off': px(n > 1 ? spread(i, 3) * 14 : 0) } as CSSProperties}>
          <span className={`${styles.shot} ${styles[style]}`}>
            {(style === 'flame' || style === 'orb' || style === 'shadow' || style === 'sludge') && (
              <>
                <i className={styles.tail} style={{ '--t': 1 } as CSSProperties} />
                <i className={styles.tail} style={{ '--t': 2 } as CSSProperties} />
                <i className={styles.tail} style={{ '--t': 3 } as CSSProperties} />
              </>
            )}
          </span>
        </span>
      ))}
      {cast?.recipe.impact ? <Sprite piece={cast.recipe.impact} cast={cast} at={to} delay={landed} once /> : <Impact at={to} delay={landed} />}
    </>
  );
}

/** How many of a stream's sprites cross the field: Flamethrower's embers, Ice Beam's crystals. */
const STREAM = 8;

/** §9.9.2 A stream — one line from the user to the target, grown, held, gone; or its sprites poured along it. */
function Beam({ from, to, cast }: { from: Point; to: Point; cast?: Cast }) {
  const landed = 'calc(var(--mv-beam-cast) + var(--mv-beam-grow))';
  if (cast?.recipe.main)
    return (
      <>
        {Array.from({ length: STREAM }, (_, i) => (
          <span key={i} className={`${styles.flight} ${styles.streamFlight} ${styles.spriteFlight}`} style={{ ...flight(from, to), '--i': i, '--n': STREAM, '--off': px(spread(i, 6) * 10) } as CSSProperties}>
            <span className={styles.upright}>
              <Sprite piece={cast.recipe.main!} cast={flying(cast)} />
            </span>
          </span>
        ))}
        {cast.recipe.impact ? <Sprite piece={cast.recipe.impact} cast={cast} at={to} delay={landed} once /> : <Impact at={to} delay={landed} big />}
      </>
    );
  return (
    <>
      <Cast at={from} kind="beam" />
      <span className={styles.beam} style={flight(from, to)}>
        <span className={styles.beamCore} />
      </span>
      <Impact at={to} delay={landed} big />
    </>
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** A jagged line between two points: lightning's path, the same every time for the same two points. */
function zigzag(a: Point, b: Point, steps: number, amp: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const off = i === 0 || i === steps ? 0 : (i % 2 ? 1 : -1) * amp * (0.6 + 0.4 * Math.abs(spread(i, 7)));
    pts.push(`${round1(a.x + dx * t + nx * off)},${round1(a.y + dy * t + ny * off)}`);
  }
  return pts.join(' ');
}

/** Lightning's own line — the GBA draws it with a task, not a sprite, so a choreography's sparks keep it and wait for
 *  its stroke (`fxBeatOf`). */
function BoltLine({ from, to, steps = 8, amp = 18, className }: { from: Point; to: Point; steps?: number; amp?: number; className?: string }) {
  const path = zigzag(from, to, steps, amp);
  return (
    <svg className={`${styles.svg} ${className ?? ''}`} aria-hidden="true">
      <polyline className={styles.boltGlow} points={path} pathLength={1} />
      <polyline className={styles.boltCore} points={path} pathLength={1} />
    </svg>
  );
}

/** §9.9.2 Lightning — a bolt drawn from the user to the target, flickering. */
function Bolt({ from, to, cast }: { from: Point; to: Point; cast?: Cast }) {
  const landed = 'calc(var(--mv-bolt-cast) + var(--mv-bolt-strike))';
  return (
    <>
      {!cast?.recipe.main && <Cast at={from} kind="bolt" />}
      <BoltLine from={from} to={to} />
      {cast ? <SpriteImpact cast={cast} at={to} delay={landed} withMain /> : <Impact at={to} delay={landed} big />}
    </>
  );
}

/** §9.9.2 A drain — a tendril to the target, the hit, then the life flowing back to the user as motes. */
function Drain({ from, to, cast }: { from: Point; to: Point; cast?: Cast }) {
  const landed = 'calc(var(--mv-drain-cast) + var(--mv-drain-travel))';
  return (
    <>
      {/* With its own sprites, the motes flowing back are the picture: no charge, no tendril over them. */}
      {!cast?.recipe.main && (
        <>
          <Cast at={from} kind="drain" />
          <span className={`${styles.beam} ${styles.tendril}`} style={flight(from, to)}>
            <span className={styles.beamCore} />
          </span>
        </>
      )}
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`${styles.flight} ${styles.back} ${cast?.recipe.main ? styles.spriteFlight : ''}`} style={{ ...flight(to, from), '--i': i, '--off': px(spread(i, 5) * 18) } as CSSProperties}>
          {cast?.recipe.main ? (
            <span className={styles.upright}>
              <Sprite piece={cast.recipe.main} cast={{ ...flying(cast), flip: !cast.flip }} />
            </span>
          ) : (
            <span className={`${styles.shot} ${styles.mote}`} />
          )}
        </span>
      ))}
      {cast?.recipe.impact ? <Sprite piece={cast.recipe.impact} cast={cast} at={to} delay={landed} once /> : <Impact at={to} delay={landed} />}
    </>
  );
}

/** §9.9.2 A hex — motes thrown at the foe and a swirl round it: a status or a stage coming its way. */
function Hex({ from, to, cast }: { from: Point; to: Point[]; cast?: Cast }) {
  const main = cast?.recipe.main;
  const landed = 'calc(var(--mv-hex-cast) + var(--mv-hex-travel))';
  return (
    <>
      {!cast?.recipe.main && <Cast at={from} kind="hex" />}
      {to.map((t, k) => (
        <span key={k}>
          {Array.from({ length: main ? 3 : 4 }, (_, i) => (
            <span key={i} className={`${styles.flight} ${styles.hexFlight} ${main ? styles.spriteFlight : ''}`} style={{ ...flight(from, t), '--i': i, '--off': px(spread(i, 9) * 16) } as CSSProperties}>
              {main && cast ? (
                <span className={styles.upright}>
                  <Sprite piece={main} cast={flying(cast)} />
                </span>
              ) : (
                <span className={`${styles.shot} ${styles.mote}`} />
              )}
            </span>
          ))}
          {cast && (main || cast.recipe.impact) ? (
            <SpriteImpact cast={cast} at={t} delay={landed} withMain />
          ) : (
            <span className={styles.swirl} style={{ left: px(t.x), top: px(t.y) }} />
          )}
        </span>
      ))}
    </>
  );
}

/** §9.9.2 A raise or a heal — rings rising from the Pokémon's feet, and sparks going up. */
function Aura({ at, box, cast }: { at: Point; box: SlotBox; cast?: Cast }) {
  const feet = { x: at.x, y: box.top + box.height * 0.92 };
  // Its own sprite on the Pokémon (Swords Dance's sword, Amnesia's question mark), played through and held: the move's
  // picture alone, without the drawn rings over it (one picture per beat, D12).
  if (cast?.recipe.main) return <Sprite piece={cast.recipe.main} cast={cast} at={at} once hold className={styles.fxAura} />;
  return (
    <span className={styles.aura} style={{ left: px(feet.x), top: px(feet.y), '--h': px(box.height * 0.8) } as CSSProperties}>
      <span className={styles.auraRing} />
      <span className={styles.auraRing} style={{ '--i': 1 } as CSSProperties} />
      <span className={styles.auraRing} style={{ '--i': 2 } as CSSProperties} />
      <span className={styles.auraGlow} />
      {Array.from({ length: 10 }, (_, i) => <i key={i} className={styles.auraSpark} style={{ '--i': i, '--x': px(spread(i, 2) * box.width * 0.35) } as CSSProperties} />)}
    </span>
  );
}

/**
 * §9.9.2 The stage-filling moves — each its own picture over the whole field: Surf's wave rolling across from its user's
 * side, Earthquake's dust and cracks under its targets (the stage itself shakes), Blizzard's snow, Thunder's bolts from
 * the sky, Fire Blast's wall of flame, Rock Slide's falling rocks, Explosion's flash and blast… What rises from a
 * target's feet (flames, dust, stones, fog) is sized from its box, so it stays in its window and off its plate.
 */
/** Blizzard's snowflakes. */
const FLAKES = 96;

/** How many of a field move's own sprites land on each target, a beat apart. */
const SCATTER = 3;

function Area({ style, side, from, to, boxes, cast }: { style: AreaStyle; side: 'player' | 'enemy'; from: Point; to: Point[]; boxes: SlotBox[]; cast?: Cast }) {
  const dir = side === 'player' ? 1 : -1;
  const vars = { '--dir': dir, '--flakes': FLAKES } as CSSProperties;
  const drawn = !cast?.recipe.main && !cast?.recipe.bg;
  const impact = 'calc(var(--mv-area-build) + var(--mv-area-peak))';
  const field = (n: number, render: (i: number) => ReactNode) => Array.from({ length: n }, (_, i) => render(i));
  /** A target's feet, and its box's size as the custom properties its floor effects read. */
  const ground = (k: number) => {
    const b = boxes[k]!;
    return { feet: b.top + b.height * 0.92, w: b.width, h: b.height, vars: { '--w': px(b.width), '--h': px(b.height) } as CSSProperties };
  };
  return (
    <div className={styles.area} style={vars}>
      {/* Where the move has its own sprites or pret's background, they replace the drawn picture and its type tint (one
          picture per beat, D12) — Earthquake's shaking ground stays, it is the choreography. */}
      {drawn && <span className={styles.tint} />}
      {drawn && style === 'wave' && (
        <span className={styles.waveTrack}>
          <span className={styles.waveBody} />
        </span>
      )}
      {style === 'quake' && (
        <>
          {/* The cracks and the dust are in the ground, under the cards (`Floor`); over them, stones jump. */}
          {to.map((t, k) => {
            const g = ground(k);
            return (
              <span key={k} style={g.vars}>
                {field(5, (i) => (
                  <i key={i} className={styles.debris} style={{ left: px(t.x + (i - 2) * g.w * 0.14), top: px(g.feet), '--i': i } as CSSProperties} />
                ))}
              </span>
            );
          })}
        </>
      )}
      {drawn && style === 'blizzard' && (
        <>
          <span className={styles.frost} />
          {field(FLAKES, (i) => (
            <i key={i} className={styles.flake} style={{ '--i': i, '--x': `${Math.round((i * 37) % 110) - 5}%`, '--y': `${Math.round(((i * 53) % 90) - 30)}%`, '--s': 0.6 + ((i * 7) % 5) / 5 } as CSSProperties} />
          ))}
        </>
      )}
      {drawn && style === 'storm' && (
        <>
          {to.map((t, k) => (
            <BoltLine key={k} from={{ x: t.x + 20 * spread(k), y: 0 }} to={t} steps={7} amp={16} className={styles.skyBolt} />
          ))}
          <span className={styles.strikeFlash} />
        </>
      )}
      {drawn && style === 'inferno' && (
        <>
          {/* Fire Blast: a great fireball crosses the field first, and the flames erupt where it lands. */}
          {to.map((t, k) => (
            <span key={k} className={`${styles.flight} ${styles.blastFlight}`} style={flight(from, t)}>
              <span className={`${styles.shot} ${styles.flame} ${styles.blast}`}>
                <i className={styles.tail} style={{ '--t': 1 } as CSSProperties} />
                <i className={styles.tail} style={{ '--t': 2 } as CSSProperties} />
                <i className={styles.tail} style={{ '--t': 3 } as CSSProperties} />
              </span>
            </span>
          ))}
          {to.map((t, k) => {
            const g = ground(k);
            return (
              <span key={`pyre-${k}`} style={g.vars}>
                {field(7, (i) => (
                  <i key={i} className={styles.pyre} style={{ left: px(t.x + (i - 3) * g.w * 0.12), top: px(g.feet - Math.abs(i - 3) * g.h * 0.03), '--i': Math.abs(i - 3) } as CSSProperties} />
                ))}
              </span>
            );
          })}
          <span className={styles.strikeFlash} />
        </>
      )}
      {drawn && style === 'rockfall' &&
        to.map((t, k) => {
          const g = ground(k);
          return (
            <span key={k} style={g.vars}>
              {field(7, (i) => (
                <i key={i} className={styles.rock} style={{ left: px(t.x + spread(i, 4) * g.w * 0.4), top: px(t.y + spread(i, 9) * g.h * 0.15), '--i': i, '--fall': px(t.y + 120), '--s': 0.7 + ((i * 3) % 4) / 5 } as CSSProperties} />
              ))}
              {field(4, (i) => (
                <i key={`d${i}`} className={`${styles.dust} ${styles.dustSmall}`} style={{ left: px(t.x + (i - 1.5) * g.w * 0.25), top: px(g.feet), '--i': i } as CSSProperties} />
              ))}
            </span>
          );
        })}
      {drawn && (style === 'shockwave' || style === 'psywave' || style === 'dragon') && (
        <>
          {field(style === 'shockwave' ? 2 : 4, (i) => (
            <span key={i} className={styles.ripple} style={{ left: px(from.x), top: px(from.y), '--i': i } as CSSProperties} />
          ))}
          {style === 'shockwave' && <span className={styles.flash} />}
        </>
      )}
      {drawn && (style === 'petals' || style === 'gale' || style === 'swarm') &&
        ((n) => field(n, (i) => <i key={i} className={STREAK[style]} style={{ '--i': i, '--n': n, '--y': `${Math.round(10 + ((i * 41) % 80))}%` } as CSSProperties} />))(STREAK_COUNT[style])}
      {drawn && style === 'toxic' &&
        to.map((t, k) => {
          const g = ground(k);
          return (
            <span key={k} style={g.vars}>
              {field(5, (i) => (
                <i key={i} className={styles.fog} style={{ left: px(t.x + (i - 2) * g.w * 0.18), top: px(g.feet - g.h * 0.2), '--i': i } as CSSProperties} />
              ))}
            </span>
          );
        })}
      {drawn && style === 'darkness' && to.map((t, k) => <span key={k} className={styles.swirl} style={{ left: px(t.x), top: px(t.y) }} />)}
      {/* The move's own sprites over each target (Blizzard's crystals, Sludge Bomb's sludge), a beat apart, then its hit. */}
      {cast?.recipe.main &&
        to.map((t, k) =>
          field(SCATTER, (i) => (
            <Sprite
              key={`own-${k}-${i}`}
              piece={cast.recipe.main!}
              cast={cast}
              at={{ x: t.x + spread(i + k, 4) * boxes[k]!.width * 0.3, y: t.y + spread(i + k, 9) * boxes[k]!.height * 0.25 }}
              delay={`calc(var(--mv-area-build) * ${i} / ${SCATTER} + var(--mv-impact-stagger) * ${k})`}
              once
            />
          )),
        )}
      {to.map((t, k) =>
        cast?.recipe.impact ? (
          <Sprite key={`hit-${k}`} piece={cast.recipe.impact} cast={cast} at={t} delay={`calc(${impact} + var(--mv-impact-stagger) * ${k})`} once />
        ) : (
          <Impact key={`hit-${k}`} at={t} delay={`calc(${impact} + var(--mv-impact-stagger) * ${k})`} big />
        ),
      )}
    </div>
  );
}

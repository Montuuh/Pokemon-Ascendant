import type { CSSProperties, ReactNode } from 'react';
import { spriteOf } from '@/ui/art';
import { fxBgOf, fxBgUrl, fxRecipeOf, fxSprite, fxSpriteUrl, type FxPiece, type FxRecipe } from '@/ui/fx/moveFx';
import type { MoveFx, SlotBox, SpriteSlot } from '@/ui/hooks/useCombatFx';
import type { AreaStyle, ProjectileStyle } from '@/ui/moveMotion';
import { ArenaSprite } from './ArenaSprite';
import styles from './MoveFx.module.css';

// §9.9.2 — a move, drawn: the user's dash across the field and back (Melee), the charge and the throw (Ranged — an orb,
// a spray, a beam, a bolt, a drain), the stage filled (Surf, Earthquake, Blizzard…), a glow (a raise or a heal) or a hex
// thrown at the foe. Every shape is positioned from the slots' measured boxes and coloured by the move's type; every
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
 * The move's sprites at one pixel size for the whole beat (D9): the field's scale — a GBA battle sprite is 64 px tall,
 * so the box's height over 64, to the half step — and a half step more, since our field is far wider than the GBA's
 * 240 px and an ember at the Pokémon's own scale is lost across it.
 */
const FX_STEP = 0.5;
const pixelScale = (b: SlotBox) => Math.max(1, Math.floor((b.height / 64) / FX_STEP) * FX_STEP) + FX_STEP;

/** What a move is drawn with: its pret sprites at the field's scale, and whose side throws it (the foe's are mirrored). */
interface Cast {
  recipe: FxRecipe;
  scale: number;
  flip: boolean;
}

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
        const vars = { '--mv-type': `var(--type-${m.type})`, '--mv-total': `${m.motion.totalMs}ms`, '--mv-impact-at': `${m.motion.impactMs}ms` } as CSSProperties;
        const cast = recipe ? { recipe, scale: pixelScale(targets[0] ?? fromBox), flip: m.side === 'enemy' } : undefined;
        return (
          <div
            key={m.id}
            className={styles.move}
            style={vars}
            {...(floor ? {} : { 'data-testid': 'move-fx', 'data-kind': m.motion.kind, 'data-style': m.motion.style, 'data-move': m.moveId, 'data-sprites': recipe && (recipe.main || recipe.impact || bg) ? 'pret' : 'drawn' })}
            aria-hidden="true"
          >
            {floor ? (
              <>
                {bg && <span className={styles.fxBg} data-testid="move-fx-bg" style={{ '--fx-bg': `url(${fxBgUrl(bg)})` } as CSSProperties} />}
                {inTheGround(m) && <Floor side={m.side} />}
              </>
            ) : (
              draw(m, fromBox, from, to, targets, cast)
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * §9.9.2 One of the move's pret sprites, at the field's scale: its frames played in steps (looping while it flies, or
 * once where it lands), or one frame held. Pixels are moved and mirrored, never turned or smoothed (D9).
 */
function Sprite({ piece, cast, at, delay = '0ms', once = false, className }: { piece: FxPiece; cast: Cast; at?: Point; delay?: string; once?: boolean; className?: string }) {
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
    ...(at ? { left: px(at.x), top: px(at.y) } : {}),
  } as CSSProperties;
  // Played once: a strip runs off its last frame; a held piece of a sheet is hidden instead (past it is the next piece).
  return <i className={`${styles.fxSprite} ${once ? (held ? styles.fxHeld : styles.fxOnce) : ''} ${className ?? ''}`} style={vars} data-fx-sprite={piece.sprite} />;
}

/** Where a move lands, drawn with its sprites: its impact (or its own sprite, if it has no impact) played once. */
function SpriteImpact({ cast, at, delay, withMain = false }: { cast: Cast; at: Point; delay: string; withMain?: boolean }) {
  const { main, impact } = cast.recipe;
  // The move's own sprite (the foot, the teeth) lands first and stays on top; its burst follows a frame later, under it.
  return (
    <>
      {impact ? <Sprite piece={impact} cast={cast} at={at} delay={withMain && main ? `calc(${delay} + var(--mv-frames-flicker))` : delay} once /> : null}
      {main && (withMain || !impact) && <Sprite piece={main} cast={cast} at={at} delay={delay} once className={cast.recipe.pair ? styles.fxJawUpper : undefined} />}
      {main && (withMain || !impact) && cast.recipe.pair && <Sprite piece={main} cast={cast} at={at} delay={delay} once className={styles.fxJawLower} />}
    </>
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
function Melee({ m, box, from, to, cast }: { m: MoveFx; box: SlotBox; from: Point; to: Point; cast?: Cast }) {
  const landed = 'calc(var(--mv-melee-windup) + var(--mv-melee-dash))';
  // It stops short of the target, so the two touch rather than overlap.
  const reach = 0.78;
  const vars = { left: box.left, top: box.top, width: box.width, height: box.height, '--dx': px((to.x - from.x) * reach), '--dy': px((to.y - from.y) * reach) } as CSSProperties;
  return (
    <>
      {m.actor && (
        <div className={styles.double} style={vars}>
          <span className={styles.trail} />
          <span className={styles.jab}>
            <ArenaSprite src={spriteOf({ speciesId: m.actor.speciesId }, m.side === 'player' ? 'back' : 'front', m.actor.shiny)} />
          </span>
        </div>
      )}
      {cast ? <SpriteImpact cast={cast} at={to} delay={landed} withMain /> : <Impact at={to} delay={landed} />}
    </>
  );
}

/** Petal Dance, Razor Wind, Pin Missile: what streams across the field. */
const STREAK: Partial<Record<AreaStyle, string>> = { petals: styles.streakPetals, gale: styles.streakGale, swarm: styles.streakSwarm };
const STREAK_COUNT = { petals: 40, gale: 18, swarm: 24 } as const;

const VOLLEY: Partial<Record<ProjectileStyle, number>> = { bubbles: 4, leaves: 3, shards: 3, rocks: 3, needles: 4, rings: 3, stars: 3, gust: 3 };

/** §9.9.2 Ranged — the charge, then the shape thrown along the line to the target: one orb, or a volley a beat apart. */
function Projectile({ style, from, to, cast }: { style: ProjectileStyle; from: Point; to: Point; cast?: Cast }) {
  const n = cast?.recipe.main ? (cast.recipe.volley ?? 1) : (VOLLEY[style] ?? 1);
  const landed = 'calc(var(--mv-projectile-cast) + var(--mv-projectile-travel))';
  if (cast?.recipe.main)
    return (
      <>
        <Cast at={from} kind="projectile" />
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={`${styles.flight} ${styles.spriteFlight}`} style={{ ...flight(from, to), '--i': i, '--off': px(n > 1 ? spread(i, 3) * 14 : 0) } as CSSProperties}>
            <span className={styles.upright}>
              <Sprite piece={cast.recipe.main!} cast={cast} />
            </span>
          </span>
        ))}
        {cast.recipe.impact ? <Sprite piece={cast.recipe.impact} cast={cast} at={to} delay={landed} once /> : <Impact at={to} delay={landed} />}
      </>
    );
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
      <Impact at={to} delay={landed} />
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
        <Cast at={from} kind="beam" />
        {Array.from({ length: STREAM }, (_, i) => (
          <span key={i} className={`${styles.flight} ${styles.streamFlight} ${styles.spriteFlight}`} style={{ ...flight(from, to), '--i': i, '--n': STREAM, '--off': px(spread(i, 6) * 10) } as CSSProperties}>
            <span className={styles.upright}>
              <Sprite piece={cast.recipe.main!} cast={cast} />
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

/** §9.9.2 Lightning — a bolt drawn from the user to the target, flickering. */
function Bolt({ from, to, cast }: { from: Point; to: Point; cast?: Cast }) {
  const path = zigzag(from, to, 8, 18);
  const landed = 'calc(var(--mv-bolt-cast) + var(--mv-bolt-strike))';
  return (
    <>
      <Cast at={from} kind="bolt" />
      <svg className={styles.svg} aria-hidden="true">
        <polyline className={styles.boltGlow} points={path} pathLength={1} />
        <polyline className={styles.boltCore} points={path} pathLength={1} />
      </svg>
      {cast ? <SpriteImpact cast={cast} at={to} delay={landed} withMain /> : <Impact at={to} delay={landed} big />}
    </>
  );
}

/** §9.9.2 A drain — a tendril to the target, the hit, then the life flowing back to the user as motes. */
function Drain({ from, to, cast }: { from: Point; to: Point; cast?: Cast }) {
  const landed = 'calc(var(--mv-drain-cast) + var(--mv-drain-travel))';
  return (
    <>
      <Cast at={from} kind="drain" />
      <span className={`${styles.beam} ${styles.tendril}`} style={flight(from, to)}>
        <span className={styles.beamCore} />
      </span>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`${styles.flight} ${styles.back} ${cast?.recipe.main ? styles.spriteFlight : ''}`} style={{ ...flight(to, from), '--i': i, '--off': px(spread(i, 5) * 18) } as CSSProperties}>
          {cast?.recipe.main ? (
            <span className={styles.upright}>
              <Sprite piece={cast.recipe.main} cast={{ ...cast, flip: !cast.flip }} />
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
      <Cast at={from} kind="hex" />
      {to.map((t, k) => (
        <span key={k}>
          {Array.from({ length: main ? 3 : 4 }, (_, i) => (
            <span key={i} className={`${styles.flight} ${styles.hexFlight} ${main ? styles.spriteFlight : ''}`} style={{ ...flight(from, t), '--i': i, '--off': px(spread(i, 9) * 16) } as CSSProperties}>
              {main && cast ? (
                <span className={styles.upright}>
                  <Sprite piece={main} cast={cast} />
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
  return (
    <>
      <span className={styles.aura} style={{ left: px(feet.x), top: px(feet.y), '--h': px(box.height * 0.8) } as CSSProperties}>
        <span className={styles.auraRing} />
        <span className={styles.auraRing} style={{ '--i': 1 } as CSSProperties} />
        <span className={styles.auraRing} style={{ '--i': 2 } as CSSProperties} />
        <span className={styles.auraGlow} />
        {!cast?.recipe.main &&
          Array.from({ length: 10 }, (_, i) => <i key={i} className={styles.auraSpark} style={{ '--i': i, '--x': px(spread(i, 2) * box.width * 0.35) } as CSSProperties} />)}
      </span>
      {/* Its own sprite on the Pokémon (Swords Dance's sword, Amnesia's question mark), played through once. */}
      {cast?.recipe.main && <Sprite piece={cast.recipe.main} cast={cast} at={at} once className={styles.fxAura} />}
    </>
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
      {/* Where pret's background washes the stage, no tint over it; where the move has its own sprites, they replace
          the drawn picture (one picture per beat, D12) — Earthquake's shaking ground stays, it is the choreography. */}
      {!cast?.recipe.bg && <span className={styles.tint} />}
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
            <svg key={k} className={`${styles.svg} ${styles.skyBolt}`} aria-hidden="true">
              <polyline className={styles.boltGlow} points={zigzag({ x: t.x + 20 * spread(k), y: 0 }, t, 7, 16)} pathLength={1} />
              <polyline className={styles.boltCore} points={zigzag({ x: t.x + 20 * spread(k), y: 0 }, t, 7, 16)} pathLength={1} />
            </svg>
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

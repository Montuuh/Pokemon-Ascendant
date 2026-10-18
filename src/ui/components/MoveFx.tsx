import type { CSSProperties, ReactNode } from 'react';
import { spriteOf } from '@/ui/art';
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
const px = (n: number) => `${Math.round(n)}px`;
/** A spread that looks scattered and is the same every time: a value in [-1, 1] from an index. */
const spread = (i: number, salt = 1) => Math.sin((i + 1) * 12.9898 * salt) % 1;

/** Whether a move does anything in the ground itself, under the cards. */
const inTheGround = (m: MoveFx) => m.motion.kind === 'area' && m.motion.style === 'quake';

export function MoveFxLayer({ moves, boxes, floor = false }: { moves: readonly MoveFx[]; boxes: Boxes; floor?: boolean }) {
  return (
    <>
      {moves.map((m) => {
        if (floor && !inTheGround(m)) return null;
        const fromBox = boxes[m.from];
        if (!fromBox) return null;
        const from = centre(fromBox);
        const targets = m.to.map((s) => boxes[s]).filter((b): b is SlotBox => !!b);
        const to = targets.map(centre);
        const vars = { '--mv-type': `var(--type-${m.type})` } as CSSProperties;
        return (
          <div key={m.id} className={styles.move} style={vars} {...(floor ? {} : { 'data-testid': 'move-fx', 'data-kind': m.motion.kind, 'data-style': m.motion.style, 'data-move': m.moveId })} aria-hidden="true">
            {floor ? <Floor side={m.side} /> : draw(m, fromBox, from, to, targets)}
          </div>
        );
      })}
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

function draw(m: MoveFx, fromBox: SlotBox, from: Point, to: Point[], targets: SlotBox[]): ReactNode {
  const first = to[0];
  switch (m.motion.kind) {
    case 'melee':
      return first ? <Melee m={m} box={fromBox} from={from} to={first} /> : null;
    case 'projectile':
      return first ? <Projectile style={(m.motion.style as ProjectileStyle) ?? 'orb'} from={from} to={first} /> : null;
    case 'beam':
      return first ? <Beam from={from} to={first} /> : null;
    case 'bolt':
      return first ? <Bolt from={from} to={first} /> : null;
    case 'drain':
      return first ? <Drain from={from} to={first} /> : null;
    case 'hex':
      return first ? <Hex from={from} to={to} /> : null;
    case 'aura':
      return first ? <Aura at={first} box={targets[0]!} /> : null;
    case 'area':
      return <Area style={(m.motion.style as AreaStyle) ?? 'shockwave'} side={m.side} from={from} to={to} boxes={targets} />;
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
function Melee({ m, box, from, to }: { m: MoveFx; box: SlotBox; from: Point; to: Point }) {
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
      <Impact at={to} delay="calc(var(--mv-melee-windup) + var(--mv-melee-dash))" />
    </>
  );
}

/** Petal Dance, Razor Wind, Pin Missile: what streams across the field. */
const STREAK: Partial<Record<AreaStyle, string>> = { petals: styles.streakPetals, gale: styles.streakGale, swarm: styles.streakSwarm };
const STREAK_COUNT = { petals: 40, gale: 18, swarm: 24 } as const;

const VOLLEY: Partial<Record<ProjectileStyle, number>> = { bubbles: 4, leaves: 3, shards: 3, rocks: 3, needles: 4, rings: 3, stars: 3, gust: 3 };

/** §9.9.2 Ranged — the charge, then the shape thrown along the line to the target: one orb, or a volley a beat apart. */
function Projectile({ style, from, to }: { style: ProjectileStyle; from: Point; to: Point }) {
  const n = VOLLEY[style] ?? 1;
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
      <Impact at={to} delay="calc(var(--mv-projectile-cast) + var(--mv-projectile-travel))" />
    </>
  );
}

/** §9.9.2 A stream — one line from the user to the target, grown, held, gone. */
function Beam({ from, to }: { from: Point; to: Point }) {
  return (
    <>
      <Cast at={from} kind="beam" />
      <span className={styles.beam} style={flight(from, to)}>
        <span className={styles.beamCore} />
      </span>
      <Impact at={to} delay="calc(var(--mv-beam-cast) + var(--mv-beam-grow))" big />
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
function Bolt({ from, to }: { from: Point; to: Point }) {
  const path = zigzag(from, to, 8, 18);
  return (
    <>
      <Cast at={from} kind="bolt" />
      <svg className={styles.svg} aria-hidden="true">
        <polyline className={styles.boltGlow} points={path} pathLength={1} />
        <polyline className={styles.boltCore} points={path} pathLength={1} />
      </svg>
      <Impact at={to} delay="calc(var(--mv-bolt-cast) + var(--mv-bolt-strike))" big />
    </>
  );
}

/** §9.9.2 A drain — a tendril to the target, the hit, then the life flowing back to the user as motes. */
function Drain({ from, to }: { from: Point; to: Point }) {
  return (
    <>
      <Cast at={from} kind="drain" />
      <span className={`${styles.beam} ${styles.tendril}`} style={flight(from, to)}>
        <span className={styles.beamCore} />
      </span>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`${styles.flight} ${styles.back}`} style={{ ...flight(to, from), '--i': i, '--off': px(spread(i, 5) * 18) } as CSSProperties}>
          <span className={`${styles.shot} ${styles.mote}`} />
        </span>
      ))}
      <Impact at={to} delay="calc(var(--mv-drain-cast) + var(--mv-drain-travel))" />
    </>
  );
}

/** §9.9.2 A hex — motes thrown at the foe and a swirl round it: a status or a stage coming its way. */
function Hex({ from, to }: { from: Point; to: Point[] }) {
  return (
    <>
      <Cast at={from} kind="hex" />
      {to.map((t, k) => (
        <span key={k}>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className={`${styles.flight} ${styles.hexFlight}`} style={{ ...flight(from, t), '--i': i, '--off': px(spread(i, 9) * 16) } as CSSProperties}>
              <span className={`${styles.shot} ${styles.mote}`} />
            </span>
          ))}
          <span className={styles.swirl} style={{ left: px(t.x), top: px(t.y) }} />
        </span>
      ))}
    </>
  );
}

/** §9.9.2 A raise or a heal — rings rising from the Pokémon's feet, and sparks going up. */
function Aura({ at, box }: { at: Point; box: SlotBox }) {
  const feet = { x: at.x, y: box.top + box.height * 0.92 };
  return (
    <span className={styles.aura} style={{ left: px(feet.x), top: px(feet.y), '--h': px(box.height * 0.8) } as CSSProperties}>
      <span className={styles.auraRing} />
      <span className={styles.auraRing} style={{ '--i': 1 } as CSSProperties} />
      <span className={styles.auraRing} style={{ '--i': 2 } as CSSProperties} />
      <span className={styles.auraGlow} />
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} className={styles.auraSpark} style={{ '--i': i, '--x': px(spread(i, 2) * box.width * 0.35) } as CSSProperties} />
      ))}
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

function Area({ style, side, from, to, boxes }: { style: AreaStyle; side: 'player' | 'enemy'; from: Point; to: Point[]; boxes: SlotBox[] }) {
  const dir = side === 'player' ? 1 : -1;
  const vars = { '--dir': dir, '--flakes': FLAKES } as CSSProperties;
  const impact = 'calc(var(--mv-area-build) + var(--mv-area-peak))';
  const field = (n: number, render: (i: number) => ReactNode) => Array.from({ length: n }, (_, i) => render(i));
  /** A target's feet, and its box's size as the custom properties its floor effects read. */
  const ground = (k: number) => {
    const b = boxes[k]!;
    return { feet: b.top + b.height * 0.92, w: b.width, h: b.height, vars: { '--w': px(b.width), '--h': px(b.height) } as CSSProperties };
  };
  return (
    <div className={styles.area} style={vars}>
      <span className={styles.tint} />
      {style === 'wave' && (
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
      {style === 'blizzard' && (
        <>
          <span className={styles.frost} />
          {field(FLAKES, (i) => (
            <i key={i} className={styles.flake} style={{ '--i': i, '--x': `${Math.round((i * 37) % 110) - 5}%`, '--y': `${Math.round(((i * 53) % 90) - 30)}%`, '--s': 0.6 + ((i * 7) % 5) / 5 } as CSSProperties} />
          ))}
        </>
      )}
      {style === 'storm' && (
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
      {style === 'inferno' && (
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
      {style === 'rockfall' &&
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
      {(style === 'shockwave' || style === 'psywave' || style === 'dragon') && (
        <>
          {field(style === 'shockwave' ? 2 : 4, (i) => (
            <span key={i} className={styles.ripple} style={{ left: px(from.x), top: px(from.y), '--i': i } as CSSProperties} />
          ))}
          {style === 'shockwave' && <span className={styles.flash} />}
        </>
      )}
      {(style === 'petals' || style === 'gale' || style === 'swarm') &&
        ((n) => field(n, (i) => <i key={i} className={STREAK[style]} style={{ '--i': i, '--n': n, '--y': `${Math.round(10 + ((i * 41) % 80))}%` } as CSSProperties} />))(STREAK_COUNT[style])}
      {style === 'toxic' &&
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
      {style === 'darkness' && to.map((t, k) => <span key={k} className={styles.swirl} style={{ left: px(t.x), top: px(t.y) }} />)}
      {to.map((t, k) => (
        <Impact key={`hit-${k}`} at={t} delay={`calc(${impact} + var(--mv-impact-stagger) * ${k})`} big />
      ))}
    </div>
  );
}

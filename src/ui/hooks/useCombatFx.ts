import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { CombatEvent, CombatState, EnemyCombatant, PokemonType } from '@/sim';
import { benchIndices, indexToSlot } from '@/sim';
import { getContent } from '@/content/registry';
import { MOTION_MS, motionOf, type Motion } from '@/ui/moveMotion';
import { SHAKE_CHECKS, wobblesShown } from '@/sim/combat/catch';
import type { FloatingFx } from '@/ui/components/FloatingNumbers';
import { CATCH_BREAK_LINE, EFFECTIVENESS_LABEL, STATUS_LABEL } from '@/ui/strings';

// Turns new sim events into transient visual effects (§9.9): floating numbers, hits weighed by what they did, lunges —
// and, since v0.9.3, the series' own beats (§9.9.1): a Poké Ball thrown from a trainer's hand and a Pokémon coming out
// of it, a faint and its ball going back to the hand, and the catch. The sim state is
// already final when this runs; every effect is a beat of feedback layered on top, and the outcome is never decided
// here — the catch's ball rocks to the shake checks the sim rolled before the first frame (§2.6.4.4).
//
// A Pokémon that faints or is caught has already left `state.enemies` when its event arrives, so its last moment
// is drawn as a **ghost**: what stood in that slot a render ago (`seen`), playing out where it stood.

/** Where a Pokémon stands: the enemy's places (`single` when it stands alone), and yours — `player` is your Lead. */
export type SpriteSlot = 'single' | 'lead' | 'support1' | 'support2' | 'player' | 'bench1' | 'bench2';

/** A slot's sprite box on the stage, in the stage's own pixels: where every beat of that slot is drawn. */
export type SlotBox = { left: number; top: number; width: number; height: number };

/** Someone who has left the field, drawn for one more beat where it stood. */
export interface Ghost {
  id: number;
  slot: SpriteSlot;
  speciesId: string;
  shiny: boolean;
  /** `faint`: sinks out of sight. */
  kind: 'faint';
  /** When its beat starts, from the batch: until then it stands as it was, so the fallen never blink out early. */
  at: number;
  /** A fallen foe: who it was, and the line as it stood before it fell (uids in order), so its panel fades in its
   *  place and the others hold theirs — and their places' names — until the beat has played (v0.9.11). */
  foe?: { enemy: EnemyCombatant; line: string[] };
}

/** A Poké Ball between a trainer's hand and a slot: thrown in (`in`, it opens there) or going back (`out`). */
export interface BallFlight {
  id: number;
  slot: SpriteSlot;
  dir: 'in' | 'out';
  /** Whose hand: the foe's trainer, or yours. */
  hand: 'trainer' | 'player';
  ball: string;
}

/** §9.2.3 / §9.9 — a move's own illustration flashed over the Pokémon it hits: the card's picture, landing. */
export interface MoveHit {
  id: number;
  slot: SpriteSlot;
  moveId: string;
}

/** The catch, beat by beat: the ball, the Pokémon drawn into it, the wobbles, and the checks the sim rolled. */
export interface CatchFx {
  id: number;
  slot: SpriteSlot;
  speciesId: string;
  shiny: boolean;
  ball: string;
  success: boolean;
  /** §2.6.4.4 — how many of the four shake checks passed (4 is the catch). */
  checks: number;
  wobbles: number;
  /** §9.9.1 — the enemies on the field as the ball left the hand: they stay, as they stood, until it opens. */
  line: EnemyCombatant[];
  targetUid: string;
}

/**
 * §9.9.2 — a move used: who used it and from where, what it hit, and how it moves (`motionOf`). Drawn by `MoveFx`;
 * the hit's number, its shake and its HP are scheduled for its impact.
 */
export interface MoveFx {
  id: number;
  moveId: string;
  type: PokemonType;
  motion: Motion;
  from: SpriteSlot;
  to: SpriteSlot[];
  /** Whose move: yours throw to the right, the foe's to the left. */
  side: 'player' | 'enemy';
  /** The user, drawn as it dashes across the field (a Melee move): its real sprite waits hidden in its card. */
  actor?: { speciesId: string; shiny: boolean };
}

export interface CombatFxState {
  floats: FloatingFx[];
  /** uid → css class applied to that combatant's card for a moment. */
  classes: Record<string, string>;
  /** uid → css class for that combatant's sprite in the arena only: sent out, waiting to be, entering. */
  sprites: Record<string, string>;
  ghosts: Ghost[];
  balls: BallFlight[];
  hits: MoveHit[];
  /** §9.9.2 — the moves playing now. */
  moves: MoveFx[];
  /** §9.9.2 — a class on the whole stage while a move shakes it (Earthquake). */
  stageClass: string | null;
  catching: CatchFx | null;
  /** A word over the arena (Enemy turn, Gotcha!): `ms` is how long it shows, so its fade ends on screen. */
  banner: { id: number; text: string; ms: number } | null;
  /** A beat is playing that the screen should not talk over — the catch, a faint: the outcome waits, the hand waits. */
  busy: boolean;
  /**
   * §9.9.1 — your Pokémon already at 0 HP in the sim whose faint has not played yet: their card stays standing through
   * the hits still on screen and dims when the beat comes (v0.9.10 — the card went grey at once, then every hit's flash
   * lit it up again, and the faint looked like it played twice).
   */
  faintPending: Record<string, true>;
  /** While a move flies or a ball rocks, the log shows only this many lines: a result is not read before it lands. */
  logHold: number | null;
  /** §9.9.2 — uid → the HP shown while a hit is on its way: what it had, until the move lands. */
  hp: Record<string, number>;
  /** §9.9.2 — the foes' moves are playing: their next intents wait until they have (the hand waits too, `busy`). */
  acting: boolean;
  /** §9.9.1 — the fight's Pokémon are still coming out of their balls: what is aimed at them waits until they are out. */
  opening: boolean;
  /** The turn the top bar says: a new one once the foes' turn has played out, not when End Turn resolves. */
  turn: number;
  /** §9.9 / D12 — the stage holds its frame at a weighty impact (`FX_MS.hitStop`). */
  hitStop: boolean;
}

/** A card's class outlives its keyframes by a frame or two, so a timer never cuts the last one. */
const CLASS_TAIL_MS = 30;
/** §5.6.1 — "Broken!" waits this long after the hit, clear of the hit's own float. */
const BREAK_FLOAT_LAG_MS = 200;
/** A ghost outlives its beat by this much: the keyframes end invisible and hold there, so a late timer never cuts a
 *  faint short (the sprite used to vanish with a third of it still showing). */
const GHOST_TAIL_MS = 150;

/**
 * §9.9.1 — the beats' lengths. Presentation only: what the sim decided is already decided. The one place they live:
 * the timers read this table and the keyframes read it as custom properties (`fxTimings`), so they cannot disagree.
 */
export const FX_MS = {
  /** A Pokémon out of its opened ball. */
  sendOut: 560,
  wildEnter: 520,
  /** A ball between a hand and a slot. */
  ballFly: 650,
  faint: 900,
  /** The catch: the throw, the Pokémon drawn in, the ball dropping to the ground, then each wobble — a still
   *  moment and a rock — and after the last a still moment more before the click or the burst. */
  throw: 750,
  absorb: 600,
  drop: 550,
  pause: 450,
  wobble: 600,
  result: 1000,
  /** A Pokémon breaking out of the ball: the burst, and it is out. */
  burst: 450,
  /** Between two Pokémon sent out together at a fight's start. */
  stagger: 420,
  /** A move's illustration over its target: pops in with the lunge, gone before the next hit's number. */
  moveHit: 560,
  /** A number or a word rising off a Pokémon. */
  float: 1100,
  /** §3.3.1 — a swap: the cards trading places across your formation (`CombatScreen`'s glide). */
  swap: 460,
  /** §9.9 / D12 — a hit's weight: a routine or resisted hit recoils, a super-effective or critical one shakes, and
   *  the blow that faints also jolts the stage by a pixel. */
  recoil: 160,
  shake: 320,
  jolt: 200,
  /** The attacker's step toward its target. */
  lunge: 380,
  /** §5.6.5 — a runner leaving its window. */
  fled: 500,
  /** A word over the arena, held and then faded. */
  banner: 1300,
  /** The impact's held frame: everything on the stage stops a beat — longer for the blow that faints. */
  hitStop: { medium: 60, heavy: 100 },
  /** §9.9 — a played card leaving the hand toward its target. */
  cardLeave: 220,
  /** §9.9 — a whole HP bar emptying at the series' constant rate; `tokens.test.ts` holds `--motion-hp-drain` to it. */
  hpDrain: 800,
} as const;

/** The beats' lengths as CSS custom properties on the arena, so the keyframes and the timers read one table. */
export const fxTimings = (): CSSProperties =>
  ({
    '--fx-sendout': `${FX_MS.sendOut}ms`,
    '--fx-wild-enter': `${FX_MS.wildEnter}ms`,
    '--fx-move-hit': `${FX_MS.moveHit}ms`,
    '--fx-ball-fly': `${FX_MS.ballFly}ms`,
    '--fx-faint': `${FX_MS.faint}ms`,
    '--fx-throw': `${FX_MS.throw}ms`,
    '--fx-absorb': `${FX_MS.absorb}ms`,
    '--fx-drop': `${FX_MS.drop}ms`,
    '--fx-wobble-cycle': `${FX_MS.pause + FX_MS.wobble}ms`,
    '--fx-result': `${FX_MS.result}ms`,
    '--fx-burst': `${FX_MS.burst}ms`,
    '--fx-float': `${FX_MS.float}ms`,
    '--fx-recoil': `${FX_MS.recoil}ms`,
    '--fx-shake': `${FX_MS.shake}ms`,
    '--fx-jolt': `${FX_MS.jolt}ms`,
    '--fx-lunge': `${FX_MS.lunge}ms`,
    '--fx-fled': `${FX_MS.fled}ms`,
  }) as CSSProperties;

/**
 * §2.6.4.4 — when each beat of a catch starts, from the throw. A catch holds still a moment after its last wobble, then
 * clicks; a Pokémon that breaks free bursts out on its last wobble, and the beat ends with the burst (v0.9.16: the
 * extra pause and a full second after it read as the animation stalling).
 */
export function catchTimeline(wobbles: number, success: boolean) {
  const absorbAt = FX_MS.throw;
  const dropAt = absorbAt + FX_MS.absorb;
  const wobbleAt = dropAt + FX_MS.drop;
  const cycle = FX_MS.pause + FX_MS.wobble;
  const resultAt = wobbleAt + wobbles * cycle + (success ? FX_MS.pause : 0);
  return { absorbAt, dropAt, wobbleAt, cycle, resultAt, total: resultAt + (success ? FX_MS.result : FX_MS.burst) };
}

interface Seen {
  enemies: Map<string, { speciesId: string; shiny: boolean; slot: SpriteSlot; enemy: EnemyCombatant }>;
  lead: { uid: string; speciesId: string; shiny: boolean } | null;
  /** Everyone's HP, and how long the log was: what the screen showed before a batch. */
  hp: Map<string, number>;
  logLength: number;
}

const slotOf = (index: number, count: number): SpriteSlot => (count <= 1 ? 'single' : index === 0 ? 'lead' : index === 1 ? 'support1' : 'support2');

function look(state: CombatState): Seen {
  const enemies: Seen['enemies'] = new Map();
  state.enemies.forEach((e, i) => enemies.set(e.uid, { speciesId: e.speciesId, shiny: !!e.shiny, slot: slotOf(i, state.enemies.length), enemy: e }));
  const l = state.player.team[state.player.leadIndex];
  const hp = new Map<string, number>([...state.player.team, ...state.enemies].map((m) => [m.uid, m.hp]));
  return { enemies, lead: l && l.hp > 0 ? { uid: l.uid, speciesId: l.speciesId, shiny: !!l.shiny } : null, hp, logLength: state.log.length };
}

/** §9.9.2 — a line that starts a beat in the log: a move used, or a trainer's Pokémon sent out. */
const usedLine = (l: CombatState['log'][number]) => (l.category === 'player' || l.category === 'enemy') && l.text.includes(' used ');
const sentLine = (l: CombatState['log'][number]) => l.text.includes(' sent out ');
const faintLine = (l: CombatState['log'][number]) => l.text.endsWith(' fainted!');

/** A fight whose Pokémon come out of a trainer's ball, rather than out of the grass. */
const fromABall = (state: CombatState) => state.kind !== 'wild' || !!state.trainer;

export function useCombatFx(state: CombatState | null, combatKey: number, animate = true): CombatFxState {
  const [floats, setFloats] = useState<FloatingFx[]>([]);
  const [classes, setClasses] = useState<Record<string, string>>({});
  const [sprites, setSprites] = useState<Record<string, string>>({});
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [balls, setBalls] = useState<BallFlight[]>([]);
  const [hits, setHits] = useState<MoveHit[]>([]);
  const [moves, setMoves] = useState<MoveFx[]>([]);
  const [stageClass, setStageClass] = useState<string | null>(null);
  const [catching, setCatching] = useState<CatchFx | null>(null);
  const [banner, setBanner] = useState<CombatFxState['banner']>(null);
  const [busy, setBusy] = useState(false);
  const [faintPending, setFaintPending] = useState<Record<string, true>>({});
  const [logHold, setLogHold] = useState<number | null>(null);
  const [hpShown, setHpShown] = useState<Record<string, number>>({});
  const [shownTurn, setShownTurn] = useState<number | null>(null);
  const [hitStop, setHitStop] = useState(false);
  const hitStopUntil = useRef(0);
  // §9.9.2 — one clock for the moves across batches, in wall time: a card played while the last move is still in the air
  // starts at that move's impact, a Pokémon that dashed waits until it is back, and the HP and log a batch holds back are
  // let go by the batch that ends last.
  const clock = useRef({ impact: 0, dashes: {} as Record<string, number>, heldUntil: 0, actingUntil: 0 });
  const [acting, setActing] = useState(false);
  const [opening, setOpening] = useState(false);
  // §9.9.1 — a fallen foe's line, held on screen while its faint plays (the others keep their places): a move drawn
  // meanwhile is aimed by that line, as the screen draws it.
  const held = useRef<{ line: string[]; until: number } | null>(null);
  // Every timer this hook has set, kept across batches: a batch arriving mid-beat must not cancel the end of the
  // last one (a sprite left hidden, the hand left locked). They are cleared only on a new fight and on unmount.
  const pending = useRef<number[]>([]);
  const seenSeq = useRef(0);
  const seenCombat = useRef<number | null>(null);
  const seen = useRef<Seen | null>(null);
  const nextId = useRef(1);
  const busyEnd = useRef(0);
  const busyTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      pending.current.forEach((t) => window.clearTimeout(t));
      if (busyTimer.current !== null) window.clearTimeout(busyTimer.current);
      // A remount starts the fight's beats over, as a fresh hook would: the timers just cleared (the opening's end
      // among them) are set again. React's dev double-mount keeps refs across it, and left the opening on for good.
      seenCombat.current = null;
    },
    [],
  );

  // Before paint: a ghost stands in for the sprite it replaces in the same frame, never a blank one between.
  useLayoutEffect(() => {
    if (!state) return;
    const schedule = (fn: () => void, ms: number) => {
      pending.current.push(window.setTimeout(fn, ms));
    };
    const setSprite = (uid: string, cls: string, at: number, dur: number) => {
      schedule(() => setSprites((c) => ({ ...c, [uid]: cls })), at);
      schedule(() => setSprites((c) => (c[uid] === cls ? { ...c, [uid]: '' } : c)), at + dur);
    };
    const holdBusy = (until: number) => {
      const end = Date.now() + until;
      if (end <= busyEnd.current) return;
      busyEnd.current = end;
      setBusy(true);
      if (busyTimer.current !== null) window.clearTimeout(busyTimer.current);
      busyTimer.current = window.setTimeout(() => {
        busyTimer.current = null;
        setBusy(false);
      }, until);
    };
    const flyBall = (b: Omit<BallFlight, 'id'>, at: number) => {
      const id = nextId.current++;
      schedule(() => setBalls((bs) => [...bs, { ...b, id }]), at);
      schedule(() => setBalls((bs) => bs.filter((x) => x.id !== id)), at + FX_MS.ballFly);
    };
    /** A ball thrown from a hand to the slot, and the Pokémon out of it when it opens. Returns when it is out. */
    const sendOut = (uid: string, slot: SpriteSlot, hand: BallFlight['hand'], at: number) => {
      flyBall({ slot, dir: 'in', hand, ball: 'poke-ball' }, at);
      setSprite(uid, 'fx-hidden', 0, at + FX_MS.ballFly);
      setSprite(uid, 'fx-sendout', at + FX_MS.ballFly, FX_MS.sendOut);
      return at + FX_MS.ballFly + FX_MS.sendOut;
    };

    // A new fight: nothing old replays, and its Pokémon come out — the foe from its trainer's ball or the grass,
    // then yours from your hand.
    if (seenCombat.current !== combatKey) {
      seenCombat.current = combatKey;
      seenSeq.current = state.nextSeq;
      pending.current.forEach((t) => window.clearTimeout(t));
      pending.current = [];
      seen.current = look(state);
      setFloats([]);
      setClasses({});
      setGhosts([]);
      setBalls([]);
      setHits([]);
      setMoves([]);
      setStageClass(null);
      setCatching(null);
      setShownTurn(state.turn);
      setSprites({});
      setLogHold(null);
      setHpShown({});
      setActing(false);
      clock.current = { impact: 0, dashes: {}, heldUntil: 0, actingUntil: 0 };
      held.current = null;
      // Nothing from the last fight holds this one.
      if (busyTimer.current !== null) window.clearTimeout(busyTimer.current);
      busyTimer.current = null;
      busyEnd.current = 0;
      setBusy(false);
      setOpening(animate);
      if (!animate) return;
      const ball = fromABall(state);
      let at = 0;
      state.enemies.forEach((e, i) => {
        const slot = slotOf(i, state.enemies.length);
        if (ball) sendOut(e.uid, slot, 'trainer', at);
        else {
          setSprite(e.uid, 'fx-hidden', 0, at);
          setSprite(e.uid, 'fx-wild-enter', at, FX_MS.wildEnter);
        }
        at += FX_MS.stagger;
      });
      // §9.9.1 (v0.9.16) — then yours, one ball at a time: the Lead, a moment later Bench 1, then Bench 2.
      let mine = at + (ball ? FX_MS.ballFly : FX_MS.wildEnter) - FX_MS.stagger;
      for (const i of [state.player.leadIndex, ...benchIndices(state)]) {
        const m = state.player.team[i];
        if (!m || m.hp <= 0) continue;
        sendOut(m.uid, i === state.player.leadIndex ? 'player' : indexToSlot(state, i) === 'bench1' ? 'bench1' : 'bench2', 'player', mine);
        mine += FX_MS.stagger;
      }
      // The arrows and the hits aimed at your Pokémon wait until the last of them is out.
      const out = mine - FX_MS.stagger + FX_MS.ballFly + FX_MS.sendOut;
      schedule(() => setOpening(false), out);
      // The fight may start at once: Pokémon coming out never hold the hand.
      return;
    }

    const fresh = state.events.filter((e) => e.seq >= seenSeq.current);
    seenSeq.current = state.nextSeq;
    const before = seen.current ?? look(state);
    /** The HP each bar shows as this batch's hits land, one after another: what a blow takes off the bar. */
    const barHp = new Map(before.hp);
    seen.current = look(state);
    if (fresh.length === 0) return;

    const t0 = Date.now();
    // A batch arriving while a move is still on its way waits for it to land.
    let delay = animate ? Math.max(0, clock.current.impact - t0) : 0;
    let busyMs = 0;
    // §9.9.2 — what this batch holds back, and when each is let go: the log's lines (up to `upTo`) and HPs.
    const logCuts: { at: number; upTo: number }[] = [];
    const hpAt: { at: number; uid: string; hp: number }[] = [];
    const marks = state.log.flatMap((l, i) => (i >= before.logLength && (usedLine(l) || sentLine(l) || faintLine(l)) ? [i] : []));
    const used = marks.filter((i) => usedLine(state.log[i]!));
    const sent = marks.filter((i) => sentLine(state.log[i]!));
    const fainted = marks.filter((i) => faintLine(state.log[i]!));
    /** When the foes' moves in this batch have played out. */
    let foesDone = 0;
    /** The lines from one beat's start up to the next beat's start. */
    const nextMark = (after: number) => marks.find((i) => i > after) ?? state.log.length;
    let lastBall = 'poke-ball';
    const addFloat = (f: Omit<FloatingFx, 'id'>, at: number) => {
      const id = nextId.current++;
      schedule(() => setFloats((fs) => [...fs, { ...f, id }]), at);
      schedule(() => setFloats((fs) => fs.filter((x) => x.id !== id)), at + FX_MS.float);
    };
    const addClass = (uid: string, cls: string, at: number, ms: number) => {
      schedule(() => setClasses((c) => ({ ...c, [uid]: cls })), at);
      schedule(() => setClasses((c) => (c[uid] === cls ? { ...c, [uid]: '' } : c)), at + ms + CLASS_TAIL_MS);
    };
    // A ghost stands in at once — the sprite it replaces is already gone — and plays its beat at `at`.
    const addGhost = (g: Omit<Ghost, 'id'>, dur: number) => {
      const id = nextId.current++;
      setGhosts((gs) => [...gs, { ...g, id }]);
      schedule(() => setGhosts((gs) => gs.filter((x) => x.id !== id)), g.at + dur + GHOST_TAIL_MS);
    };
    // Cleared only by its own timer: a word that replaced it keeps its whole time on screen.
    const showBanner = (text: string, at: number, ms: number = FX_MS.banner) => {
      const id = nextId.current++;
      schedule(() => setBanner({ id, text, ms }), at);
      schedule(() => setBanner((b) => (b?.id === id ? null : b)), at + ms);
    };
    /** The move's picture landing on one target: an attack no move was drawn for. */
    const addHit = (slot: SpriteSlot, moveId: string, at: number) => {
      const id = nextId.current++;
      schedule(() => setHits((hs) => [...hs, { id, slot, moveId }]), at);
      schedule(() => setHits((hs) => hs.filter((x) => x.id !== id)), at + FX_MS.moveHit);
    };
    /** Where a Pokémon stands at `at` — as the screen draws it then: by a fallen foe's held line while its faint plays,
     *  else where it stands now, or stood a render ago if it has just left the field. */
    const slotOfUid = (uid: string, at: number): SpriteSlot | null => {
      const mine = state.player.team.findIndex((m) => m.uid === uid);
      if (mine >= 0) {
        if (mine === state.player.leadIndex) return 'player';
        return indexToSlot(state, mine) === 'bench1' ? 'bench1' : 'bench2';
      }
      const line = held.current && t0 + at < held.current.until ? held.current.line : null;
      const inLine = line ? line.indexOf(uid) : -1;
      if (line && inLine >= 0) return slotOf(inLine, line.length);
      const now = state.enemies.findIndex((x) => x.uid === uid);
      return now >= 0 ? slotOf(now, state.enemies.length) : (before.enemies.get(uid)?.slot ?? null);
    };
    const actorOf = (uid: string): { speciesId: string; shiny: boolean } | null => {
      const m = state.player.team.find((x) => x.uid === uid) ?? state.enemies.find((x) => x.uid === uid) ?? before.enemies.get(uid)?.enemy;
      return m ? { speciesId: m.speciesId, shiny: !!m.shiny } : null;
    };
    const isMine = (uid: string) => state.player.team.some((m) => m.uid === uid);
    /** The move being drawn: its hits land at its impact — on each of several a stagger apart — not at their own beat. */
    let moving: { moveId: string; userUid: string; hitAt: Map<string, number> } | null = null;
    /**
     * §9.9.2 — a move used: gather who it touched from the events that follow (its hits, or for a move with no power,
     * whom its status, stage or heal landed on), choose its motion, schedule it, and move the batch's clock to its impact.
     */
    const drawMove = (userUid: string, moveId: string, aimed: string | null, from: number) => {
      const move = getContent().move(moveId);
      const hit: string[] = [];
      const touched: string[] = [];
      for (let j = from + 1; j < fresh.length; j++) {
        const n = fresh[j]!;
        if (n.t === 'card-played' || n.t === 'enemy-action' || n.t === 'turn-start' || n.t === 'consumable-used' || n.t === 'outcome') break;
        if (n.t === 'attack' && n.moveId === moveId && !hit.includes(n.targetUid)) hit.push(n.targetUid);
        if ((n.t === 'status-applied' || n.t === 'status-immune' || n.t === 'stage' || n.t === 'heal') && !touched.includes(n.targetUid)) touched.push(n.targetUid);
      }
      const motion = motionOf(move, hit.length);
      // A Pokémon still dashing back from its last blow finishes coming back first.
      delay = Math.max(delay, (clock.current.dashes[userUid] ?? 0) - t0);
      const fromSlot = slotOfUid(userUid, delay);
      if (!fromSlot) return;
      const onFoe = (uid: string) => isMine(uid) !== isMine(userUid);
      const targets =
        motion.kind === 'aura' ? [touched.find((u) => !onFoe(u)) ?? userUid]
        : motion.kind === 'hex' ? (touched.filter(onFoe).length ? touched.filter(onFoe) : aimed ? [aimed] : [])
        : hit.length ? hit : aimed ? [aimed] : [];
      const to = targets.map((u) => slotOfUid(u, delay)).filter((s): s is SpriteSlot => !!s);
      if (!to.length && motion.kind !== 'area') return;
      const actor = motion.kind === 'melee' ? actorOf(userUid) : null;
      const id = nextId.current++;
      const fx: MoveFx = { id, moveId, type: move.type, motion, from: fromSlot, to, side: isMine(userUid) ? 'player' : 'enemy', ...(actor ? { actor } : {}) };
      schedule(() => setMoves((ms) => [...ms, fx]), delay);
      schedule(() => setMoves((ms) => ms.filter((x) => x.id !== id)), delay + motion.totalMs);
      // A dash: the real sprite waits hidden in its card while its double crosses the field and comes back.
      // Its own class, not fx-hidden: a foe hidden that way reads as still in its ball, and its whole card waits unseen.
      if (motion.kind === 'melee') {
        // Cleared only by the dash it belongs to: a second dash starting as the first ends keeps the sprite unseen.
        const back = t0 + delay + motion.totalMs;
        clock.current.dashes[userUid] = back;
        schedule(() => setSprites((c) => ({ ...c, [userUid]: 'fx-dashing' })), delay);
        schedule(() => {
          if (clock.current.dashes[userUid] === back) setSprites((c) => (c[userUid] === 'fx-dashing' ? { ...c, [userUid]: '' } : c));
        }, delay + motion.totalMs);
      }
      if (!isMine(userUid)) foesDone = Math.max(foesDone, delay + motion.totalMs);
      // Earthquake: the whole stage shakes from a beat before its impact to its end.
      if (motion.kind === 'area' && motion.style === 'quake') {
        const shakeAt = delay + motion.impactMs - MOTION_MS.stage.lead;
        schedule(() => setStageClass('fx-quake'), shakeAt);
        schedule(() => setStageClass((c) => (c === 'fx-quake' ? null : c)), shakeAt + MOTION_MS.stage.shake);
      }
      // The log names the move as it is used, and tells what it did when it lands.
      const line = used.shift();
      if (line !== undefined) {
        logCuts.push({ at: delay, upTo: line + 1 });
        logCuts.push({ at: delay + motion.impactMs, upTo: nextMark(line) });
      }
      const stagger = motion.kind === 'area' ? MOTION_MS.impact.stagger : 0;
      const hitAt = new Map(targets.map((uid, k) => [uid, delay + motion.impactMs + k * stagger]));
      clock.current.impact = Math.max(clock.current.impact, t0 + delay + motion.impactMs);
      delay += motion.impactMs;
      moving = { moveId, userUid, hitAt };
    };

    for (const [index, e] of (fresh as CombatEvent[]).entries()) {
      switch (e.t) {
        case 'card-played':
          moving = null;
          if (animate) drawMove(e.ownerUid, e.moveId, e.targetUid, index);
          break;
        case 'enemy-action':
          moving = null;
          if (!e.fizzled) showBanner('Enemy turn', delay);
          else addFloat({ uid: e.enemyUid, kind: 'text', text: 'Missed!' }, delay);
          delay += 350;
          if (animate && !e.fizzled && e.intent.moveId) {
            const aimed = e.intent.targetSlot === 'lead' ? (state.player.team[state.player.leadIndex]?.uid ?? null) : null;
            drawMove(e.enemyUid, e.intent.moveId, aimed, index);
          }
          break;
        case 'attack': {
          // §9.9.2 — part of a move already drawn: the motion is its picture, and its hits land at its impact.
          if ((moving as { moveId: string } | null)?.moveId === e.moveId) break;
          addClass(e.sourceUid, e.sourceUid.startsWith('p') ? 'fx-lunge-right' : 'fx-lunge-left', delay, FX_MS.lunge);
          // No move drawn for it: the move's picture lands on its target, where it stands.
          const slot = slotOfUid(e.targetUid, delay);
          if (slot && animate) addHit(slot, e.moveId, delay);
          delay += 180;
          break;
        }
        case 'damage': {
          // A drawn move's hit lands at its impact (a move landing on several, on each a stagger apart); any other now.
          const m = moving as { userUid: string; hitAt: Map<string, number> } | null;
          const drawn = m && e.cause === 'move' && e.sourceUid === m.userUid ? m.hitAt.get(e.targetUid) : undefined;
          if (drawn !== undefined) m!.hitAt.delete(e.targetUid);
          const at = drawn ?? delay;
          const emphasis = e.crit ? 'crit' : e.effectiveness === 'double' || e.effectiveness === 'quad' ? 'super' : e.effectiveness === 'half' || e.effectiveness === 'quarter' ? 'weak' : e.effectiveness === 'immune' ? 'immune' : undefined;
          const suffix = e.cause !== 'move' ? ` ${e.cause}` : '';
          addFloat({ uid: e.targetUid, kind: 'damage', text: e.amount === 0 && e.effectiveness === 'immune' ? 'immune' : `-${e.amount}${suffix}`, emphasis }, at);
          // §9.9 / D12 — weighted by what the hit did: the blow that faints is heavy, a super-effective or critical one
          // medium, the rest light.
          const heavy = e.amount > 0 && e.hpAfter === 0;
          const weighty = heavy || emphasis === 'super' || emphasis === 'crit';
          // The held frame: the move's picture and everyone else stop at the contact while the target flashes and
          // shakes and its number lands (`.stage[data-hit-stop]`).
          const stop = animate && e.amount > 0 && weighty ? FX_MS.hitStop[heavy ? 'heavy' : 'medium'] : 0;
          if (stop) {
            const until = t0 + at + stop;
            schedule(() => {
              hitStopUntil.current = Math.max(hitStopUntil.current, until);
              setHitStop(true);
            }, at);
            schedule(() => {
              if (Date.now() >= hitStopUntil.current - 5) setHitStop(false);
            }, at + stop);
          }
          if (e.amount > 0) {
            if (weighty) addClass(e.targetUid, 'fx-shake', at, FX_MS.shake);
            else addClass(e.targetUid, 'fx-recoil', at, FX_MS.recoil);
            if (heavy && animate) {
              schedule(() => setStageClass((c) => c ?? 'fx-jolt'), at);
              schedule(() => setStageClass((c) => (c === 'fx-jolt' ? null : c)), at + FX_MS.jolt);
            }
          }
          // Said under the number it explains, never over it.
          if (e.crit) addFloat({ uid: e.targetUid, kind: 'text', text: 'CRIT', under: true }, at + 120);
          else if (emphasis === 'super') addFloat({ uid: e.targetUid, kind: 'text', text: EFFECTIVENESS_LABEL[e.effectiveness] ?? '', under: true }, at + 120);
          if (animate && at > 0) hpAt.push({ at, uid: e.targetUid, hp: e.hpAfter });
          // The blow that faints shakes to rest and its bar empties (HpBar's drain, by the share it crosses) before the
          // faint takes its card: the bar tells the outcome first, as in the series.
          // The bar loses what it showed, not the damage dealt: an overkill blow drains no further than empty.
          const maxHp = [...state.player.team, ...state.enemies, ...state.defeatedEnemies].find((u) => u.uid === e.targetUid)?.maxHp ?? 0;
          const shownBefore = barHp.get(e.targetUid) ?? e.amount + e.hpAfter;
          barHp.set(e.targetUid, e.hpAfter);
          const drainMs = maxHp > 0 ? FX_MS.hpDrain * (0.25 + 0.75 * Math.min(1, Math.max(0, shownBefore - e.hpAfter) / maxHp)) : 0;
          delay = Math.max(delay, at) + (heavy ? Math.max(FX_MS.shake, drainMs) : 220);
          break;
        }
        case 'heal':
          addFloat({ uid: e.targetUid, kind: 'heal', text: `+${e.amount}` }, delay);
          if (animate && delay > 0) hpAt.push({ at: delay, uid: e.targetUid, hp: e.hpAfter });
          delay += 150;
          break;
        case 'status-applied':
          // A word, said under the number of the hit that brought it.
          addFloat({ uid: e.targetUid, kind: 'status', text: STATUS_LABEL[e.status] ?? e.status, under: true }, delay);
          delay += 150;
          break;
        case 'status-immune':
          addFloat({ uid: e.targetUid, kind: 'text', text: 'Immune' }, delay);
          delay += 150;
          break;
        case 'stage':
          addFloat({ uid: e.targetUid, kind: 'status', text: `${e.stat === 'attack' ? 'Atk' : e.stat === 'defense' ? 'Def' : 'Spd'} ${e.delta > 0 ? '+' : ''}${e.delta}`, under: true }, delay);
          delay += 120;
          break;
        case 'combo-break':
          // §5.6.1 — its second action is struck: said over the Pokémon, where the hit that broke it landed — a beat after
          // that hit's own numbers and a row above them (a stage or a status from the same move), so the two never print over each other.
          addFloat({ uid: e.enemyUid, kind: 'text', text: 'Broken!', lifted: true }, delay + BREAK_FLOAT_LAG_MS);
          delay += 150;
          break;
        case 'sturdy':
          addFloat({ uid: e.uid, kind: 'text', text: 'Sturdy!' }, delay);
          delay += 150;
          break;
        case 'faint': {
          // The log says it fainted as its beat starts, not at the blow.
          const said = animate ? fainted.shift() : undefined;
          if (said !== undefined) logCuts.push({ at: delay, upTo: nextMark(said) });
          // The card stands until its beat, then dims into its fainted look (motion.css faintOut).
          if (e.side !== 'enemy' && delay > 0) {
            const uid = e.uid;
            schedule(() => setFaintPending((p) => ({ ...p, [uid]: true })), 0);
            schedule(() => setFaintPending((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== uid)) as Record<string, true>), delay);
          }
          addClass(e.uid, 'fx-faint', delay, FX_MS.faint);
          if (!animate) {
            delay += 300;
            break;
          }
          // §9.9.1 — the fallen Pokémon sinks out of sight where it stood; a trainer's, or yours, then goes back
          // into its ball and the ball back to the hand that threw it. A wild one is simply gone.
          const enemy = e.side === 'enemy' ? before.enemies.get(e.uid) : undefined;
          const mine = e.side !== 'enemy' && before.lead?.uid === e.uid ? before.lead : undefined;
          const who = enemy ?? mine;
          if (!who) {
            delay += 300;
            break;
          }
          const slot: SpriteSlot = enemy ? enemy.slot : 'player';
          addGhost({ slot, speciesId: who.speciesId, shiny: who.shiny, kind: 'faint', at: delay, ...(enemy ? { foe: { enemy: enemy.enemy, line: [...before.enemies.keys()] } } : {}) }, FX_MS.faint);
          if (enemy) {
            // The screen holds the line as it stood until the ghost has played — the first fallen's line, if one still is.
            const until = t0 + delay + FX_MS.faint + GHOST_TAIL_MS;
            const still = held.current && held.current.until > t0 + delay ? held.current : null;
            held.current = still ? { line: still.line, until: Math.max(still.until, until) } : { line: [...before.enemies.keys()], until };
          }
          let end = delay + FX_MS.faint;
          if (mine || fromABall(state)) {
            flyBall({ slot, dir: 'out', hand: mine ? 'player' : 'trainer', ball: 'poke-ball' }, end);
            end += FX_MS.ballFly;
          }
          busyMs = Math.max(busyMs, end);
          delay = end;
          break;
        }
        case 'swap':
          // §3.3.1 (the user's note, 2026-10-19) — no ball: the cards glide between their places, the Pokémon in them
          // (`CombatScreen`). What follows the swap waits for the glide.
          if (animate) delay += FX_MS.swap;
          break;
        case 'enemy-enter': {
          if (!animate) break;
          // §5.6.2 / §5.9.3 — the trainer's next Pokémon, thrown from the trainer's hand; or a wild one answering a call.
          const idx = state.enemies.findIndex((x) => x.uid === e.enemyUid);
          const slot = slotOf(Math.max(0, idx), state.enemies.length);
          if (fromABall(state) && !e.called) {
            sendOut(e.enemyUid, slot, 'trainer', delay);
            // The log names it as it comes out of the ball, not while the last one is still falling.
            const line = sent.shift();
            if (line !== undefined) {
              logCuts.push({ at: delay, upTo: line });
              logCuts.push({ at: delay + FX_MS.ballFly, upTo: nextMark(line) });
            }
          }
          else {
            setSprite(e.enemyUid, 'fx-hidden', 0, delay);
            setSprite(e.enemyUid, 'fx-wild-enter', delay, FX_MS.wildEnter);
          }
          delay += 260;
          break;
        }
        case 'phase':
          showBanner(`Phase ${e.phase}!`, delay);
          delay += 300;
          break;
        case 'consumable-used':
          lastBall = e.consumableId;
          break;
        case 'catch': {
          // §2.6.4.4 — the throw. The sim rolled the four shake checks already; the ball only shows them.
          // The ball flies at the Pokémon it was thrown at — a support behind the Lead too (§5.6).
          const aimed = before.enemies.get(e.targetUid);
          const target = aimed ? ([e.targetUid, aimed] as const) : [...before.enemies.entries()].find(([, v]) => v.slot === 'single' || v.slot === 'lead');
          if (!animate || !target) {
            showBanner(e.success ? 'Gotcha!' : CATCH_BREAK_LINE[Math.min(e.checks, 3)]!, delay);
            delay += 300;
            break;
          }
          const [uid, was] = target;
          const wobbles = e.success ? SHAKE_CHECKS - 1 : wobblesShown(e.checks);
          const t = catchTimeline(wobbles, e.success);
          const id = nextId.current++;
          const fx: CatchFx = { id, slot: was.slot, speciesId: was.speciesId, shiny: was.shiny, ball: lastBall, success: e.success, checks: e.checks, wobbles, line: [...before.enemies.values()].map((v) => v.enemy), targetUid: uid };
          if (delay === 0) setCatching(fx);
          else schedule(() => setCatching(fx), delay);
          // The log already holds the result: it shows the throw, and the rest when the ball clicks or bursts.
          const cut = state.log.findLastIndex((l) => l.text.startsWith('Used ')) + 1;
          if (cut > 0) {
            logCuts.push({ at: delay, upTo: cut });
            logCuts.push({ at: delay + t.resultAt, upTo: state.log.length });
          }
          // A Pokémon that broke free is still on the field: hidden while it is in the ball, then out again.
          if (!e.success) {
            setSprite(uid, 'fx-hidden', 0, delay + t.resultAt);
            setSprite(uid, 'fx-burst', delay + t.resultAt, FX_MS.sendOut);
          }
          schedule(() => setCatching((c) => (c?.id === id ? null : c)), delay + t.total);
          showBanner(e.success ? 'Gotcha!' : CATCH_BREAK_LINE[Math.min(e.checks, 3)]!, delay + t.resultAt);
          busyMs = Math.max(busyMs, delay + t.total);
          delay += t.total;
          break;
        }
        case 'turn-start': {
          moving = null;
          const turn = e.turn;
          schedule(() => setShownTurn(turn), delay);
          break;
        }
        default:
          break;
      }
    }
    // §9.9.2 — the foes' turn plays out before the next one is shown: their next intents and the hand wait for it.
    if (foesDone > 0) {
      busyMs = Math.max(busyMs, foesDone);
      clock.current.actingUntil = Math.max(clock.current.actingUntil, t0 + foesDone);
      setActing(true);
      schedule(() => {
        if (Date.now() >= clock.current.actingUntil - 5) setActing(false);
      }, foesDone);
    }
    if (busyMs > 0) holdBusy(busyMs);
    // §9.9.2 — before paint, the log and the HP as they stood (or as an earlier batch still holds them) — never a frame of
    // a result before its beat told it (v0.9.16); each cut and each hit lets a little more through; the batch that ends
    // last lets go of the rest.
    if (logCuts.length || hpAt.length) {
      if (logCuts.length) {
        const first = Math.max(before.logLength, ...logCuts.filter((c) => c.at <= 0).map((c) => c.upTo));
        setLogHold((h) => h ?? first);
        for (const c of logCuts) if (c.at > 0) schedule(() => setLogHold((h) => (h === null ? null : Math.max(h, c.upTo))), c.at);
      }
      if (hpAt.length) {
        setHpShown((cur) => {
          const next = { ...cur };
          for (const h of hpAt) if (!(h.uid in next)) next[h.uid] = before.hp.get(h.uid) ?? h.hp;
          return next;
        });
        for (const h of hpAt) schedule(() => setHpShown((c) => ({ ...c, [h.uid]: h.hp })), h.at);
      }
      const end = Math.max(...logCuts.map((c) => c.at), ...hpAt.map((h) => h.at));
      clock.current.heldUntil = Math.max(clock.current.heldUntil, t0 + end);
      schedule(() => {
        if (Date.now() < clock.current.heldUntil - 5) return;
        setLogHold(null);
        setHpShown({});
      }, end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.nextSeq, combatKey]);

  return { floats, classes, sprites, ghosts, balls, hits, moves, stageClass, catching, banner, busy, logHold, faintPending, hp: hpShown, acting, opening, turn: shownTurn ?? state?.turn ?? 1, hitStop };
}

export type { CombatEvent };

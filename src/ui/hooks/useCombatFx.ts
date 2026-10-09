import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { CombatEvent, CombatState, EnemyCombatant } from '@/sim';
import { SHAKE_CHECKS, wobblesShown } from '@/sim/combat/catch';
import type { FloatingFx } from '@/ui/components/FloatingNumbers';
import { CATCH_BREAK_LINE, EFFECTIVENESS_LABEL, STATUS_LABEL } from '@/ui/strings';

// Turns new sim events into transient visual effects (§9.9): floating numbers, hit shakes, lunges, a turn banner —
// and, since v0.9.3, the series' own beats (§9.9.1): a Poké Ball thrown from a trainer's hand and a Pokémon coming out
// of it, a Pokémon recalled into its ball and the ball going back to the hand, a faint, and the catch. The sim state is
// already final when this runs; every effect is a beat of feedback layered on top, and the outcome is never decided
// here — the catch's ball rocks to the shake checks the sim rolled before the first frame (§2.6.4.4).
//
// A Pokémon that faints or is caught has already left `state.enemies` when its event arrives, so its last moment
// is drawn as a **ghost**: what stood in that slot a render ago (`seen`), playing out where it stood.

export type SpriteSlot = 'single' | 'lead' | 'support1' | 'support2' | 'player';

/** Someone who has left the field, drawn for one more beat where it stood. */
export interface Ghost {
  id: number;
  slot: SpriteSlot;
  speciesId: string;
  shiny: boolean;
  /** `faint`: sinks out of sight. `recall`: the red light takes it back into its ball. */
  kind: 'faint' | 'recall';
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

/** The catch, beat by beat: the ball, the Pokémon drawn into it, the wobbles, and the checks the sim rolled. */
export interface CatchFx {
  id: number;
  slot: SpriteSlot;
  speciesId: string;
  shiny: boolean;
  ball: string;
  chance: number;
  success: boolean;
  /** §2.6.4.4 — how many of the four shake checks passed (4 is the catch). */
  checks: number;
  wobbles: number;
}

export interface CombatFxState {
  floats: FloatingFx[];
  /** uid → css class applied to that combatant's card for a moment. */
  classes: Record<string, string>;
  /** uid → css class for that combatant's sprite in the arena only: sent out, waiting to be, entering. */
  sprites: Record<string, string>;
  ghosts: Ghost[];
  balls: BallFlight[];
  catching: CatchFx | null;
  banner: string | null;
  /** A beat is playing that the screen should not talk over — the catch, a faint: the outcome waits, the hand waits. */
  busy: boolean;
  /**
   * §9.9.1 — your Pokémon already at 0 HP in the sim whose faint has not played yet: their card stays standing through
   * the hits still on screen and dims when the beat comes (v0.9.10 — the card went grey at once, then every hit's flash
   * lit it up again, and the faint looked like it played twice).
   */
  faintPending: Record<string, true>;
  /** While a ball rocks, the log shows only this many lines: the result is not read before the ball tells it. */
  logHold: number | null;
}

const FLOAT_MS = 1150;
const CLASS_MS = 450;
const BANNER_MS = 1300;
const FAINT_CARD_MS = 650;
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
  recall: 520,
  /** The catch: the throw, the Pokémon drawn in, the ball dropping to the ground, then each wobble — a still
   *  moment and a rock — and after the last a still moment more before the click or the burst. */
  throw: 750,
  absorb: 600,
  drop: 550,
  pause: 450,
  wobble: 600,
  result: 1000,
  /** Between two Pokémon sent out together at a fight's start. */
  stagger: 220,
} as const;

/** The beats' lengths as CSS custom properties on the arena, so the keyframes and the timers read one table. */
export const fxTimings = (): CSSProperties =>
  ({
    '--fx-sendout': `${FX_MS.sendOut}ms`,
    '--fx-wild-enter': `${FX_MS.wildEnter}ms`,
    '--fx-ball-fly': `${FX_MS.ballFly}ms`,
    '--fx-faint': `${FX_MS.faint}ms`,
    '--fx-recall': `${FX_MS.recall}ms`,
    '--fx-throw': `${FX_MS.throw}ms`,
    '--fx-absorb': `${FX_MS.absorb}ms`,
    '--fx-drop': `${FX_MS.drop}ms`,
    '--fx-wobble-cycle': `${FX_MS.pause + FX_MS.wobble}ms`,
    '--fx-result': `${FX_MS.result}ms`,
  }) as CSSProperties;

/** §2.6.4.4 — when each beat of a catch starts, from the throw. */
export function catchTimeline(wobbles: number) {
  const absorbAt = FX_MS.throw;
  const dropAt = absorbAt + FX_MS.absorb;
  const wobbleAt = dropAt + FX_MS.drop;
  const cycle = FX_MS.pause + FX_MS.wobble;
  /** The end of wobble `i` (1-based): where its shake check lands. */
  const checkAt = (i: number) => wobbleAt + i * cycle;
  const resultAt = wobbleAt + wobbles * cycle + FX_MS.pause;
  return { absorbAt, dropAt, wobbleAt, cycle, checkAt, resultAt, total: resultAt + FX_MS.result };
}

interface Seen {
  enemies: Map<string, { speciesId: string; shiny: boolean; slot: SpriteSlot; enemy: EnemyCombatant }>;
  lead: { uid: string; speciesId: string; shiny: boolean } | null;
}

const slotOf = (index: number, count: number): SpriteSlot => (count <= 1 ? 'single' : index === 0 ? 'lead' : index === 1 ? 'support1' : 'support2');

function look(state: CombatState): Seen {
  const enemies: Seen['enemies'] = new Map();
  state.enemies.forEach((e, i) => enemies.set(e.uid, { speciesId: e.speciesId, shiny: !!e.shiny, slot: slotOf(i, state.enemies.length), enemy: e }));
  const l = state.player.team[state.player.leadIndex];
  return { enemies, lead: l && l.hp > 0 ? { uid: l.uid, speciesId: l.speciesId, shiny: !!l.shiny } : null };
}

/** A fight whose Pokémon come out of a trainer's ball, rather than out of the grass. */
const fromABall = (state: CombatState) => state.kind !== 'wild' || !!state.trainer;

export function useCombatFx(state: CombatState | null, combatKey: number, animate = true): CombatFxState {
  const [floats, setFloats] = useState<FloatingFx[]>([]);
  const [classes, setClasses] = useState<Record<string, string>>({});
  const [sprites, setSprites] = useState<Record<string, string>>({});
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [balls, setBalls] = useState<BallFlight[]>([]);
  const [catching, setCatching] = useState<CatchFx | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [faintPending, setFaintPending] = useState<Record<string, true>>({});
  const [logHold, setLogHold] = useState<number | null>(null);
  // Every timer this hook has set, kept across batches: a batch arriving mid-beat must not cancel the end of the
  // last one (a sprite left hidden, the hand left locked). They are cleared only on a new fight and on unmount.
  const pending = useRef<number[]>([]);
  const busyEnd = useRef(0);
  const busyTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      pending.current.forEach((t) => window.clearTimeout(t));
      if (busyTimer.current !== null) window.clearTimeout(busyTimer.current);
    },
    [],
  );
  const seenSeq = useRef(0);
  const seenCombat = useRef<number | null>(null);
  const seen = useRef<Seen | null>(null);
  const nextId = useRef(1);

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
      setCatching(null);
      setSprites({});
      setLogHold(null);
      // Nothing from the last fight holds this one.
      if (busyTimer.current !== null) window.clearTimeout(busyTimer.current);
      busyTimer.current = null;
      busyEnd.current = 0;
      setBusy(false);
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
      const lead = state.player.team[state.player.leadIndex];
      if (lead) sendOut(lead.uid, 'player', 'player', at + (ball ? FX_MS.ballFly : FX_MS.wildEnter) - FX_MS.stagger);
      // The fight may start at once: Pokémon coming out never hold the hand.
      return;
    }

    const fresh = state.events.filter((e) => e.seq >= seenSeq.current);
    seenSeq.current = state.nextSeq;
    const before = seen.current ?? look(state);
    seen.current = look(state);
    if (fresh.length === 0) return;

    let delay = 0;
    let busyMs = 0;
    let lastBall = 'poke-ball';
    const addFloat = (f: Omit<FloatingFx, 'id'>, at: number) => {
      const id = nextId.current++;
      schedule(() => setFloats((fs) => [...fs, { ...f, id }]), at);
      schedule(() => setFloats((fs) => fs.filter((x) => x.id !== id)), at + FLOAT_MS);
    };
    const addClass = (uid: string, cls: string, at: number, ms = CLASS_MS) => {
      schedule(() => setClasses((c) => ({ ...c, [uid]: cls })), at);
      schedule(() => setClasses((c) => (c[uid] === cls ? { ...c, [uid]: '' } : c)), at + ms);
    };
    // A ghost stands in at once — the sprite it replaces is already gone — and plays its beat at `at`.
    const addGhost = (g: Omit<Ghost, 'id'>, dur: number) => {
      const id = nextId.current++;
      setGhosts((gs) => [...gs, { ...g, id }]);
      schedule(() => setGhosts((gs) => gs.filter((x) => x.id !== id)), g.at + dur + GHOST_TAIL_MS);
    };
    const showBanner = (text: string, at: number, ms = BANNER_MS) => {
      schedule(() => setBanner(text), at);
      schedule(() => setBanner(null), at + ms);
    };

    for (const e of fresh as CombatEvent[]) {
      switch (e.t) {
        case 'enemy-action':
          if (!e.fizzled) showBanner('Enemy turn', delay);
          else addFloat({ uid: e.enemyUid, kind: 'text', text: 'Missed!' }, delay);
          delay += 350;
          break;
        case 'attack':
          addClass(e.sourceUid, e.sourceUid.startsWith('p') ? 'fx-lunge-right' : 'fx-lunge-left', delay);
          delay += 180;
          break;
        case 'damage': {
          const emphasis = e.crit ? 'crit' : e.effectiveness === 'double' || e.effectiveness === 'quad' ? 'super' : e.effectiveness === 'half' || e.effectiveness === 'quarter' ? 'weak' : e.effectiveness === 'immune' ? 'immune' : undefined;
          const suffix = e.cause !== 'move' ? ` ${e.cause}` : '';
          addFloat({ uid: e.targetUid, kind: 'damage', text: e.amount === 0 && e.effectiveness === 'immune' ? 'immune' : `-${e.amount}${suffix}`, emphasis }, delay);
          if (e.amount > 0) addClass(e.targetUid, 'fx-shake', delay);
          if (e.crit) addFloat({ uid: e.targetUid, kind: 'text', text: 'CRIT' }, delay + 120);
          else if (emphasis === 'super') addFloat({ uid: e.targetUid, kind: 'text', text: EFFECTIVENESS_LABEL[e.effectiveness] ?? '' }, delay + 120);
          delay += 220;
          break;
        }
        case 'heal':
          addFloat({ uid: e.targetUid, kind: 'heal', text: `+${e.amount}` }, delay);
          delay += 150;
          break;
        case 'status-applied':
          addFloat({ uid: e.targetUid, kind: 'status', text: STATUS_LABEL[e.status] ?? e.status }, delay);
          delay += 150;
          break;
        case 'status-immune':
          addFloat({ uid: e.targetUid, kind: 'text', text: 'Immune' }, delay);
          delay += 150;
          break;
        case 'stage':
          addFloat({ uid: e.targetUid, kind: 'status', text: `${e.stat === 'attack' ? 'Atk' : e.stat === 'defense' ? 'Def' : 'Spd'} ${e.delta > 0 ? '+' : ''}${e.delta}` }, delay);
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
          // The card stands until its beat, then dims into its fainted look (motion.css faintOut).
          if (e.side !== 'enemy' && delay > 0) {
            const uid = e.uid;
            schedule(() => setFaintPending((p) => ({ ...p, [uid]: true })), 0);
            schedule(() => setFaintPending((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== uid)) as Record<string, true>), delay);
          }
          addClass(e.uid, 'fx-faint', delay, FAINT_CARD_MS);
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
          let end = delay + FX_MS.faint;
          if (mine || fromABall(state)) {
            flyBall({ slot, dir: 'out', hand: mine ? 'player' : 'trainer', ball: 'poke-ball' }, end);
            end += FX_MS.ballFly;
          }
          busyMs = Math.max(busyMs, end);
          delay = end;
          break;
        }
        case 'swap': {
          if (!animate) break;
          // §3.3.1 — the Lead goes back into its ball, the ball back to your hand, and the new one is thrown out. A
          // replacement follows a faint, whose ball already went back.
          const now = state.player.team[state.player.leadIndex];
          if (!now) break;
          if (e.kind !== 'replacement' && before.lead && before.lead.uid !== now.uid) {
            addGhost({ slot: 'player', speciesId: before.lead.speciesId, shiny: before.lead.shiny, kind: 'recall', at: delay }, FX_MS.recall);
            flyBall({ slot: 'player', dir: 'out', hand: 'player', ball: 'poke-ball' }, delay + FX_MS.recall - 80);
            delay += FX_MS.recall - 80 + FX_MS.ballFly - 120;
          }
          sendOut(now.uid, 'player', 'player', delay);
          delay += 200;
          break;
        }
        case 'enemy-enter': {
          if (!animate) break;
          // §5.6.2 / §5.9.3 — the trainer's next Pokémon, thrown from the trainer's hand; or a wild one answering a call.
          const idx = state.enemies.findIndex((x) => x.uid === e.enemyUid);
          const slot = slotOf(Math.max(0, idx), state.enemies.length);
          if (fromABall(state) && !e.called) {
            sendOut(e.enemyUid, slot, 'trainer', delay);
            // The log names it as it comes out of the ball, not while the last one is still falling.
            const cut = state.log.findLastIndex((l) => l.text.includes(' sent out '));
            if (cut >= 0) {
              schedule(() => setLogHold(cut), 0);
              schedule(() => setLogHold((h) => (h === cut ? null : h)), delay + FX_MS.ballFly);
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
          const t = catchTimeline(wobbles);
          const id = nextId.current++;
          const fx: CatchFx = { id, slot: was.slot, speciesId: was.speciesId, shiny: was.shiny, ball: lastBall, chance: e.chance, success: e.success, checks: e.checks, wobbles };
          schedule(() => setCatching(fx), delay);
          // The log already holds the result: it shows the throw, and the rest when the ball clicks or bursts.
          const cut = state.log.findLastIndex((l) => l.text.startsWith('Used ')) + 1;
          if (cut > 0) {
            schedule(() => setLogHold(cut), 0);
            schedule(() => setLogHold((h) => (h === cut ? null : h)), delay + t.resultAt);
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
        case 'turn-start':
          if (e.turn > 1) showBanner(`Turn ${e.turn}`, delay, 900);
          break;
        default:
          break;
      }
    }
    if (busyMs > 0) holdBusy(busyMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.nextSeq, combatKey]);

  return { floats, classes, sprites, ghosts, balls, catching, banner, busy, logHold, faintPending };
}

export type { CombatEvent };

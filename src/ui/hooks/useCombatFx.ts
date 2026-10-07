import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CombatEvent, CombatState } from '@/sim';
import type { FloatingFx } from '@/ui/components/FloatingNumbers';
import { EFFECTIVENESS_LABEL, STATUS_LABEL } from '@/ui/strings';

// Turns new sim events into transient visual effects (§9.9): floating numbers, hit shakes, lunges, a turn banner —
// and, since v0.9.3, the series' own beats: a Pokémon sent out of its ball, recalled into it, fainting, and the
// catch. The sim state is already final when this runs; every effect is a beat of feedback layered on top, and the
// outcome is never decided here — the catch's ball wobbles to a result the sim rolled before the first frame.
//
// A Pokémon that faints or is caught has already left `state.enemies` when its event arrives, so its last moment
// is drawn as a **ghost**: what stood in that slot a render ago (`seen`), playing out where it stood.

export type SpriteSlot = 'single' | 'lead' | 'support1' | 'support2' | 'player';

/** Someone who has left the field, drawn for one more beat: falling, or going back into the ball. */
export interface Ghost {
  id: number;
  slot: SpriteSlot;
  speciesId: string;
  shiny: boolean;
  /** `faint`: drops and fades (a wild Pokémon). `faint-recall`: drops, then the red beam (a trainer's, or yours). `recall`: the beam alone (a swap). */
  kind: 'faint' | 'faint-recall' | 'recall';
}

/** The catch, beat by beat: the ball, the Pokémon drawn into it, the wobbles, and the result the sim rolled. */
export interface CatchFx {
  id: number;
  slot: SpriteSlot;
  speciesId: string;
  shiny: boolean;
  ball: string;
  chance: number;
  success: boolean;
  wobbles: number;
}

export interface CombatFxState {
  floats: FloatingFx[];
  /** uid → css class applied to that combatant's card for a moment. */
  classes: Record<string, string>;
  /** uid → css class for that combatant's sprite in the arena only: sent out, waiting to be, entering. */
  sprites: Record<string, string>;
  ghosts: Ghost[];
  catching: CatchFx | null;
  banner: string | null;
  /** A beat is playing that the screen should not talk over — the catch, a faint: the outcome waits, the hand waits. */
  busy: boolean;
  /** While a ball rocks, the log shows only this many lines: the result is not read before the ball tells it. */
  logHold: number | null;
}

const FLOAT_MS = 1150;
const CLASS_MS = 450;
const BANNER_MS = 1300;

/** §9.9 — the beats' lengths. Presentation only: what the sim decided is already decided. */
export const FX_MS = {
  sendOut: 520,
  wildEnter: 480,
  faint: 650,
  recall: 420,
  /** The catch: the throw, the Pokémon drawn in, the ball landing, one wobble, the click or the burst. */
  throw: 480,
  absorb: 360,
  land: 240,
  wobble: 520,
  result: 650,
  /** Between two Pokémon sent out together at a fight's start. */
  stagger: 160,
} as const;

/** The beats' lengths as CSS custom properties on the arena, so the keyframes and the timers read one table. */
export const fxTimings = (): CSSProperties =>
  ({
    '--fx-sendout': `${FX_MS.sendOut}ms`,
    '--fx-wild-enter': `${FX_MS.wildEnter}ms`,
    '--fx-faint': `${FX_MS.faint}ms`,
    '--fx-recall': `${FX_MS.recall}ms`,
    '--fx-throw': `${FX_MS.throw}ms`,
    '--fx-absorb': `${FX_MS.absorb}ms`,
    '--fx-land': `${FX_MS.land}ms`,
    '--fx-wobble': `${FX_MS.wobble}ms`,
    '--fx-result': `${FX_MS.result}ms`,
  }) as CSSProperties;

/** How many times the ball rocks before it breaks open: more suspense the better the odds were. Presentation only. */
export function catchWobbles(chance: number, success: boolean): number {
  if (success) return 3;
  return chance < 0.2 ? 0 : chance < 0.45 ? 1 : 2;
}

/** How long a catch plays, from the throw to the click or the burst. */
export const catchMs = (wobbles: number): number => FX_MS.throw + FX_MS.absorb + FX_MS.land + wobbles * FX_MS.wobble + FX_MS.result;

interface Seen {
  enemies: Map<string, { speciesId: string; shiny: boolean; slot: SpriteSlot }>;
  lead: { uid: string; speciesId: string; shiny: boolean } | null;
}

const slotOf = (index: number, count: number): SpriteSlot => (count <= 1 ? 'single' : index === 0 ? 'lead' : index === 1 ? 'support1' : 'support2');

function look(state: CombatState): Seen {
  const enemies = new Map<string, { speciesId: string; shiny: boolean; slot: SpriteSlot }>();
  state.enemies.forEach((e, i) => enemies.set(e.uid, { speciesId: e.speciesId, shiny: !!e.shiny, slot: slotOf(i, state.enemies.length) }));
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
  const [catching, setCatching] = useState<CatchFx | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
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

    // A new fight: nothing old replays, and its Pokémon come out — the foe from its ball or the grass, then yours.
    if (seenCombat.current !== combatKey) {
      seenCombat.current = combatKey;
      seenSeq.current = state.nextSeq;
      pending.current.forEach((t) => window.clearTimeout(t));
      pending.current = [];
      seen.current = look(state);
      setFloats([]);
      setClasses({});
      setGhosts([]);
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
      for (const e of state.enemies) {
        setSprite(e.uid, 'fx-hidden', 0, at);
        setSprite(e.uid, ball ? 'fx-sendout' : 'fx-wild-enter', at, ball ? FX_MS.sendOut : FX_MS.wildEnter);
        at += FX_MS.stagger;
      }
      const lead = state.player.team[state.player.leadIndex];
      if (lead) {
        setSprite(lead.uid, 'fx-hidden', 0, at);
        setSprite(lead.uid, 'fx-sendout', at, FX_MS.sendOut);
      }
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
    const addClass = (uid: string, cls: string, at: number) => {
      schedule(() => setClasses((c) => ({ ...c, [uid]: cls })), at);
      schedule(() => setClasses((c) => (c[uid] === cls ? { ...c, [uid]: '' } : c)), at + CLASS_MS);
    };
    const addGhost = (g: Omit<Ghost, 'id'>, at: number, dur: number) => {
      const id = nextId.current++;
      schedule(() => setGhosts((gs) => [...gs, { ...g, id }]), at);
      schedule(() => setGhosts((gs) => gs.filter((x) => x.id !== id)), at + dur);
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
        case 'sturdy':
          addFloat({ uid: e.uid, kind: 'text', text: 'Sturdy!' }, delay);
          delay += 150;
          break;
        case 'faint': {
          addClass(e.uid, 'fx-faint', delay);
          if (animate) {
            // §9.9 — the fallen Pokémon's last beat, where it stood: a wild one drops and is gone; a trainer's, or
            // yours, drops and goes back into its ball.
            if (e.side === 'enemy') {
              const was = before.enemies.get(e.uid);
              if (was) {
                const kind = fromABall(state) ? 'faint-recall' : 'faint';
                const ms = kind === 'faint' ? FX_MS.faint : FX_MS.faint + FX_MS.recall;
                addGhost({ slot: was.slot, speciesId: was.speciesId, shiny: was.shiny, kind }, delay, ms);
                busyMs = Math.max(busyMs, delay + ms);
                delay += ms - 120;
              }
            } else if (before.lead?.uid === e.uid) {
              const ms = FX_MS.faint + FX_MS.recall;
              addGhost({ slot: 'player', speciesId: before.lead.speciesId, shiny: before.lead.shiny, kind: 'faint-recall' }, delay, ms);
              busyMs = Math.max(busyMs, delay + ms);
              delay += ms - 120;
            } else delay += 300;
          } else delay += 300;
          break;
        }
        case 'swap': {
          if (!animate) break;
          // §3.3.1 — the Lead goes back into its ball and the new one comes out. A replacement follows a faint,
          // whose ghost already took the old Lead away.
          const now = state.player.team[state.player.leadIndex];
          if (!now) break;
          if (e.kind !== 'replacement' && before.lead && before.lead.uid !== now.uid) {
            addGhost({ slot: 'player', speciesId: before.lead.speciesId, shiny: before.lead.shiny, kind: 'recall' }, delay, FX_MS.recall);
            delay += FX_MS.recall - 80;
          }
          setSprite(now.uid, 'fx-hidden', 0, delay);
          setSprite(now.uid, 'fx-sendout', delay, FX_MS.sendOut);
          delay += 200;
          break;
        }
        case 'enemy-enter': {
          if (!animate) break;
          // §5.6.2 / §5.9.3 — the next Pokémon out of the trainer's ball, or a wild one answering a call.
          const ball = fromABall(state) && !e.called;
          setSprite(e.enemyUid, 'fx-hidden', 0, delay);
          setSprite(e.enemyUid, ball ? 'fx-sendout' : 'fx-wild-enter', delay, ball ? FX_MS.sendOut : FX_MS.wildEnter);
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
          // §2.6.4 — the throw. The sim rolled the result already; the ball only shows it.
          const target = [...before.enemies.entries()].find(([, v]) => v.slot === 'single' || v.slot === 'lead');
          if (!animate || !target) {
            showBanner(e.success ? 'Gotcha!' : 'It broke free!', delay);
            delay += 300;
            break;
          }
          const [uid, was] = target;
          const wobbles = catchWobbles(e.chance, e.success);
          const ms = catchMs(wobbles);
          const id = nextId.current++;
          const fx: CatchFx = { id, slot: was.slot, speciesId: was.speciesId, shiny: was.shiny, ball: lastBall, chance: e.chance, success: e.success, wobbles };
          schedule(() => setCatching(fx), delay);
          // The log already holds the result: it shows the throw, and the rest when the ball clicks or bursts.
          const cut = state.log.findLastIndex((l) => l.text.startsWith('Used ')) + 1;
          if (cut > 0) {
            schedule(() => setLogHold(cut), 0);
            schedule(() => setLogHold((h) => (h === cut ? null : h)), delay + ms - FX_MS.result);
          }
          // A Pokémon that broke free is still on the field: hidden while it is in the ball, then out again.
          if (!e.success) {
            setSprite(uid, 'fx-hidden', 0, delay + ms - FX_MS.result);
            setSprite(uid, 'fx-burst', delay + ms - FX_MS.result, FX_MS.result);
          }
          schedule(() => setCatching((c) => (c?.id === id ? null : c)), delay + ms);
          showBanner(e.success ? 'Gotcha!' : 'It broke free!', delay + ms - FX_MS.result);
          busyMs = Math.max(busyMs, delay + ms);
          delay += ms;
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

  return { floats, classes, sprites, ghosts, catching, banner, busy, logHold };
}

export type { CombatEvent };

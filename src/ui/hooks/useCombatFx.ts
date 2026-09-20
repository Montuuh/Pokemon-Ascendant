import { useEffect, useRef, useState } from 'react';
import type { CombatEvent, CombatState } from '@/sim';
import type { FloatingFx } from '@/ui/components/FloatingNumbers';
import { EFFECTIVENESS_LABEL, STATUS_LABEL } from '@/ui/strings';

// Turns new sim events into transient visual effects: floating numbers, hit shakes, lunges, a turn banner.
// The sim state is already final when this runs; the FX are a beat of feedback layered on top (§9.9).

export interface CombatFxState {
  floats: FloatingFx[];
  /** uid → css class applied to that combatant's card for a moment. */
  classes: Record<string, string>;
  banner: string | null;
}

const FLOAT_MS = 1150;
const CLASS_MS = 450;
const BANNER_MS = 1300;

export function useCombatFx(state: CombatState | null, combatKey: number): CombatFxState {
  const [floats, setFloats] = useState<FloatingFx[]>([]);
  const [classes, setClasses] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const seenSeq = useRef(0);
  const seenCombat = useRef<number | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (!state) return;
    const key = combatKey;
    if (seenCombat.current !== key) {
      seenCombat.current = key;
      seenSeq.current = state.nextSeq; // do not replay the setup events
      setFloats([]);
      setClasses({});
      return;
    }
    const fresh = state.events.filter((e) => e.seq >= seenSeq.current);
    seenSeq.current = state.nextSeq;
    if (fresh.length === 0) return;

    const timers: number[] = [];
    let delay = 0;
    const schedule = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const addFloat = (f: Omit<FloatingFx, 'id'>, at: number) => {
      const id = nextId.current++;
      schedule(() => setFloats((fs) => [...fs, { ...f, id }]), at);
      schedule(() => setFloats((fs) => fs.filter((x) => x.id !== id)), at + FLOAT_MS);
    };
    const addClass = (uid: string, cls: string, at: number) => {
      schedule(() => setClasses((c) => ({ ...c, [uid]: cls })), at);
      schedule(() => setClasses((c) => (c[uid] === cls ? { ...c, [uid]: '' } : c)), at + CLASS_MS);
    };

    for (const e of fresh) {
      switch (e.t) {
        case 'enemy-action':
          if (!e.fizzled) {
            schedule(() => setBanner(`Enemy turn`), delay);
            schedule(() => setBanner(null), delay + BANNER_MS);
          } else {
            addFloat({ uid: e.enemyUid, kind: 'text', text: 'Missed!' }, delay);
          }
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
        case 'faint':
          addClass(e.uid, 'fx-faint', delay);
          delay += 300;
          break;
        case 'phase':
          schedule(() => setBanner(`Phase ${e.phase}!`), delay);
          schedule(() => setBanner(null), delay + BANNER_MS);
          delay += 300;
          break;
        case 'catch':
          schedule(() => setBanner(e.success ? 'Gotcha!' : 'It broke free!'), delay);
          schedule(() => setBanner(null), delay + BANNER_MS);
          delay += 300;
          break;
        case 'turn-start':
          if (e.turn > 1) {
            schedule(() => setBanner(`Turn ${e.turn}`), delay);
            schedule(() => setBanner(null), delay + 900);
          }
          break;
        default:
          break;
      }
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.nextSeq, combatKey]);

  return { floats, classes, banner };
}

export type { CombatEvent };

import { useLayoutEffect, useState } from 'react';
import type { CombatState, Intent } from '@/sim';
import { intentRecipient } from '@/sim';
import styles from './IntentArrows.module.css';

/** What an arrow means: a hit (red), a status or a debuff (violet), help for an ally (green). */
type ArrowKind = 'hit' | 'status' | 'ally';

interface Arrow {
  key: string;
  d: string;
  kind: ArrowKind;
  enemyUid: string;
  second: boolean;
}

const KIND: Partial<Record<Intent['kind'], ArrowKind>> = {
  attack: 'hit',
  backstrike: 'hit',
  cleave: 'hit',
  status: 'status',
  debuff: 'status',
  buff: 'ally',
  stall: 'ally',
};

/**
 * §5.2 / §9.2.5 — who each enemy is about to hit, as a quiet arrow across the field (v0.9.16, the user's ask: "muy
 * sutil"): from the enemy's sprite to the slot its intent names — every slot for a Cleave, an ally for a buff or a
 * heal. A hidden intent draws nothing: its target is hidden too. Resting on an enemy brings its arrows forward and
 * the rest back. The ends are the sprites' own boxes (`data-arrow-from`, `data-arrow-to`), measured, so the arrows
 * follow the formation at every size.
 */
export function IntentArrows({ state, stage, focusUid }: { state: CombatState; stage: HTMLElement | null; focusUid: string | null }) {
  const [arrows, setArrows] = useState<Arrow[]>([]);

  useLayoutEffect(() => {
    if (!stage) return;
    const measure = () => {
      const base = stage.getBoundingClientRect();
      const box = (sel: string) => {
        const el = stage.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
      };
      const next: Arrow[] = [];
      const lanes = new Map<string, number>();
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const from = box(`[data-arrow-from="${enemy.uid}"]`);
        if (!from) continue;
        ([enemy.intent, enemy.second] as const).forEach((intent, action) => {
          if (!intent || intent.hidden) return;
          const kind = KIND[intent.kind];
          if (!kind) return;
          const ally = intent.targetEnemyUid ? intentRecipient(state, enemy, intent) : null;
          const ends =
            kind === 'ally'
              ? ally && ally.uid !== enemy.uid
                ? [`[data-arrow-from="${ally.uid}"]`]
                : []
              : intent.kind === 'cleave'
                ? ['lead', 'bench1', 'bench2'].map((s) => `[data-arrow-to="${s}"]`)
                : intent.targetSlot
                  ? [`[data-arrow-to="${intent.targetSlot}"]`]
                  : [];
          for (const sel of ends) {
            const to = box(sel);
            if (!to) continue;
            // Two arrows into the same place bow apart rather than lying on top of each other.
            const lane = lanes.get(sel) ?? 0;
            lanes.set(sel, lane + 1);
            next.push({ key: `${enemy.uid}#${action}${sel}`, d: path(from, to, kind === 'ally', lane), kind, enemyUid: enemy.uid, second: action === 1 });
          }
        });
      }
      setArrows((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    };
    measure();
    // The sprites settle (fonts, a send-out) a moment after the state does: measure once more then.
    const late = window.setTimeout(measure, 400);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(stage);
    return () => {
      window.clearTimeout(late);
      ro?.disconnect();
    };
  }, [stage, state]);

  return (
    <svg className={styles.svg} aria-hidden="true">
      <defs>
        {(['hit', 'status', 'ally'] as const).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className={styles[k]} />
          </marker>
        ))}
      </defs>
      {arrows.map((a) => (
        <path
          key={a.key}
          d={a.d}
          className={[styles.arrow, styles[a.kind], a.second ? styles.second : '', focusUid ? (focusUid === a.enemyUid ? styles.focus : styles.faded) : ''].join(' ')}
          markerEnd={`url(#arrow-${a.kind})`}
          data-testid="intent-arrow"
          data-from={a.enemyUid}
          data-kind={a.kind}
        />
      ))}
    </svg>
  );
}

type Box = { x: number; y: number; w: number; h: number };

/**
 * A gentle curve from the enemy's chest to the target's: it leaves from the side of the enemy facing the target and
 * stops short of the target's sprite, bowing upward (an ally's arrow, a short hop, bows the other way).
 */
function path(from: Box, to: Box, ally: boolean, lane: number): string {
  const fy = from.y + from.h * 0.5;
  const ty = to.y + to.h * 0.5;
  const leftward = to.x + to.w / 2 < from.x + from.w / 2;
  const fx = leftward ? from.x + from.w * 0.18 : from.x + from.w * 0.82;
  const tx = leftward ? to.x + to.w * 0.86 : to.x + to.w * 0.14;
  const dx = Math.abs(tx - fx);
  // Bowed from the straight line's middle, not from its higher end: an arrow from a Pokémon standing high stays low
  // enough to pass under the trainer at the back of the field.
  const bow = (ally ? 0.3 : -0.14 - lane * 0.07) * Math.max(dx, 60);
  const cx = (fx + tx) / 2;
  const cy = (fy + ty) / 2 + bow;
  return `M${fx.toFixed(1)},${fy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;
}

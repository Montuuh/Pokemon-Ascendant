import { useLayoutEffect, useState } from 'react';
import type { CombatState, SlotId } from '@/sim';
import { intentRecipient } from '@/sim';
import { intentTone, type IntentTone } from '@/ui/intentTone';
import styles from './IntentArrows.module.css';

interface Arrow {
  key: string;
  d: string;
  tone: IntentTone;
  enemyUid: string;
  /** The slot of yours it lands on (none for help to an ally). */
  toSlot: SlotId | null;
  second: boolean;
}

/**
 * §5.2 / §9.2.5 — who each enemy is about to hit, as an arrow across the field: from the enemy's sprite to the slot its
 * intent names — every slot for a Cleave, an ally for a heal — in the intent's colour (`intentTone`). A hidden intent
 * draws nothing: its target is hidden too. Resting on an enemy brings its arrows forward and the rest back; resting on
 * one of yours brings forward the arrows aimed at it (v0.9.16). The ends are the sprites' own boxes (`data-arrow-from`,
 * `data-arrow-to`), measured, so the arrows follow the formation at every size.
 */
export function IntentArrows({ state, stage, focusUid, focusSlot, hidden }: { state: CombatState; stage: HTMLElement | null; focusUid: string | null; focusSlot: SlotId | null; hidden?: boolean }) {
  const [arrows, setArrows] = useState<Arrow[]>([]);

  useLayoutEffect(() => {
    if (!stage) return;
    const measure = () => {
      const base = stage.getBoundingClientRect();
      // An end: the card's own edge (`data-arrow-card`), at the height of its sprite's window — so the head sits
      // against the card, in sight, and the line leaves from the card it belongs to.
      const box = (sel: string) => {
        const el = stage.querySelector(sel);
        if (!el) return null;
        const w = el.getBoundingClientRect();
        const c = el.closest('[data-arrow-card]')?.getBoundingClientRect() ?? w;
        return { x: c.left - base.left, y: w.top - base.top, w: c.width, h: w.height };
      };
      const next: Arrow[] = [];
      const lanes = new Map<string, number>();
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const from = box(`[data-arrow-from="${enemy.uid}"]`);
        if (!from) continue;
        ([enemy.intent, enemy.second] as const).forEach((intent, action) => {
          const tone = intentTone(intent);
          if (!intent || !tone || tone === 'other') return;
          const ally = intent.targetEnemyUid ? intentRecipient(state, enemy, intent) : null;
          // Help for another of its side lands on that one; a buff or a heal on itself draws nothing.
          const ends: { sel: string; slot: SlotId | null }[] = intent.targetEnemyUid
            ? ally && ally.uid !== enemy.uid
              ? [{ sel: `[data-arrow-from="${ally.uid}"]`, slot: null }]
              : []
            : intent.kind === 'cleave'
              ? (['lead', 'bench1', 'bench2'] as const).map((s) => ({ sel: `[data-arrow-to="${s}"]`, slot: s }))
              : intent.targetSlot
                ? [{ sel: `[data-arrow-to="${intent.targetSlot}"]`, slot: intent.targetSlot }]
                : [];
          for (const end of ends) {
            const to = box(end.sel);
            if (!to) continue;
            // Two arrows into the same place bow apart rather than lying on top of each other.
            const lane = lanes.get(end.sel) ?? 0;
            lanes.set(end.sel, lane + 1);
            next.push({ key: `${enemy.uid}#${action}${end.sel}`, d: path(from, to, end.slot === null, lane), tone: end.slot === null ? 'ally' : tone, enemyUid: enemy.uid, toSlot: end.slot, second: action === 1 });
          }
        });
      }
      setArrows((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    };
    measure();
    // The cards settle (fonts, a send-out) a moment after the state does: measure once more then.
    const late = window.setTimeout(measure, 400);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(stage);
    return () => {
      window.clearTimeout(late);
      ro?.disconnect();
    };
  }, [stage, state]);

  if (hidden) return null;
  const focused = (a: Arrow) => (focusUid ? a.enemyUid === focusUid : focusSlot ? a.toSlot === focusSlot : null);
  return (
    <svg className={styles.svg} aria-hidden="true">
      <defs>
        {(['hit', 'stat', 'status', 'ally'] as const).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className={styles[k]} />
          </marker>
        ))}
      </defs>
      {arrows.map((a) => {
        const f = focused(a);
        return (
          <path
            key={a.key}
            d={a.d}
            className={[styles.arrow, styles[a.tone], a.second ? styles.second : '', f === true ? styles.focus : f === false ? styles.faded : ''].join(' ')}
            markerEnd={`url(#arrow-${a.tone})`}
            data-testid="intent-arrow"
            data-from={a.enemyUid}
            data-to={a.toSlot ?? undefined}
            data-kind={a.tone}
          />
        );
      })}
    </svg>
  );
}

type Box = { x: number; y: number; w: number; h: number };

/**
 * A gentle curve from the edge of the enemy's card facing the target to the edge of the target's card, at the height of
 * their sprites, bowing upward from the line's middle (an ally's arrow, a short hop, the other way).
 */
function path(from: Box, to: Box, ally: boolean, lane: number): string {
  const fy = from.y + from.h * 0.5;
  const ty = to.y + to.h * 0.5;
  const leftward = to.x + to.w / 2 < from.x + from.w / 2;
  const fx = leftward ? from.x - 2 : from.x + from.w + 2;
  const tx = leftward ? to.x + to.w + 6 : to.x - 6;
  const dx = Math.abs(tx - fx);
  // Bowed from the straight line's middle, not from its higher end: an arrow from a Pokémon standing high stays low.
  const bow = (ally ? 0.3 : -0.14 - lane * 0.07) * Math.max(dx, 60);
  const cx = (fx + tx) / 2;
  const cy = (fy + ty) / 2 + bow;
  return `M${fx.toFixed(1)},${fy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;
}

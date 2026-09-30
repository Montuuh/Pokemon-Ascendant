import { useState } from 'react';
import { Popover } from 'radix-ui';
import type { CombatCtx, CombatState, EnemyCombatant } from '@/sim';
import { catchOptions, catchPercent, catchStatus } from '@/sim';
import { itemIcon } from '@/ui/art';
import { REJECT_TEXT } from '@/ui/strings';
import { IconLock } from '@tabler/icons-react';
import { catchPickerTip } from '@/ui/tips';
import { InfoDot } from '@/ui/tooltip';
import styles from './CatchPicker.module.css';

// §2.6.4 / §2.6.4.2 — the catch pill on a wild Pokémon, and the picker behind it (v0.8.6, the user's idea): press
// the pill and every kind of ball in the bag is listed with the chance *that* ball has on this Pokémon now — the
// Poké Ball's, the Great Ball's ×1.5, the Ultra Ball's ×2 — and pressing a row throws it. The pill still shows the
// best ball's chance at a glance. The picker is the door (no tooltip on the pill: it would sit over the picker).

interface Props {
  state: CombatState;
  enemy: EnemyCombatant;
  ctx: CombatCtx;
  interactive: boolean;
  onThrow: (cardId: string, targetUid: string) => void;
}

export function CatchPicker({ state, enemy, ctx, interactive, onThrow }: Props) {
  const [open, setOpen] = useState(false);
  const options = catchOptions(state, ctx, enemy.uid);
  const gauge = catchStatus(state, ctx, enemy.uid);
  if (!gauge) return null;
  const best = options[0];
  const shown = best ? catchPercent(best.odds) : catchPercent(gauge);
  const label = options.length === 0 ? 'no balls' : best?.odds.guaranteed ? 'SURE' : `${shown}%`;
  // §3.5 — when every row is blocked for the same reason (the turn's items are used), it is said once, up top.
  const reasons = [...new Set(options.map((o) => (o.playable.playable ? null : o.playable.reason)))];
  const shared = reasons.length === 1 && reasons[0] ? REJECT_TEXT[reasons[0]] : null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={styles.pill}
          data-testid="catch-pill"
          data-chance={shown}
          disabled={options.length === 0}
          aria-label={`Catch ${enemy.name}: ${label}. Choose a ball.`}
        >
          <span className={styles.ball} />
          <span className="display tabular">{label}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="end" sideOffset={6} className={styles.panel} data-testid="catch-picker">
          <p className={styles.head}>
            <b>Catch {enemy.name}</b>
            <InfoDot tip={catchPickerTip(best?.odds ?? gauge)} label={`About catching ${enemy.name}`} />
          </p>
          {shared && (
            <p className={styles.blocked} data-testid="catch-blocked">
              <IconLock size={14} aria-hidden="true" /> {shared}
            </p>
          )}
          <ul className={styles.rows}>
            {options.map((o) => {
              const def = ctx.content.consumable(o.consumableId);
              const why = shared || o.playable.playable ? null : o.playable.reason ? REJECT_TEXT[o.playable.reason] : null;
              return (
                <li key={o.consumableId}>
                  <button
                    type="button"
                    className={styles.row}
                    disabled={!interactive || !o.playable.playable}
                    onClick={() => {
                      setOpen(false);
                      onThrow(o.cardId, enemy.uid);
                    }}
                    data-testid={`catch-with-${o.consumableId}`}
                  >
                    <img src={itemIcon(o.consumableId)} alt="" width={28} height={28} className={styles.icon} />
                    <span className={styles.name}>
                      {def.name} <span className={styles.count}>×{o.count}</span>
                    </span>
                    <span className={`${styles.chance} display tabular`}>
                      {!o.playable.playable && <IconLock size={14} aria-label="Not now" />}
                      {o.odds.guaranteed ? 'SURE' : `${catchPercent(o.odds)}%`}
                    </span>
                    {why && <span className={styles.why}>{why}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

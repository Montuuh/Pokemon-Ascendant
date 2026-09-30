import { useState } from 'react';
import { Popover } from 'radix-ui';
import { IconBackpack } from '@tabler/icons-react';
import type { ConsumablePlayability } from '@/sim';
import { ConsumableCard } from '@/ui/components/ConsumableCard';
import { combatBagTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import styles from './BagButton.module.css';

// §3.5 — the bag in a fight (v0.8.6). Consumables are spent now, so the whole bag is open every turn instead of a
// random two: one button on the tray, and the bag opens above it with one card per kind and its count. Two items a
// turn (`itemCap`); the button says how many are left, the cards say why one cannot be used.

interface Props {
  plays: ConsumablePlayability[];
  itemsUsed: number;
  itemCap: number;
  disabled: boolean;
  selectedCardId: string | null;
  onUse: (play: ConsumablePlayability) => void;
}

export function BagButton({ plays, itemsUsed, itemCap, disabled, selectedCardId, onUse }: Props) {
  const [open, setOpen] = useState(false);
  // One card per kind, carrying how many of it the bag holds; the first card of the kind is the one used.
  const kinds = new Map<string, { play: ConsumablePlayability; count: number }>();
  for (const p of plays) {
    const k = kinds.get(p.def.id);
    if (k) k.count += 1;
    else kinds.set(p.def.id, { play: p, count: 1 });
  }
  const left = Math.max(0, itemCap - itemsUsed);
  const total = plays.length;
  const tip = useTip(combatBagTip(total, left, itemCap));
  // An empty bag stays focusable (aria-disabled, not disabled) so its tip can say where supplies come from.
  const empty = total === 0;

  return (
    <Popover.Root open={open && !empty} onOpenChange={(o) => setOpen(o && !empty)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={[styles.button, empty ? styles.empty : ''].join(' ')}
          disabled={disabled}
          aria-disabled={empty || undefined}
          onClick={(e) => empty && e.preventDefault()}
          data-testid="btn-bag"
          aria-label={`Bag: ${total} items, ${left} of ${itemCap} left this turn`}
          {...(open ? {} : tip)}
        >
          <IconBackpack size={26} aria-hidden="true" />
          <span className={`${styles.label} display`}>Bag</span>
          <span className={`${styles.count} tabular`}>{total}</span>
          <span className={styles.uses} data-testid="bag-uses">
            {left}/{itemCap}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" align="end" sideOffset={10} className={styles.panel} data-testid="bag-panel">
          <p className={styles.head}>
            <b>Bag</b> · {left === 0 ? 'no more items this turn' : `${left} more item${left === 1 ? '' : 's'} this turn`}
          </p>
          <div className={styles.grid}>
            {[...kinds.values()].map(({ play, count }) => (
              <ConsumableCard
                key={play.def.id}
                play={play}
                count={count}
                selected={selectedCardId === play.cardId}
                onClick={() => {
                  onUse(play);
                  if (play.playable) setOpen(false);
                }}
              />
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

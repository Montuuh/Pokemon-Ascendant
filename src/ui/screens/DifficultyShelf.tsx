import { useRef, type ReactNode } from 'react';
import { Collapsible } from 'radix-ui';
import { IconChevronDown, IconLock } from '@tabler/icons-react';
import type { DifficultyModifier } from '@/sim';
import { Tipped } from '@/ui/tooltip';
import { lockedModifierTip } from '@/ui/tips';
import { DIFFICULTY_TEXT } from '@/ui/strings';
import styles from './DifficultyShelf.module.css';

// Per §8.8.2 — a modifier below the account's Trainer Level is shown, named and locked, not hidden: one closed line, and
// each row's effect and premium are its tooltip (D4: a fact behind a door, the goal still a hover away).

interface Props {
  /** The modifiers this account has not opened (or whose system is pending), in the order they open. */
  locked: DifficultyModifier[];
  /** A modifier's effect as it reads for this account (Box Squeeze's numbers are the Box you have bought). */
  effectOf: (m: DifficultyModifier) => ReactNode;
}

export function DifficultyShelf({ locked, effectOf }: Props) {
  const content = useRef<HTMLDivElement>(null);
  if (!locked.length) return null;
  // The first level that opens something: the goal a new player is walking toward.
  const next = locked.filter((m) => m.available).reduce<number | null>((lv, m) => (lv === null || m.unlockLevel < lv ? m.unlockLevel : lv), null);
  // Opening it scrolls the rows into view: a closed line at the foot of a scrolling step would otherwise open below the fold.
  return (
    <Collapsible.Root className={styles.shelf} data-testid="difficulty-shelf" onOpenChange={(open) => open && requestAnimationFrame(() => content.current?.scrollIntoView({ block: 'nearest' }))}>
      <Collapsible.Trigger className={styles.trigger} data-testid="difficulty-shelf-toggle">
        <IconLock size={18} className={styles.lock} aria-hidden="true" />
        <span className={`${styles.label} display`}>{DIFFICULTY_TEXT.shelf}</span>
        <span className={`${styles.count} tabular`}>{locked.length}</span>
        <span className={styles.next}>{next === null ? DIFFICULTY_TEXT.shelfNone : DIFFICULTY_TEXT.shelfNext(next)}</span>
        <IconChevronDown size={18} className={styles.chevron} aria-hidden="true" />
      </Collapsible.Trigger>
      <Collapsible.Content ref={content} className={styles.content}>
        <ul className={styles.rows}>
          {locked.map((m) => (
            <Tipped as="li" key={m.id} tip={lockedModifierTip(m, effectOf(m))} className={styles.row} tabIndex={0} data-testid={`difficulty-${m.id}`} data-locked="true">
              <span className={`${styles.name} display`}>{m.name}</span>
              <span className={styles.gate} data-testid={`difficulty-lock-${m.id}`}>
                <IconLock size={12} aria-hidden="true" /> {m.available ? m.unlock : m.pending}
              </span>
            </Tipped>
          ))}
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

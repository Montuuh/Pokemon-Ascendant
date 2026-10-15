import { apTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './ApMeter.module.css';

interface Props {
  ap: number;
  /** The AP a turn starts with: the capsule always shows at least this many cells. */
  base: number;
  /** §9.2.2.4 — the card under the pointer (hovered, dragged or held): what it would cost, shown before it is paid. */
  cost: number | null;
}

/**
 * §9.2.2.4 (v0.9.16) — the AP as a capsule of cells, one per point, gold like a card's cost gem (the user weighed a
 * capsule, a sphere and a bar: cells are the one that can be counted at a glance), docked at the middle of the screen
 * over the hand. It drains as you play. While a card
 * is under the pointer the cells it would spend go striped and the number reads "3 → 1"; a card you cannot afford
 * shows the cells you are short in red.
 */
export function ApMeter({ ap, base, cost }: Props) {
  const after = cost === null ? null : ap - cost;
  const cells = Math.max(base, ap, cost ?? 0);
  // Cell i, counted from the left: kept, about to be spent, empty, or short (a cost beyond what is left).
  const stateOf = (i: number): 'kept' | 'spend' | 'empty' | 'short' => {
    if (after === null) return i < ap ? 'kept' : 'empty';
    if (after >= 0) return i < after ? 'kept' : i < ap ? 'spend' : 'empty';
    return i < ap ? 'spend' : i < cost! ? 'short' : 'empty';
  };
  return (
    <Tipped as="div" tip={apTip(ap, base)} className={styles.meter} data-testid="ap-pips" data-tip-keep data-ap={ap} data-preview={cost ?? undefined} data-empty={ap === 0 || undefined}>
      <span className={`${styles.value} display tabular`}>
        {after === null ? (
          <b>{ap}</b>
        ) : (
          <>
            <s className={styles.was}>{ap}</s>
            <span className={styles.to}>→</span>
            <b className={after < 0 ? styles.short : undefined}>{Math.max(0, after)}</b>
          </>
        )}{' '}
        <span className={styles.unit}>AP</span>
      </span>
      <span className={styles.capsule} aria-hidden="true">
        {Array.from({ length: cells }, (_, i) => (
          <i key={i} className={styles.cell} data-state={stateOf(i)} />
        ))}
      </span>
    </Tipped>
  );
}

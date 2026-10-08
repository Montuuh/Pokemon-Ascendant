import { getContent } from '@/content/registry';
import { TypeLabel } from '@/ui/components/TypeBadge';
import { moveDefTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './MoveChip.module.css';

/**
 * A move as a chip, with its card on hover (v0.9.6). `active`: in the active four. `fresh`: new to the Pokémon.
 * `struck`: the card being replaced. Inside an element that already reads it out (a radio card), `inCard` takes the
 * chip off the tab order.
 */
export function MoveChip({ id, active, fresh, struck, inCard }: { id: string; active?: boolean; fresh?: boolean; struck?: boolean; inCard?: boolean }) {
  const m = getContent().move(id);
  return (
    <Tipped as="span" tip={moveDefTip(m)} tabIndex={inCard ? -1 : 0} className={[styles.chip, active ? styles.active : '', struck ? styles.struck : ''].join(' ')} data-move={id}>
      <TypeLabel type={m.type} size={12} />
      <span className={styles.chipName}>{m.name}</span>
      {fresh && <span className={styles.fresh} role="img" aria-label="new" />}
    </Tipped>
  );
}

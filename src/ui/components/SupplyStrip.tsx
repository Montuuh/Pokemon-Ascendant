import { getContent } from '@/content/registry';
import { countSupplies } from '@/sim';
import { itemIcon } from '@/ui/art';
import { ballsFoundTip, consumableTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './SupplyStrip.module.css';

// §2.7.2 / §2.9.1 / §2.11.1 — supplies handed over, as one strip: each item's icon with its count, the name and
// the effect one hover away (consumableTip). The reward screen, the nurse and the Center draw the same strip, so a
// Potion ×2 looks the same wherever it came from.

export function SupplyStrip({ ids, balls = 0, testId }: { ids: readonly string[]; balls?: number; testId: string }) {
  const content = getContent();
  const counted = countSupplies(ids);
  if (!counted.length && balls <= 0) return null;
  return (
    <ul className={styles.strip} data-testid={testId} aria-label="Supplies">
      {counted.map(([id, n]) => {
        const def = content.consumable(id);
        return (
          <li key={id}>
            <Tipped tip={consumableTip(def)} className={styles.item} data-testid={`${testId}-${id}`} aria-label={n > 1 ? `${def.name} ×${n}` : def.name}>
              <img src={itemIcon(id)} alt="" width={32} height={32} className={styles.icon} />
              {n > 1 && <span className={styles.count}>×{n}</span>}
            </Tipped>
          </li>
        );
      })}
      {balls > 0 && (
        <li>
          <Tipped tip={ballsFoundTip(balls)} className={styles.item} data-testid={`${testId}-balls`} aria-label={`Poké Ball ×${balls}`}>
            <img src={itemIcon('poke-ball')} alt="" width={32} height={32} className={styles.icon} />
            {balls > 1 && <span className={styles.count}>×{balls}</span>}
          </Tipped>
        </li>
      )}
    </ul>
  );
}

import type { EventOutcome } from '@/sim';
import { itemIcon } from '@/ui/art';
import styles from './EventChoiceLoot.module.css';

/** §2.10.1 — show only named, guaranteed objects. Random supplies/relics and gamble branches stay undisclosed. */
export function EventChoiceLoot({ outcomes }: { outcomes: readonly EventOutcome[] }) {
  const ids = outcomes.flatMap((outcome) => {
    if (outcome.kind === 'consumables') return outcome.ids;
    if (outcome.kind === 'balls') return Array.from({ length: outcome.amount }, () => 'poke-ball');
    if (outcome.kind === 'stone' && outcome.id) return [outcome.id];
    return [];
  });
  if (ids.length === 0) return null;
  return (
    <span className={styles.loot} aria-hidden="true">
      {ids.map((id, index) => (
        <img key={`${id}-${index}`} src={itemIcon(id)} alt="" width={30} height={30} />
      ))}
    </span>
  );
}

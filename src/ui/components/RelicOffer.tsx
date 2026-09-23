import { useState, type ReactNode } from 'react';
import { getContent } from '@/content/registry';
import { ItemCard } from '@/ui/components/ItemCard';
import { InfoDot } from '@/ui/tooltip';
import styles from './RelicOffer.module.css';

// A relic 1-of-N, taken or declined: the Legendary pick at a Gym victory (§7.3.7) and the Challenge Ring's top
// prize (§2.9.4.1). The two differ only in words and in what they dispatch, so they share the page.

export function RelicOffer({
  testId,
  heading,
  headingTip,
  lede,
  header,
  offer,
  onPick,
  ids,
}: {
  testId: string;
  heading: string;
  headingTip: ReactNode;
  lede: string;
  /** Above the heading — the Badge a Gym just paid, for the Legendary pick. */
  header?: ReactNode;
  offer: readonly string[];
  onPick: (relicId: string | null) => void;
  /** Test ids of the offer cards (prefix), the take and the decline buttons. */
  ids: { offer: string; take: string; decline: string };
}) {
  const content = getContent();
  const [pick, setPick] = useState<string | null>(null);

  return (
    <main className={styles.root} data-testid={testId}>
      <div className={`${styles.card} fx-pop`}>
        {header}
        <h1 className={`${styles.title} display`}>
          {heading}
          <InfoDot tip={headingTip} />
        </h1>
        <p className={styles.lede}>{lede}</p>

        <div className={styles.offer}>
          {offer.map((id) => {
            const r = content.relic(id);
            return (
              <ItemCard
                key={id}
                id={id}
                kind="relic"
                name={r.name}
                description={r.description}
                rarity={r.rarity}
                {...(r.pending ? { pending: r.pending } : {})}
                selected={pick === id}
                onClick={() => setPick(pick === id ? null : id)}
                testId={`${ids.offer}${id}`}
                footer={<span className={styles.take}>{pick === id ? 'Taking this one' : 'Take it'}</span>}
              />
            );
          })}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.confirm} disabled={!pick} onClick={() => pick && onPick(pick)} data-testid={ids.take}>
            {pick ? `Take the ${content.relic(pick).name}` : 'Pick one'}
          </button>
          <button type="button" className={styles.decline} onClick={() => onPick(null)} data-testid={ids.decline}>
            Leave them
          </button>
        </div>
      </div>
    </main>
  );
}


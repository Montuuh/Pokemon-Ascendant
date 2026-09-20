import { useState } from 'react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { LEGENDARY_CAP } from '@/sim';
import { ItemCard } from '@/ui/components/ItemCard';
import { InfoDot, Tip } from '@/ui/tooltip';
import styles from './LegendaryScreen.module.css';

// §7.3.7 — the guaranteed 1-of-3 that closes a Gym victory.
//
// It sits between the Gym and the summary on purpose. A choice offered *on* a results screen is a choice
// nobody makes: the run is over, the numbers are up, and the pointer is already on Continue. Here it is the
// last thing the Region asks you, with the Badge still warm.

export function LegendaryScreen() {
  const run = useRunStore((s) => s.run);
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [pick, setPick] = useState<string | null>(null);

  const offer = run?.pendingLegendary ?? [];
  if (!run || offer.length === 0) return null;

  const held = run.relics.filter((id) => content.relic(id).rarity === 'legendary').length;
  const atCap = held >= LEGENDARY_CAP;

  return (
    <main className={styles.root} data-testid="legendary-screen">
      <div className={`${styles.card} fx-pop`}>
        <h1 className={`${styles.title} display`}>
          {atCap ? 'One more, from the Gym' : 'The Gym owes you something'}
          <InfoDot
            tip={
              <Tip
                title="Legendary relics"
                body={atCap ? `You already hold ${LEGENDARY_CAP}, the most anyone carries, so this offer is the tier below.` : 'Never sold and never dropped — the only way to one is a pick like this, at a Gym victory. You hold at most two per run.'}
                footer="Leaving all three is allowed."
              />
            }
          />
        </h1>
        <p className={styles.lede}>{atCap ? 'Three Rare relics. Take one, or none.' : 'Three Legendary relics. Take one, or none.'}</p>

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
                testId={`legendary-offer-${id}`}
                footer={<span className={styles.take}>{pick === id ? 'Taking this one' : 'Take it'}</span>}
              />
            );
          })}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.confirm}
            disabled={!pick}
            onClick={() => pick && dispatch({ type: 'pick-legendary', relicId: pick })}
            data-testid="btn-take-legendary"
          >
            {pick ? `Take the ${content.relic(pick).name}` : 'Pick one'}
          </button>
          <button
            type="button"
            className={styles.decline}
            onClick={() => dispatch({ type: 'pick-legendary', relicId: null })}
            data-testid="btn-decline-legendary"
          >
            Leave them
          </button>
        </div>
      </div>
    </main>
  );
}

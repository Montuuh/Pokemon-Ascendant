import { useState } from 'react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { LEGENDARY_CAP } from '@/sim';
import { ItemCard } from '@/ui/components/ItemCard';
import { nodeBadge } from '@/ui/art';
import { badgeTip } from '@/ui/tips';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
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
  // §5.10 — the Badge this Gym just paid. The run-end summary used to be where it was shown; since v0.7.1 a Gym
  // leads to a City, so this screen is the one moment between the win and the town.
  const won = run.badges.length ? content.badge(run.badges[run.badges.length - 1]!) : null;

  return (
    <main className={styles.root} data-testid="legendary-screen">
      <div className={`${styles.card} fx-pop`}>
        {won && (
          <Tipped tip={badgeTip(won.name, won.description)} className={styles.badge} data-testid="badge-award">
            <img src={nodeBadge(`gym-${won.type}`)} alt="" width={40} height={40} />
            <span className="display">{won.name} earned</span>
          </Tipped>
        )}
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

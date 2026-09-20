import { useState } from 'react';
import { IconDice5, IconDoorExit, IconShoppingBag } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { rerollPrice, type ShopSlot } from '@/sim';
import { ItemCard, type ItemKind, type Rarity } from '@/ui/components/ItemCard';
import { Money, Price } from '@/ui/components/Money';
import { RUN_REJECT_TEXT } from '@/ui/strings';
import styles from './ShopScreen.module.css';
import { Tip, Tipped } from '@/ui/tooltip';

// Poké Mart, §2.9.2 — node-screen chrome (header · shelf · Leave), same shape as the Dojo and the Centre.
//
// The shelf is fixed for the visit: leaving and coming back is not a re-roll (the stock is seeded per visit),
// and a sold slot stays sold through a re-roll. Both of those are §2.9.3 rules the screen has to *show*, not
// just obey — a sold-out row stays on the shelf, greyed, so you can see what your money went on.

const KIND_TAG: Record<ShopSlot['kind'], string> = {
  relic: 'Relic',
  'held-item': 'Held',
  tm: 'TM',
  ball: 'Ball',
  consumable: 'Item',
};

/** Everything a slot needs to become a card. The Shop is the only place that has to translate all five. */
function describe(slot: ShopSlot): { name: string; description: string; kind: ItemKind; rarity?: Rarity; pending?: string } {
  const content = getContent();
  switch (slot.kind) {
    case 'relic': {
      const r = content.relic(slot.id);
      return { name: r.name, description: r.description, kind: 'relic', rarity: r.rarity, ...(r.pending ? { pending: r.pending } : {}) };
    }
    case 'held-item': {
      const i = content.heldItem(slot.id);
      return { name: i.name, description: i.description, kind: 'held-item', ...(i.pending ? { pending: i.pending } : {}) };
    }
    case 'tm': {
      const t = content.tm(slot.id);
      return { name: t.name, description: t.description, kind: 'tm' };
    }
    case 'ball':
      return { name: 'Poké Ball', description: 'One more throw at a wild Pokémon. Balls are spent on the throw, not the catch.', kind: 'ball' };
    case 'consumable': {
      const c = content.consumable(slot.id);
      return { name: c.name, description: c.description, kind: 'consumable' };
    }
  }
}

export function ShopScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const [toast, setToast] = useState<string | null>(null);

  const stock = run.pendingShop;
  const reroll = stock ? rerollPrice(stock) : null;

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  const unsold = stock?.slots.filter((s) => !s.sold).length ?? 0;

  return (
    <main className={styles.root} data-testid="shop-screen">
      <header className={styles.topBar}>
        <div>
          <h1 className={`${styles.title} display`}>
            <IconShoppingBag size={26} /> Poké Mart
          </h1>
          <p className={styles.sub}>
            One shelf, this visit only. What you leave here you cannot come back for — the next Mart is a
            Region away.
          </p>
        </div>
        <span className={styles.wallet} data-testid="shop-money">
          <Money amount={run.money} size={18} />
          <span className={styles.walletLabel}>in hand</span>
        </span>
      </header>

      <div className={styles.shelf} role="list" aria-label="On the shelf">
        {stock?.slots.map((slot, index) => {
          const d = describe(slot);
          const affordable = run.money >= slot.price;
          return (
            <div role="listitem" key={`${slot.kind}-${slot.id}-${index}`}>
              <ItemCard
                id={slot.id}
                kind={d.kind}
                name={d.name}
                description={d.description}
                {...(d.rarity ? { rarity: d.rarity } : {})}
                {...(d.pending ? { pending: d.pending } : {})}
                tag={KIND_TAG[slot.kind]}
                dim={slot.sold}
                disabled={slot.sold || !affordable}
                onClick={() => act({ type: 'buy', index })}
                testId={`shop-slot-${index}`}
                footer={
                  slot.sold ? (
                    <span className={styles.sold} data-testid={`shop-sold-${index}`}>
                      Sold
                    </span>
                  ) : (
                    <Price amount={slot.price} affordable={affordable} />
                  )
                }
              />
            </div>
          );
        })}
      </div>

      <footer className={styles.footer}>
        {toast && (
          <p className={styles.toast} role="status" data-testid="shop-toast">
            {toast}
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {run.log.slice(-1).join(' ')}
        </p>

        <div className={styles.actions}>
          {/* §2.9.3 — the ladder is 25 → 50 → 100 and it is on the button, so the third re-roll is a decision
              and not a surprise. A sold slot is not re-rolled: you keep what you bought. */}
          <Tipped
            as="button"
            type="button"
            tip={<Tip title="Re-roll" meta={['25 · 50 · 100 ₽', 'Three per visit']} body={reroll === null ? 'Three re-rolls is the limit for this visit.' : unsold === 0 ? 'Nothing left to re-roll — you bought the shelf.' : `Re-rolls the ${unsold} unsold slot${unsold === 1 ? '' : 's'}. What you already bought stays yours.`} />}
            className={styles.reroll}
            disabled={reroll === null || run.money < reroll || unsold === 0}
            onClick={() => act({ type: 'reroll-shop' })}
            data-testid="btn-reroll"
          >
            <IconDice5 size={18} />
            {reroll === null ? 'No re-rolls left' : <>Re-roll the shelf <Price amount={reroll} affordable={run.money >= reroll} /></>}
          </Tipped>

          <button type="button" className={styles.leave} onClick={() => act({ type: 'leave-shop' })} data-testid="btn-leave-shop">
            <IconDoorExit size={18} /> Back to the route
          </button>
        </div>
      </footer>
    </main>
  );
}

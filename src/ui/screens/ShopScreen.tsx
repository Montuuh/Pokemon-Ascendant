import { useState } from 'react';
import { IconBackpack, IconBuildingStore, IconCoins, IconDice5, IconDoorExit, IconShoppingBag } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { CITIES, PRICES, rerollPrice, sellPrice, type ShopSlot } from '@/sim';
import { itemIcon } from '@/ui/art';
import { ItemCard, type ItemKind, type Rarity } from '@/ui/components/ItemCard';
import { Money, Price } from '@/ui/components/Money';
import { RUN_REJECT_TEXT } from '@/ui/strings';
import styles from './ShopScreen.module.css';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { heldItemSellTip, sellTip, shopTip } from '@/ui/tips';

// The shop, two ways (header · shelf · Leave): the route's travelling merchant (§2.9.2) and a City's Poké Mart or
// Department Store (§2.11.2). The shelf is the sim's; the screen only names which one you are standing at.
//
// A sold slot stays sold through a re-roll, and in a City it stays sold across visits (§2.11.0). Both are rules
// the screen has to *show*, not just obey — a sold-out row stays on the shelf, greyed, so you can see what your
// money went on. Only a City shop buys held items back (§2.11.2.4), so only a City shop shows the counter.

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
      return {
        name: slot.qty && slot.qty > 1 ? `Poké Ball ×${slot.qty}` : 'Poké Ball',
        description: slot.qty && slot.qty > 1 ? `${slot.qty} more throws at wild Pokémon.` : 'One more throw at a wild Pokémon.',
        kind: 'ball',
      };
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
  const city = run.city ? CITIES[run.city.id] : null;
  const title = !city ? 'Travelling merchant' : city.shop === 'department-store' ? 'Department Store' : 'Poké Mart';
  const TitleIcon = !city ? IconBackpack : city.shop === 'department-store' ? IconBuildingStore : IconShoppingBag;
  // §2.9.3 — the ladder this shop climbs: one rung for the merchant, all three in a City.
  const ladder = PRICES.rerolls.slice(0, stock?.maxRerolls ?? PRICES.rerolls.length);
  const heldInBag = run.bag;

  return (
    <main className={styles.root} data-testid="shop-screen">
      <header className={styles.topBar}>
        <div>
          <h1 className={`${styles.title} display`}>
            <TitleIcon size={26} /> {title}
          </h1>
          <p className={styles.sub}>
            {city ? 'The shelf waits while you are in town.' : 'One cart, this visit only.'}
            <InfoDot tip={shopTip(title, !!city)} />
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

      {city && heldInBag.length > 0 && (
        <section className={styles.sell} aria-label="Sell held items" data-testid="shop-sell">
          <h2 className={styles.sellTitle}>
            <IconCoins size={18} /> Sell
            <InfoDot tip={sellTip()} />
          </h2>
          <ul className={styles.sellList}>
            {heldInBag.map((id, i) => {
              const item = getContent().heldItem(id);
              return (
                <li key={`${id}-${i}`}>
                  <Tipped as="button" type="button" tip={heldItemSellTip(id)} className={styles.sellBtn} onClick={() => act({ type: 'sell-item', itemId: id })} data-testid={`sell-${id}`} aria-label={`Sell ${item.name} for ${sellPrice()} Poké Dollars`}>
                    <img src={itemIcon(id)} alt="" width={24} height={24} />
                    {item.name}
                    <Price amount={sellPrice()} affordable />
                  </Tipped>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
            tip={<Tip title="Re-roll" meta={[`${ladder.join(' · ')} ₽`, ladder.length === 1 ? 'One per visit' : `${ladder.length} per visit`]} body={reroll === null ? 'No re-rolls left this visit.' : unsold === 0 ? 'Nothing left to re-roll — you bought the shelf.' : `Re-rolls the ${unsold} unsold slot${unsold === 1 ? '' : 's'}. What you already bought stays yours.`} />}
            className={styles.reroll}
            disabled={reroll === null || run.money < reroll || unsold === 0}
            onClick={() => act({ type: 'reroll-shop' })}
            data-testid="btn-reroll"
          >
            <IconDice5 size={18} />
            {reroll === null ? 'No re-rolls left' : <>Re-roll the shelf <Price amount={reroll} affordable={run.money >= reroll} /></>}
          </Tipped>

          <button type="button" className={styles.leave} onClick={() => act({ type: 'leave-shop' })} data-testid="btn-leave-shop">
            <IconDoorExit size={18} /> {city ? 'Back to town' : 'Back to the route'}
          </button>
        </div>
      </footer>
    </main>
  );
}

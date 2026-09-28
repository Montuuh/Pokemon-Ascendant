import { useState } from 'react';
import { Tabs } from 'radix-ui';
import { IconBackpack, IconBuildingStore, IconCoins, IconDice5, IconShoppingBag } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { CITIES, PRICES, STORE_FLOORS, floorRestockable, rerollPrice, sellPrice, type ShopSlot, type StoreFloor } from '@/sim';
import { itemIcon } from '@/ui/art';
import { ItemCard, type ItemKind, type Rarity } from '@/ui/components/ItemCard';
import { Money, Price } from '@/ui/components/Money';
import { RUN_REJECT_TEXT, SHELF_LABEL, SHOP_TEXT, STORE_FLOOR_LABEL } from '@/ui/strings';
import { BackButton } from '@/ui/components/BackButton';
import styles from './ShopScreen.module.css';
import { InfoDot, Tipped } from '@/ui/tooltip';
import { floorTip, heldItemSellTip, rerollTip, sellTip, shelfTip, shopExitTip, shopTip } from '@/ui/tips';
import { MART, STORE, shelfOf, type Room, type ShelfId } from './shop/rooms';
import { ShopRoom } from './shop/ShopRoom';

// The shop, two ways (back · header · shop): the route's travelling merchant (§2.9.2), a cart with its cards on one
// shelf, and a City's Poké Mart or Department Store (§2.11.2), which is the room itself — the Mart, or the store's
// floor on screen, as FireRed / LeafGreen drew them, every piece of furniture a shelf you press (`shop/ShopRoom`).
// The shelf pressed opens beside the room with its cards, so the room stays in view. The clerk behind the counter
// sells everything — the whole Mart, or the whole floor, shelf by shelf with the Poké Balls — and buys held items
// back; their list is what the room opens on. What is on sale is the sim's; the screen only places it.
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
  stone: 'Stone',
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
    case 'stone': {
      const st = content.evolutionItem(slot.id);
      return { name: st.name, description: st.description, kind: 'stone' };
    }
  }
}

export function ShopScreen() {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const [toast, setToast] = useState<string | null>(null);
  /** §2.11.2 — the Department Store floor on screen. */
  const [floor, setFloor] = useState<StoreFloor>('consumables');
  /** §2.11.2 — the shelf pressed in the room on screen; null until one is, when the first stocked shelf shows. */
  const [picked, setPicked] = useState<ShelfId | null>(null);
  /** The clerk's two jobs, on two tabs: selling you everything, and buying held items back. */
  const [deal, setDeal] = useState<'buy' | 'sell'>('buy');

  const stock = run.pendingShop;
  const reroll = stock ? rerollPrice(stock) : null;

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
    }
  }

  const city = run.city ? CITIES[run.city.id] : null;
  const store = city?.shop === 'department-store';
  // In the store a re-roll restocks the floor on screen; everywhere else, the whole shelf.
  const unsold = stock?.slots.filter((s) => !s.sold && (!store || s.floor === floor)).length ?? 0;
  // §2.11.2 — a floor with nothing else in its pool is not charged for the same shelf (the sim refuses it too).
  const restockable = !store || floorRestockable(run, floor, getContent());
  const title = !city ? 'Travelling merchant' : city.shop === 'department-store' ? 'Department Store' : 'Poké Mart';
  const TitleIcon = !city ? IconBackpack : city.shop === 'department-store' ? IconBuildingStore : IconShoppingBag;
  // §2.9.3 — the ladder this shop climbs: one rung for the merchant, all three in a City.
  const ladder = PRICES.rerolls.slice(0, stock?.maxRerolls ?? PRICES.rerolls.length);
  const heldInBag = run.bag;
  const leaveLabel = city ? SHOP_TEXT.backToTown : SHOP_TEXT.backToRoute;
  const leave = () => act({ type: 'leave-shop' });
  const content = getContent();

  // The room on screen and where every slot of it sits, by index into the stock so a card buys the right slot.
  const room: Room | null = !city ? null : store ? STORE[floor] : MART;
  const placed = (stock?.slots ?? []).map((slot, index) => ({ slot, index })).filter(({ slot }) => !store || slot.floor === floor);
  const onShelf = (id: ShelfId) => (room ? placed.filter(({ slot }) => shelfOf(room, slot, content) === id) : []);
  const counts: Record<string, number> = {};
  for (const shelf of room?.shelves ?? []) counts[shelf.id] = (shelf.id === 'clerk' ? placed : onShelf(shelf.id)).filter(({ slot }) => !slot.sold).length;
  // The clerk's list is where a room opens: everything it sells, before any one shelf is pressed.
  const shelf = room ? (room.shelves.find((s) => s.id === (picked ?? 'clerk')) ?? room.shelves[0]!) : null;
  // The clerk's list, shelf by shelf in the room's order, the Poké Balls (the clerk's own) last. A slot no shelf
  // holds falls to the clerk too; only the balls are titled as balls, anything else goes in an untitled group.
  const clerkGroups = (room?.shelves ?? [])
    .filter((s) => s.id !== 'clerk')
    .map((s) => ({ key: s.id as string, label: SHELF_LABEL[s.id] as string | null, items: onShelf(s.id) }))
    .concat([
      { key: 'balls', label: SHOP_TEXT.balls, items: onShelf('clerk').filter(({ slot }) => slot.kind === 'ball') },
      { key: 'other', label: null, items: onShelf('clerk').filter(({ slot }) => slot.kind !== 'ball') },
    ])
    .filter((g) => g.items.length > 0);

  /** §2.11.2.4 — the clerk's buy-back: every held item in the bag, at the sell price. */
  const sellSection = (
    <section className={styles.sell} aria-label="Sell held items" data-testid="shop-sell">
      <p className={styles.sellTitle}>
        {SHOP_TEXT.sellLede}
        <InfoDot tip={sellTip()} />
      </p>
      {heldInBag.length === 0 ? (
        <p className={styles.empty}>{SHOP_TEXT.nothingToSell}</p>
      ) : (
        <ul className={styles.sellList}>
          {heldInBag.map((id, i) => {
            const item = content.heldItem(id);
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
      )}
    </section>
  );

  /** One slot as a card. Its index is the stock's, so a floor's card buys the right slot. */
  function renderSlot(slot: ShopSlot, index: number) {
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
  }

  return (
    <main className={styles.root} data-testid="shop-screen">
      <header className={styles.topBar}>
        {/* The way back sits in the corner, out of the shop's way: an arrow, named on hover. The room's door is the
            same way out (`ShopRoom`'s doormat or stairs). */}
        <BackButton label={leaveLabel} onClick={leave} testId="btn-leave-shop" tip={shopExitTip(leaveLabel, !!city)} />
        <div className={styles.heading}>
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

      {room && shelf ? (
        <div className={styles.hall}>
          {store && (
            // §2.11.2 — the Department Store's lift: one floor per category, each its own room.
            <Tabs.Root value={floor} onValueChange={(v) => { setFloor(v as StoreFloor); setPicked(null); }} data-testid="store-floors">
              <Tabs.List className={styles.floors} aria-label="Floors">
                {STORE_FLOORS.map((f, i) => {
                  const count = stock?.slots.filter((s) => s.floor === f && !s.sold).length ?? 0;
                  return (
                    <Tabs.Trigger key={f} value={f} className={styles.floor} data-testid={`floor-${f}`} asChild>
                      <Tipped as="button" type="button" tip={floorTip(STORE_FLOOR_LABEL[f] ?? f, count)}>
                        <span className={styles.floorNo}>{i + 1}F</span> {STORE_FLOOR_LABEL[f]}
                      </Tipped>
                    </Tabs.Trigger>
                  );
                })}
              </Tabs.List>
            </Tabs.Root>
          )}
          <div className={styles.aisle}>
            <ShopRoom room={room} counts={counts} chosen={shelf.id} onChoose={setPicked} onExit={leave} exitLabel={leaveLabel} label={store ? `${title}, ${STORE_FLOOR_LABEL[floor]}` : title} />

            {/* The shelf pressed: its cards; at the clerk, everything in one list, and the buy-back on its own tab. */}
            <section className={styles.panel} aria-label={SHELF_LABEL[shelf.id]} data-testid="shelf-panel" data-shelf={shelf.id}>
              <h2 className={styles.panelTitle}>
                {SHELF_LABEL[shelf.id]}
                <InfoDot tip={shelfTip(shelf.id, counts[shelf.id] ?? 0)} />
              </h2>
              {shelf.id === 'clerk' ? (
                <Tabs.Root value={deal} onValueChange={(v) => setDeal(v as 'buy' | 'sell')} className={styles.deal}>
                  <Tabs.List className={styles.dealTabs} aria-label={SHOP_TEXT.clerkTabs}>
                    <Tabs.Trigger value="buy" className={styles.floor} data-testid="clerk-buy">
                      <IconShoppingBag size={16} aria-hidden="true" /> {SHOP_TEXT.buy}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="sell" className={styles.floor} data-testid="clerk-sell">
                      <IconCoins size={16} aria-hidden="true" /> {SHOP_TEXT.sell}
                    </Tabs.Trigger>
                  </Tabs.List>
                  <Tabs.Content value="buy" className={styles.dealPanel}>
                    {clerkGroups.length === 0 && <p className={styles.empty}>{SHOP_TEXT.emptyShelf}</p>}
                    {clerkGroups.map((g) => (
                      <div key={g.key} className={styles.group}>
                        {g.label && <h3 className={styles.groupTitle} id={`group-${g.key}`}>{g.label}</h3>}
                        <div className={styles.cards} role="list" {...(g.label ? { 'aria-labelledby': `group-${g.key}` } : { 'aria-label': SHELF_LABEL.clerk })}>
                          {g.items.map(({ slot, index }) => renderSlot(slot, index))}
                        </div>
                      </div>
                    ))}
                  </Tabs.Content>
                  <Tabs.Content value="sell" className={styles.dealPanel}>
                    {sellSection}
                  </Tabs.Content>
                </Tabs.Root>
              ) : onShelf(shelf.id).length > 0 ? (
                <div className={styles.cards} role="list" aria-label={SHELF_LABEL[shelf.id]}>
                  {onShelf(shelf.id).map(({ slot, index }) => renderSlot(slot, index))}
                </div>
              ) : (
                <p className={styles.empty}>{SHOP_TEXT.emptyShelf}</p>
              )}

            </section>
          </div>
        </div>
      ) : (
        <div className={styles.shelf} role="list" aria-label="On the shelf">
          {stock?.slots.map((slot, index) => renderSlot(slot, index))}
        </div>
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
            tip={rerollTip(ladder, reroll, unsold, restockable, store)}
            className={styles.reroll}
            disabled={reroll === null || run.money < reroll || unsold === 0 || !restockable}
            onClick={() => act(store ? { type: 'reroll-shop', floor } : { type: 'reroll-shop' })}
            data-testid="btn-reroll"
          >
            <IconDice5 size={18} />
            {reroll === null ? 'No re-rolls left' : <>{store ? 'Re-roll this floor' : 'Re-roll the shelf'} <Price amount={reroll} affordable={run.money >= reroll} /></>}
          </Tipped>
        </div>
      </footer>
    </main>
  );
}

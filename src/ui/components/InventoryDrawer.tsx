import { useState } from 'react';
import { IconBackpack, IconCircleCheck, IconX } from '@tabler/icons-react';
import { useRunStore } from '@/app/runStore';
import { getContent } from '@/content/registry';
import { itemIcon } from '@/ui/art';
import { ItemCard } from '@/ui/components/ItemCard';
import { MonIcon } from '@/ui/components/MonIcon';
import { Modal } from '@/ui/components/Modal';
import { RUN_REJECT_TEXT } from '@/ui/strings';
import styles from './InventoryDrawer.module.css';

// Everything the run is carrying, in one drawer (§7.2–§7.5). Reachable from the Map View, because that is
// the only place §7.4.1 lets the loadout change: the item locks with the Active Team when a node is entered.
//
// Three sections, in the order they matter:
//   Relics     run-long, uncapped, nothing to decide — they are shown, not managed.
//   Held Items one slot each, and the *only* thing on this screen you can change. Bag ↔ Pokémon.
//   Bag        consumables and TMs, counted. Consumables become cards inside a fight (§3.5), not here.

type Tab = 'relics' | 'items' | 'bag';

export function InventoryDrawer({ onClose }: { onClose: () => void }) {
  const run = useRunStore((s) => s.run)!;
  const dispatch = useRunStore((s) => s.dispatch);
  const content = getContent();
  const [tab, setTab] = useState<Tab>(run.relics.length ? 'relics' : 'items');
  const [equipping, setEquipping] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function act(action: Parameters<typeof dispatch>[0]) {
    if (!dispatch(action)) {
      setToast(RUN_REJECT_TEXT[useRunStore.getState().lastRejected?.reason ?? ''] ?? 'Not now.');
      window.setTimeout(() => setToast(null), 2600);
      return false;
    }
    return true;
  }

  const wearers = run.box.filter((m) => m.heldItem);
  const counts = run.consumables.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'relics', label: 'Relics', count: run.relics.length },
    { id: 'items', label: 'Held Items', count: run.bag.length + wearers.length },
    { id: 'bag', label: 'Bag', count: run.consumables.length + run.tms.length },
  ];

  return (
    <Modal title="What you are carrying" size="reading" testId="inventory-modal">
      <div className={styles.root} data-testid="inventory-drawer">
        {/* §7.4.1 in the player's words. A section number is how *we* find the rule; it tells a player
            nothing, and this is the only string in the UI that was leaking one. */}
        <p className={styles.lede}>
          <IconBackpack size={16} /> Held Items move here and nowhere else — the loadout locks with your team
          the moment you step into a node.
        </p>

        <div className={styles.tabs} role="tablist" aria-label="Inventory sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`}
              onClick={() => setTab(t.id)}
              data-testid={`inv-tab-${t.id}`}
            >
              {t.label} <b className="tabular">{t.count}</b>
            </button>
          ))}
        </div>

        <div className={styles.panel} role="tabpanel">
          {tab === 'relics' && (
            run.relics.length === 0 ? (
              <p className={styles.empty}>
                No relics yet. Trainers drop them, Elites and the Gym hand one over outright, and the Poké Mart
                always has two on the shelf.
              </p>
            ) : (
              <div className={styles.grid}>
                {run.relics.map((id) => {
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
                      testId={`relic-${id}`}
                    />
                  );
                })}
              </div>
            )
          )}

          {tab === 'items' && (
            <div className={styles.items}>
              <h3 className={styles.sub}>Worn</h3>
              {wearers.length === 0 ? (
                <p className={styles.empty}>Nobody is holding anything.</p>
              ) : (
                <ul className={styles.worn}>
                  {wearers.map((mon) => {
                    const item = content.heldItem(mon.heldItem!);
                    return (
                      <li key={mon.uid} className={styles.wornRow}>
                        <MonIcon speciesId={mon.speciesId} size={36} />
                        <span className={styles.wornBody}>
                          <b>{content.species(mon.speciesId).name}</b>
                          <span className={styles.wornItem}>
                            <img src={itemIcon(item.id)} alt="" width={20} height={20} /> {item.name}
                          </span>
                        </span>
                        <button
                          type="button"
                          className={styles.takeOff}
                          onClick={() => act({ type: 'equip-item', uid: mon.uid, itemId: null })}
                          data-testid={`unequip-${mon.speciesId}`}
                        >
                          Take off
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <h3 className={styles.sub}>In the bag</h3>
              {run.bag.length === 0 ? (
                <p className={styles.empty}>
                  Nothing spare. A Trainer drops a Held Item one time in five, and the Mart sometimes stocks one.
                </p>
              ) : (
                <div className={styles.grid}>
                  {run.bag.map((id, i) => {
                    const item = content.heldItem(id);
                    const open = equipping === `${id}-${i}`;
                    return (
                      <div key={`${id}-${i}`} className={styles.baggedWrap}>
                        <ItemCard
                          id={id}
                          kind="held-item"
                          name={item.name}
                          description={item.description}
                          {...(item.pending ? { pending: item.pending } : {})}
                          selected={open}
                          onClick={() => setEquipping(open ? null : `${id}-${i}`)}
                          testId={`bagged-${id}`}
                          footer={<span className={styles.hint}>{open ? 'Pick a wearer ↓' : 'Equip…'}</span>}
                        />
                        {open && (
                          <ul className={styles.wearers}>
                            {run.box.map((mon) => {
                              const locked = !!item.speciesLock && item.speciesLock !== mon.speciesId;
                              const busy = !!mon.heldItem;
                              return (
                                <li key={mon.uid}>
                                  <button
                                    type="button"
                                    className={styles.wearer}
                                    disabled={locked}
                                    onClick={() => {
                                      if (act({ type: 'equip-item', uid: mon.uid, itemId: id })) setEquipping(null);
                                    }}
                                    data-testid={`equip-${id}-${mon.speciesId}`}
                                    title={
                                      locked
                                        ? `${item.name} only fits ${content.species(item.speciesLock!).name}.`
                                        : busy
                                          ? `Swaps with ${content.heldItem(mon.heldItem!).name}, which goes back in the bag.`
                                          : `Give it to ${content.species(mon.speciesId).name}.`
                                    }
                                  >
                                    <MonIcon speciesId={mon.speciesId} size={28} />
                                    <span>{content.species(mon.speciesId).name}</span>
                                    {busy && <span className={styles.swapNote}>swaps</span>}
                                    {!busy && !locked && <IconCircleCheck size={15} />}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'bag' && (
            <div className={styles.grid}>
              {Object.entries(counts).map(([id, n]) => {
                const c = content.consumable(id);
                return (
                  <ItemCard
                    key={id}
                    id={id}
                    kind="consumable"
                    name={c.name}
                    description={c.description}
                    tag={`×${n}`}
                    testId={`bag-${id}`}
                  />
                );
              })}
              {run.tms.map((id, i) => {
                const t = content.tm(id);
                return (
                  <ItemCard key={`${id}-${i}`} id={id} kind="tm" name={t.name} description={t.description} tag="TM" testId={`bag-${id}`} />
                );
              })}
              {run.consumables.length + run.tms.length === 0 && <p className={styles.empty}>The bag is empty.</p>}
            </div>
          )}
        </div>

        {toast && (
          <p className={styles.toast} role="status" data-testid="inventory-toast">
            {toast}
          </p>
        )}

        <button type="button" className={styles.close} onClick={onClose} data-testid="btn-close-inventory">
          <IconX size={16} /> Close
        </button>
      </div>
    </Modal>
  );
}

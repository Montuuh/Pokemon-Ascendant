import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { IconCheck, IconHelpHexagon, IconNotebook, IconPackage, IconPin, IconPinFilled } from '@tabler/icons-react';
import { Progress, Tabs } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import {
  JOURNAL_SHELVES, PIN_LIMIT, VAULT, cosmeticById, journalEntries, levelFor, parcelChoicesFor, parcelCost, parcelOffer, parcelPool, vaultCard,
  type JournalEntry, type VaultEntry,
} from '@/sim';
import { ItemCard, type ItemKind } from '@/ui/components/ItemCard';
import { MedalIcon } from '@/ui/components/MedalIcon';
import { itemIcon } from '@/ui/art';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { journalEntryTip, journalShelfTip, journalTip, pinTip, researchTip } from '@/ui/tips';
import { JOURNEY_TEXT } from '@/ui/strings';
import hub from './Hub.module.css';
import styles from './Journey.module.css';

// §8.6.2, §8.7 — Professor Oak's aide: the parcels that open the vault, and the Trainer Journal.
//
// Two tabs because they are two questions: "what did the last run bring me?" (a parcel — three cards, take one)
// and "what am I chasing?" (the Journal — a tile per deed, the three you have pinned on top). The parcel is the
// one place the account's progress is a choice with a face, so its cards are the same cards a run draws. A Journal
// tile is an icon, a name and a bar; the deed and its prize are its bubble.

const CARD_KIND: Record<VaultEntry['kind'], ItemKind | null> = { relic: 'relic', consumable: 'consumable', held: 'held-item', tm: 'tm', event: null };

/** The plate over a card's icon: one word, the kind. */
const SHORT_KIND: Record<VaultEntry['kind'], string> = { relic: 'Relic', consumable: 'Item', held: 'Held', tm: 'TM', event: 'Mystery' };

function ParcelCard({ entry, onTake }: { entry: VaultEntry; onTake: () => void }) {
  const content = getContent();
  const card = vaultCard(entry, content);
  const kind = CARD_KIND[entry.kind];
  const footer = <span className={styles.take}>{JOURNEY_TEXT.parcel.take}</span>;
  if (kind) {
    const rarity = entry.kind === 'relic' ? content.relic(entry.ids[0]!).rarity : undefined;
    return <ItemCard id={entry.ids[0]!} kind={kind} name={card.name} description={card.description} {...(rarity ? { rarity } : {})} tag={SHORT_KIND[entry.kind]} onClick={onTake} testId={`parcel-card-${entry.id}`} footer={footer} />;
  }
  // A Mystery event has no item art: a card of its own, the same size, the question mark the map draws.
  return (
    <Tipped as="button" type="button" tip={<Tip title={card.name} meta={[card.kind]} body={card.description} />} className={styles.eventCard} onClick={onTake} data-testid={`parcel-card-${entry.id}`}>
      <IconHelpHexagon size={44} stroke={1.6} aria-hidden="true" />
      <span className={`${styles.eventName} display`}>{card.name}</span>
      <span className={styles.eventKind}>{card.kind}</span>
      {footer}
    </Tipped>
  );
}

/**
 * §8.6.2 — the parcel on the table: its cards, one to take. The aide's tab and the Field Report both show this.
 *
 * Taking a card puts the next parcel behind a button rather than under the cursor: three new cards appearing where
 * the old ones were would let a double click spend a second parcel unread. In a sheet (`inSheet`) the cards hold
 * one row, and an empty table says nothing — the sheet's own button closes it.
 */
export function ParcelOffer({ inSheet = false }: { inSheet?: boolean }) {
  const account = useAccountStore((s) => s.account);
  const openParcel = useAccountStore((s) => s.openParcel);
  const content = getContent();
  const [taken, setTaken] = useState<string | null>(null);
  const offer = account.parcels > 0 && !taken ? parcelOffer(account, parcelChoicesFor(levelFor(account.xp))) : [];
  const take = (entry: VaultEntry) => {
    openParcel(entry.id);
    setTaken(vaultCard(entry, content).name);
  };
  return (
    <>
      {taken && (
        <div className={styles.notice} role="status" data-testid="parcel-notice">
          <span>{JOURNEY_TEXT.parcel.added(taken)}</span>
          {account.parcels > 0 && (
            <button type="button" className={styles.next} onClick={() => setTaken(null)} data-testid="btn-next-parcel">
              {JOURNEY_TEXT.parcel.next(account.parcels)}
            </button>
          )}
        </div>
      )}
      {offer.length > 0 ? (
        <section className={styles.offer} data-testid="parcel-offer" data-waiting={account.parcels}>
          <h2 className={`${styles.offerTitle} display`}>
            <IconPackage size={22} aria-hidden="true" /> {JOURNEY_TEXT.parcel.title}
            {account.parcels > 1 && <span className={`${styles.waiting} tabular`}>{JOURNEY_TEXT.parcel.more(account.parcels - 1)}</span>}
          </h2>
          <div className={styles.cards} data-row={inSheet} style={{ '--cards': offer.length } as CSSProperties}>
            {offer.map((entry) => <ParcelCard key={entry.id} entry={entry} onTake={() => take(entry)} />)}
          </div>
        </section>
      ) : (
        !inSheet && account.parcels === 0 && (
          <p className={styles.empty} data-testid="parcel-empty">
            <IconPackage size={28} stroke={1.5} aria-hidden="true" />
            {parcelPool(account).length === 0 ? JOURNEY_TEXT.parcel.vaultEmpty : JOURNEY_TEXT.parcel.none}
          </p>
        )
      )}
    </>
  );
}

function Parcels() {
  const account = useAccountStore((s) => s.account);
  const cost = parcelCost(account.parcelsEarned);
  const pct = Math.min(100, Math.round((account.research / cost) * 100));

  return (
    <div className={styles.parcels}>
      <div className={styles.research}>
        <span className={`${styles.researchLabel} display`}>
          {JOURNEY_TEXT.research}
          <InfoDot tip={researchTip()} />
        </span>
        <Progress.Root className={styles.researchBar} value={pct} aria-label={`${account.research} of ${cost} Research`}>
          <Progress.Indicator className={styles.researchFill} style={{ width: `${pct}%` }} />
        </Progress.Root>
        <span className={`${styles.researchText} tabular`}>{account.research} / {cost}</span>
        <span className={`${styles.vaultCount} tabular`} data-testid="vault-count">{JOURNEY_TEXT.vault(account.unlocks.length, VAULT.length)}</span>
      </div>

      <ParcelOffer />
    </div>
  );
}

function EntryTile({ entry, canPin, onPin }: { entry: JournalEntry; canPin: boolean; onPin: (on: boolean) => void }) {
  const pct = Math.round((entry.have / entry.goal) * 100);
  const testId = entry.id.startsWith('note:') ? `note-${entry.id.slice(5)}` : `achievement-${entry.id}`;
  return (
    <li className={styles.entry} data-testid={testId} data-done={entry.done} data-pinned={entry.pinned}>
      <Tipped tip={journalEntryTip(entry)} className={styles.entryFace} tabIndex={0}>
        {/* A deed's medal in its tier's colour; a Field Note is the relic that carries it, a silhouette until written. */}
        <span className={styles.entryIcon} aria-hidden="true">
          {entry.tier ? <MedalIcon tier={entry.tier} size={28} /> : entry.id.startsWith('note:') ? <img src={itemIcon(entry.id.slice(5))} alt="" width={28} height={28} className={`pixel ${styles.noteArt}`} /> : <IconNotebook size={26} stroke={1.6} />}
        </span>
        <span className={styles.entryBody}>
          <span className={`${styles.entryName} display`}>{entry.name}</span>
          {entry.done ? (
            <span className={styles.entryDone}><IconCheck size={14} stroke={3} aria-hidden="true" /> {JOURNEY_TEXT.journal.done}</span>
          ) : (
            <Progress.Root className={styles.entryBar} value={pct} aria-label={`${entry.have} of ${entry.goal}`}>
              <Progress.Indicator className={styles.entryFill} style={{ width: `${pct}%` }} />
            </Progress.Root>
          )}
        </span>
        {!entry.done && entry.goal > 1 && <span className={`${styles.entryCount} tabular`}>{entry.have} / {entry.goal}</span>}
      </Tipped>
      {!entry.done && (
        <Tipped
          as="button"
          type="button"
          tip={pinTip(entry.pinned, canPin)}
          className={`${styles.pin} ${entry.pinned ? styles.pinOn : ''}`}
          onClick={() => onPin(!entry.pinned)}
          aria-pressed={entry.pinned}
          aria-disabled={!entry.pinned && !canPin}
          aria-label={entry.pinned ? JOURNEY_TEXT.journal.unpin(entry.name) : JOURNEY_TEXT.journal.pin(entry.name)}
          data-testid={`pin-${entry.id}`}
          data-pin={entry.id}
        >
          {entry.pinned ? <IconPinFilled size={18} aria-hidden="true" /> : <IconPin size={18} aria-hidden="true" />}
        </Tipped>
      )}
    </li>
  );
}

function Journal() {
  const account = useAccountStore((s) => s.account);
  const pin = useAccountStore((s) => s.pin);
  const entries = journalEntries(account, getContent(), (id) => cosmeticById(id)?.name ?? id);
  const canPin = account.pins.length < PIN_LIMIT;
  const pinned = entries.filter((e) => e.pinned && !e.done);
  // A pin moves its tile to another list, which unmounts the button under the keyboard: the focus follows the tile.
  const box = useRef<HTMLDivElement>(null);
  const moved = useRef<string | null>(null);
  useEffect(() => {
    if (!moved.current) return;
    box.current?.querySelector<HTMLElement>(`[data-pin="${moved.current}"]`)?.focus();
    moved.current = null;
  }, [account.pins]);
  const tile = (e: JournalEntry) => (
    <EntryTile
      key={e.id}
      entry={e}
      canPin={canPin}
      onPin={(on) => {
        if (on && !canPin) return;
        moved.current = e.id;
        pin(e.id, on);
      }}
    />
  );
  return (
    <div className={hub.medals} ref={box}>
      {/* §8.7.2 — what you are chasing sits on top: the three pins. */}
      <div className={hub.group}>
        <h2 className={hub.groupTitle}>
          {JOURNEY_TEXT.journal.pinned} <span className={`${hub.muted} tabular`}>{pinned.length} / {PIN_LIMIT}</span>
          <InfoDot tip={journalTip()} />
        </h2>
        {pinned.length > 0 ? <ul className={styles.entries}>{pinned.map(tile)}</ul> : <p className={styles.none}>{JOURNEY_TEXT.journal.noPins}</p>}
      </div>
      {JOURNAL_SHELVES.map((shelf) => {
        const rows = entries.filter((e) => e.shelf === shelf.id);
        const open = rows.filter((e) => !(e.pinned && !e.done));
        return (
          <div key={shelf.id} className={hub.group}>
            <h2 className={hub.groupTitle}>
              {shelf.name} <span className={`${hub.muted} tabular`}>{rows.filter((e) => e.done).length} / {rows.length}</span>
              <InfoDot tip={journalShelfTip(shelf.name, shelf.about)} />
            </h2>
            <ul className={styles.entries}>{open.map(tile)}</ul>
          </div>
        );
      })}
    </div>
  );
}

export function OakAide() {
  const account = useAccountStore((s) => s.account);
  const entries = journalEntries(account, getContent());
  return (
    <Tabs.Root className={hub.pc} defaultValue={account.parcels > 0 ? 'parcels' : 'journal'} data-testid="oak-aide">
      <Tabs.List className={hub.tabs} aria-label={JOURNEY_TEXT.aide}>
        <Tabs.Trigger className={hub.tab} value="parcels" data-testid="aide-tab-parcels">
          {JOURNEY_TEXT.parcel.tab} <span className={`${hub.muted} tabular`}>{account.parcels}</span>
        </Tabs.Trigger>
        <Tabs.Trigger className={hub.tab} value="journal" data-testid="aide-tab-journal">
          {JOURNEY_TEXT.journal.title} <span className={`${hub.muted} tabular`}>{entries.filter((e) => e.done).length} / {entries.length}</span>
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="parcels" className={hub.tabPanel}><Parcels /></Tabs.Content>
      <Tabs.Content value="journal" className={hub.tabPanel}><Journal /></Tabs.Content>
    </Tabs.Root>
  );
}

import { useState } from 'react';
import { IconCheck, IconHelpHexagon, IconNotebook, IconPackage, IconPin, IconPinFilled } from '@tabler/icons-react';
import { Progress, Tabs } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import {
  JOURNAL_SHELVES, PARCEL, PIN_LIMIT, VAULT, cosmeticById, journalEntries, levelFor, parcelChoicesFor, parcelCost, parcelOffer, parcelPool, vaultCard,
  type JournalEntry, type VaultEntry,
} from '@/sim';
import { ItemCard, type ItemKind } from '@/ui/components/ItemCard';
import { MedalIcon } from '@/ui/components/MedalIcon';
import { InfoDot, Tip, Tipped } from '@/ui/tooltip';
import { JOURNEY_TEXT } from '@/ui/strings';
import hub from './Hub.module.css';
import styles from './Journey.module.css';

// §8.6.2, §8.7 — Professor Oak's aide: the parcels that open the vault, and the Trainer Journal.
//
// Two tabs because they are two questions: "what did the last run bring me?" (a parcel — three cards, take one)
// and "what am I chasing?" (the Journal — deeds, their prizes, and the three you have pinned). The parcel is the
// one place the account's progress is a choice with a face, so its cards are the same cards a run draws.

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

/** §8.6.2 — the parcel on the table: its cards, one to take. The aide's tab and the Field Report both show this. */
export function ParcelOffer() {
  const account = useAccountStore((s) => s.account);
  const openParcel = useAccountStore((s) => s.openParcel);
  const content = getContent();
  const [taken, setTaken] = useState<string | null>(null);
  const offer = account.parcels > 0 ? parcelOffer(account, parcelChoicesFor(levelFor(account.xp))) : [];
  const take = (entry: VaultEntry) => {
    openParcel(entry.id);
    setTaken(vaultCard(entry, content).name);
  };
  return (
    <>
      {taken && <p className={styles.notice} role="status" data-testid="parcel-notice">{JOURNEY_TEXT.parcel.added(taken)}</p>}
      {offer.length > 0 ? (
        <section className={styles.offer} data-testid="parcel-offer" data-waiting={account.parcels}>
          <h2 className={`${styles.offerTitle} display`}>
            <IconPackage size={22} aria-hidden="true" /> {JOURNEY_TEXT.parcel.title}
            {account.parcels > 1 && <span className={`${styles.waiting} tabular`}>{JOURNEY_TEXT.parcel.more(account.parcels - 1)}</span>}
          </h2>
          <div className={styles.cards}>
            {offer.map((entry) => <ParcelCard key={entry.id} entry={entry} onTake={() => take(entry)} />)}
          </div>
        </section>
      ) : (
        <p className={styles.empty} data-testid="parcel-empty">
          <IconPackage size={28} stroke={1.5} aria-hidden="true" />
          {parcelPool(account).length === 0 ? JOURNEY_TEXT.parcel.vaultEmpty : JOURNEY_TEXT.parcel.none}
        </p>
      )}
    </>
  );
}

function Parcels() {
  const account = useAccountStore((s) => s.account);
  const cost = parcelCost(account.parcelsEarned);
  const pct = Math.min(100, Math.round((account.research / cost) * 100));
  const opened = account.unlocks.length;

  return (
    <div className={styles.parcels} data-testid="aide-parcels">
      <div className={styles.research} data-testid="research-bar" data-research={account.research} data-cost={cost}>
        <span className={`${styles.researchLabel} display`}>
          {JOURNEY_TEXT.research}
          <InfoDot tip={<Tip title={JOURNEY_TEXT.research} body={JOURNEY_TEXT.researchTip(PARCEL.earlyCost, PARCEL.earlyCount, PARCEL.cost)} />} />
        </span>
        <Progress.Root className={styles.researchBar} value={pct} aria-label={`${account.research} of ${cost} Research`}>
          <Progress.Indicator className={styles.researchFill} style={{ width: `${pct}%` }} />
        </Progress.Root>
        <span className={`${styles.researchText} tabular`}>{account.research} / {cost}</span>
        <span className={`${styles.vaultCount} tabular`} data-testid="vault-count">{JOURNEY_TEXT.vault(opened, VAULT.length)}</span>
      </div>

      <ParcelOffer />
    </div>
  );
}

function EntryRow({ entry, canPin, onPin }: { entry: JournalEntry; canPin: boolean; onPin: (on: boolean) => void }) {
  const pct = Math.round((entry.have / entry.goal) * 100);
  const testId = entry.id.startsWith('note:') ? `note-${entry.id.slice(5)}` : `achievement-${entry.id}`;
  return (
    <li className={entry.done ? hub.got : hub.pendingRow} data-testid={testId} data-done={entry.done} data-pinned={entry.pinned}>
      <span className={hub.medal} aria-hidden="true">{entry.tier ? <MedalIcon tier={entry.tier} size={28} /> : <IconNotebook size={26} stroke={1.6} />}</span>
      <span className={hub.rowBody}>
        <span className={`${hub.rowName} display`}>{entry.hidden && !entry.done ? `${entry.name} (hidden)` : entry.name}</span>
        <span className={hub.rowDesc}>{entry.description}</span>
        <span className={styles.prize}>{entry.prize}</span>
      </span>
      <span className={styles.entryEnd}>
      {entry.done ? (
        <span className={`${hub.state} ${hub.stateGot}`}><IconCheck size={14} /> {JOURNEY_TEXT.journal.done}</span>
      ) : entry.goal > 1 ? (
        <Progress.Root className={`${hub.bar} tabular`} value={pct} aria-label={`${entry.have} of ${entry.goal}`}>
          <Progress.Indicator className={hub.fill} style={{ width: `${pct}%` }} />
          <span className={hub.barText}>{entry.have} / {entry.goal}</span>
        </Progress.Root>
      ) : (
        <span className={hub.state}>{JOURNEY_TEXT.journal.open}</span>
      )}
      {!entry.done && (
        <button
          type="button"
          className={`${styles.pin} ${entry.pinned ? styles.pinOn : ''}`}
          onClick={() => onPin(!entry.pinned)}
          aria-pressed={entry.pinned}
          aria-disabled={!entry.pinned && !canPin}
          aria-label={entry.pinned ? JOURNEY_TEXT.journal.unpin(entry.name) : JOURNEY_TEXT.journal.pin(entry.name)}
          data-testid={`pin-${entry.id}`}
        >
          {entry.pinned ? <IconPinFilled size={18} aria-hidden="true" /> : <IconPin size={18} aria-hidden="true" />}
        </button>
      )}
      </span>
    </li>
  );
}

function Journal() {
  const account = useAccountStore((s) => s.account);
  const pin = useAccountStore((s) => s.pin);
  const entries = journalEntries(account, getContent(), (id) => cosmeticById(id)?.name ?? id);
  const canPin = account.pins.length < PIN_LIMIT;
  return (
    <div className={hub.medals} data-testid="aide-journal">
      <p className={hub.lede}>
        {JOURNEY_TEXT.journal.lede(account.pins.length, PIN_LIMIT)}
        <InfoDot tip={<Tip title={JOURNEY_TEXT.journal.title} body={JOURNEY_TEXT.journal.tip} />} />
      </p>
      {JOURNAL_SHELVES.map((shelf) => {
        const rows = entries.filter((e) => e.shelf === shelf.id);
        const done = rows.filter((e) => e.done).length;
        return (
          <div key={shelf.id} className={hub.group} data-testid={`journal-${shelf.id}`}>
            <h2 className={hub.groupTitle}>{shelf.name} <span className={`${hub.muted} tabular`}>{done} / {rows.length}</span> <span className={styles.shelfAbout}>{shelf.about}</span></h2>
            <ul className={hub.list}>
              {rows.map((e) => <EntryRow key={e.id} entry={e} canPin={canPin} onPin={(on) => pin(e.id, on)} />)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function OakAide() {
  const parcels = useAccountStore((s) => s.account.parcels);
  const account = useAccountStore((s) => s.account);
  const entries = journalEntries(account, getContent());
  return (
    <Tabs.Root className={hub.pc} defaultValue={parcels > 0 ? 'parcels' : 'journal'} data-testid="oak-aide">
      <Tabs.List className={hub.tabs} aria-label="Professor Oak's aide">
        <Tabs.Trigger className={hub.tab} value="parcels" data-testid="aide-tab-parcels">
          {JOURNEY_TEXT.parcel.tab} <span className={`${hub.muted} tabular`}>{parcels}</span>
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

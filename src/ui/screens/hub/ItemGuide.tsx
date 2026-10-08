import { useMemo, useState, type ReactNode } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { Tabs } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { MART_PRICE, PRICES, discoveryProgress, itemSources, listPrice, relicUnlocked, type ItemSources, type PokemonType, type PricedKind } from '@/sim';
import { itemIcon, tmIcon } from '@/ui/art';
import { MonIcon } from '@/ui/components/MonIcon';
import { MoveChip } from '@/ui/components/MoveChip';
import { TypeBadge } from '@/ui/components/TypeBadge';
import { GUIDE_TEXT } from '@/ui/strings';
import { guidePriceTip, relicTierNoteTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import styles from './ItemGuide.module.css';

// §8.4 / §7 — the Item Guide (v0.9.9, the user's call: "a dictionary of relics, consumables and held items somewhere in
// the Hub"): the table in the lobby's corner. Every item the game has, by kind — a list to pick from, grouped by rarity
// or tier, and the whole of one item beside it: what it does, how rare, what it costs, where it turns up, and for a
// relic, where your account stands with it. Facts come from the content and the sim (`listPrice`, `itemSources`,
// `discoveryProgress`). The search runs across every kind, and each tab counts its matches.

interface Row {
  id: string;
  name: string;
  /** The subheading the row sits under: a rarity, a tier, a kind of held item. */
  group: string;
  icon: string;
  /** A TM's move type, drawn as its badge. */
  type?: PokemonType;
}

const KINDS: readonly PricedKind[] = ['relic', 'consumable', 'held-item', 'stone', 'tm'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary'];

function rowsOf(kind: PricedKind): Row[] {
  const content = getContent();
  switch (kind) {
    case 'relic':
      return [...content.allRelics()].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)).map((r) => ({ id: r.id, name: r.name, group: cap(r.rarity), icon: itemIcon(r.id) }));
    case 'consumable':
      return [...content.allConsumables()].sort((a, b) => a.tier - b.tier).map((c) => ({ id: c.id, name: c.name, group: GUIDE_TEXT.tier(c.tier), icon: itemIcon(c.id) }));
    case 'held-item':
      return [...content.allHeldItems()].sort((a, b) => Number(!!a.speciesLock) - Number(!!b.speciesLock)).map((h) => ({ id: h.id, name: h.name, group: h.speciesLock ? GUIDE_TEXT.signature : GUIDE_TEXT.held, icon: itemIcon(h.id) }));
    case 'stone':
      return content.allEvolutionItems().map((s) => ({ id: s.id, name: s.name, group: GUIDE_TEXT.stone, icon: itemIcon(s.id) }));
    case 'tm':
      return content.allTms().map((t) => ({ id: t.id, name: t.name, group: GUIDE_TEXT.kind.tm!, icon: tmIcon(t.id), type: content.move(t.move).type }));
  }
}

export function ItemGuide() {
  const [kind, setKind] = useState<PricedKind>('relic');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const all = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, rowsOf(k)])) as Record<PricedKind, Row[]>, []);
  const q = query.trim().toLowerCase();
  // A TM is found by its move's name too: "flamethrower" finds TM04.
  const matches = (k: PricedKind) => all[k].filter((r) => r.name.toLowerCase().includes(q) || (k === 'tm' && getContent().move(getContent().tm(r.id).move).name.toLowerCase().includes(q)));
  const shown = matches(kind);
  const current = shown.find((r) => r.id === picked) ?? shown[0] ?? null;

  return (
    <div className={styles.root} data-testid="item-guide">
      <Tabs.Root value={kind} onValueChange={(v) => { setKind(v as PricedKind); setPicked(null); }}>
        <div className={styles.bar}>
          <Tabs.List className={styles.tabs} aria-label={GUIDE_TEXT.kinds}>
            {KINDS.map((k) => (
              <Tabs.Trigger key={k} value={k} className={styles.tab} data-testid={`guide-tab-${k}`}>
                {GUIDE_TEXT.kind[k]} <span className={`${styles.count} tabular`} data-testid={`guide-count-${k}`}>{matches(k).length}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <label className={styles.search}>
            <IconSearch size={16} aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={GUIDE_TEXT.search} aria-label={GUIDE_TEXT.search} data-testid="guide-search" />
          </label>
        </div>
        {KINDS.map((k) => (
          // Only the open tab draws its list: the rows and the pick belong to the kind on show.
          <Tabs.Content key={k} value={k} className={styles.body}>
            {k === kind && (
              <>
                <ul className={styles.list} aria-label={GUIDE_TEXT.kind[k]}>
                  {shown.map((r, i) => (
                    <li key={r.id}>
                      {(i === 0 || shown[i - 1]!.group !== r.group) && <p className={styles.group}>{r.group}</p>}
                      <button type="button" className={`${styles.row} ${current?.id === r.id ? styles.rowOn : ''}`} aria-pressed={current?.id === r.id} onClick={() => setPicked(r.id)} data-testid={`guide-item-${r.id}`}>
                        <img src={r.icon} alt="" width={30} height={30} className={styles.pixel} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                        <span className={styles.rowName}>{r.name}</span>
                        {r.type && <TypeBadge type={r.type} size={14} mode="attack" />}
                      </button>
                    </li>
                  ))}
                  {shown.length === 0 && <li className={styles.empty}>{GUIDE_TEXT.none}</li>}
                </ul>
                {current && <Detail kind={kind} id={current.id} icon={current.icon} />}
              </>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

/** One item, all of it. */
function Detail({ kind, id, icon }: { kind: PricedKind; id: string; icon: string }) {
  const content = getContent();
  const account = useAccountStore((s) => s.account);
  const price = listPrice(kind, id, content);
  const facts: [string, ReactNode][] = [];
  let name: string;
  let body: ReactNode;
  const meta: ReactNode[] = [GUIDE_TEXT.kindOne[kind]!];
  let pending: string | undefined;

  if (kind === 'relic') {
    const r = content.relic(id);
    name = r.name;
    body = r.description;
    pending = r.pending;
    meta.push(cap(r.rarity), <Tipped key="tier" as="span" tip={relicTierNoteTip(r.tier ?? 1)} className={styles.metaTip}>{GUIDE_TEXT.relicTier(r.tier ?? 1)}</Tipped>);
    facts.push([GUIDE_TEXT.categories, r.categories.map(cap).join(' · ')]);
    const prog = discoveryProgress(account, r);
    facts.push([GUIDE_TEXT.yours, relicUnlocked(account, r) ? GUIDE_TEXT.inPool : r.tier === 3 ? GUIDE_TEXT.mastery(MART_PRICE.mastery) : prog ? GUIDE_TEXT.discover(prog.text, prog.have, prog.goal) : GUIDE_TEXT.locked]);
  } else if (kind === 'consumable') {
    const c = content.consumable(id);
    name = c.name;
    body = c.description;
    meta.push(GUIDE_TEXT.tier(c.tier));
    facts.push([GUIDE_TEXT.cost, GUIDE_TEXT.ap(c.apCost)]);
    facts.push([GUIDE_TEXT.target, GUIDE_TEXT.targetOf[c.target] ?? cap(c.target)]);
    if (c.upgradeTo) facts.push([GUIDE_TEXT.upgrade, content.consumable(c.upgradeTo).name]);
    facts.push([GUIDE_TEXT.found, sourcesLine(itemSources(id))]);
  } else if (kind === 'held-item') {
    const h = content.allHeldItems().find((x) => x.id === id)!;
    name = h.name;
    body = h.description;
    pending = h.pending;
    if (h.grantsLeadAura) facts.push([GUIDE_TEXT.aura, cap(h.grantsLeadAura)]);
  } else if (kind === 'stone') {
    const s = content.evolutionItem(id);
    name = s.name;
    body = s.description;
    facts.push([GUIDE_TEXT.evolves, s.uses.map((u) => `${content.species(u.species).name} (${GUIDE_TEXT.fromLv(u.fromLevel)})`).join(' · ')]);
  } else {
    const t = content.tm(id);
    name = t.name;
    body = t.description;
    facts.push([GUIDE_TEXT.teaches, <MoveChip key="m" id={t.move} />]);
    facts.push([
      GUIDE_TEXT.compatible,
      <span key="c" className={styles.mons}>
        {t.compatibleSpecies.map((sp) => <MonIcon key={sp} speciesId={sp} size={32} />)}
      </span>,
    ]);
  }
  facts.push([
    GUIDE_TEXT.price,
    price === null ? GUIDE_TEXT.notSold : <Tipped key="p" as="span" tip={guidePriceTip(kind === 'relic')} className={styles.metaTip}>{GUIDE_TEXT.prices(price, Math.round(price * PRICES.cityMarkup))}</Tipped>,
  ]);

  return (
    <article className={styles.detail} data-testid="guide-detail" data-item={id}>
      <header className={styles.detailHead}>
        <img src={icon} alt="" width={60} height={60} className={styles.pixel} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
        <div>
          <h2 className={`${styles.detailName} display`}>{name}</h2>
          <p className={styles.meta}>
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                {m}
              </span>
            ))}
          </p>
        </div>
      </header>
      <p className={styles.description}>{body}</p>
      {pending && <p className={styles.pending}>{GUIDE_TEXT.pending(pending)}</p>}
      <dl className={styles.facts}>
        {facts.map(([k, v]) => (
          <div key={k} className={styles.fact}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

/** Where a consumable turns up, by Region; a shop sells the rest. */
function sourcesLine(s: ItemSources): string {
  const parts = [
    s.supplies.length ? GUIDE_TEXT.supplies(s.supplies) : null,
    s.prizes.length ? GUIDE_TEXT.prizes(s.prizes) : null,
    s.ground.length ? GUIDE_TEXT.ground(s.ground) : null,
  ].filter((p): p is string => !!p);
  return parts.length ? cap(parts.join(' · ')) : GUIDE_TEXT.shopsOnly;
}

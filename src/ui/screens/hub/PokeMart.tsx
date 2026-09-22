import { useState, type ReactNode } from 'react';
import { IconAward, IconBox, IconCheck, IconDiamond, IconEye, IconFirstAidKit, IconLock, IconMountain, IconShoppingCart, IconSquareRounded, IconUsers, IconAdjustments } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { Progress, Tabs } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import {
  HUB_UPGRADE_LABEL, SHELF_ORDER, SHELVES, bondRank, cosmeticById, discoveryProgress, levelFor, martOwned, martPending, martPrice, martShelf, shelfItems, shelfOpen, xpForLevel,
  type AccountState, type HubUpgrade, type MartError, type MartItem, type ShelfId,
} from '@/sim';
import { MonIcon } from '@/ui/components/MonIcon';
import { itemIcon, trainerSprite } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tip, Tipped, useTip } from '@/ui/tooltip';
import { cosmeticTip, hubUpgradeTip, relicTierTip, starterTip, tokenTip } from '@/ui/tips';
import { FRAME_CLASS } from './frames';
import { TokenIcon } from './TokenIcon';
import styles from './Hub.module.css';

// §8.3.4 / §8.4.1 — the Poké Mart: five shelves, one currency, one button per thing. Trainer Level opens a
// shelf; Tokens buy from it. A closed shelf is still a tab you can open and read — priced, with a banner that
// says what opens it and how far away that is — because a door you can see is a goal (§7.7). The Corner is
// open from Level 1 so the first Tokens have somewhere to go the day they arrive.

const SHELF_ICON: Record<ShelfId, ReactNode> = {
  corner: <IconAward size={18} />,
  starters: <IconUsers size={18} />,
  hub: <IconBox size={18} />,
  discoveries: <IconEye size={18} />,
  mastery: <IconDiamond size={18} />,
};

const HUB_ICON: Record<HubUpgrade, ReactNode> = {
  'starting-relic-plus-one': <IconDiamond size={26} />,
  'expanded-box': <IconBox size={26} />,
  'pokedex-insight': <IconEye size={26} />,
  'trauma-salve-cache': <IconFirstAidKit size={26} />,
  'apex-reveal': <IconMountain size={26} />,
  'modifier-slot-plus-one': <IconAdjustments size={26} />,
  'twin-run': <IconUsers size={26} />,
};

/** §8.5.2 — the design slot of each meta-starter, in the player's words. */
const STARTER_BLURB: Record<string, string> = {
  magikarp: 'Water → Water/Flying. Three cards and a prayer until Gyarados; a monster after.',
  eevee: 'Normal. Its evolution is its type choice — Vaporeon, Jolteon or Flareon.',
  pikachu: 'Electric. The iconic pick, ranged-leaning. Starts holding a Light Ball.',
};

/** The shelf the Mart opens on: the newest one open, so a level-up lands you in front of what it opened. */
function defaultShelf(account: AccountState): ShelfId {
  return [...SHELF_ORDER].reverse().find((s) => shelfOpen(account, s)) ?? 'corner';
}

export function PokeMart() {
  const account = useAccountStore((s) => s.account);
  const buy = useAccountStore((s) => s.buy);
  const wear = useAccountStore((s) => s.wear);
  const content = getContent();
  const animate = useMotionPref();
  const [shelf, setShelf] = useState<ShelfId>(() => defaultShelf(account));
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);

  function nameOf(item: MartItem): string {
    switch (item.kind) {
      case 'cosmetic': return cosmeticById(item.id)?.name ?? item.id;
      case 'hub': return HUB_UPGRADE_LABEL[item.id].name;
      case 'starter': return content.hasSpecies(item.id) ? content.species(item.id).name : item.id.charAt(0).toUpperCase() + item.id.slice(1);
      case 'relic': return content.relic(item.id).name;
    }
  }

  function purchase(item: MartItem) {
    const err: MartError | null = buy(item);
    const name = nameOf(item);
    const price = martPrice(item, content) ?? 0;
    const shelfDef = SHELVES[shelf];
    const bought: Record<MartItem['kind'], string> = {
      cosmetic: `${name} is yours and on your card.`,
      hub: `${name} is yours. Every run from now on has it.`,
      starter: `${name} can start your next run.`,
      relic: `${name} is in your pool. Every run from now on can offer it.`,
    };
    setNotice(
      err === null ? { text: bought[item.kind], tone: 'ok' }
      : err === 'locked' ? { text: `The ${shelfDef.name} shelf opens at Trainer Level ${shelfDef.level}.`, tone: 'warn' }
      : err === 'owned' ? { text: `${name} is already yours.`, tone: 'warn' }
      : err === 'pending' ? { text: `${name} is not sold yet: ${martPending(item, content)}.`, tone: 'warn' }
      : err === 'cannot-afford' ? { text: `${name} is ${price} Tokens — you have ${account.tokens}. Every level pays some, and so does every Gold or Platinum medal.`, tone: 'warn' }
      : { text: `The Mart does not sell that.`, tone: 'warn' },
    );
  }

  return (
    <div className={styles.mart} data-testid="poke-mart">
      <div className={styles.martHead}>
        <span className={styles.lede}>
          Five shelves. Trainer Level opens them; Tokens buy from them.
          <InfoDot tip={<Tip title="The shop of the pass" body="Every Trainer Level pays Tokens and four of them open a shelf: Starters at 3, Hub upgrades at 5, Discoveries at 8, the Mastery lane at 10. The Trainer's Corner is open from the start. Nothing here is power — starters, conveniences, relics for your pool, and things to wear on the card." footer="The whole shop costs more than the track pays: you choose, and medals top the wallet up." />} />
        </span>
        <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
          <span className={styles.wallet} data-testid="mart-tokens" data-tokens={account.tokens}>
            <span className={styles.walletLabel}>You have</span>
            <span className={`${styles.walletValue} display tabular`}><TokenIcon /> <NumberFlow value={account.tokens} animated={animate} /></span>
          </span>
        </Tipped>
      </div>

      <Tabs.Root value={shelf} onValueChange={(v) => { setShelf(v as ShelfId); setNotice(null); }}>
        <Tabs.List className={`${styles.tabs} ${styles.shelfTabs}`} aria-label="Shelves">
          {SHELF_ORDER.map((s) => {
            const open = shelfOpen(account, s);
            const items = shelfItems(s, content);
            const owned = items.filter((i) => martOwned(account, i, content)).length;
            return (
              <Tabs.Trigger key={s} className={`${styles.tab} ${styles.shelfTab}`} value={s} data-testid={`mart-tab-${s}`} data-open={open}>
                <span className={styles.shelfTabIcon} aria-hidden="true">{open ? SHELF_ICON[s] : <IconLock size={16} />}</span>
                {SHELVES[s].name}
                <span className={`${styles.muted} tabular`}>{open ? `${owned} / ${items.length}` : `Lv ${SHELVES[s].level}`}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {SHELF_ORDER.map((s) => (
          <Tabs.Content key={s} value={s} className={styles.tabPanel}>
            <Shelf id={s} account={account} notice={notice} onBuy={purchase} onWear={(kind, id) => wear(kind, id)} />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

function Shelf({ id, account, notice, onBuy, onWear }: {
  id: ShelfId;
  account: AccountState;
  notice: { text: string; tone: 'ok' | 'warn' } | null;
  onBuy: (item: MartItem) => void;
  onWear: (kind: 'title' | 'avatar' | 'frame', id: string) => void;
}) {
  const content = getContent();
  const def = SHELVES[id];
  const open = shelfOpen(account, id);
  const level = levelFor(account.xp);
  const items = shelfItems(id, content);
  const xpToOpen = Math.max(0, xpForLevel(def.level) - account.xp);
  const pctToOpen = def.level <= 1 ? 100 : Math.min(100, Math.round((account.xp / xpForLevel(def.level)) * 100));

  return (
    <div className={styles.shelfSection} data-testid={`mart-shelf-${id}`}>
      <div className={styles.martBanner} data-state={open ? 'open' : 'locked'} data-testid="mart-banner">
        <span className={styles.martBannerIcon} aria-hidden="true">{open ? <IconShoppingCart size={26} /> : <IconLock size={26} />}</span>
        <span className={styles.martBannerBody}>
          <span className={`${styles.martBannerTitle} display`}>
            {open ? def.name : `${def.name} · opens at Trainer Level ${def.level}`}
          </span>
          <span className={styles.martBannerText}>{def.sells}</span>
          {!open && (
            <Tipped tip={<Tip title={`Level ${def.level}`} body={`You are Level ${level}. The shelf is priced already; Tokens keep until it opens.`} footer={`${xpToOpen} XP to go.`} />} className={styles.martUnlockRow}>
              <Progress.Root className={styles.martUnlockBar} value={pctToOpen} aria-label={`${pctToOpen}% of the way to Level ${def.level}`}>
                <Progress.Indicator className={styles.martUnlockFill} style={{ width: `${pctToOpen}%` }} />
              </Progress.Root>
              <span className={`${styles.martUnlockText} tabular`}>{xpToOpen} XP</span>
            </Tipped>
          )}
        </span>
      </div>

      {notice && (
        <p className={`${styles.notice} ${notice.tone === 'ok' ? styles.noticeOk : ''}`} role="status" data-testid="mart-notice">
          {notice.text}
        </p>
      )}

      <ul className={styles.shelf}>
        {items.map((item) => (
          <MartCard key={item.id} item={item} account={account} open={open} onBuy={() => onBuy(item)} onWear={onWear} />
        ))}
      </ul>
    </div>
  );
}

function MartCard({ item, account, open, onBuy, onWear }: {
  item: MartItem;
  account: AccountState;
  open: boolean;
  onBuy: () => void;
  onWear: (kind: 'title' | 'avatar' | 'frame', id: string) => void;
}) {
  const content = getContent();
  const price = martPrice(item, content) ?? 0;
  const owned = martOwned(account, item, content);
  const pending = martPending(item, content);
  const affordable = account.tokens >= price;
  const canBuy = open && !owned && !pending && affordable;
  const shelfLevel = SHELVES[martShelf(item, content) ?? 'corner'].level;
  // The reason a Buy is greyed rides in its name and its bubble (D4); the banner and the wallet already say it.
  const reason = owned ? null : pending ? 'Not yet' : !open ? `Opens at Level ${shelfLevel}` : !affordable ? 'Not enough Tokens' : null;

  // What the card is, by kind: face, name, one line, tooltip, and — for a cosmetic — whether it is worn.
  let face: ReactNode;
  let name: string;
  let desc: ReactNode;
  let tipNode: ReactNode;
  let worn = false;
  let wearKind: 'title' | 'avatar' | 'frame' | null = null;
  let ownedTag = 'Yours';
  switch (item.kind) {
    case 'cosmetic': {
      const c = cosmeticById(item.id)!;
      wearKind = c.kind;
      worn = account.wearing[c.kind] === c.id;
      name = c.name;
      desc = c.blurb;
      face = c.kind === 'avatar' && c.sprite
        ? <img src={trainerSprite(c.sprite)} alt="" className={styles.shelfAvatar} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
        : c.kind === 'frame' ? <span className={`${styles.frameSwatch} ${FRAME_CLASS[c.id] ?? ''}`} aria-hidden="true"><IconSquareRounded size={22} /></span>
        : <IconAward size={26} />;
      tipNode = cosmeticTip(c.name, c.kind, c.blurb, price, worn ? 'wearing' : owned ? 'owned' : canBuy ? 'buyable' : 'locked');
      if (worn) ownedTag = 'Wearing';
      break;
    }
    case 'hub': {
      const row = HUB_UPGRADE_LABEL[item.id];
      name = row.name;
      desc = row.effect;
      face = HUB_ICON[item.id];
      tipNode = hubUpgradeTip(row.name, row.effect, price, shelfLevel, owned, row.pending);
      break;
    }
    case 'starter': {
      const shipped = content.hasSpecies(item.id);
      name = shipped ? content.species(item.id).name : item.id.charAt(0).toUpperCase() + item.id.slice(1);
      desc = STARTER_BLURB[item.id] ?? '';
      face = shipped ? <MonIcon speciesId={item.id} size={40} /> : <span className={styles.starterBlank} aria-hidden="true">?</span>;
      const soulbound = bondRank(account.bond[item.id] ?? 0) >= 5;
      tipNode = starterTip(name, STARTER_BLURB[item.id] ?? '', price, soulbound ? 'soulbound' : owned ? 'owned' : pending ? 'pending' : canBuy ? 'buyable' : 'locked', pending ?? (!open ? `The Starters shelf opens at Trainer Level ${shelfLevel}.` : undefined));
      if (soulbound) ownedTag = 'Soulbound';
      break;
    }
    case 'relic': {
      const r = content.relic(item.id);
      name = r.name;
      const prog = discoveryProgress(account, r);
      desc = (
        <>
          {r.description}
          {prog && !owned && <span className={styles.shelfProgress}><span className="tabular">{prog.have} / {prog.goal}</span> to discover</span>}
        </>
      );
      face = <img src={itemIcon(r.id)} alt="" width={40} height={40} className={styles.shelfIcon} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />;
      tipNode = relicTierTip(r, owned ? 'owned' : open ? 'buyable' : 'locked', prog, { price, level: shelfLevel });
      break;
    }
  }

  const tip = useTip(tipNode);
  return (
    <li
      className={`${styles.shelfCard} ${owned ? styles.shelfOwned : ''} ${pending ? styles.shelfInert : ''} ${worn ? styles.shelfWorn : ''}`}
      data-testid={`mart-${item.id}`}
      data-state={owned ? 'owned' : canBuy ? 'buyable' : 'locked'}
      {...tip}
    >
      <span className={styles.shelfFace}>{face}</span>
      <span className={styles.shelfBody}>
        <span className={`${styles.shelfName} display`}>{name}</span>
        <span className={styles.shelfDesc}>{desc}</span>
        {pending && <span className={styles.shelfPending}>Not sold yet: {pending}</span>}
      </span>
      <span className={styles.shelfAction}>
        {owned ? (
          <>
            <span className={styles.shelfOwnedTag} data-testid={`mart-price-${item.id}`}><IconCheck size={14} stroke={3} /> {ownedTag}</span>
            {wearKind && !worn && (
              <button type="button" className={styles.wear} onClick={() => onWear(wearKind!, item.id)} data-testid={`mart-wear-${item.id}`}>Wear</button>
            )}
          </>
        ) : (
          <button type="button" className={`${styles.buy} ${canBuy ? styles.buyOk : ''}`} onClick={onBuy} disabled={!!pending} aria-disabled={!canBuy} data-testid={`mart-price-${item.id}`} aria-label={`Buy ${name} for ${price} Tokens${reason ? ` — ${reason}` : ''}`}>
            <span className={styles.buyLabel}>Buy</span>
            <span className={`${styles.buyPrice} tabular`}><TokenIcon /> {price}</span>
          </button>
        )}
      </span>
    </li>
  );
}

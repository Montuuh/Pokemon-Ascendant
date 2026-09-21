import { useState } from 'react';
import { IconCheck, IconLock, IconShoppingCart } from '@tabler/icons-react';
import NumberFlow from '@number-flow/react';
import { Progress } from 'radix-ui';
import { useAccountStore } from '@/app/accountStore';
import { getContent } from '@/content/registry';
import { TIER3_PRICE, isOfferable, levelFor, masteryRelics, xpForLevel } from '@/sim';
import { itemIcon } from '@/ui/art';
import { useMotionPref } from '@/ui/hooks/useMotionPref';
import { InfoDot, Tip, Tipped, useTip } from '@/ui/tooltip';
import { relicTierTip, tokenTip } from '@/ui/tips';
import { TokenIcon } from './TokenIcon';
import styles from './Hub.module.css';

// §8.4.1 / §8.6.1 — the Poké Mart: one shelf, one currency, one button. Tier-3 relics at five Tokens each,
// from Trainer Level 10. Below that the shelf is visible and priced and a banner says what opens it and how
// far away it is — a door you can see is a goal (§7.7). The Tier-2 board moved to the PC Terminal.

const MART_LEVEL = 10;

export function PokeMart() {
  const account = useAccountStore((s) => s.account);
  const buy = useAccountStore((s) => s.buy);
  const content = getContent();
  const animate = useMotionPref();
  const level = levelFor(account.xp);
  const open = level >= MART_LEVEL;
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const shelf = masteryRelics(content);
  const owned = shelf.filter((r) => account.relics.includes(r.id)).length;
  const xpToOpen = Math.max(0, xpForLevel(MART_LEVEL) - account.xp);
  const pctToOpen = Math.round((account.xp / xpForLevel(MART_LEVEL)) * 100);

  function purchase(id: string) {
    const err = buy(id);
    const name = content.relic(id).name;
    setNotice(
      err === null ? { text: `${name} is in your pool. Every run from now on can offer it.`, tone: 'ok' }
      : err === 'locked' ? { text: `The Mastery lane opens at Trainer Level ${MART_LEVEL}.`, tone: 'warn' }
      : err === 'owned' ? { text: `${name} is already yours.`, tone: 'warn' }
      : { text: `${TIER3_PRICE} Tokens each — you have ${account.tokens}. Tokens come from every fifth level and from Gold and Platinum medals.`, tone: 'warn' },
    );
  }

  return (
    <div className={styles.mart} data-testid="poke-mart">
      <div className={styles.martBanner} data-state={open ? 'open' : 'locked'} data-testid="mart-banner">
        <span className={styles.martBannerIcon} aria-hidden="true">{open ? <IconShoppingCart size={26} /> : <IconLock size={26} />}</span>
        <span className={styles.martBannerBody}>
          <span className={`${styles.martBannerTitle} display`}>
            {open ? `Tier-3 relics · ${TIER3_PRICE} Tokens each` : `Opens at Trainer Level ${MART_LEVEL}`}
          </span>
          <span className={styles.martBannerText}>
            {open
              ? <>A bought relic joins your pool for every run after. {owned} of {shelf.length} bought.</>
              : <>You are Level {level} — <b className="tabular">{xpToOpen} XP</b> to go. The shelf is priced already; Tokens keep until then.</>}
            <InfoDot tip={<Tip title="The Mastery lane" body="Ten relics that change how a run works rather than how hard it hits. Buy them in any order, five Tokens each. Your pool is what a run can drop, offer or stock — a bought relic is in it from the next run on." footer="Tokens: every fifth Trainer Level pays some, and so does every Gold or Platinum medal." />} />
          </span>
          {!open && (
            <Progress.Root className={styles.martUnlockBar} value={pctToOpen} aria-label={`${pctToOpen}% of the way to Level ${MART_LEVEL}`}>
              <Progress.Indicator className={styles.martUnlockFill} style={{ width: `${pctToOpen}%` }} />
            </Progress.Root>
          )}
        </span>
        <Tipped tip={tokenTip(account.tokens, account.tokensEarned)}>
          <span className={styles.wallet} data-testid="mart-tokens">
            <span className={styles.walletLabel}>You have</span>
            <span className={`${styles.walletValue} display tabular`}><TokenIcon /> <NumberFlow value={account.tokens} animated={animate} /></span>
          </span>
        </Tipped>
      </div>

      {notice && (
        <p className={`${styles.notice} ${notice.tone === 'ok' ? styles.noticeOk : ''}`} role="status" data-testid="mart-notice">
          {notice.text}
        </p>
      )}

      <ul className={styles.shelf} data-testid="mart-shelf">
        {shelf.map((r) => (
          <ShelfCard
            key={r.id}
            id={r.id}
            owned={account.relics.includes(r.id)}
            inert={!isOfferable(r)}
            open={open}
            affordable={account.tokens >= TIER3_PRICE}
            onBuy={() => purchase(r.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ShelfCard({ id, owned, inert, open, affordable, onBuy }: { id: string; owned: boolean; inert: boolean; open: boolean; affordable: boolean; onBuy: () => void }) {
  const r = getContent().relic(id);
  const tip = useTip(relicTierTip(r, owned ? 'owned' : open ? 'buyable' : 'locked'));
  const canBuy = open && !owned && !inert && affordable;
  const reason = owned ? 'In your pool' : inert ? 'Not working yet' : !open ? `Level ${MART_LEVEL}` : !affordable ? 'Not enough Tokens' : null;
  return (
    <li className={`${styles.shelfCard} ${owned ? styles.shelfOwned : ''} ${inert ? styles.shelfInert : ''}`} data-testid={`mart-${id}`} data-state={owned ? 'owned' : canBuy ? 'buyable' : 'locked'} {...tip}>
      <img src={itemIcon(id)} alt="" width={40} height={40} className={styles.shelfIcon} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
      <span className={styles.shelfBody}>
        <span className={`${styles.shelfName} display`}>{r.name}</span>
        <span className={styles.shelfDesc}>{r.description}</span>
        {inert && r.pending && <span className={styles.shelfPending}>Not working yet: {r.pending}</span>}
      </span>
      <span className={styles.shelfAction}>
        {owned ? (
          <span className={styles.shelfOwnedTag} data-testid={`mart-price-${id}`}><IconCheck size={14} stroke={3} /> Yours</span>
        ) : (
          <button type="button" className={`${styles.buy} ${canBuy ? styles.buyOk : ''}`} onClick={onBuy} disabled={inert} aria-disabled={!canBuy} data-testid={`mart-price-${id}`} aria-label={`Buy ${r.name} for ${TIER3_PRICE} Tokens${reason ? ` — ${reason}` : ''}`}>
            <span className={styles.buyLabel}>Buy</span>
            <span className={`${styles.buyPrice} tabular`}><TokenIcon /> {TIER3_PRICE}</span>
          </button>
        )}
        {!owned && reason && <span className={styles.shelfReason}>{reason}</span>}
      </span>
    </li>
  );
}

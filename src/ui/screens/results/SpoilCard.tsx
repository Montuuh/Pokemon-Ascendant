import { useState, type CSSProperties } from 'react';
import { getContent } from '@/content/registry';
import { itemIcon, tmIcon } from '@/ui/art';
import { PokeDollar } from '@/ui/components/Money';
import { RarityGem } from '@/ui/components/RarityGem';
import { lootHow, lootTip, rewardMoneyTip, tollTip } from '@/ui/tips';
import { RESULT_TEXT } from '@/ui/strings';
import { Tipped } from '@/ui/tooltip';
import type { Spoil } from './results';
import styles from './SpoilCard.module.css';

/** Item art is two kinds: a 30-px pixel icon, drawn at whole multiples (D9), or a painted render, scaled to fit. */
const PIXEL_ICON = 64;
function ItemArt({ src }: { src: string }) {
  const [natural, setNatural] = useState(0);
  const pixel = natural > 0 && natural <= PIXEL_ICON;
  return (
    <img
      className={pixel ? `${styles.icon} pixel` : styles.icon}
      src={src}
      alt=""
      draggable={false}
      onLoad={(e) => setNatural(e.currentTarget.naturalWidth)}
      style={pixel ? { width: natural * 2, height: 'auto' } : undefined}
    />
  );
}

/**
 * §9.4.5 — one thing the fight paid (or running cost), as a card in the tray where the hand was, in the move card's
 * grammar: its name on the head, the thing itself in the window, what kind of thing on the foot. Its door says the rest.
 */
export function SpoilCard({ spoil, style, testId }: { spoil: Spoil; style?: CSSProperties; testId?: string }) {
  const content = getContent();
  if (spoil.kind === 'money' || spoil.kind === 'toll-money') {
    const toll = spoil.kind === 'toll-money';
    return (
      <Tipped
        tip={toll ? tollTip(spoil.amount, spoil.pct) : rewardMoneyTip(spoil.amount, spoil.wallet)}
        className={`${styles.card} ${styles.money} ${toll ? styles.toll : ''}`}
        style={style}
        data-testid={testId}
      >
        <span className={`${styles.head} display`}>{toll ? RESULT_TEXT.toll : RESULT_TEXT.prize}</span>
        <span className={styles.window}>
          <span className={`${styles.amount} display tabular`}>
            <PokeDollar size={26} />
            {toll ? `−${spoil.amount}` : spoil.amount.toLocaleString('en-GB')}
          </span>
        </span>
        <span className={styles.foot}>{toll ? RESULT_TEXT.tollShare(spoil.pct) : RESULT_TEXT.wallet(spoil.wallet)}</span>
      </Tipped>
    );
  }
  const item = spoil.item;
  const row = item === 'relic' ? content.relic(spoil.id) : item === 'held-item' ? content.heldItem(spoil.id) : item === 'tm' ? content.tm(spoil.id) : content.consumable(spoil.id);
  const lost = spoil.kind === 'toll-item';
  const count = spoil.kind === 'item' ? spoil.count : 1;
  const rarity = item === 'relic' ? content.relic(spoil.id).rarity : null;
  return (
    <Tipped
      tip={lootTip(row.name, RESULT_TEXT.kind[item], row.description, lost ? RESULT_TEXT.leftBehind : lootHow[item])}
      className={`${styles.card} ${lost ? styles.toll : ''}`}
      style={style}
      data-testid={testId}
      data-kind={item}
    >
      <span className={`${styles.head} display`}>{row.name}</span>
      <span className={styles.window}>
        <ItemArt src={item === 'tm' ? tmIcon(spoil.id) : itemIcon(spoil.id)} />
        {count > 1 && <span className={`${styles.count} tabular`}>×{count}</span>}
        {rarity && <RarityGem rarity={rarity} size={16} className={styles.gem} />}
        {lost && <span className={styles.strike} aria-hidden="true" />}
      </span>
      <span className={styles.foot}>{lost ? RESULT_TEXT.leftBehind : RESULT_TEXT.kind[item]}</span>
    </Tipped>
  );
}

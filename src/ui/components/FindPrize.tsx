import { useState, type KeyboardEvent } from 'react';
import { countSupplies, reelChances, WILD_TIERS, type FindGot, type FindPrize, type FindTile } from '@/sim';
import { itemIcon, mysterySign, tmIcon } from '@/ui/art';
import { FIND_TEXT, WILD_TEXT, WILD_TIER_LABEL } from '@/ui/strings';
import { prizeTip, reelRowTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { PokeDollar } from './Money';
import { RarityGem } from './RarityGem';
import styles from './FindPrize.module.css';

// §2.9.5 — an item ball's prizes, drawn the one way everywhere: the bag's own icon with its count, the TM disc of its
// type, the stone, Poké Dollars; a held item and a relic as the overworld's "?" (the relic with its rarity's gem) until
// the reel has landed on one and said which. The preview card's pool and the reel both draw them with this.

/**
 * D9 — an item's icon at `size`: a small pixel sprite (the 30-px bag icons) at the largest whole or half multiple of its
 * own size that fits, crisp; a large render (the 128-px ones) smooth at `size`.
 */
function ItemIcon({ src, size }: { src: string; size: number }) {
  const [px, setPx] = useState<number | null>(null);
  const shown = px ?? size;
  return (
    <img
      className={`${styles.icon} ${px ? 'pixel' : ''}`}
      src={src}
      alt=""
      width={shown}
      height={shown}
      onLoad={(e) => {
        const n = e.currentTarget.naturalWidth;
        if (n > 0 && n <= 40) setPx(Math.max(n, Math.floor(size / (n / 2)) * (n / 2)));
      }}
      draggable={false}
    />
  );
}

/** The overworld's "?" is drawn on a 16-px grid (64 px, ×4): it stands at a multiple of 16. */
const signSize = (size: number) => Math.max(16, Math.round(size / 16) * 16);

/** A prize's face: its icon(s) and a count, at `size` px. */
export function PrizeFace({ prize, got = {}, size = 40 }: { prize: FindPrize; got?: FindGot; size?: number }) {
  if (got.money !== undefined || prize.kind === 'money')
    return (
      <span className={styles.face}>
        <PokeDollar size={Math.round(size * 0.6)} />
        <b className={`${styles.count} tabular`}>{got.money ?? (prize.kind === 'money' ? prize.amount : 0)}</b>
      </span>
    );
  const known = got.relic ?? got.heldItem;
  if (known)
    return (
      <span className={styles.face}>
        <ItemIcon src={itemIcon(known)} size={size} />
      </span>
    );
  switch (prize.kind) {
    case 'supply':
      return (
        <span className={styles.face}>
          {countSupplies(prize.items).map(([id, n]) => (
            <span key={id} className={styles.stack}>
              <ItemIcon src={itemIcon(id)} size={size} />
              {n > 1 && <b className={`${styles.count} tabular`}>×{n}</b>}
            </span>
          ))}
        </span>
      );
    case 'tm':
      return (
        <span className={styles.face}>
          <ItemIcon src={tmIcon(prize.id)} size={size} />
        </span>
      );
    case 'stone':
      return (
        <span className={styles.face}>
          <ItemIcon src={itemIcon(prize.id)} size={size} />
        </span>
      );
    case 'held-item':
    case 'relic':
      return (
        <span className={styles.face}>
          <img className="pixel" src={mysterySign()} alt="" width={signSize(size)} height={signSize(size)} draggable={false} />
          {prize.kind === 'relic' && <RarityGem rarity={prize.rarity} size={Math.round(signSize(size) * 0.35)} className={styles.gem} />}
        </span>
      );
  }
}

// A row is one tab stop; the arrows walk its tiles, as the Wild Area's pool does.
function onRowKey(e: KeyboardEvent<HTMLUListElement>) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
  if (!step) return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('li')];
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  items[(i + step + items.length) % items.length]?.focus();
}

/** §2.9.5 — the preview card's reel: a row per rarity, its chance on the left, its prizes on the right. */
export function ReelPool({ tiles }: { tiles: readonly FindTile[] }) {
  const chances = reelChances(tiles);
  return (
    <div className={styles.pool} data-testid="reel-pool">
      {WILD_TIERS.map((tier) => {
        const row = tiles.map((t, i) => ({ t, i })).filter(({ t }) => t.tier === tier);
        if (!row.length) return null;
        const share = row.reduce((a, { i }) => a + chances[i]!, 0);
        return (
          <section key={tier} className={styles.tier} data-tier={tier} aria-label={`${WILD_TIER_LABEL[tier]}, ${WILD_TEXT.pct(share)}`}>
            <Tipped as="div" tip={reelRowTip(tier, share, row.length)} className={styles.head}>
              <span className={styles.label}>{WILD_TIER_LABEL[tier]}</span>
              <b className={`${styles.odds} tabular`}>{WILD_TEXT.pct(share)}</b>
            </Tipped>
            <ul className={styles.prizes} onKeyDown={onRowKey}>
              {row.map(({ t, i }, k) => (
                <Tipped as="li" key={i} tabIndex={k === 0 ? 0 : -1} tip={prizeTip(t.prize, chances[i]!)} className={styles.prize} data-testid={`reel-prize-${i}`}>
                  <PrizeFace prize={t.prize} size={30} />
                </Tipped>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="sr-only">{FIND_TEXT.spins}</p>
    </div>
  );
}

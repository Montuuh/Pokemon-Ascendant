import type { KeyboardEvent } from 'react';
import { WILD_TIERS, type NodePreview, type WildTier } from '@/sim';
import { WILD_TEXT, WILD_TIER_LABEL } from '@/ui/strings';
import { wildMonTip, wildTierTip } from '@/ui/tips';
import { Tipped } from '@/ui/tooltip';
import { MonIcon } from './MonIcon';
import styles from './WildPool.module.css';

// §2.6.2 — a Wild Area's pool (v0.9.7): one row per rarity, its chance on the left, everyone in it on the right. The
// names and each Pokémon's own chance are one hover away; the screen keeps the faces and the three numbers. The
// chances are the sim's (`wildChancesFor`): the Lure Module and an empty row are already counted in.

interface Props {
  wild: NonNullable<NodePreview['wild']>;
  odds: { chances: Record<WildTier, number>; rolls: number };
}

// A row is one tab stop; the arrows walk its faces (a strip of 8+ same-kind items is not 25 tab stops).
function onRowKey(e: KeyboardEvent<HTMLUListElement>) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
  if (!step) return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('li')];
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  items[(i + step + items.length) % items.length]?.focus();
}

export function WildPool({ wild, odds }: Props) {
  const lured = odds.rolls > 1;
  return (
    <div className={styles.root} data-testid="wild-pool">
      {WILD_TIERS.filter((t) => wild.pool[t].length > 0).map((t) => {
        const ids = wild.pool[t];
        const chance = odds.chances[t];
        return (
          <section key={t} className={styles.tier} data-tier={t} data-testid={`wild-tier-${t}`} aria-label={`${WILD_TIER_LABEL[t]}, ${WILD_TEXT.pct(chance)}`}>
            <Tipped as="div" tip={wildTierTip(t, chance, ids.length, lured)} className={styles.head}>
              <span className={styles.label}>{WILD_TIER_LABEL[t]}</span>
              <b className={`${styles.odds} tabular`} data-testid={`wild-odds-${t}`}>
                {WILD_TEXT.pct(chance)}
              </b>
            </Tipped>
            <ul className={styles.mons} onKeyDown={onRowKey}>
              {ids.map((id, i) => (
                <Tipped as="li" key={id} tabIndex={i === 0 ? 0 : -1} tip={wildMonTip(id, t, chance / ids.length)} className={styles.mon} data-testid={`wild-mon-${id}`}>
                  <MonIcon speciesId={id} size={30} />
                </Tipped>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

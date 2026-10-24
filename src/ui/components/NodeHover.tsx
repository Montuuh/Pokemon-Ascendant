import type { ReactNode } from 'react';
import { getContent } from '@/content/registry';
import { WILD_TIERS, type WildTier } from '@/sim';
import { WILD_TEXT, WILD_TIER_LABEL } from '@/ui/strings';
import { MonIcon } from './MonIcon';
import { PixelSprite } from './PixelSprite';
import styles from './NodeHover.module.css';

/** §9.3 — a glance at a place, using only facts already offered by its preview. */
export function NodeHover({ heading, art, facts, detail, hint, access, available, pool, chances }: {
  heading: string; art: string; facts: string[]; detail: ReactNode; hint: string; access: string; available: boolean;
  pool?: Record<WildTier, string[]>; chances?: Record<WildTier, number>;
}) {
  return <div className={`${styles.root} theme-stage`} data-testid="node-hover">
    <header className={styles.head}>
      <span className={styles.picture}><PixelSprite src={art} alt="" width={56} height={64} /></span>
      <div><strong className={`${styles.title} display`}>{heading}</strong><div className={styles.facts}>{facts.map((fact) => <span key={fact}>{fact}</span>)}</div></div>
    </header>
    {pool ? <div className={styles.pool}>{WILD_TIERS.filter((tier) => pool[tier].length).map((tier) =>
      <section key={tier} className={styles.tier} data-tier={tier}>
        <div className={styles.tierHead}><b>{WILD_TIER_LABEL[tier]}</b>{chances && <b>{WILD_TEXT.pct(chances[tier])}</b>}</div>
        <div className={styles.species}>{pool[tier].map((id) => <span key={id}><MonIcon speciesId={id} size={24} alt="" />{getContent().species(id).name}</span>)}</div>
      </section>)}</div> : detail && <p className={styles.detail}>{detail}</p>}
    {hint && <p className={styles.hint}>{hint}</p>}
    <div className={styles.access} data-available={available}>{access}</div>
  </div>;
}
